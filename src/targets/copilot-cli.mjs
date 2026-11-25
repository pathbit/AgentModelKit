import { getCopilotProvidersPath } from "../utils/paths.mjs";
import { jsonWrite, parseSnapshot, readSnapshot } from "../utils/json.mjs";
import { applyTarget, assertConfig, shouldRemove } from "./config.mjs";

const MARKER = "AgentModelKit:";
// Match the persisted markers from earlier development builds.
const legacyGroups = {
  "opencode-go": ["opencode", "+++++++ OPENCODE GO (PLANO GO) +++++++"],
  "opencode-free-go": ["opencode", "+++++++ OPENCODE FREE (GRATIS NO GO) +++++++"],
  "opencode-payg": ["opencode", "+++++++ OPENCODE PAYG (PAY-AS-YOU-GO) +++++++"],
  freellmapi: ["freellmapi", "+++++++ FREELLMAPI (100% GRATIS SMART ROUTER) +++++++"],
};

function owner(provider) {
  if (provider?._comment?.startsWith?.(MARKER)) {
    const [providerId, groupId] = provider._comment.slice(MARKER.length).split("/");
    if (providerId && groupId) return { providerId, groupId };
  }
  const legacy = Object.hasOwn(legacyGroups, provider?.name) ? legacyGroups[provider.name] : null;
  return legacy && provider._comment === legacy[1]
    ? { providerId: legacy[0], groupId: provider.name, legacy: true }
    : null;
}

export function copilotGroupName(group, model) {
  const api = model.apiType || group.apiType || "chat-completions";
  return api === "chat-completions" ? group.id : `${group.id}-${api}`;
}

export function buildCopilotPayload(resolvedProviders, { apiKeys = new Map() } = {}) {
  const providers = new Map();
  const models = [];
  for (const resolved of resolvedProviders) {
    for (const group of resolved.groups) {
      for (const model of group.models) {
        const api = model.apiType || group.apiType || "chat-completions";
        const name = copilotGroupName(group, model);
        const apiKey = apiKeys.get(resolved.providerId);
        // Copilot's Anthropic adapter appends /v1/messages.
        const baseUrl = model.baseUrl || group.baseUrl;
        const connection = {
          _comment: `${MARKER}${resolved.providerId}/${group.id}`,
          name,
          type: api === "messages" ? "anthropic" : "openai",
          baseUrl: api === "messages" ? baseUrl.replace(/\/v1$/, "") : baseUrl,
          ...(api === "messages" ? {} : { wireApi: api === "responses" ? "responses" : "completions" }),
          ...(group.copilotHeaders ? { headers: group.copilotHeaders } : {}),
          ...(apiKey ? { apiKey } : {}),
        };
        const registered = providers.get(name);
        if (registered && registered._comment !== connection._comment) {
          throw new Error(`Ambiguous Copilot connection name: ${name}`);
        }
        providers.set(name, connection);
        models.push({
          id: model.id,
          name: `${group.prefix} ${model.name}`,
          provider: name,
          maxPromptTokens: model.maxInputTokens,
          maxOutputTokens: model.maxOutputTokens,
          capabilities: { supports: {
            vision: Boolean(model.vision),
            toolCalls: Boolean(model.toolCalling),
            ...(model.reasoningEfforts?.length ? { reasoning_effort: model.reasoningEfforts } : {}),
          } },
          metadata: { agentModelKit: resolved.providerId },
        });
      }
    }
  }
  return { providers: [...providers.values()], models };
}

