import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

import {
  getCopilotDir,
  getCopilotProvidersPath,
  getKeyFilePath,
  getVSCodeChatModelsPath,
  getVSCodeUserDir,
} from "../src/utils/paths.mjs";
import { readSavedKey, resolveProviderApiKey } from "../src/keys.mjs";
import { normalizeOpenCodeTiers, opencodeProvider } from "../src/providers/opencode.mjs";
import { filterResolvedProvidersByModelIds, parseCliArgs, runCli } from "../src/cli.mjs";

function makeTempEnv() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "amk-cli-test-"));
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
  delete env.FREELLMAPI_PORT;
  delete env.FREELLMAPI_CONFIG_PATH;
  return { root, copilotHome, vscodeUser, env };
}

test("paths resolve cleanly across Windows, macOS, and Linux", () => {
  assert.equal(getCopilotDir({ COPILOT_HOME: "/tmp/custom-cop" }), "/tmp/custom-cop");
  assert.equal(
    getCopilotProvidersPath({ COPILOT_HOME: "/tmp/custom-cop" }),
    path.join("/tmp/custom-cop", "providers.json")
  );
  assert.equal(
    getCopilotProvidersPath({ COPILOT_PROVIDERS_CONFIG: "/tmp/override.json" }),
    "/tmp/override.json"
  );

  assert.equal(
    getVSCodeUserDir("darwin", {}, "/Users/dev"),
    path.join("/Users/dev", "Library", "Application Support", "Code", "User")
  );
  assert.equal(
    getVSCodeUserDir("win32", { APPDATA: "C:\\Users\\dev\\AppData\\Roaming" }, "C:\\Users\\dev"),
    path.join("C:\\Users\\dev\\AppData\\Roaming", "Code", "User")
  );
  assert.equal(
    getVSCodeUserDir("linux", { XDG_CONFIG_HOME: "/home/dev/.xdg" }, "/home/dev"),
    path.join("/home/dev/.xdg", "Code", "User")
  );
  assert.equal(
    getVSCodeChatModelsPath("linux", { VSCODE_USER_DIR: "/custom/vsc" }, "/home/dev"),
    path.join("/custom/vsc", "chatLanguageModels.json")
  );
});

test("OpenCode generates paid catalog entries with model-specific protocol", async () => {
  assert.deepEqual(normalizeOpenCodeTiers(), ["payg"]);
  assert.deepEqual(normalizeOpenCodeTiers("go,free"), ["go", "free"]);
  assert.deepEqual(normalizeOpenCodeTiers("all"), ["go", "free", "payg"]);
  assert.throws(() => normalizeOpenCodeTiers("all,invalid"), /Tier invalido/);
  const all = await opencodeProvider.resolve({ tiers: "all" });
  assert.deepEqual(all.groups.map(({ id }) => id), ["opencode-go", "opencode-payg"]);
  assert.match(all.groups[0].copilotHeaders["x-opencode-session"], /^ses_[a-f0-9]{32}$/);
  assert.notEqual(all.groups[0].copilotHeaders["x-opencode-session"], all.groups[0].vscodeHeaders["x-opencode-session"]);
  assert.equal(all.groups[1].copilotHeaders, null);
  assert.ok(all.groups[1].models.some((model) => model.apiType === "responses"));
  assert.ok(all.groups[1].models.some((model) => model.apiType === "messages"));
});

test("resolveProviderApiKey persists 0600 .key file and readSavedKey reads it back", async (t) => {
  const { root, env } = makeTempEnv();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const resolved = await resolveProviderApiKey(
    opencodeProvider,
    { key: "oc_sk_example_123", nonInteractive: true },
    env
  );
  assert.equal(resolved.apiKey, "oc_sk_example_123");
  assert.equal(resolved.source, "cli-flag");

  const keyPath = getKeyFilePath("opencode.key", env);
  assert.equal(fs.existsSync(keyPath), true);
  if (process.platform !== "win32") {
    assert.equal(fs.statSync(keyPath).mode & 0o777, 0o600);
  }
  assert.equal(readSavedKey("opencode", env), "oc_sk_example_123");
  assert.throws(() => readSavedKey("", env), /Informe o nome do provider/);
});

