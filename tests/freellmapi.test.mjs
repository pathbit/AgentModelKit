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
