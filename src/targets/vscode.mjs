import { getVSCodeChatModelsPath } from "../utils/paths.mjs";
import { jsonWrite, parseSnapshot, readSnapshot } from "../utils/json.mjs";
import { OPEN_CODE_GROUPS } from "../catalogs/opencode.mjs";
import { applyTarget, assertConfig, shouldRemove } from "./config.mjs";

const LEGACY_OPENCODE = "+++++++ CONFIGURACAO OPENCODE +++++++";
const LEGACY_FREE = "+++++++ CONFIGURACAO FREELLMAPI +++++++";
const RESERVED_HEADERS = new Set(["authorization", "api-key", "content-type"]);
const apiPath = { "chat-completions": "chat/completions", responses: "responses", messages: "messages" };

export function modelEndpoint(group, model) {
  return `${model.baseUrl || group.baseUrl}/${apiPath[model.apiType || group.apiType || "chat-completions"]}`;
}

function toVSCodeModel(model, group) {
  const entry = {
    id: model.id,
    name: model.name,
    url: modelEndpoint(group, model),
    apiType: model.apiType || group.apiType || "chat-completions",
    toolCalling: Boolean(model.toolCalling),
    vision: Boolean(model.vision),
    maxInputTokens: model.maxInputTokens,
    maxOutputTokens: model.maxOutputTokens,
  };
  if (model.reasoning || model.reasoningEffort) entry.thinking = true;
  if (model.reasoningEfforts?.length) entry.supportsReasoningEffort = model.reasoningEfforts;
  if (entry.apiType === "responses" && group.id.startsWith("opencode-")) entry.statefulResponses = false;
  if (group.vscodeHeaders) {
    entry.requestHeaders = Object.fromEntries(Object.entries(group.vscodeHeaders)
      .filter(([key]) => !RESERVED_HEADERS.has(key.toLowerCase())));
  }
  return entry;
}

export function buildVSCodeBlocks(resolvedProviders, { inlineApiKeys = new Map() } = {}) {
  return resolvedProviders.flatMap((resolved) => resolved.groups.map((group) => ({
    name: group.label,
    vendor: "customendpoint",
    ...(inlineApiKeys.get(resolved.providerId) ? { apiKey: inlineApiKeys.get(resolved.providerId) } :
      group.vscodeSecretId ? { apiKey: `\${input:${group.vscodeSecretId}}` } : {}),
    models: group.models.map((model) => toVSCodeModel(model, group)),
  })));
}

function legacyOwner(block, separators) {
  if (block.vendor !== "customendpoint" || !Array.isArray(block.models)) return null;
  const open = OPEN_CODE_GROUPS.find(({ label, id }) => label === block.name && id !== "opencode-free-console");
  if (open && separators.has(LEGACY_OPENCODE) &&
      typeof block.apiKey === "string" &&
      block.models.some(({ url }) => /^https:\/\/opencode\.ai\/inference\/(?:go\/)?openai\/v1\/chat\/completions$/.test(url))) {
    return {
      providerId: "opencode", groupId: open.id,
      models: block.models.filter(({ url }) => /^https:\/\/opencode\.ai\/inference\/(?:go\/)?openai\/v1\/chat\/completions$/.test(url))
        .map(({ id, url }) => ({ id, url })),
    };
  }
  if (block.name === "FreeLLMAPI" && separators.has(LEGACY_FREE) &&
      typeof block.apiKey === "string" && block.models.some(({ id }) => id === "auto")) {
    return { providerId: "freellmapi", groupId: "freellmapi", models: block.models
      .filter(({ url }) => typeof url === "string" && url.endsWith("/v1/chat/completions"))
      .map(({ id, url }) => ({ id, url })) };
  }
  return null;
}

