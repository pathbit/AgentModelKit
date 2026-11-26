import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { releaseArchiveName } from "./publish-package.mjs";
import { stableVersion } from "./verify-npm-release.mjs";

const root = fs.mkdtempSync(path.join(os.tmpdir(), "amk-pack-"));
const npm = process.env.npm_execpath;
assert.ok(npm, "Run this test with npm run test:package.");
function run(args, options = {}) {
  return execFileSync(process.execPath, [npm, ...args], { encoding: "utf8", timeout: 60000, ...options });
}
function checkReleaseExamples(file, markdown, { name, version }) {
  const commands = [...markdown.matchAll(/(?:^[ \t]*|`)(npx|npm[ \t]+view)[ \t]+([^`\r\n]+)/gm)]
    .map(([, command, args]) => ({
      command,
      targets: args.trim().split(/\s+/).map(arg => arg.replace(/^(['"])(.*)\1$/, "$2")),
    }));
  const npxTargets = commands.filter(({ command }) => command === "npx").flatMap(({ targets }) => targets);
  const packagePrefix = `${name}@`;
  const pinned = commands.flatMap(({ targets }) => targets)
    .filter(target => target.startsWith(packagePrefix) && stableVersion.test(target.slice(packagePrefix.length)));
  assert.ok(npxTargets.includes(`${name}@latest`), `Missing @latest example in ${file}`);
  assert.ok(npxTargets.includes(`${name}@${version}`) && pinned.every(target => target === `${name}@${version}`),
    `The pinned npm example in ${file} must match ${name}@${version}`);
  const releasePrefix = "https://github.com/pathbit/AgentModelKit/releases/download/";
  const downloads = npxTargets.filter(target => target.startsWith(releasePrefix));
  const expected = `${releasePrefix}v${version}/${releaseArchiveName(version)}`;
  assert.ok(downloads.length > 0 && downloads.every(target => target === expected),
    `The GitHub Release example in ${file} must use ${expected}`);
}

try {
  const [pack] = JSON.parse(run(["pack", "--json", "--pack-destination", root]));
  const files = new Set(pack.files.map((file) => file.path));
  const publicationDocs = ["README", "docs/RELEASE"].flatMap(stem =>
    ["", ".en", ".es"].map(language => `${stem}${language}.md`));
  for (const file of publicationDocs) {
    assert.ok(files.has(file), `Missing ${file} in the tarball`);
    checkReleaseExamples(file, fs.readFileSync(file, "utf8"), pack);
  }
  for (const required of [
    "data/opencode-catalog.json", "data/freellmapi-catalog.json", "data/awesome-free-providers.json",
    "data/curation.json", "src/agentmodelkit.mjs", "examples/provider.local.example.json",
  ]) assert.ok(files.has(required), `Missing ${required} in the tarball`);
  for (const file of files) {
    if (!file.endsWith(".md")) continue;
    if (!/\.(en|es)\.md$/.test(file)) {
      for (const language of ["en", "es"]) {
        const translation = file.replace(/\.md$/, `.${language}.md`);
        assert.ok(files.has(translation), `Missing ${translation} in the tarball`);
      }
    }
    const markdown = fs.readFileSync(file, "utf8").replace(/```[\s\S]*?```/g, "");
    for (const [, link] of markdown.matchAll(/\[[^\]]+\]\(([^)\s]+)\)/g)) {
      if (/^(https?:|mailto:|#)/.test(link)) continue;
      const target = path.posix.join(path.posix.dirname(file), link.split("#")[0]).replace(/\/$/, "");
      assert.ok(files.has(target) || [...files].some((entry) => entry.startsWith(`${target}/`)),
        `Broken packaged link in ${file}: ${link}`);
    }
  }
  assert.ok(![...files].some((name) => /(?:\.bak|\.key|\.tmp|\.tgz)$|(?:^|\/)\.env|^(?:bin|tests)\//.test(name)));
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
  for (const variable of Object.keys(env)) {
    if (variable.toLowerCase() === "npm_config_package") delete env[variable];
  }
  const npmCommand = (command, ...args) => run(["exec", "--yes", "--offline", "--package", artifact, "--", command, ...args], { cwd, env });
  assert.match(npmCommand("agentmodelkit", "catalog", "list"), /FreeLLMAPI/);
  assert.match(npmCommand("amk", "--help"), /^AgentModelKit.*\n\nUsage: agentmodelkit/m);
  const inferred = run(["exec", "--yes", "--offline", "--", `file:../${pack.filename}`, "--help"], { cwd, env });
  assert.match(inferred, /Usage: agentmodelkit/);
  assert.equal(npmCommand("agentmodelkit", "--version").trim(), pack.version);
  assert.equal(npmCommand("amk", "-v").trim(), pack.version);
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
  const agentUrl = "https://llm.example.com/v1/t/EXAMPLE_TOKEN";
  const urlOutput = npmCommand("agentmodelkit", "--url", agentUrl);
  assert.match(urlOutput, /\[opencode\] updated/);
  assert.doesNotMatch(urlOutput, /EXAMPLE_TOKEN/);
  const openCodeFile = path.join(cwd, ".opencode", "opencode.json");
  const openCodeText = fs.readFileSync(openCodeFile, "utf8");
  const router = JSON.parse(openCodeText).providers["agentmodelkit-freellmapi"];
  assert.deepEqual(Object.keys(router.models), ["auto"]);
  assert.equal(router.settings.apiKey, undefined);
  assert.match(router.settings.baseURL, /^\{file:.*\}$/);
  assert.equal(fs.readFileSync(router.settings.baseURL.slice(6, -1), "utf8").trim(), agentUrl);
  assert.doesNotMatch(openCodeText, /EXAMPLE_TOKEN/);
  const fixtureKey = path.join(root, "package-test.key");
  fs.writeFileSync(fixtureKey, "package-fixture-key\n", { mode: 0o600 });
  const openCodeProviderOutput = npmCommand(
    "agentmodelkit", "opencode", "vscode", "copilot", "--tiers", "payg", "--key-file", fixtureKey, "--yes",
  );
  assert.match(openCodeProviderOutput, /\[vscode\] updated/);
  assert.match(openCodeProviderOutput, /\[copilot-cli\] updated/);
  assert.doesNotMatch(openCodeProviderOutput, /\[opencode\]/);
  const freeLLMProviderOutput = npmCommand(
    "agentmodelkit", "freellmapi", "copilot", "--connection", "local", "--url", "http://127.0.0.1:3001/v1",
    "--key-file", fixtureKey, "--yes",
  );
  assert.match(freeLLMProviderOutput, /\[copilot-cli\] updated/);
  assert.doesNotMatch(openCodeProviderOutput + freeLLMProviderOutput, /package-fixture-key/);
  assert.deepEqual(fs.readdirSync(cwd), [".opencode"]);
  if (process.env.AGENTMODELKIT_ARTIFACT_DIR) {
    const dir = path.resolve(process.env.AGENTMODELKIT_ARTIFACT_DIR);
    fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(artifact, path.join(dir, releaseArchiveName(pack.version)));
    fs.writeFileSync(path.join(dir, "integrity.txt"), pack.integrity + "\n");
  }
  console.log(`OK: offline npm exec of ${pack.filename} with an isolated cache, bundled data and no project installation.`);
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}
