const DEFAULT_SERVER_URL = "http://localhost:3001/v1";
const DEFAULT_DESKTOP_URL = "http://127.0.0.1:31415/v1";

const BUILTIN_VIRTUAL_MODELS = [
  {
    id: "auto",
    name: "Auto Router",
    toolCalling: true,
    vision: true,
    reasoningEffort: null,
    tier: "balance",
    maxInputTokens: 1048576,
    maxOutputTokens: 65536,
  },
  {
    id: "auto:smart",
    name: "Auto Smart",
    toolCalling: true,
    vision: true,
    reasoningEffort: "high",
    tier: "intelligence",
    maxInputTokens: 1048576,
    maxOutputTokens: 65536,
  },
  {
    id: "auto:fast",
    name: "Auto Fast",
    toolCalling: true,
    vision: true,
    reasoningEffort: null,
    tier: "efficiency",
    maxInputTokens: 1048576,
    maxOutputTokens: 65536,
  },
  {
    id: "auto:reliable",
    name: "Auto Reliable",
    toolCalling: true,
    vision: true,
    reasoningEffort: null,
    tier: "balance",
    maxInputTokens: 1048576,
    maxOutputTokens: 65536,
  },
  {
    id: "auto:balanced",
    name: "Auto Balanced",
    toolCalling: true,
    vision: true,
    reasoningEffort: null,
    tier: "balance",
    maxInputTokens: 1048576,
    maxOutputTokens: 65536,
  },
  {
    id: "fusion",
    name: "Fusion (Multi-Model)",
    toolCalling: true,
    vision: false,
    reasoningEffort: "high",
    tier: "intelligence",
    maxInputTokens: 1048576,
    maxOutputTokens: 65536,
  },
];

/**
 * Normalize a FreeLLMAPI base URL so it always ends cleanly with `/v1`.
 */
export function normalizeFreeLLMBaseUrl(rawUrl) {
  const trimmed = (rawUrl || DEFAULT_SERVER_URL).trim().replace(/\/+$/, "");
  if (trimmed.endsWith("/chat/completions")) {
    return trimmed.slice(0, -"/chat/completions".length);
  }
  if (trimmed.endsWith("/v1")) return trimmed;
  return `${trimmed}/v1`;
}

/**
 * Probe local FreeLLMAPI desktop (`31415`) and server (`3001`) ports.
 */
export async function detectFreeLLMApiBaseUrl(fetchImpl = globalThis.fetch) {
  if (!fetchImpl) return DEFAULT_SERVER_URL;
  for (const candidate of [DEFAULT_DESKTOP_URL, DEFAULT_SERVER_URL]) {
    try {
      const res = await fetchImpl(`${candidate}/models`, { signal: AbortSignal.timeout(700) });
      if (res.status === 200 || res.status === 401 || res.status === 403) {
        return candidate;
      }
    } catch {
      // Ignore unreachable candidate
    }
  }
  return DEFAULT_SERVER_URL;
}

/**
 * Fetch ready models from a live FreeLLMAPI `/v1/models?execution_status=ready` endpoint.
 */
export async function fetchFreeLLMApiModels(baseUrl, apiKey, fetchImpl = globalThis.fetch) {
  if (!fetchImpl) return [];
  const headers = apiKey ? { Authorization: `Bearer ${apiKey}` } : {};
  const res = await fetchImpl(`${baseUrl}/models?execution_status=ready`, {
    headers,
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  const payload = await res.json();
  const rows = Array.isArray(payload.data) ? payload.data : [];

  const virtualIds = new Set(BUILTIN_VIRTUAL_MODELS.map((m) => m.id));
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
  description: "FreeLLMAPI router local 100% gratis (Docker :3001 / Desktop :31415)",
  availableTiers: ["free"],
  defaultTiers: ["free"],
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
    apiKey,
    live = true,
    fetchImpl = globalThis.fetch,
    secretInputId = "chat.lm.secret.freellmapi",
  } = {}) {
    const resolvedBaseUrl = baseUrl
      ? normalizeFreeLLMBaseUrl(baseUrl)
      : await detectFreeLLMApiBaseUrl(fetchImpl);

    let models = [...BUILTIN_VIRTUAL_MODELS];
    let source = "virtual-builtin";

    if (live) {
      try {
        const readyModels = await fetchFreeLLMApiModels(resolvedBaseUrl, apiKey, fetchImpl);
        if (readyModels.length > 0) {
          models = [...models, ...readyModels];
          source = `live:${readyModels.length}-ready`;
        }
      } catch {
        source = "virtual-fallback";
      }
    }

    return {
      providerId: "freellmapi",
      separatorName: "+++++++ CONFIGURACAO FREELLMAPI +++++++",
      copilotRootComment: "+++++++ CONFIGURACAO FREELLMAPI +++++++",
      managedGroupIds: ["freellmapi"],
      managedVSCodeNames: ["+++++++ CONFIGURACAO FREELLMAPI +++++++", "FreeLLMAPI"],
      keyFile: "freellmapi.key",
      defaultModel: "freellmapi/auto",
      source,
      groups: [
        {
          id: "freellmapi",
          label: "FreeLLMAPI",
          prefix: "[FreeLLMAPI]",
          comment: "+++++++ FREELLMAPI (100% GRATIS LOCAL ROUTER) +++++++",
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
