#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const REQUIRED_PATHS = [
  ".vscode",
  ".vscode/settings.json",
  ".vscode/extensions.json",
  ".vscode/.gitignore",
  ".gitattributes",
  ".gitignore",
  ".editorconfig",
  ".env.example",
  ".npmrc",
  ".github/ISSUE_TEMPLATE/bug_report.yml",
  ".github/ISSUE_TEMPLATE/feature_request.yml",
  ".github/ISSUE_TEMPLATE/config.yml",
  ".github/PULL_REQUEST_TEMPLATE.md",
  ".github/workflows/ci.yml",
  "bin/agentmodelkit.mjs",
  "bin/README.md",
  "src",
  "src/README.md",
  "src/ui/prompts.mjs",
  "docs",
  "docs/README.md",
  "tests",
  "tests/README.md",
  "data/opencode-catalog.json",
  "data/README.md",
  "examples",
  "examples/README.md",
  "examples/opencode.freellmapi.json",
  "README.md",
  "README.en.md",
  "CONTRIBUTING.md",
  "CHANGELOG.md",
  "LICENSE",
  "package.json",
];

for (const rel of REQUIRED_PATHS) {
  const full = path.join(root, rel);
  assert.ok(fs.existsSync(full), `Arquivo ou diretorio obrigatorio ausente: ${rel}`);
}

const JSON_FILES = [
  "package.json",
  ".vscode/settings.json",
  ".vscode/extensions.json",
  "data/opencode-catalog.json",
  "examples/vscode.chatLanguageModels.free.json",
  "examples/copilot.providers.free.json",
  "examples/opencode.freellmapi.json",
];

for (const rel of JSON_FILES) {
  const full = path.join(root, rel);
  const raw = fs.readFileSync(full, "utf8");
  JSON.parse(raw);
}

const vsSample = JSON.parse(
  fs.readFileSync(path.join(root, "examples/vscode.chatLanguageModels.free.json"), "utf8")
);
const validVendors = new Set([
  "agent-host-claude",
  "agent-host-codex",
  "agent-host-copilotcli",
  "anthropic",
  "azure",
  "cloud-sandbox",
  "copilot",
  "customendpoint",
  "gemini",
  "ollama",
  "openai",
  "openrouter",
  "xai",
]);
for (const block of vsSample) {
  assert.ok(validVendors.has(block.vendor), `Vendor invalido em example VS Code: ${block.vendor}`);
}

const MD_FILES = [
  "README.md",
  "README.en.md",
  "CONTRIBUTING.md",
  "CHANGELOG.md",
  "bin/README.md",
  "src/README.md",
  "data/README.md",
  "tests/README.md",
  "examples/README.md",
  ...fs.readdirSync(path.join(root, "docs"))
    .filter((f) => f.endsWith(".md"))
    .map((f) => path.join("docs", f)),
];

let checkedLinks = 0;
for (const rel of MD_FILES) {
  const filePath = path.join(root, rel);
  const raw = fs.readFileSync(filePath, "utf8").replace(/```[\s\S]*?```/g, "");
  for (const match of raw.matchAll(/\[[^\]]+\]\(([^)\s]+)\)/g)) {
    const target = match[1];
    if (/^(https?:|mailto:|#)/.test(target)) continue;
    const cleanTarget = target.split("#")[0];
    if (!cleanTarget) continue;
    const resolved = path.resolve(path.dirname(filePath), cleanTarget);
    assert.ok(fs.existsSync(resolved), `Link quebrado em ${rel}: ${target}`);
    checkedLinks++;
  }
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
assert.equal(pkg.type, "module");
assert.ok(pkg.bin?.agentmodelkit, "package.json deve declarar bin.agentmodelkit");

console.log(
  `check OK: ${REQUIRED_PATHS.length} itens obrigatorios, ${JSON_FILES.length} JSONs e ${checkedLinks} links Markdown validados.`
);
