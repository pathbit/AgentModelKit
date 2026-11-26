import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import os from "node:os";
import { runCli } from "../src/cli.mjs";
import { commitWrites, jsonWrite, readSnapshot } from "../src/utils/json.mjs";
import { refreshCatalogs } from "../src/catalogs/index.mjs";

function profiles(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "amk-lifecycle-"));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const env = {
    COPILOT_HOME: path.join(root, "copilot"),
    VSCODE_USER_DIR: path.join(root, "vscode"),
    AGENTMODELKIT_CATALOG_DIR: path.join(root, "catalog"),
  };
  return {
    root, env, vs: path.join(env.VSCODE_USER_DIR, "chatLanguageModels.json"),
    cp: path.join(env.COPILOT_HOME, "providers.json"), settings: path.join(env.COPILOT_HOME, "settings.json"),
  };
}

function read(file) { return JSON.parse(fs.readFileSync(file)); }
function write(file, data) { fs.writeFileSync(file, JSON.stringify(data)); }
async function listen(t, responder) {
  const server = http.createServer(responder);
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => {
    server.closeAllConnections?.();
    return new Promise((resolve) => server.close(resolve));
  });
  return `http://127.0.0.1:${server.address().port}/v1`;
}

function setupArgs(...suffix) {
  return ["add", "--targets", "vscode,copilot-cli", "-p", "opencode", "--tiers", "payg", "--key", "fixture", "--yes", ...suffix];
}

test("incremental add, replacement, default model, backups and no-op retry", async (t) => {
  const { env, vs, cp, settings } = profiles(t);
  await runCli(setupArgs("--models", "glm-5.3"), env);
  const group = read(vs);
  group[0].apiKey = "${input:chat.lm.secret.from-ui}";
  write(vs, group);
  const firstVs = fs.readFileSync(vs);
  const firstCp = fs.readFileSync(cp);
  await runCli(setupArgs("--models", "gpt-6.2-sol", "--default-model", "gpt-6.2-sol"), env);
  assert.deepEqual(fs.readFileSync(vs + ".bak"), firstVs);
  assert.deepEqual(fs.readFileSync(cp + ".bak"), firstCp);
  assert.deepEqual(read(vs)[0].models.map(({ id }) => id), ["glm-5.3", "gpt-6.2-sol"]);
  assert.equal(read(vs)[0].apiKey, "${input:chat.lm.secret.from-ui}");
  assert.deepEqual(read(cp).models.map(({ id }) => id), ["glm-5.3", "gpt-6.2-sol"]);
  assert.deepEqual(read(settings), { model: "opencode-payg-responses/gpt-6.2-sol" });

  const bytesBefore = fs.readFileSync(cp);
  const retry = await runCli(setupArgs("--models", "gpt-6.2-sol"), env);
  assert.ok(retry.every(({ changed }) => !changed));
  assert.deepEqual(fs.readFileSync(cp), bytesBefore);

  const replaced = await runCli(setupArgs("--replace", "--models", "glm-5.3"), env);
  assert.ok(replaced.every(({ removed }) => removed.some((item) => item.endsWith("/gpt-6.2-sol"))));
  assert.deepEqual(fs.readFileSync(cp + ".bak"), firstCp);
  assert.deepEqual(fs.readFileSync(replaced[1].backupPath), bytesBefore);
  assert.deepEqual(read(settings), {});
});

test("VS Code retains custom headers for the same endpoint and rotates authentication", async (t) => {
  const { env, vs } = profiles(t);
  const configure = (port, key) => runCli([
    "freellmapi", "vscode", "--url", `http://127.0.0.1:${port}/v1`, "--key", key, "--yes",
  ], env);
  await configure(3001, "old-key");
  const groups = read(vs);
  groups[0].apiKey = "${input:chat.lm.secret.from-ui}";
  groups[0].models[0].requestHeaders = { authorization: "Bearer old-key", "X-Team-Router": "fixture-${apiKey}" };
  write(vs, groups);

  await configure(3001, "new-key");
  assert.deepEqual(read(vs)[0].models[0].requestHeaders, {
    "X-Team-Router": "fixture-${apiKey}", Authorization: "Bearer new-key",
  });

  assert.equal(read(vs)[0].apiKey, "${input:chat.lm.secret.from-ui}");

  await configure(3002, "next-endpoint-key");
  assert.deepEqual(read(vs)[0].models[0].requestHeaders, { Authorization: "Bearer next-endpoint-key" });
  assert.equal(read(vs)[0].apiKey, undefined);
});

