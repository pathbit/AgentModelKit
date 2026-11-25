import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";

import {
  detectFreeLLMApiBaseUrl,
  fetchFreeLLMApiModels,
  freellmapiProvider,
  getFreeLLMDesktopConfigPath,
  normalizeFreeLLMBaseUrl,
  normalizeFreeLLMMode,
  readFreeLLMDesktopPort,
} from "../src/providers/freellmapi.mjs";
import { runCli } from "../src/cli.mjs";

function makeTempEnv() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "amk-free-test-"));
  const copilotHome = path.join(root, ".copilot");
  const vscodeUser = path.join(root, "vscode-user");
  const env = {
    ...process.env,
    COPILOT_HOME: copilotHome,
    VSCODE_USER_DIR: vscodeUser,
  };
  delete env.COPILOT_PROVIDERS_CONFIG;
  delete env.OPENCODE_API_KEY;
  delete env.FREELLMAPI_API_KEY;
  delete env.FREELLMAPI_URL;
  delete env.FREELLMAPI_BASE_URL;
  delete env.FREELLMAPI_PORT;
  delete env.FREELLMAPI_CONFIG_PATH;
  return { root, copilotHome, vscodeUser, env };
}

test("normalizeFreeLLMBaseUrl handles full URLs, paths, host:port, and bare port numbers", () => {
  assert.equal(normalizeFreeLLMBaseUrl("http://localhost:3001"), "http://localhost:3001/v1");
  assert.equal(normalizeFreeLLMBaseUrl("http://localhost:3001/"), "http://localhost:3001/v1");
  assert.equal(normalizeFreeLLMBaseUrl("http://127.0.0.1:31415/v1/"), "http://127.0.0.1:31415/v1");
  assert.equal(
    normalizeFreeLLMBaseUrl("http://localhost:3001/v1/chat/completions"),
    "http://localhost:3001/v1"
  );
  assert.equal(normalizeFreeLLMBaseUrl("http://localhost:4000/messages"), "http://localhost:4000/v1");
  assert.equal(normalizeFreeLLMBaseUrl("4000"), "http://localhost:4000/v1");
  assert.equal(normalizeFreeLLMBaseUrl(":31420"), "http://localhost:31420/v1");
  assert.equal(normalizeFreeLLMBaseUrl("192.168.1.50:8080"), "http://192.168.1.50:8080/v1");
  assert.throws(() => normalizeFreeLLMBaseUrl("99999"), /Invalid FreeLLMAPI port/);
});

test("detectFreeLLMApiBaseUrl resolves Desktop config.json port, --port, env vars, and probing dynamically", async (t) => {
  const { root, env } = makeTempEnv();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  assert.equal(
    getFreeLLMDesktopConfigPath("darwin", {}, "/Users/dev"),
    path.join("/Users/dev", "Library", "Application Support", "FreeLLMAPI", "config.json")
  );
  assert.equal(
    getFreeLLMDesktopConfigPath("win32", { APPDATA: "C:\\Users\\dev\\AppData\\Roaming" }, "C:\\Users\\dev"),
    path.join("C:\\Users\\dev\\AppData\\Roaming", "FreeLLMAPI", "config.json")
  );

  // Desktop App listenWithScan dynamic port recorded in config.json
  const desktopCfgPath = path.join(root, "FreeLLMAPI", "config.json");
  fs.mkdirSync(path.dirname(desktopCfgPath), { recursive: true });
  fs.writeFileSync(desktopCfgPath, JSON.stringify({ port: 31422 }), "utf8");
  const desktopEnv = { ...env, FREELLMAPI_CONFIG_PATH: desktopCfgPath };
  assert.equal(readFreeLLMDesktopPort({ env: desktopEnv }), 31422);

  const fromConfig = await detectFreeLLMApiBaseUrl({
    env: desktopEnv,
    fetchImpl: async (url) => {
      if (url.includes("31422")) return { status: 200 };
      throw new Error("unreachable");
    },
  });
  assert.equal(fromConfig, "http://127.0.0.1:31422/v1");

  // Explicit FREELLMAPI_URL overrides desktop config
  const fromEnvUrl = await detectFreeLLMApiBaseUrl({
    env: { ...desktopEnv, FREELLMAPI_URL: "http://10.0.0.5:4100" },
    fetchImpl: null,
  });
  assert.equal(fromEnvUrl, "http://10.0.0.5:4100/v1");

  // Explicit port probes 127.0.0.1 and localhost
  const fromExplicitPort = await detectFreeLLMApiBaseUrl({
    env: desktopEnv,
    port: 4567,
    fetchImpl: async (url) => {
      if (url.includes("127.0.0.1:4567")) return { status: 401 };
      throw new Error("unreachable");
    },
  });
  assert.equal(fromExplicitPort, "http://127.0.0.1:4567/v1");

  // Fallback when config is absent and servers are offline
  const offlineDefault = await detectFreeLLMApiBaseUrl({
    env,
    fetchImpl: async () => {
      throw new Error("ECONNREFUSED");
    },
  });
  assert.equal(offlineDefault, "http://localhost:3001/v1");
});

