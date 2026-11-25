import os from "node:os";
import path from "node:path";

/**
 * Resolve the Copilot CLI home directory (`COPILOT_HOME` or `~/.copilot`).
 */
export function getCopilotDir(env = process.env) {
  return env.COPILOT_HOME?.trim() || path.join(os.homedir(), ".copilot");
}

/**
 * Resolve the Copilot CLI `providers.json` file path.
 */
export function getCopilotProvidersPath(env = process.env) {
  return env.COPILOT_PROVIDERS_CONFIG?.trim() || path.join(getCopilotDir(env), "providers.json");
}

/**
 * Resolve the VS Code user configuration directory across Windows, macOS, and Linux.
 */
export function getVSCodeUserDir(platform = process.platform, env = process.env, homeDir = os.homedir()) {
  if (env.VSCODE_USER_DIR?.trim()) {
    return env.VSCODE_USER_DIR.trim();
  }
  switch (platform) {
    case "darwin":
      return path.join(homeDir, "Library", "Application Support", "Code", "User");
    case "win32":
      return path.join(env.APPDATA || path.join(homeDir, "AppData", "Roaming"), "Code", "User");
    default:
      return path.join(env.XDG_CONFIG_HOME || path.join(homeDir, ".config"), "Code", "User");
  }
}

/**
 * Resolve the VS Code `chatLanguageModels.json` path.
 */
export function getVSCodeChatModelsPath(platform = process.platform, env = process.env, homeDir = os.homedir()) {
  return path.join(getVSCodeUserDir(platform, env, homeDir), "chatLanguageModels.json");
}

/**
 * Resolve the path where a provider's key file is stored inside `COPILOT_HOME`.
 */
export function getKeyFilePath(keyFileName, env = process.env) {
  return path.join(getCopilotDir(env), keyFileName);
}