test("preflight failures preserve both clients and any existing key", async (t) => {
  const { env, vs, cp } = profiles(t);
  await runCli(setupArgs("--models", "glm-5.3"), env);
  const vsBefore = fs.readFileSync(vs);
  const key = path.join(env.COPILOT_HOME, "opencode.key");
  const keyBefore = fs.readFileSync(key);
  fs.writeFileSync(cp, "[bad JSON");
  const alternative = ["add", "--targets", "vscode,copilot-cli", "-p", "opencode", "--key", "replacement", "--models", "gpt-6.2-sol", "--yes"];
  await assert.rejects(runCli(alternative, env), /Invalid JSON/);
  assert.deepEqual(fs.readFileSync(vs), vsBefore);
  assert.deepEqual(fs.readFileSync(key), keyBefore);
  assert.equal(fs.existsSync(vs + ".bak"), false);
  assert.equal(fs.existsSync(key + ".bak"), false);
  assert.equal(fs.readFileSync(cp, "utf8"), "[bad JSON");
  await assert.rejects(runCli(["add", "-p", "opencode", "--tiers", "free", "--yes"], env), /restricted/);
  await assert.rejects(runCli(["add", "--key"], env), /Provide a value/);
});

test("prune FreeLLMAPI uses full availability and preserves manual rows and exhausted models", async (t) => {
  const { env, vs, cp } = profiles(t);
  let mode = "ready";
  const seen = [];
  const baseUrl = await listen(t, (req, res) => {
    seen.push([req.url, req.headers.authorization]);
    res.setHeader("Content-Type", "application/json");
    if (mode === "failure") return res.writeHead(503).end();
    if (mode === "partial") return res.end(JSON.stringify({ data: [{ id: "auto" }], has_more: true }));
    const data = [
      { id: "auto", type: "chat" },
      { id: "vendor/exhausted", execution_status: mode === "ready" ? "ready" : "exhausted" },
      ...(mode === "ready" ? [{ id: "vendor/retired", execution_status: "ready" }] : []),
    ];
    res.end(JSON.stringify({ data }));
  });

  const args = ["--targets", "vscode,copilot-cli", "-p", "freellmapi", "--url", baseUrl, "--key", "fake"];
  await runCli(["add", ...args, "--freellmapi-mode", "ready", "--models", "auto,vendor/exhausted,vendor/retired", "--yes"], env);
  const vc = read(vs);
  vc[0].models.push({ id: "manual", url: baseUrl + "/chat/completions" });
  write(vs, vc);
  const cc = read(cp);
  cc.models.push({ id: "manual", provider: "freellmapi" });
  write(cp, cc);

  mode = "current";
  const beforeVs = fs.readFileSync(vs);
  const beforeCp = fs.readFileSync(cp);
  const preview = await runCli(["prune", ...args], env);
  assert.ok(preview.every(({ dryRun, removed }) => dryRun && removed.length === 1 && removed[0].endsWith("/vendor/retired")));
  assert.deepEqual(fs.readFileSync(vs), beforeVs);
  assert.deepEqual(fs.readFileSync(cp), beforeCp);
  assert.ok(seen.some(([url, auth]) => url === "/v1/models?execution_status=ready" && auth === "Bearer fake"));
  assert.ok(seen.some(([url, auth]) => url === "/v1/models" && auth === "Bearer fake"));
  for (mode of ["failure", "partial"]) {
    await assert.rejects(runCli(["prune", ...args, "--apply"], env), /HTTP 503|incomplete/);
    assert.deepEqual(fs.readFileSync(vs), beforeVs);
    assert.deepEqual(fs.readFileSync(cp), beforeCp);
  }
  mode = "current";
  await runCli(["prune", ...args, "--apply"], env);
  assert.deepEqual(fs.readFileSync(vs + ".bak"), beforeVs);
  assert.deepEqual(fs.readFileSync(cp + ".bak"), beforeCp);
  assert.deepEqual(read(vs)[0].models.map(({ id }) => id), ["auto", "vendor/exhausted", "manual"]);
  assert.deepEqual(read(cp).models.map(({ id }) => id), ["auto", "vendor/exhausted", "manual"]);
});

test("manual provider supports opt-in curation and same-origin availability", async (t) => {
  const { root, env, cp } = profiles(t);
  const url = await listen(t, (_, res) => res.end(JSON.stringify({ data: [{ id: "vendor/large" }] })));
  const file = path.join(root, "manifest.json");
  const model = (id) => ({ id, maxInputTokens: 2048, maxOutputTokens: 512 });
  const config = {
    id: "custom-test", requiresKey: false, baseUrl: url, modelsUrl: `${url}/models`,
    models: [model("vendor/large"), model("vendor/old")], powerfulIds: ["vendor/large"],
  };
  write(file, config);
  await runCli(["add", "--targets", "vscode,copilot-cli", "--provider-file", file, "--powerful", "--yes"], env);
  assert.deepEqual(read(cp).models.map(({ id }) => id), ["vendor/large"]);
  await runCli(["add", "--targets", "vscode,copilot-cli", "--provider-file", file, "--models", "custom-test/vendor/old", "--yes"], env);
  assert.deepEqual(read(cp).models.map(({ id }) => id), ["vendor/large", "vendor/old"]);
  await runCli(["prune", "--targets", "vscode,copilot-cli", "--provider-file", file, "--apply"], env);
  assert.deepEqual(read(cp).models.map(({ id }) => id), ["vendor/large"]);
  write(file, { ...config, modelsUrl: "https://example.com/models" });
  await assert.rejects(runCli(["add", "--targets", "vscode,copilot-cli", "--provider-file", file, "--yes"], env), /same origin/);
});

