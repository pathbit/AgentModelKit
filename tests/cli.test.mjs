import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync, execSync } from "node:child_process";

import {
  getCopilotDir,
  getCopilotProvidersPath,
  getKeyFilePath,
  getVSCodeChatModelsPath,
  getVSCodeUserDir,
} from "../src/utils/paths.mjs";
import { buildCrossPlatformKeyCommand } from "../src/utils/json.mjs";
import { readSavedKey, resolveProviderApiKey } from "../src/keys.mjs";
import { normalizeOpenCodeTiers, opencodeProvider } from "../src/providers/opencode.mjs";
import { vscodeTarget } from "../src/targets/vscode.mjs";
import { copilotCliTarget } from "../src/targets/copilot-cli.mjs";
import { parseCliArgs, runCli } from "../src/cli.mjs";

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

test("buildCrossPlatformKeyCommand avoids shell wrappers and reads COPILOT_HOME key file", (t) => {
  const { root, copilotHome, env } = makeTempEnv();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const cmd = buildCrossPlatformKeyCommand("opencode.key");
  assert.doesNotMatch(cmd, /[$%`]/);
  assert.doesNotMatch(cmd, /sh -c/i);
  assert.throws(() => buildCrossPlatformKeyCommand("../secret.key"), /Invalid key file name/);

  fs.mkdirSync(copilotHome, { recursive: true });
  fs.writeFileSync(path.join(copilotHome, "opencode.key"), "oc_test_cross_platform\n", "utf8");

  const output = execSync(cmd, { encoding: "utf8", env });
  assert.equal(output, "oc_test_cross_platform");
});

test("normalizeOpenCodeTiers and opencodeProvider separate free, go, and payg accurately", async () => {
  assert.deepEqual(normalizeOpenCodeTiers(), ["free"]);
  assert.deepEqual(normalizeOpenCodeTiers("go,free"), ["go", "free"]);
  assert.deepEqual(normalizeOpenCodeTiers("all"), ["go", "free", "payg"]);
  assert.throws(() => normalizeOpenCodeTiers("invalid"), /Tier invalido/);

  const freeOnly = await opencodeProvider.resolve({ tiers: "free" });
  assert.equal(freeOnly.groups.length, 1);
  assert.equal(freeOnly.groups[0].id, "opencode-free-go");
  assert.equal(freeOnly.groups[0].models.length, 4);
  assert.equal(freeOnly.defaultModel, "opencode-free-go/hungerg-free");
  assert.equal(freeOnly.groups[0].copilotHeaders["x-opencode-session"], "copilot-cli");

  const allTiers = await opencodeProvider.resolve({ tiers: "all" });
  assert.equal(allTiers.groups.length, 3);
  const counts = Object.fromEntries(allTiers.groups.map((g) => [g.id, g.models.length]));
  assert.deepEqual(counts, {
    "opencode-go": 22,
    "opencode-free-go": 4,
    "opencode-payg": 45,
  });
  assert.equal(allTiers.defaultModel, "opencode-go/claude-haiku-5-5");

  const paygGroup = allTiers.groups.find((g) => g.id === "opencode-payg");
  assert.equal(paygGroup.baseUrl, "https://opencode.ai/inference/openai/v1");
  assert.equal(paygGroup.copilotHeaders, null);
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

test("targets perform idempotent tier downgrade while preserving unrelated providers and backups", async (t) => {
  const { root, vscodeUser, copilotHome, env } = makeTempEnv();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const vscodePath = path.join(vscodeUser, "chatLanguageModels.json");
  const copilotPath = path.join(copilotHome, "providers.json");

  fs.mkdirSync(vscodeUser, { recursive: true });
  fs.mkdirSync(copilotHome, { recursive: true });

  fs.writeFileSync(
    vscodePath,
    JSON.stringify([{ name: "Custom Local Ollama", vendor: "customendpoint", models: [] }]),
    "utf8"
  );
  fs.writeFileSync(
    copilotPath,
    JSON.stringify({
      providers: [{ name: "my-ollama", type: "openai", baseUrl: "http://localhost:11434/v1" }],
      models: [{ id: "qwen3", name: "Local Qwen3", provider: "my-ollama" }],
    }),
    "utf8"
  );

  const allOpenCode = await opencodeProvider.resolve({ tiers: "all" });
  const vscAll = vscodeTarget.apply([allOpenCode], {}, env);
  const copAll = copilotCliTarget.apply([allOpenCode], { noDefaultModel: true }, env);

  assert.equal(vscAll.modelCount, 71);
  assert.equal(copAll.modelCount, 71);
  assert.ok(fs.existsSync(`${vscodePath}.bak`));
  assert.ok(fs.existsSync(`${copilotPath}.bak`));

  // Downgrade from `all` to `free` should remove opencode-go and opencode-payg cleanly
  const freeOpenCode = await opencodeProvider.resolve({ tiers: "free" });
  vscodeTarget.apply([freeOpenCode], {}, env);
  copilotCliTarget.apply([freeOpenCode], { noDefaultModel: true }, env);

  const vscAfter = JSON.parse(fs.readFileSync(vscodePath, "utf8"));
  const vscNames = vscAfter.map((b) => b.name);
  assert.ok(vscNames.includes("Custom Local Ollama"));
  assert.ok(vscNames.includes("+++++++ CONFIGURACAO OPENCODE +++++++"));
  assert.ok(vscNames.includes("OpenCode Free"));
  assert.equal(vscNames.includes("OpenCode Go"), false);
  assert.equal(vscNames.includes("OpenCode PAYG"), false);

  const copAfter = JSON.parse(fs.readFileSync(copilotPath, "utf8"));
  const copProvNames = copAfter.providers.map((p) => p.name);
  assert.deepEqual(copProvNames, ["my-ollama", "opencode-free-go"]);
  assert.equal(copAfter.models.length, 5); // 1 my-ollama + 4 opencode-free-go
  assert.ok(copAfter.models.some((m) => m.name.startsWith("[OpenCode Free] ")));
});

test("parseCliArgs and runCli configure targets non-interactively and support --dry-run", async (t) => {
  const { root, vscodeUser, copilotHome, env } = makeTempEnv();
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));

  const parsed = parseCliArgs(["copilot", "-p", "opencode", "--tiers", "free", "--dry-run"]);
  assert.equal(parsed.command, "copilot");
  assert.equal(parsed.targets, "copilot-cli");
  assert.equal(parsed.dryRun, true);
  assert.throws(() => parseCliArgs(["--unknown-flag"]), /Opcao desconhecida/);

  const dryResults = await runCli(
    ["init", "-p", "opencode", "--tiers", "free", "-t", "all", "-k", "oc_dry", "--dry-run", "--yes"],
    env
  );
  assert.equal(dryResults.length, 2);
  assert.equal(dryResults[0].dryRun, true);
  assert.equal(fs.existsSync(path.join(vscodeUser, "chatLanguageModels.json")), false);
  assert.equal(fs.existsSync(path.join(copilotHome, "opencode.key")), false);

  await runCli(
    ["init", "-p", "opencode", "--tiers", "free", "-t", "all", "-k", "oc_real_123", "--no-default-model", "--yes"],
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
  assert.match(doctorOutput, /opencode.*OK/);
});
