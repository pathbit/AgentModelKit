#!/usr/bin/env node
import { bundledDir, refreshCatalogs } from "../src/catalogs/index.mjs";

const [mode = "--dry-run", source = "all", ...extra] = process.argv.slice(2);
if (extra.length || !["--dry-run", "--write", "--check"].includes(mode)) {
  throw new Error("Uso: npm run catalog:update -- [--dry-run|--write|--check] [all|opencode|freellmapi]");
}

const results = await refreshCatalogs({ dir: bundledDir, source, dryRun: mode !== "--write" });
for (const result of results) {
  console.log(`${result.changed ? (mode === "--write" ? "Atualizado" : "Tem atualizacao") : "Atual"} ${result.path}`);
}
if (mode === "--check" && results.some(({ changed }) => changed)) process.exitCode = 1;
