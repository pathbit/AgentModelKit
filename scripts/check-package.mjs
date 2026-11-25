import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "amk-pack-"));
const npm = process.env.npm_execpath;
assert.ok(npm, "Run this test with npm run test:package.");
function run(args, options = {}) {
  return execFileSync(process.execPath, [npm, ...args], { encoding: "utf8", timeout: 60000, ...options });
}
try {
  const [pack] = JSON.parse(run(["pack", "--json", "--pack-destination", root]));
  const files = new Set(pack.files.map((file) => file.path));
  for (const required of [
    "data/opencode-catalog.json", "data/freellmapi-catalog.json", "data/awesome-free-providers.json",
    "data/curation.json", "bin/agentmodelkit.mjs", "examples/provider.local.example.json", "README.md",
  ]) assert.ok(files.has(required), `Missing ${required} in the tarball`);
  for (const file of files) {
    if (!file.endsWith(".md") || /\.(en|es)\.md$/.test(file)) continue;
    for (const language of ["en", "es"]) {
      const translation = file.replace(/\.md$/, `.${language}.md`);
      assert.ok(files.has(translation), `Missing ${translation} in the tarball`);
    }
  }
  assert.ok(![...files].some((name) => /(?:\.bak|\.key|\.tmp|\.tgz)$|(?:^|\/)\.env/.test(name)));
  const artifact = path.join(root, pack.filename);
  const cwd = path.join(root, "consumer");
  fs.mkdirSync(cwd);
  const manifest = path.join(root, "provider.json");
  fs.copyFileSync("examples/provider.local.example.json", manifest);
  const env = {
    ...process.env,
    COPILOT_HOME: path.join(root, "copilot"),
    COPILOT_PROVIDERS_CONFIG: path.join(root, "copilot", "providers.json"),
    VSCODE_USER_DIR: path.join(root, "vscode"),
    AGENTMODELKIT_CATALOG_DIR: path.join(root, "catalogs"),
    npm_config_cache: path.join(root, "npm-cache"),
  };
  const npmCommand = (command, ...args) => run(["exec", "--yes", "--offline", "--package", artifact, "--", command, ...args], { cwd, env });
  assert.match(npmCommand("agentmodelkit", "catalog", "list"), /FreeLLMAPI/);
  assert.match(npmCommand("amk", "--help"), /^AgentModelKit.*\n\nUsage: agentmodelkit/m);
  assert.match(npmCommand("agentmodelkit", "add", "--provider-file", manifest, "--targets", "all", "--dry-run"), /dry run/);
  assert.equal(fs.existsSync(env.COPILOT_HOME), false);
  assert.equal(fs.existsSync(env.VSCODE_USER_DIR), false);
  assert.deepEqual(fs.readdirSync(cwd), []);
  assert.match(npmCommand("agentmodelkit", "add", "--provider-file", manifest, "--yes"), /\[opencode\] updated/);
  assert.equal(fs.existsSync(env.COPILOT_HOME), false);
  assert.equal(fs.existsSync(env.VSCODE_USER_DIR), false);
  assert.match(npmCommand("agentmodelkit", "add", "--provider-file", manifest, "--targets", "all", "--yes"), /updated/);
  const config = JSON.parse(fs.readFileSync(env.COPILOT_PROVIDERS_CONFIG, "utf8"));
  assert.equal(config.models[0].id, "qwen3:8b");
  assert.equal(config.providers[0].apiKey, undefined);
  assert.deepEqual(fs.readdirSync(cwd), [".opencode"]);
  const project = JSON.parse(fs.readFileSync(path.join(cwd, ".opencode", "opencode.json"), "utf8"));
  assert.ok(project.providers["agentmodelkit-custom-ollama"].models["qwen3:8b"]);
  if (process.env.AGENTMODELKIT_ARTIFACT_DIR) {
    const dir = path.resolve(process.env.AGENTMODELKIT_ARTIFACT_DIR);
    fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(artifact, path.join(dir, pack.filename));
    fs.writeFileSync(path.join(dir, "integrity.txt"), pack.integrity + "\n");
  }
  console.log(`OK: offline npm exec of ${pack.filename} with an isolated cache, bundled data and no project installation.`);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
