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
    "src/agentmodelkit.mjs",
    "src/cli.mjs",
    "src/ui/prompts.mjs",
    "docs/README.md",
    "tests/cli.test.mjs",
    "tests/prompts.test.mjs",
    "examples/README.md",
    "examples/opencode.freellmapi.json",
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
  assert.equal(fs.existsSync(path.join(root, "bin")), false);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
  assert.deepEqual(manifest.bin, {
    agentmodelkit: "./src/agentmodelkit.mjs",
    amk: "./src/agentmodelkit.mjs",
  });
});

test("examples never use invalid VS Code vendor 'comentario'", () => {
  const vscExample = fs.readFileSync(
    path.join(root, "examples/vscode.chatLanguageModels.free.json"),
    "utf8"
  );
  assert.equal(vscExample.includes('"comentario"'), false);
  assert.equal(vscExample.includes('"customendpoint"'), true);
});

test("repository contains no committed .key, .bak, or .env secret files", () => {
  const forbidden = [".env", "opencode.key", "freellmapi.key", "providers.json", "chatLanguageModels.json"];
  for (const name of forbidden) {
    assert.equal(
      fs.existsSync(path.join(root, name)),
      false,
      `Sensitive/generated file must not live at repo root: ${name}`
    );
  }
});