export const copilotCliTarget = {
  id: "copilot-cli",
  label: "GitHub Copilot CLI (~/.copilot/providers.json)",
  description: "Configures providers.json in GitHub Copilot CLI.",

  plan(resolvedProviders, opts = {}, env = process.env) {
    const snapshot = readSnapshot(opts.copilotProvidersPath || getCopilotProvidersPath(env));
    const existing = parseSnapshot(snapshot, {});
    assertConfig(existing && typeof existing === "object" && !Array.isArray(existing) &&
      [existing.providers, existing.models].every((items) => items === undefined ||
        (Array.isArray(items) && items.every((item) => item && typeof item === "object"))), snapshot);
    const existingProviders = existing.providers ?? [];
    const existingModels = existing.models ?? [];
    const previous = new Map(existingProviders.map((provider) => [provider.name, provider]));
    const incoming = buildCopilotPayload(resolvedProviders, opts);
    const connections = new Map(incoming.providers.map((provider) => [provider.name, provider]));
    for (const [name, provider] of connections) {
      const old = previous.get(name);
      if (old && owner(old)?.providerId !== owner(provider).providerId) {
        throw new Error(`Copilot provider already exists and is managed outside AgentModelKit: ${name}`);
      }
    }
    const modelKey = (group, id) => JSON.stringify([group, id]);
    const wanted = new Set(incoming.models.map((model) => modelKey(owner(connections.get(model.provider)).groupId, model.id)));
    const retained = [];
    const removed = [];
    const matching = new Map();
    for (const model of existingModels) {
      const provider = previous.get(model.provider);
      const known = owner(provider);
      const owned = known && (model.metadata?.agentModelKit === known.providerId ||
        (known.legacy && /^\[(?:OpenCode (?:Go|Free|PAYG)|FreeLLMAPI)\] /.test(model.name)));
      if (owned && wanted.has(modelKey(known.groupId, model.id))) {
        matching.set(modelKey(model.provider, model.id), model);
      } else if (owned && shouldRemove(opts, known, model.id, provider.baseUrl)) {
        removed.push(`${model.provider}/${model.id}`);
      } else {
        if (connections.has(model.provider) && incoming.models.some((item) => item.provider === model.provider && item.id === model.id)) {
          throw new Error(`Manual model with the same ID in Copilot: ${model.provider}/${model.id}`);
        }
        retained.push(owned && known.legacy && connections.has(model.provider)
          ? { ...model, metadata: { ...model.metadata, agentModelKit: known.providerId } } : model);
      }
    }
    const models = [...retained, ...incoming.models.map((model) => {
      const old = matching.get(modelKey(model.provider, model.id));
      return old ? { ...old, ...model, metadata: { ...old.metadata, ...model.metadata } } : model;
    })];
    const used = new Set(models.map(({ provider }) => provider));
    const previouslyUsed = new Set(existingModels.map(({ provider }) => provider));
    const providers = existingProviders.filter((provider) => !connections.has(provider.name) &&
      (!owner(provider) || used.has(provider.name) || !previouslyUsed.has(provider.name)));
    for (const next of incoming.providers) {
      const old = previous.get(next.name);
      const merged = { ...old, ...next };
      delete merged.apiKeyCommand;
      delete merged.bearerToken;
      if (!next.apiKey) delete merged.apiKey;
      providers.push(merged);
    }
    // A key rotation applies to every managed tier/connection for that provider.
    for (let i = 0; i < providers.length; i++) {
      const entry = providers[i];
      const recognized = owner(entry);
      const key = opts.apiKeys?.get(recognized?.providerId);
      if (key && !connections.has(entry.name)) {
        const { apiKeyCommand, bearerToken, ...rest } = entry;
        providers[i] = { ...rest, apiKey: key };
      }
    }
    const merged = incoming.models.length || removed.length ? { ...existing, providers, models } : existing;
    const write = jsonWrite(snapshot, merged);
    if (snapshot.content === null && !incoming.models.length) write.changed = false;
    return {
      targetId: this.id, path: snapshot.path, write, writes: [write],
      modelCount: incoming.models.length, removed,
      modelSelections: models.map(({ provider, id }) => `${provider}/${id}`),
      selection: incoming.models.map(({ provider, id }) => ({ provider, id, selection: `${provider}/${id}` })),
      merged: opts.dryRun ? undefined : merged,
    };
  },

  apply(resolvedProviders, opts = {}, env = process.env) {
    return applyTarget(this, resolvedProviders, opts, env);
  },
};