test("freellmapiProvider defaults to clean auto-only router mode and supports strategies and ready discovery", async (t) => {
  const { root, copilotHome, vscodeUser, env } = makeTempEnv();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  assert.equal(normalizeFreeLLMMode(), "auto");
  assert.equal(normalizeFreeLLMMode("strategies"), "strategies");
  assert.equal(normalizeFreeLLMMode("ready"), "ready");
  assert.throws(() => normalizeFreeLLMMode("bad"), /Invalid FreeLLMAPI mode/);

  let capturedAuth = null;
  let requestedQuery = null;

  const server = http.createServer((req, res) => {
    if (req.url.startsWith("/v1/models")) {
      capturedAuth = req.headers.authorization || null;
      requestedQuery = req.url;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          data: [
            { id: "auto", name: "Auto Duplicate", execution_status: "ready", type: "chat" },
            {
              id: "groq/llama-3.3-70b-versatile",
              name: "Llama 3.3 70B",
              execution_status: "ready",
              type: "chat",
              supports_tools: true,
              supports_vision: false,
              supports_reasoning: false,
              context_window: 131072,
              max_output_tokens: 32768,
            },
            {
              id: "gemini/gemini-2.5-flash",
              name: "Gemini 2.5 Flash",
              execution_status: "ready",
              type: "chat",
              supports_tools: true,
              supports_vision: true,
              supports_reasoning: true,
            },
            { id: "openai/gpt-4o", name: "Needs Key", execution_status: "needsKey", type: "chat" },
            { id: "cohere/embed-v4", name: "Embedder", execution_status: "ready", type: "embedding" },
          ],
        })
      );
      return;
    }
    res.writeHead(404).end();
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}/v1`;

  // 1) Default clean router-only mode ("auto" = 1 model, dynamic port detected!)
  const autoOnly = await freellmapiProvider.resolve({ port, apiKey: "freellmapi-secret-1", env });
  assert.equal(autoOnly.source, "router-auto");
  assert.equal(autoOnly.groups[0].baseUrl, baseUrl);
  assert.deepEqual(
    autoOnly.groups[0].models.map((m) => m.id),
    ["auto"]
  );

  // 2) Strategies mode (6 virtual router strategies)
  const strategiesOnly = await freellmapiProvider.resolve({ port, mode: "strategies", env });
  assert.equal(strategiesOnly.source, "router-strategies");
  assert.equal(strategiesOnly.groups[0].models.length, 6);

  // 3) Live ready discovery mode
  const discovered = await fetchFreeLLMApiModels(baseUrl, "freellmapi-secret-1");
  assert.equal(capturedAuth, "Bearer freellmapi-secret-1");
  assert.equal(requestedQuery, "/v1/models?execution_status=ready");
  assert.deepEqual(
    discovered.map((m) => m.id),
    ["groq/llama-3.3-70b-versatile", "gemini/gemini-2.5-flash"]
  );

  const readyResolved = await freellmapiProvider.resolve({
    port,
    apiKey: "freellmapi-secret-1",
    mode: "ready",
    env,
  });
  assert.equal(readyResolved.source, "live:2-ready");
  assert.equal(readyResolved.groups[0].models.length, 8); // 6 virtual + 2 ready

  // 4) Run CLI end-to-end with dynamic --port & clean auto-only default
  await runCli(
    [
      "init",
      "--targets",
      "vscode,copilot-cli",
      "--providers",
      "freellmapi",
      "--port",
      String(port),
      "--key",
      "freellmapi-secret-1",
      "--no-default-model",
      "--yes",
    ],
    env
  );

  await runCli(
    [
      "init",
      "--targets",
      "vscode,copilot-cli",
      "--providers",
      "opencode",
      "--tiers",
      "payg",
      "--models",
      "gpt-6.2-sol",
      "--key",
      "oc_coexist_key",
      "--no-default-model",
      "--yes",
    ],
    env
  );

  const copJson = JSON.parse(fs.readFileSync(path.join(copilotHome, "providers.json"), "utf8"));
  const freeProvider = copJson.providers.find((p) => p.name === "freellmapi");
  assert.equal(freeProvider.baseUrl, baseUrl);
  assert.deepEqual(
    copJson.providers.map((p) => p.name),
    ["freellmapi", "opencode-payg-responses"]
  );
  assert.equal(copJson.models.length, 2);

  const vscJson = JSON.parse(fs.readFileSync(path.join(vscodeUser, "chatLanguageModels.json"), "utf8"));
  assert.ok(vscJson.every((b) => b.vendor === "customendpoint"));
  assert.deepEqual(
    vscJson.map((b) => b.name),
    ["FreeLLMAPI", "OpenCode PAYG"]
  );
  const vscFreeBlock = vscJson.find((b) => b.name === "FreeLLMAPI");
  assert.equal(vscFreeBlock.models.length, 1);
  assert.equal(vscFreeBlock.models[0].id, "auto");
  assert.equal(vscFreeBlock.models[0].url, `${baseUrl}/chat/completions`);
});

test("explicit ready discovery fails on an offline server", async () => {
  await assert.rejects(freellmapiProvider.resolve({
    baseUrl: "http://127.0.0.1:1/v1",
    apiKey: "fixture",
    mode: "ready",
    fetchImpl: async () => { throw new Error("ECONNREFUSED"); },
  }), /ECONNREFUSED/);
});

test("an agent URL configures the three clients without a separate key and supports discovery and pruning", async (t) => {
  const { root, copilotHome, vscodeUser, env } = makeTempEnv();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const token = "example-fixture-token";
  const seen = [];
  let available = true;
  let broken = false;
  const server = http.createServer((request, response) => {
    seen.push({ url: request.url, authorization: request.headers.authorization });
    response.setHeader("Content-Type", "application/json");
    const data = available ? [{ id: "fixture-chat", execution_status: "ready" }] : [];
    response.end(JSON.stringify({ data: broken ? [] : [{ id: "auto" }, ...data] }));
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => {
    server.closeAllConnections();
    server.close();
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}/v1/t/${token}`;
  assert.equal(normalizeFreeLLMBaseUrl(baseUrl + "/"), baseUrl);
  assert.equal(normalizeFreeLLMBaseUrl(baseUrl + "/responses"), baseUrl);
  assert.equal(normalizeFreeLLMBaseUrl(baseUrl + "/models"), baseUrl);
  assert.throws(() => normalizeFreeLLMBaseUrl(baseUrl + "/not-an-endpoint"), (error) =>
    /Invalid FreeLLMAPI agent URL/.test(error.message) && !error.message.includes(token));

  const openCodeArgs = ["--project-dir", root, "--yes"];
  const urlArgs = ["--url", baseUrl + "/chat/completions", "--targets", "all", ...openCodeArgs];
  await runCli([...urlArgs, "--dry-run"], env);
  assert.deepEqual(fs.readdirSync(root), []);
  await runCli(urlArgs, env);
  assert.deepEqual(seen, []);

  const project = path.join(root, ".opencode");
  const projectConfig = path.join(project, "opencode.json");
  const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
  const openCode = () => readJson(projectConfig).providers["agentmodelkit-freellmapi"];
  const copilot = () => readJson(path.join(copilotHome, "providers.json"));
  const vscode = () => readJson(path.join(vscodeUser, "chatLanguageModels.json"));
  const reference = openCode().settings.baseURL;
  assert.match(reference, /^\{file:.*\}$/);
  assert.equal(openCode().settings.apiKey, undefined);
  assert.deepEqual(Object.keys(openCode().models), ["auto"]);
  const secretFile = reference.slice(6, -1);
  assert.equal(fs.readFileSync(secretFile, "utf8").trim(), baseUrl);
  if (process.platform !== "win32") assert.equal(fs.statSync(secretFile).mode & 0o777, 0o600);
  for (const file of fs.readdirSync(project)) {
    assert.equal(fs.readFileSync(path.join(project, file), "utf8").includes(token), false);
  }
  assert.equal(fs.existsSync(path.join(copilotHome, "freellmapi.key")), false);
  assert.equal(copilot().providers[0].baseUrl, baseUrl);
  assert.equal(copilot().providers[0].apiKey, undefined);
  assert.equal(vscode()[0].models[0].url, baseUrl + "/chat/completions");
  assert.equal(vscode()[0].apiKey, undefined);

  const envWithUrl = { ...env, FREELLMAPI_URL: baseUrl, FREELLMAPI_API_KEY: "unused-fixture-key" };
  await runCli(["add", "--live", "--targets", "all", ...openCodeArgs], envWithUrl);
  assert.deepEqual(seen, [{ url: `/v1/t/${token}/models?execution_status=ready`, authorization: undefined }]);
  assert.ok(openCode().models["fixture-chat"]);
  const virtualModels = Object.keys(openCode().models).filter((id) => id !== "fixture-chat").sort();

  available = false;
  broken = true;
  await assert.rejects(runCli(["prune", ...urlArgs, "--apply"], envWithUrl), (error) =>
    /Could not list FreeLLMAPI models/.test(error.message) && !error.message.includes(token));
  assert.ok(openCode().models["fixture-chat"]);
  broken = false;
  await runCli(["prune", ...urlArgs, "--apply"], envWithUrl);
  assert.deepEqual(Object.keys(openCode().models).sort(), virtualModels);
  assert.deepEqual(copilot().models.map(({ id }) => id).sort(), virtualModels);
  assert.deepEqual(vscode()[0].models.map(({ id }) => id).sort(), virtualModels);

  const normalUrl = "http://localhost:3001/v1";
  await runCli(["--url", normalUrl, ...openCodeArgs], env);
  assert.equal(openCode().settings.apiKey, "{env:FREELLMAPI_API_KEY}");
  await runCli(["--url", baseUrl, ...openCodeArgs], env);
  assert.equal(openCode().settings.apiKey, undefined);
  assert.equal(openCode().settings.baseURL, reference);
});