test("generated clients use correct protocols and preserve user settings", async (t) => {
  const { root, vscodeUser, copilotHome, env } = makeTempEnv();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const vsFile = path.join(vscodeUser, "chatLanguageModels.json");
  const cpFile = path.join(copilotHome, "providers.json");
  const key = "fixture";
  const ollama = { name: "Local Ollama", vendor: "customendpoint", models: [] };
  const previousCopilot = { customProperty: ["keep"], providers: [{ name: "manual" }], models: [{ provider: "manual", id: "x" }] };
  fs.mkdirSync(vscodeUser);
  fs.mkdirSync(copilotHome);
  fs.writeFileSync(vsFile, JSON.stringify([ollama]));
  fs.writeFileSync(cpFile, JSON.stringify(previousCopilot));
  await runCli(["init", "-p", "opencode", "--tiers", "payg", "--powerful", "--key", key, "--yes"], env);
  const vscode = JSON.parse(fs.readFileSync(vsFile, "utf8"));
  const copilot = JSON.parse(fs.readFileSync(cpFile, "utf8"));
  assert.deepEqual(vscode[0], ollama);
  assert.deepEqual(copilot.customProperty, previousCopilot.customProperty);
  assert.deepEqual(copilot.models[0], previousCopilot.models[0]);
  const open = vscode[1];
  assert.equal(open.vendor, "customendpoint");
  assert.match(open.apiKey, /^\$\{input:/);
  const gpt = open.models.find((model) => model.id === "gpt-6.2-astra");
  assert.match(gpt.url, /\/openai\/v1\/responses$/);
  assert.equal(gpt.statefulResponses, false);
  const anthropic = copilot.providers.find((provider) => provider.type === "anthropic");
  assert.match(anthropic.baseUrl, /\/inference\/anthropic$/);
  assert.equal(anthropic.apiKey, key);
  assert.equal(anthropic.apiKeyCommand, undefined);
  assert.deepEqual(JSON.parse(fs.readFileSync(vsFile + ".bak")), [ollama]);
  assert.deepEqual(JSON.parse(fs.readFileSync(cpFile + ".bak")), previousCopilot);
});

test("model filters match exact IDs and reject unknown selections", async (t) => {
  const { root, copilotHome, env } = makeTempEnv();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const all = [await opencodeProvider.resolve({ tiers: "all" })];
  const justGo = filterResolvedProvidersByModelIds(all, "opencode-go/glm-5.3");
  assert.deepEqual(justGo[0].groups.map(({ id, models }) => [id, models[0].id]), [["opencode-go", "glm-5.3"]]);
  assert.throws(() => filterResolvedProvidersByModelIds(all, "glm-5.3,does-not-exist"), /does-not-exist/);
  await runCli(["copilot", "-p", "opencode", "--tiers", "go", "--models", "glm-5.3,kimi-k3", "-k", "fixture", "--yes"], env);
  const config = JSON.parse(fs.readFileSync(path.join(copilotHome, "providers.json"), "utf8"));
  assert.deepEqual(config.models.map(({ id }) => id), ["glm-5.3", "kimi-k3"]);
});

test("parseCliArgs and runCli configure targets non-interactively and support --dry-run", async (t) => {
  const { root, vscodeUser, copilotHome, env } = makeTempEnv();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const parsed = parseCliArgs([
    "copilot",
    "-p",
    "opencode,freellmapi",
    "--tiers",
    "free",
    "--port",
    "31416",
    "--freellmapi-mode",
    "auto",
    "--models",
    "hungerg-free,auto",
    "--dry-run",
  ]);
  assert.equal(parsed.command, "copilot");
  assert.equal(parsed.targets, "copilot-cli");
  assert.equal(parsed.port, "31416");
  assert.equal(parsed.freellmapiMode, "auto");
  assert.equal(parsed.models, "hungerg-free,auto");
  assert.equal(parsed.dryRun, true);
  assert.throws(() => parseCliArgs(["--unknown-flag"]), /Opcao desconhecida/);

  const dryResults = await runCli(
    ["init", "-p", "opencode", "--tiers", "payg", "-t", "all", "-k", "oc_dry", "--dry-run", "--yes"],
    env
  );
  assert.equal(dryResults.length, 2);
  assert.equal(dryResults[0].dryRun, true);
  assert.equal(fs.existsSync(path.join(vscodeUser, "chatLanguageModels.json")), false);
  assert.equal(fs.existsSync(path.join(copilotHome, "opencode.key")), false);

  await runCli(
    ["init", "-p", "opencode", "--tiers", "payg", "-t", "all", "-k", "oc_real_123", "--no-default-model", "--yes"],
    env
  );
  assert.equal(fs.existsSync(path.join(vscodeUser, "chatLanguageModels.json")), true);
  assert.equal(fs.existsSync(path.join(copilotHome, "providers.json")), true);
  assert.equal(readSavedKey("opencode", env), "oc_real_123");

  const cliOutput = execFileSync(process.execPath, ["bin/agentmodelkit.mjs", "list"], {
    encoding: "utf8",
    env,
  });
  assert.match(cliOutput, /opencode/);
  assert.match(cliOutput, /freellmapi/);

  const doctorOutput = execFileSync(process.execPath, ["bin/agentmodelkit.mjs", "doctor"], {
    encoding: "utf8",
    env,
  });
  assert.match(doctorOutput, /AgentModelKit Doctor/);
  assert.match(doctorOutput, /FreeLLMAPI URL detectada/);
  assert.match(doctorOutput, /opencode.*OK/);
});
