export const OPEN_CODE_SOURCES = {
  go: "https://opencode.ai/inference/go/v1/models",
  console: "https://opencode.ai/inference/v1/models",
};

export const OPEN_CODE_GROUPS = [
  { id: "opencode-go", label: "OpenCode Go", tier: "go", channel: "go" },
  { id: "opencode-free-go", label: "OpenCode Free", tier: "free", channel: "go" },
  { id: "opencode-free-console", label: "OpenCode Free (Console)", tier: "free", channel: "console" },
  { id: "opencode-payg", label: "OpenCode PAYG", tier: "payg", channel: "console" },
];

const apiPaths = {
  "chat-completions": "openai/v1",
  responses: "openai/v1",
  messages: "anthropic/v1",
};

export function openCodeBaseUrl(channel, apiType) {
  return `https://opencode.ai/inference/${channel === "go" ? "go/" : ""}${apiPaths[apiType]}`;
}

export function modelRows(payload, source) {
  if (!Array.isArray(payload?.data) || payload.data.length === 0 ||
      payload.has_more || payload.next || payload.next_cursor ||
      payload.data.some((row) => typeof row?.id !== "string" || !row.id.trim()) ||
      new Set(payload.data.map((row) => row.id)).size !== payload.data.length) {
    throw new Error(`Lista de modelos ausente, incompleta ou invalida: ${source}`);
  }
  return payload.data;
}

export async function fetchModelRows(url, { apiKey, fetchImpl = globalThis.fetch } = {}) {
  const response = await fetchImpl(url, {
    signal: AbortSignal.timeout(12000),
    redirect: "error",
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} ao consultar ${new URL(url).host}`);
  return modelRows(await response.json(), url);
}

function normalizeModel(row, channel) {
  const native = [row.recommended_api, ...Object.keys(apiPaths)].find(
    (protocol) => Object.hasOwn(apiPaths, protocol) &&
      row.api?.[protocol]?.base_url === openCodeBaseUrl(channel, protocol)
  );
  if (row.type !== "chat" || !Object.keys(row.api ?? {}).length) return null;
  // OpenCode can translate chat requests when the native API is Gemini.
  const apiType = native ?? "chat-completions";
  const context = row.limit?.context;
  const maxOutputTokens = row.limit?.input === undefined && row.limit?.output >= context
    ? Math.floor(context / 4) : row.limit?.output;
  const maxInputTokens = row.limit?.input ?? context - maxOutputTokens;
  if (![maxInputTokens, maxOutputTokens].every((n) => Number.isSafeInteger(n) && n > 0)) return null;
  return {
    id: row.id,
    name: row.name || row.id,
    apiType,
    toolCalling: row.capabilities?.tools?.supported === true,
    vision: row.modalities?.input?.some((item) => item.startsWith("image/")) ?? false,
    reasoning: row.capabilities?.reasoning?.supported === true,
    reasoningEfforts: row.capabilities?.reasoning?.effort ?? [],
    maxInputTokens,
    maxOutputTokens,
  };
}

export async function fetchOpenCodeDirectory(fetchImpl = globalThis.fetch) {
  const [go, console] = await Promise.all(Object.values(OPEN_CODE_SOURCES).map(
    (url) => fetchModelRows(url, { fetchImpl })
  ));
  if (![go, console].every((rows) => rows.some((row) => row.type === "chat" &&
      Number.isFinite(row.cost?.text?.input?.price) && Number.isFinite(row.cost?.text?.output?.price)))) {
    throw new Error("OpenCode nao retornou um catalogo de chat com precos validos.");
  }
  return { go, console };
}

export function buildOpenCodeCatalog(directory) {
  const groups = Object.fromEntries(OPEN_CODE_GROUPS.map(({ id, tier, channel }) => [
    id,
    directory[channel].filter((row) => {
      const input = row.cost?.text?.input?.price;
      const output = row.cost?.text?.output?.price;
      if (![input, output].every((price) => Number.isFinite(price) && price >= 0)) return false;
      return tier === "free" ? input === 0 && output === 0 : input > 0 || output > 0;
    }).map((row) => normalizeModel(row, channel)).filter(Boolean).sort((a, b) => a.id.localeCompare(b.id)),
  ]));
  if (!Object.values(groups).some((models) => models.length)) {
    throw new Error("OpenCode nao retornou modelos de chat com protocolos suportados.");
  }
  return {
    sourceUrls: Object.values(OPEN_CODE_SOURCES),
    groups,
    // The full presence list protects models omitted from curation or incompatible with a client.
    availableIds: Object.fromEntries(Object.entries(directory).map(
      ([channel, rows]) => [channel, rows.map(({ id }) => id).sort()]
    )),

  };
}