test("named FreeLLMAPI setup requires the local URL and installs bearer credentials for every client", async (t) => {
  const { root, env, copilotHome, vscodeUser } = makeTempEnv();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const auth = "local-fixture-key";
  const serverUrl = "http://localhost:3001/v1";
  const args = ["freellmapi", "--targets", "all", "--project-dir", root, "--yes"];
  await assert.rejects(runCli(args, env), /Provide the FreeLLMAPI server URL/);
  await assert.rejects(runCli(["add", "--providers", "freellmapi", "--yes"], env), /Provide the FreeLLMAPI server URL/);
  await assert.rejects(runCli([...args, "--url", serverUrl], env), /Missing API key/);
  assert.deepEqual(fs.readdirSync(root), []);
  await runCli(["freellmapi", "vscode", "--connection", "local", "--yes", "--dry-run"], { ...env, FREELLMAPI_URL: serverUrl });
  assert.deepEqual(fs.readdirSync(root), []);

  await runCli([...args, "--connection", "local", "--url", serverUrl], { ...env, FREELLMAPI_API_KEY: auth });
  const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
  const [block] = readJson(path.join(vscodeUser, "chatLanguageModels.json"));
  assert.equal(block.apiKey, undefined);
  assert.equal(block.models[0].url, serverUrl + "/chat/completions");
  assert.equal(block.models[0].requestHeaders.Authorization, `Bearer ${auth}`);
  const copilot = readJson(path.join(copilotHome, "providers.json"));
  assert.equal(copilot.providers[0].baseUrl, serverUrl);
  assert.equal(copilot.providers[0].apiKey, auth);
  const project = readJson(path.join(root, ".opencode", "opencode.json"));
  const router = project.providers["agentmodelkit-freellmapi"];
  assert.equal(router.settings.baseURL, serverUrl);
  assert.deepEqual(Object.keys(router.models), ["auto"]);
  assert.equal(fs.readFileSync(router.settings.apiKey.slice(6, -1), "utf8").trim(), auth);

  const newUrl = "http://localhost:5000/v1";
  await runCli(["add", "--providers", "freellmapi", "--targets", "vscode", "--url", newUrl, "--yes"], env);
  const [updated] = readJson(path.join(vscodeUser, "chatLanguageModels.json"));
  assert.equal(updated.models[0].url, newUrl + "/chat/completions");
  assert.equal(updated.models[0].requestHeaders?.Authorization, undefined);
});

