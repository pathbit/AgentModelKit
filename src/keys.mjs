import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { getKeyFilePath } from "./utils/paths.mjs";

/**
 * Prompt the user on stdin/stdout for input.
 */
export function promptLine(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Resolve an API key for `providerId` using CLI flags, `<COPILOT_HOME>/<keyFile>`,
 * local `<keyFile>`, environment variable, or interactive prompt (saving `0600` by default).
 */
export async function resolveProviderApiKey(provider, opts = {}, env = process.env) {
  const keyFileName = provider.keyFile || `${provider.id}.key`;
  const targetKeyPath = opts.keyFile ? path.resolve(opts.keyFile) : getKeyFilePath(keyFileName, env);

  if (opts.key?.trim()) {
    const val = opts.key.trim();
    const shouldSave = !opts.noSaveKey;
    if (shouldSave) {
      saveKeyFile(targetKeyPath, val);
    }
    return {
      apiKey: val,
      source: "cli-flag",
      keyFilePath: targetKeyPath,
      savedTo: shouldSave ? targetKeyPath : null,
    };
  }

  const candidates = [
    opts.keyFile ? path.resolve(opts.keyFile) : null,
    getKeyFilePath(keyFileName, env),
    path.resolve(process.cwd(), keyFileName),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      const val = fs.readFileSync(candidate, "utf8").trim();
      if (val) {
        if (!opts.noSaveKey && candidate !== targetKeyPath && !fs.existsSync(targetKeyPath)) {
          saveKeyFile(targetKeyPath, val);
        }
        return { apiKey: val, source: candidate, keyFilePath: targetKeyPath };
      }
    }
  }

  const envName = provider.envVar || `${provider.id.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_API_KEY`;
  if (env[envName]?.trim()) {
    const val = env[envName].trim();
    if (!opts.noSaveKey && !fs.existsSync(targetKeyPath)) {
      saveKeyFile(targetKeyPath, val);
    }
    return { apiKey: val, source: `env:${envName}`, keyFilePath: targetKeyPath };
  }

  if (opts.nonInteractive) {
    throw new Error(
      `API key ausente para '${provider.id}'. Informe --key, --key-file, env ${envName} ou salve em ${targetKeyPath}.`
    );
  }

  const hint = provider.keyPlaceholder ? ` (${provider.keyPlaceholder})` : "";
  const entered = await promptLine(`[${provider.id}] Cole sua API key${hint} [sera salva em ${targetKeyPath}]: `);
  if (!entered) {
    throw new Error(`API key vazia para '${provider.id}'.`);
  }

  if (!opts.noSaveKey) {
    saveKeyFile(targetKeyPath, entered);
  }
  return { apiKey: entered, source: "prompt", keyFilePath: targetKeyPath, savedTo: opts.noSaveKey ? null : targetKeyPath };
}

/**
 * Save a single-line API key file with restrictive permissions (`0600`).
 */
export function saveKeyFile(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${value.trim()}\n`, { encoding: "utf8", mode: 0o600 });
}

/**
 * Print a provider's saved key to stdout (useful for `apiKeyCommand` integrations).
 */
export function readSavedKey(providerId, env = process.env) {
  const cleanId = (providerId || "").trim();
  if (!cleanId) {
    throw new Error("Informe o nome do provider. Ex: agentmodelkit key opencode");
  }
  const keyPath = getKeyFilePath(`${cleanId}.key`, env);
  if (!fs.existsSync(keyPath)) {
    throw new Error(`Chave nao encontrada em ${keyPath}`);
  }
  const value = fs.readFileSync(keyPath, "utf8").trim();
  if (!value) {
    throw new Error(`Arquivo de chave vazio: ${keyPath}`);
  }
  return value;
}