export const vscodeTarget = {
  id: "vscode",
  label: "VS Code (chatLanguageModels.json)",
  description: "Configura endpoints no VS Code.",

  plan(resolvedProviders, opts = {}, env = process.env) {
    const snapshot = readSnapshot(opts.vscodePath || getVSCodeChatModelsPath(process.platform, env));
    const stateFile = readSnapshot(`${snapshot.path}.agentmodelkit.json`);
    const existing = parseSnapshot(snapshot, []);
    const previous = parseSnapshot(stateFile, []);
    assertConfig(Array.isArray(existing) && existing.every((entry) => entry && typeof entry === "object" &&
      (entry.models === undefined || Array.isArray(entry.models) && entry.models.every((model) => model && typeof model === "object"))), snapshot);
    assertConfig(Array.isArray(previous) && previous.every((item) => typeof item?.name === "string" &&
      typeof item.providerId === "string" && typeof item.groupId === "string" &&
      Array.isArray(item.models) && item.models.every((model) => typeof model?.id === "string" && typeof model.url === "string")), stateFile);

    const incoming = buildVSCodeBlocks(resolvedProviders, opts);
    const pending = new Map(incoming.map((block) => [block.name, block]));
    const newOwners = new Map(resolvedProviders.flatMap((resolved) => resolved.groups.map((group) =>
      [group.label, { providerId: resolved.providerId, groupId: group.id }])));
    const oldOwners = new Map(previous.map(({ name, ...entry }) => [name, entry]));
    const merged = [];
    const state = [];
    const removed = [];
    const separators = new Set(existing.filter((block) => block.vendor === "customendpoint" &&
      Object.keys(block).length === 2).map(({ name }) => name));
    const touched = new Set([...resolvedProviders.map(({ providerId }) => providerId), ...(opts.prune?.keys() ?? [])]);
    let migrated = false;

    for (const block of existing) {
      const next = pending.get(block.name);
      const legacy = legacyOwner(block, separators);
      const owner = block.vendor === "customendpoint" && (oldOwners.get(block.name) ?? legacy);
      if (!next && (!owner || !touched.has(owner.providerId))) {
        merged.push(block);
        const savedOwner = oldOwners.get(block.name);
        if (savedOwner) state.push({ name: block.name, ...savedOwner });
        continue;
      }
      if (next && (!owner || owner.providerId !== newOwners.get(block.name).providerId)) {
        throw new Error(`Grupo do VS Code ja existe e e gerenciado fora do AgentModelKit: ${block.name}`);
      }
      const oldModelUrls = new Map(owner.models.map(({ id, url }) => [id, url]));
      const incomingModels = new Map((next?.models ?? []).map((model) => [model.id, model]));
      const models = [];
      const owned = [];
      for (const model of block.models ?? []) {
        const managed = oldModelUrls.get(model.id) === model.url && oldModelUrls.has(model.id);
        const replacement = incomingModels.get(model.id);
        if (replacement) {
          if (!managed) throw new Error(`Modelo manual com o mesmo ID no VS Code: ${block.name}/${model.id}`);
          const { supportsReasoningEffort, thinking, requestHeaders, statefulResponses, ...otherFields } = model;
          models.push({ ...otherFields, ...replacement });
          owned.push({ id: replacement.id, url: replacement.url });
          incomingModels.delete(model.id);
        } else if (managed && shouldRemove(opts, owner, model.id, model.url)) {
          removed.push(`${block.name}/${model.id}`);
        } else {
          models.push(model);
          if (managed) owned.push({ id: model.id, url: model.url });
        }
      }
      for (const model of incomingModels.values()) {
        models.push(model);
        owned.push({ id: model.id, url: model.url });
      }
      if (legacy && !oldOwners.has(block.name) && (next || removed.some((item) => item.startsWith(`${block.name}/`)))) migrated = true;
      // Preserve credentials a user already configured in the editor by default.
      const apiKey = opts.inlineApiKeys?.has(owner.providerId) ? next?.apiKey : block.apiKey ?? next?.apiKey;
      if (models.length || !block.models?.length) merged.push({ ...block, ...(apiKey ? { apiKey } : {}), models });
      if (owned.length) state.push({ name: block.name, providerId: owner.providerId, groupId: owner.groupId, models: owned });
      pending.delete(block.name);
    }

    const clean = migrated ? merged.filter((block) => !(Object.keys(block).length === 2 &&
      block.vendor === "customendpoint" && ((touched.has("opencode") && block.name === LEGACY_OPENCODE) ||
      (touched.has("freellmapi") && block.name === LEGACY_FREE)))) : merged;
    for (const block of pending.values()) {
      clean.push(block);
      state.push({ name: block.name, ...newOwners.get(block.name), models: block.models.map(({ id, url }) => ({ id, url })) });
    }
    const write = jsonWrite(snapshot, clean);
    const stateWrite = jsonWrite(stateFile, state);
    if (snapshot.content === null && !clean.length) write.changed = false;
    if (stateFile.content === null && !state.length) stateWrite.changed = false;
    return {
      targetId: this.id, path: snapshot.path, write, writes: [write, stateWrite],
      modelCount: incoming.reduce((count, block) => count + block.models.length, 0),
      removed, merged: opts.dryRun ? undefined : clean,
    };
  },

  apply(resolvedProviders, opts = {}, env = process.env) {
    return applyTarget(this, resolvedProviders, opts, env);
  },
};