test("writes reject stale snapshots and active per-file locks before applying any changes", (t) => {
  const { root } = profiles(t);
  const a = path.join(root, "a.json");
  const b = path.join(root, "b.json");
  write(a, { keep: 1 });
  write(b, { keep: 2 });
  const plans = [a, b].map((file) => jsonWrite(readSnapshot(file), { newValue: 1 }));
  fs.writeFileSync(b + ".agentmodelkit.lock", "");
  assert.throws(() => commitWrites(plans), /File busy/);
  assert.deepEqual(read(a), { keep: 1 });
  assert.ok(fs.existsSync(b + ".agentmodelkit.lock"));
  fs.unlinkSync(b + ".agentmodelkit.lock");
  write(b, { external: 2 });
  assert.throws(() => commitWrites(plans), /File changed/);
  assert.deepEqual(read(a), { keep: 1 });
  assert.deepEqual(read(b), { external: 2 });
  assert.equal(fs.existsSync(a + ".bak"), false);
});

test("cache refresh refuses unsigned FreeLLMAPI and incomplete OpenCode payloads", async (t) => {
  const { env } = profiles(t);
  const dir = env.AGENTMODELKIT_CATALOG_DIR;
  await assert.rejects(refreshCatalogs({
    dir, source: "freellmapi", fetchImpl: async () => new Response(JSON.stringify({ models: [] })),
  }), /Invalid signature/);
  await assert.rejects(refreshCatalogs({
    dir, source: "opencode", fetchImpl: async () => new Response(JSON.stringify({ data: [] })),
  }), /incomplete/);
  assert.equal(fs.existsSync(dir), false);
});

test("OpenCode project setup preserves manual models and uses credential references", async (t) => {
  const { root, env } = profiles(t);
  const project = path.join(root, "app");
  const configDir = path.join(project, ".opencode");
  const configFile = path.join(configDir, "opencode.json");
  fs.mkdirSync(configDir, { recursive: true });
  const manual = { models: { custom: { name: "Manual" } } };
  write(configFile, { model: "manual/custom", providers: { manual } });
  const args = ["--project-dir", project, "-p", "freellmapi", "--url", "http://127.0.0.1:1/v1"];
  await runCli(["add", ...args, "--yes"], env);
  const config = read(configFile);
  const router = config.providers["agentmodelkit-freellmapi"];
  assert.equal(router.settings.apiKey, "{env:FREELLMAPI_API_KEY}");
  assert.equal(router.package, "@opencode/ai/providers/openai-compatible");
  assert.deepEqual(Object.keys(router.models), ["auto"]);
  assert.deepEqual(config.providers.manual, manual);
  assert.equal(config.model, "manual/custom");
  assert.equal(read(configFile + ".bak").model, "manual/custom");
  assert.equal(fs.existsSync(env.COPILOT_HOME), false);
  assert.equal(fs.existsSync(env.VSCODE_USER_DIR), false);
  const result = await runCli(["add", ...args, "--yes"], env);
  assert.equal(result[0].changed, false);
});

test("OpenCode pruning updates the project without touching its direct JSONC configuration", async (t) => {
  const { root, env } = profiles(t);
  let ids = ["keep", "old"];
  const url = await listen(t, (_, res) => res.end(JSON.stringify({ data: ids.map((id) => ({ id })) })));
  const manifest = path.join(root, "provider.json");
  write(manifest, {
    id: "custom-project", requiresKey: false, baseUrl: url, modelsUrl: `${url}/models`,
    models: ids.map((id) => ({ id, maxInputTokens: 1024, maxOutputTokens: 128 })),
  });
  const directConfig = path.join(root, "opencode.jsonc");
  const userConfig = '{ // preserve this comment\n  "model": "manual/keep",\n}\n';
  fs.writeFileSync(directConfig, userConfig);
  const args = ["--project-dir", root, "--provider-file", manifest];
  await runCli(["add", ...args, "--dry-run"], env);
  assert.equal(fs.existsSync(path.join(root, ".opencode")), false);
  await runCli(["add", ...args, "--yes"], env);
  ids = ["keep"];
  const configFile = path.join(root, ".opencode", "opencode.json");
  const modelMap = () => read(configFile).providers["agentmodelkit-custom-project"].models;
  const [plan] = await runCli(["prune", ...args], env);
  assert.deepEqual(plan.removed, ["agentmodelkit-custom-project/old"]);
  assert.ok(modelMap().old);
  await runCli(["prune", ...args, "--apply"], env);
  assert.deepEqual(Object.keys(modelMap()), ["keep"]);
  assert.equal(fs.readFileSync(directConfig, "utf8"), userConfig);
});
