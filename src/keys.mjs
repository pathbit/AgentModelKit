import path from "node:path";
import { getKeyFilePath } from "./utils/paths.mjs";
import { commitWrites, readSnapshot } from "./utils/json.mjs";
import { promptText } from "./ui/prompts.mjs";

function readKeyFile(filePath, required) {
  const snapshot = readSnapshot(filePath);
  if (snapshot.content === null && !required) return null;
  const key = snapshot.content?.toString("utf8").trim();
  if (!key) throw new Error(`Chave ausente ou vazia em ${filePath}`);
  return key;
}

export function planKeyFile(filePath, value) {
  const snapshot = readSnapshot(filePath);
  const next = Buffer.from(`${value.trim()}\n`);
  return {
    ...snapshot,
    next,
    mode: 0o600,
    changed: !snapshot.content?.equals(next) || (process.platform !== "win32" && snapshot.mode !== 0o600),
  };
}

export async function resolveProviderApiKey(provider, opts = {}, env = process.env) {
  const savedPath = path.resolve(getKeyFilePath(provider.keyFile, env));
  let apiKey = opts.key?.trim();
  let source = "cli-flag";
  if (!apiKey && opts.keyFile) {
    apiKey = readKeyFile(path.resolve(opts.keyFile), true);
    source = "arquivo informado";
  }
  if (!apiKey && env[provider.envVar]?.trim()) {
    apiKey = env[provider.envVar].trim();
    source = `env:${provider.envVar}`;
  }
  if (!apiKey) {
    apiKey = readKeyFile(savedPath, false);
    source = "chave salva";
  }
  if (!apiKey && !opts.nonInteractive && !opts.optional) {
    apiKey = await promptText(`[${provider.id}] API key: `, "", { secret: true });
    source = "prompt";
  }
  if (!apiKey) {
    if (opts.optional) return { apiKey: null, write: null };
    throw new Error(`API key ausente para '${provider.id}'. Use --key-file, ${provider.envVar} ou --key.`);
  }
  if (/[\r\n\0]/.test(apiKey)) throw new Error(`API key invalida para '${provider.id}'.`);
  const write = opts.noSaveKey ? null : planKeyFile(savedPath, apiKey);
  if (write && !opts.deferWrite) commitWrites([write]);
  return { apiKey, source, keyFilePath: savedPath, write, savedTo: write?.changed ? savedPath : null };
}

export function readSavedKey(providerId, env = process.env) {
  if (!/^[a-z][a-z0-9-]*$/.test(providerId ?? "")) {
    throw new Error("Informe o nome do provider. Ex: agentmodelkit key opencode");
  }
  return readKeyFile(getKeyFilePath(`${providerId}.key`, env), true);
}
