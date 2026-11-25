import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("repository follows PathBit standard layout", () => {
  const expectedEntries = [
    ".vscode/settings.json",
    ".vscode/extensions.json",
    ".vscode/.gitignore",
    ".github/ISSUE_TEMPLATE/bug_report.yml",
    ".github/ISSUE_TEMPLATE/feature_request.yml",
    ".github/PULL_REQUEST_TEMPLATE.md",
    ".github/workflows/ci.yml",
    ".gitattributes",
    ".gitignore",
    ".editorconfig",
    ".env.example",
    ".npmrc",
    "bin/agentmodelkit.mjs",
    "src/cli.mjs",
    "docs/README.md",
    "tests/cli.test.mjs",
    "examples/README.md",
    "CHANGELOG.md",
    "CONTRIBUTING.md",
    "LICENSE",
    "README.md",
    "README.en.md",
    "package.json",
  ];

  for (const rel of expectedEntries) {
    assert.equal(fs.existsSync(path.join(root, rel)), true, `Missing baseline file: ${rel}`);
  }
});

test("repository contains no committed .key, .bak, or .env secret files", () => {
  const forbidden = [".env", "opencode.key", "freellmapi.key", "providers.json", "chatLanguageModels.json"];
  for (const name of forbidden) {
    assert.equal(fs.existsSync(path.join(root, name)), false, `Sensitive/generated file must not live at repo root: ${name}`);
  }
});
