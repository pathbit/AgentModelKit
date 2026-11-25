import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadCatalog, loadCuration } from "../catalogs/index.mjs";
import { fetchModelRows } from "../catalogs/opencode.mjs";
import { parseEndpoint } from "./custom.mjs";

const DEFAULT_SERVER_PORT = 3001;
const DEFAULT_DESKTOP_PORT = 31415;
const DEFAULT_SERVER_URL = `http://localhost:${DEFAULT_SERVER_PORT}/v1`;
const DEFAULT_DESKTOP_URL = `http://127.0.0.1:${DEFAULT_DESKTOP_PORT}/v1`;

function validatePort(port) {
  const num = Number(port);
  if (!Number.isInteger(num) || num < 1 || num > 65535) {
    throw new Error(`Porta invalida para FreeLLMAPI: '${port}'. Use um numero entre 1 e 65535.`);
  }
  return num;
}

/**
 * Normalize a FreeLLMAPI URL, `host:port`, `:port`, or bare port number so it ends with `/v1`.
 */
export function normalizeFreeLLMBaseUrl(rawInput, defaultHost = "localhost") {
  const raw = String(rawInput || "").trim();
  if (!raw) return DEFAULT_SERVER_URL;

  if (/^:?\d+$/.test(raw)) {
    const port = validatePort(raw.replace(/^:/, ""));
    return `http://${defaultHost}:${port}/v1`;
  }

  const withScheme = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
  const trimmed = parseEndpoint(withScheme);

  for (const suffix of ["/chat/completions", "/responses", "/messages"]) {
    if (trimmed.endsWith(suffix)) {
      const stripped = trimmed.slice(0, -suffix.length);
      return stripped.endsWith("/v1") ? stripped : `${stripped}/v1`;
    }
  }
  return trimmed.endsWith("/v1") ? trimmed : `${trimmed}/v1`;
}

/**
 * Resolve the FreeLLMAPI Desktop App runtime `config.json` path across OSes.
 */
export function getFreeLLMDesktopConfigPath(
  platform = process.platform,
  env = process.env,
  homeDir = os.homedir()
) {
  if (env.FREELLMAPI_CONFIG_PATH?.trim()) {
    return env.FREELLMAPI_CONFIG_PATH.trim();
  }
  if (platform === "darwin") {
    return path.join(homeDir, "Library", "Application Support", "FreeLLMAPI", "config.json");
  }
  if (platform === "win32") {
    return path.join(env.APPDATA || path.join(homeDir, "AppData", "Roaming"), "FreeLLMAPI", "config.json");
  }
  return path.join(env.XDG_CONFIG_HOME || path.join(homeDir, ".config"), "FreeLLMAPI", "config.json");
}

/**
 * Read the dynamic listening port recorded by the FreeLLMAPI Desktop app (`listenWithScan`).
 */
export function readFreeLLMDesktopPort({
  platform = process.platform,
  env = process.env,
  homeDir = os.homedir(),
  fsImpl = fs,
} = {}) {
  try {
    const cfgPath = getFreeLLMDesktopConfigPath(platform, env, homeDir);
    if (!fsImpl.existsSync(cfgPath)) return null;
    const cfg = JSON.parse(fsImpl.readFileSync(cfgPath, "utf8"));
    const port = Number(cfg?.port);
    return Number.isInteger(port) && port >= 1 && port <= 65535 ? port : null;
  } catch {
    return null;
  }
}

async function probeCandidate(baseUrl, fetchImpl) {
  try {
    const res = await fetchImpl(`${baseUrl}/models`, { signal: AbortSignal.timeout(600), redirect: "error" });
    await res.body?.cancel();
    return res.status === 200 || res.status === 401 || res.status === 403;
  } catch {
    return false;
  }
}

/**
 * Dynamically resolve FreeLLMAPI base URL from explicit `--port`/`FREELLMAPI_PORT`,
 * `FREELLMAPI_URL`, Desktop App `config.json`, or probing running local ports.
 */
export async function detectFreeLLMApiBaseUrl(options = {}) {
  const isFn = typeof options === "function";
  const {
    fetchImpl = isFn ? options : globalThis.fetch,
    port,
    env = process.env,
    platform = process.platform,
    homeDir = os.homedir(),
    fsImpl = fs,
  } = isFn ? {} : options;

  const explicitPort = port ?? env.FREELLMAPI_PORT?.trim();
  if (explicitPort) {
    const validPort = validatePort(explicitPort);
    const localCandidates = [
      `http://127.0.0.1:${validPort}/v1`,
      `http://localhost:${validPort}/v1`,
    ];
    if (fetchImpl) {
      for (const c of localCandidates) {
        if (await probeCandidate(c, fetchImpl)) return c;
      }
    }
    return `http://localhost:${validPort}/v1`;
  }

  const envUrl = env.FREELLMAPI_URL?.trim() || env.FREELLMAPI_BASE_URL?.trim();
  if (envUrl) {
    return normalizeFreeLLMBaseUrl(envUrl);
  }

  const desktopPort = readFreeLLMDesktopPort({ platform, env, homeDir, fsImpl });
  const candidates = [];
  if (desktopPort) {
    candidates.push(`http://127.0.0.1:${desktopPort}/v1`);
  }
  candidates.push(DEFAULT_DESKTOP_URL, DEFAULT_SERVER_URL);
  const uniqueCandidates = [...new Set(candidates)];

  if (fetchImpl) {
    for (const candidate of uniqueCandidates) {
      if (await probeCandidate(candidate, fetchImpl)) {
        return candidate;
      }
    }
  }

  return desktopPort ? `http://127.0.0.1:${desktopPort}/v1` : DEFAULT_SERVER_URL;
}

