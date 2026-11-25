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
  normalizeFreeLLMBaseUrl,
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
  return { root, copilotHome, vscodeUser, env };
}

test("normalizeFreeLLMBaseUrl handles root, /v1, trailing slash, and /chat/completions", () => {
  assert.equal(normalizeFreeLLMBaseUrl("http://localhost:3001"), "http://localhost:3001/v1");
  assert.equal(normalizeFreeLLMBaseUrl("http://localhost:3001/"), "http://localhost:3001/v1");
  assert.equal(normalizeFreeLLMBaseUrl("http://127.0.0.1:31415/v1/"), "http://127.0.0.1:31415/v1");
  assert.equal(
    normalizeFreeLLMBaseUrl("http://localhost:3001/v1/chat/completions"),
    "http://localhost:3001/v1"
  );
});

test("detectFreeLLMApiBaseUrl prefers desktop :31415 and falls back to server :3001", async () => {
  const desktopFirst = await detectFreeLLMApiBaseUrl(async (url) => {
    if (url.includes("31415")) return { status: 200 };
    throw new Error("unreachable");
  });
  assert.equal(desktopFirst, "http://127.0.0.1:31415/v1");

  const serverFallback = await detectFreeLLMApiBaseUrl(async (url) => {
    if (url.includes("31415")) throw new Error("ECONNREFUSED");
    if (url.includes("3001")) return { status: 401 };
    throw new Error("unreachable");
  });
  assert.equal(serverFallback, "http://localhost:3001/v1");

  const offlineDefault = await detectFreeLLMApiBaseUrl(async () => {
    throw new Error("ECONNREFUSED");
  });
  assert.equal(offlineDefault, "http://localhost:3001/v1");
});

test("freellmapiProvider discovers ready chat models from live HTTP server and configures both targets", async (t) => {
  const { root, copilotHome, vscodeUser, env } = makeTempEnv();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

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
            {
              id: "openai/gpt-4o",
              name: "Needs Key",
              execution_status: "needsKey",
              type: "chat",
            },
            {
              id: "cohere/embed-v4",
              name: "Embedder",
              execution_status: "ready",
              type: "embedding",
            },
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

  const discovered = await fetchFreeLLMApiModels(baseUrl, "freellmapi-secret-1");
  assert.equal(capturedAuth, "Bearer freellmapi-secret-1");
  assert.equal(requestedQuery, "/v1/models?execution_status=ready");
  assert.deepEqual(
    discovered.map((m) => m.id),
    ["groq/llama-3.3-70b-versatile", "gemini/gemini-2.5-flash"]
  );
  assert.equal(discovered[1].vision, true);
  assert.equal(discovered[1].reasoningEffort, "high");

  const resolved = await freellmapiProvider.resolve({
    baseUrl: `http://127.0.0.1:${port}`,
    apiKey: "freellmapi-secret-1",
    live: true,
  });
  assert.equal(resolved.source, "live:2-ready");
  assert.equal(resolved.defaultModel, "freellmapi/auto");
  assert.equal(resolved.groups[0].models.length, 8); // 6 virtual + 2 ready

  await runCli(
    [
      "init",
      "--providers",
      "freellmapi",
      "--url",
      `http://127.0.0.1:${port}`,
      "--key",
      "freellmapi-secret-1",
      "--no-default-model",
      "--yes",
    ],
    env
  );

  // Also add OpenCode free alongside FreeLLMAPI and ensure both coexist cleanly
  await runCli(
    [
      "init",
      "--providers",
      "opencode",
      "--tiers",
      "free",
      "--key",
      "oc_coexist_key",
      "--no-default-model",
      "--yes",
    ],
    env
  );

  const copJson = JSON.parse(fs.readFileSync(path.join(copilotHome, "providers.json"), "utf8"));
  assert.deepEqual(
    copJson.providers.map((p) => p.name),
    ["freellmapi", "opencode-free-go"]
  );
  assert.equal(copJson.models.length, 12); // 8 freellmapi + 4 opencode-free-go
  assert.ok(copJson.models.some((m) => m.name === "[FreeLLMAPI] Llama 3.3 70B"));

  const vscJson = JSON.parse(fs.readFileSync(path.join(vscodeUser, "chatLanguageModels.json"), "utf8"));
  assert.deepEqual(
    vscJson.map((b) => b.name),
    [
      "+++++++ CONFIGURACAO FREELLMAPI +++++++",
      "FreeLLMAPI",
      "+++++++ CONFIGURACAO OPENCODE +++++++",
      "OpenCode Free",
    ]
  );
});

test("freellmapiProvider falls back cleanly to 6 built-in virtual models when offline", async () => {
  const resolved = await freellmapiProvider.resolve({
    baseUrl: "http://127.0.0.1:1/v1",
    apiKey: "freellmapi-offline",
    live: true,
    fetchImpl: async () => {
      throw new Error("ECONNREFUSED");
    },
  });
  assert.equal(resolved.source, "virtual-fallback");
  assert.equal(resolved.groups[0].models.length, 6);
});
