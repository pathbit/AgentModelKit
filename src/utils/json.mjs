import fs from "node:fs";
import path from "node:path";

/**
 * Read and parse a JSON file if it exists, otherwise return `null`.
 */
export function readJsonOrNull(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf8").trim();
  if (!raw) return null;
  return JSON.parse(raw);
}

/**
 * Create a `.bak` backup copy when `filePath` already exists.
 */
export function backupFile(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const bakPath = `${filePath}.bak`;
  fs.copyFileSync(filePath, bakPath);
  return bakPath;
}

/**
 * Write JSON formatted with tabs, creating parent directories and `.bak` backup when present.
 */
export function writeJsonWithBackup(filePath, data, { mode } = {}) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const backupPath = backupFile(filePath);
  const content = JSON.stringify(data, null, "\t") + "\n";
  fs.writeFileSync(filePath, content, mode ? { encoding: "utf8", mode } : "utf8");
  return { backupPath };
}

/**
 * Build a cross-platform `apiKeyCommand` (works on Windows cmd.exe, macOS, and Linux)
 * that reads `<COPILOT_HOME>/<keyFileName>` without exposing `$`, `%`, or `sh -c`.
 */
export function buildCrossPlatformKeyCommand(keyFileName) {
  if (!/^[a-zA-Z0-9._-]+$/.test(keyFileName)) {
    throw new Error(`Invalid key file name: ${keyFileName}`);
  }
  return `node -e "const f=require('fs'),o=require('os'),p=require('path');process.stdout.write(f.readFileSync(p.join(process.env.COPILOT_HOME||p.join(o.homedir(),'.copilot'),'${keyFileName}'),'utf8').trim())"`;
}