/**
 * Validate FreeLLMAPI catalog mode (`auto`, `strategies`, or `ready`).
 */
export function normalizeFreeLLMMode(rawMode) {
  const mode = String(rawMode || "auto").trim().toLowerCase();
  if (!["auto", "strategies", "ready"].includes(mode)) {
    throw new Error(`Modo invalido para FreeLLMAPI: '${rawMode}'. Use: auto, strategies ou ready.`);
  }
  return mode;
}

/**
 * Fetch ready models from a live FreeLLMAPI `/v1/models?execution_status=ready` endpoint.
 */
export async function fetchFreeLLMApiModels(baseUrl, apiKey, fetchImpl = globalThis.fetch) {
  const rows = await fetchModelRows(`${baseUrl}/models?execution_status=ready`, { apiKey, fetchImpl });
  const virtualIds = new Set(loadCatalog("freellmapi-catalog.json").strategies.map(({ id }) => id));
  const discovered = [];
  for (const m of rows) {
    if (!m?.id || virtualIds.has(m.id)) continue;
    if (m.execution_status && m.execution_status !== "ready") continue;
    const type = m.type || "chat";
    if (type !== "chat") continue;

    discovered.push({
      id: m.id,
      name: m.name || m.id,
      toolCalling: m.supports_tools !== false,
      vision: Boolean(m.supports_vision || m.vision),
      reasoningEffort: m.supports_reasoning ? "high" : null,
      tier: "efficiency",
      maxInputTokens: m.context_window || m.max_prompt_tokens || 128000,
      maxOutputTokens: m.max_output_tokens || 16384,
    });
  }
  return discovered;
}

export const freellmapiProvider = {
  id: "freellmapi",
  label: "FreeLLMAPI",
  description: "Roteador do FreeLLMAPI com URL dinamica e descoberta de modelos prontos",
  availableTiers: ["free"],
  defaultTiers: ["free"],
  availableModes: ["auto", "strategies", "ready"],
  keyFile: "freellmapi.key",
  envVar: "FREELLMAPI_API_KEY",
  keyPlaceholder: "freellmapi-...",
  requiresKey: true,
  defaultUrls: {
    server: DEFAULT_SERVER_URL,
    desktop: DEFAULT_DESKTOP_URL,
  },

  async resolve({
    baseUrl,
    port,
    apiKey,
    live = false,
    mode,
    powerful = false,
    fetchImpl = globalThis.fetch,
    env = process.env,
    platform = process.platform,
    homeDir = os.homedir(),
    fsImpl = fs,
    secretInputId = "chat.lm.secret.freellmapi",
  } = {}) {
    const resolvedMode = normalizeFreeLLMMode(mode ?? (live ? "ready" : "auto"));
    const resolvedBaseUrl = baseUrl
      ? normalizeFreeLLMBaseUrl(baseUrl)
      : await detectFreeLLMApiBaseUrl({ fetchImpl, port, env, platform, homeDir, fsImpl });

    const catalog = loadCatalog("freellmapi-catalog.json", env);
    const curated = new Set(loadCuration().freellmapi);
    let models = powerful ? catalog.strategies.filter(({ id }) => curated.has(id)) :
      resolvedMode === "auto" ? catalog.strategies.filter(({ id }) => id === catalog.router) : [...catalog.strategies];
    let source = powerful ? "curadoria" : `router-${resolvedMode}`;

    if (resolvedMode === "ready" && !powerful) {
      const ready = await fetchFreeLLMApiModels(resolvedBaseUrl, apiKey, fetchImpl);
      models = [...models, ...ready];
      source = `live:${ready.length}-ready`;
    }

    return {
      providerId: "freellmapi",
      source,
      groups: [
        {
          id: "freellmapi",
          apiType: "chat-completions",
          label: "FreeLLMAPI",
          prefix: "[FreeLLMAPI]",
          baseUrl: resolvedBaseUrl,
          copilotHeaders: null,
          vscodeHeaders: null,
          vscodeSecretId: secretInputId,
          models,
        },
      ],
    };
  },
};