test("named remote FreeLLMAPI chooses its configured address and keeps local credentials separate", async (t) => {
  const { root, env, copilotHome, vscodeUser } = makeTempEnv();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  delete env.FREELLMAPI_REMOTE_URL;
  delete env.FREELLMAPI_REMOTE_API_KEY;
  const args = ["freellmapi", "vscode", "--connection", "remote", "--yes"];
  await assert.rejects(runCli(args, env), /Set FREELLMAPI_REMOTE_URL/);
  await assert.rejects(runCli([...args, "--url", "https://api.freellmapi.co/v1"], env), /serves the catalog/);
  await assert.rejects(runCli([...args, "--url", "http://llm.example.com/v1"], env), /Use an HTTPS URL/);
  const localKey = "local-saved-fixture-key";
  fs.mkdirSync(copilotHome);
  fs.writeFileSync(path.join(copilotHome, "freellmapi.key"), localKey);
  const remoteUrl = "https://llm.example.com/v1";
  const remoteEnv = { ...env, FREELLMAPI_API_KEY: localKey, FREELLMAPI_REMOTE_URL: remoteUrl };
  await assert.rejects(runCli(args, remoteEnv), /Missing API key.*FREELLMAPI_REMOTE_API_KEY/);
  assert.equal(fs.existsSync(vscodeUser), false);
  const remoteKey = "remote-fixture-key";
  await runCli(args, { ...remoteEnv, FREELLMAPI_REMOTE_API_KEY: remoteKey });
  const [vscode] = JSON.parse(fs.readFileSync(path.join(vscodeUser, "chatLanguageModels.json"), "utf8"));
  assert.equal(vscode.models[0].url, remoteUrl + "/chat/completions");
  assert.equal(vscode.models[0].requestHeaders.Authorization, `Bearer ${remoteKey}`);
  assert.equal(fs.readFileSync(path.join(copilotHome, "freellmapi.key"), "utf8"), localKey);
  await assert.rejects(runCli([...args, "--url", "https://other.example.com/v1"], remoteEnv), /Missing API key/);
  await runCli(["freellmapi", "copilot", "--connection", "remote", "--yes"], remoteEnv);
  const copilot = JSON.parse(fs.readFileSync(path.join(copilotHome, "providers.json"), "utf8"));
  assert.equal(copilot.providers[0].apiKey, remoteKey);
});
