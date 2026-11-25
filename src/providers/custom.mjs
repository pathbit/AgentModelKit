import { readJsonOrNull } from "../utils/json.mjs";
import { fetchModelRows } from "../catalogs/opencode.mjs";

export function parseEndpoint(input) {
  if (typeof input !== "string" || !/^https?:\/\//i.test(input) || /[\s\\]/.test(input)) {
    throw new Error("Specify a valid HTTP(S) endpoint.");
  }
  const url = new URL(input);
  if (url.username || url.password || url.search || url.hash) {
    throw new Error("The endpoint must be free of credentials, query parameters and fragments.");
  }
  return url.href.replace(/\/+$/, "");
}

function validateModel(model) {
  if (typeof model?.id !== "string" || !model.id.trim() || model.id !== model.id.trim() || /[,\x00-\x1f]/.test(model.id) ||
      ![model.maxInputTokens, model.maxOutputTokens].every((n) => Number.isSafeInteger(n) && n > 0 && n <= 0xffffffff)) {
    throw new Error("A manual model requires an ID and positive integer input and output limits.");
  }
  return {
    id: model.id,
    name: typeof model.name === "string" ? model.name : model.id,
    toolCalling: model.toolCalling === true,
    vision: model.vision === true,
  };
}

export function loadCustomProviders(files) {
  const providers = new Map();
  for (const file of files) {
    const config = readJsonOrNull(file);
    if (!/^custom-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(config?.id ?? "") ||
        !Array.isArray(config?.models) || !config.models.length ||
        !["chat-completions", "responses", "messages"].includes(config.apiType ?? "chat-completions") ||
        (config.requiresKey !== undefined && typeof config.requiresKey !== "boolean")) {
      throw new Error(`Invalid manifest in ${file}. See examples/provider.local.example.json.`);
    }
    if (providers.has(config.id)) throw new Error(`Duplicate manual provider: ${config.id}`);
    const baseUrl = parseEndpoint(config.baseUrl);
    const modelsUrl = config.modelsUrl === undefined ? null : parseEndpoint(config.modelsUrl);
    if (modelsUrl && new URL(modelsUrl).origin !== new URL(baseUrl).origin) {
      throw new Error(`modelsUrl must use the same origin as baseUrl in ${file}.`);
    }
    const models = config.models.map((model) => ({
      ...validateModel(model),
      maxInputTokens: model.maxInputTokens,
      maxOutputTokens: model.maxOutputTokens,
    }));
    if (new Set(models.map(({ id }) => id)).size !== models.length) throw new Error(`Duplicate IDs in ${file}.`);
    if (config.powerfulIds !== undefined && (!Array.isArray(config.powerfulIds) ||
        config.powerfulIds.some((id) => !models.some((model) => model.id === id)))) {
      throw new Error(`powerfulIds references missing models in ${file}.`);
    }
    const label = `AgentModelKit: ${config.id}`;
    const apiType = config.apiType ?? "chat-completions";
    providers.set(config.id, {
      id: config.id,
      label,
      requiresKey: config.requiresKey !== false,
      keyFile: `${config.id}.key`,
      envVar: config.id.toUpperCase().replaceAll("-", "_") + "_API_KEY",
      defaultTiers: ["manual"],
      async resolve({ live, powerful, apiKey } = {}) {
        let selected = models;
        if (live) {
          const available = await this.availability({ apiKey });
          selected = models.filter((model) => available.has(model.id));
        }
        if (powerful) {
          const wanted = new Set(config.powerfulIds ?? []);
          selected = selected.filter((model) => wanted.has(model.id));
        }
        return {
          providerId: this.id,
          source: live ? "live" : "manifesto",
          groups: selected.length ? [{
            id: this.id,
            label,
            prefix: `[${config.name || config.id}]`,
            baseUrl,
            models: selected.map((model) => ({ ...model, apiType })),
            vscodeSecretId: this.requiresKey ? `chat.lm.secret.${this.id}` : null,
          }] : [],
        };
      },
      async availability({ apiKey }) {
        if (!modelsUrl) throw new Error(`Define modelsUrl in ${file} to check availability.`);
        // Without a key, an authenticated provider could return a restricted view.
        if (this.requiresKey && !apiKey) throw new Error(`Checking ${this.id} requires an API key.`);
        return new Set((await fetchModelRows(modelsUrl, { apiKey })).map(({ id }) => id));
      },
      ownsEndpoint(url) { return url === baseUrl; },
    });
  }
  return providers;
}
