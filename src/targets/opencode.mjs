import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { jsonWrite, parseSnapshot, readSnapshot } from "../utils/json.mjs";
import { assertConfig, shouldRemove } from "./config.mjs";

const PACKAGES = {
  "chat-completions": "@opencode/ai/providers/openai-compatible",
  responses: "@opencode/ai/providers/openai/responses",
  messages: "@opencode/ai/providers/anthropic",
};

const isRecord = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

function buildProjectProviders(resolved, keyReferences, configPath) {
  const entries = new Map();
  const session = createHash("sha256").update(configPath).digest("hex").slice(0, 32);
  for (const { providerId, groups } of resolved) {
    for (const group of groups) {
      for (const model of group.models) {
        const api = model.apiType ?? group.apiType ?? "chat-completions";
        const groupId = group.id;
        const name = `agentmodelkit-${groupId}${api === "chat-completions" ? "" : `-${api}`}`;
        const previous = entries.get(name);
        if (previous && (previous.providerId !== providerId || previous.groupId !== groupId)) {
          throw new Error(`Ambiguous OpenCode provider name: ${name}`);
        }
        const baseURL = model.baseUrl ?? group.baseUrl;
        const apiKey = keyReferences?.get(providerId);
        const entry = previous ?? {
          providerId, groupId, baseURL,
          provider: {
            name: group.label,
            package: PACKAGES[api],
            settings: { baseURL, ...(apiKey ? { apiKey } : {}) },
            ...(group.channel === "go" ? { headers: { "x-opencode-session": `ses_${session}` } } : {}),
            models: Object.create(null),
          },
        };
        entry.provider.models[model.id] = {
          modelID: model.id,
          name: model.name,
          capabilities: {
            tools: Boolean(model.toolCalling),
            input: model.vision ? ["text", "image"] : ["text"],
            output: ["text"],
          },
          limit: {
            context: model.maxInputTokens + model.maxOutputTokens,
            input: model.maxInputTokens,
            output: model.maxOutputTokens,
          },
        };
        entries.set(name, entry);
      }
    }
  }
  return entries;
}

function projectPaths(projectDir = process.cwd()) {
  const project = path.resolve(projectDir);
  if (!fs.statSync(project, { throwIfNoEntry: false })?.isDirectory()) {
    throw new Error(`Project directory does not exist: ${project}`);
  }
  const directory = path.join(project, ".opencode");
  return {
    config: path.join(directory, "opencode.json"),
    ownership: path.join(directory, "agentmodelkit-models.json"),
  };
}

export const opencodeTarget = {
  id: "opencode",
  label: "OpenCode (current project)",
  description: "Configures OpenCode 2 in .opencode/opencode.json.",

  plan(resolved, opts = {}) {
    const paths = projectPaths(opts.projectDir);
    const snapshot = readSnapshot(paths.config);
    const ownership = readSnapshot(paths.ownership);
    const existing = parseSnapshot(snapshot, {});
    const previous = parseSnapshot(ownership, {});
    assertConfig(isRecord(existing) && (existing.providers === undefined || isRecord(existing.providers)), snapshot);
    assertConfig(isRecord(previous) && Object.values(previous).every((entry) =>
      isRecord(entry) && typeof entry.providerId === "string" && typeof entry.groupId === "string" &&
      typeof entry.baseURL === "string" && Array.isArray(entry.ids) && entry.ids.every((id) => typeof id === "string")), ownership);
    const incoming = buildProjectProviders(resolved, opts.projectKeyRefs, snapshot.path);
    const managed = new Map(Object.entries(previous));
    const providers = new Map(Object.entries(existing.providers ?? {}));
    const removed = [];
    const replacing = new Set([...incoming.values()].flatMap(({ groupId, provider }) =>
      Object.keys(provider.models).map((id) => JSON.stringify([groupId, id]))));

    for (const [name, current] of providers) {
      const old = managed.get(name);
      const next = incoming.get(name);
      const ownsEndpoint = old && current?.settings?.baseURL === old.baseURL;
      if (next && (!ownsEndpoint || old.providerId !== next.providerId || old.groupId !== next.groupId)) {
        throw new Error(`OpenCode provider already exists and is managed outside AgentModelKit: ${name}`);
      }
      if (!ownsEndpoint) continue;
      assertConfig(isRecord(current.models), snapshot);
      const models = new Map(Object.entries(current.models));
      const owned = new Set(old.ids);
      for (const [id] of models) {
        const moved = !next?.provider.models[id] && replacing.has(JSON.stringify([old.groupId, id]));
        if (owned.has(id) && (moved || (!next?.provider.models[id] && shouldRemove(opts, old, id, old.baseURL)))) {
          models.delete(id);
          owned.delete(id);
          removed.push(`${name}/${id}`);
        }
      }
      if (next) {
        for (const [id, model] of Object.entries(next.provider.models)) {
          if (models.has(id) && !owned.has(id)) {
            throw new Error(`Manual model with the same ID in OpenCode: ${name}/${id}`);
          }
          models.set(id, { ...models.get(id), ...model });
          owned.add(id);
        }
        incoming.delete(name);
      }
      if (models.size) {
        providers.set(name, {
          ...current,
          ...next?.provider,
          settings: { ...current.settings, ...next?.provider.settings },
          models: Object.fromEntries(models),
        });
        managed.set(name, { ...old, baseURL: next?.baseURL ?? old.baseURL, ids: [...owned].filter((id) => models.has(id)) });
      } else {
        providers.delete(name);
        managed.delete(name);
      }
    }

    for (const [name, { providerId, groupId, baseURL, provider }] of incoming) {
      providers.set(name, provider);
      managed.set(name, { providerId, groupId, baseURL, ids: Object.keys(provider.models) });
    }
    const modelCount = resolved.reduce((total, provider) =>
      total + provider.groups.reduce((count, group) => count + group.models.length, 0), 0);
    const merged = modelCount || removed.length ? {
      $schema: "https://opencode.ai/config.json", ...existing, providers: Object.fromEntries(providers) } : existing;
    if (typeof merged.model === "string" && removed.includes(merged.model)) delete merged.model;
    const write = jsonWrite(snapshot, merged, { mode: 0o644 });
    const state = jsonWrite(ownership, Object.fromEntries(managed), { mode: 0o644 });
    if (snapshot.content === null && !modelCount) write.changed = false;
    if (ownership.content === null && !managed.size) state.changed = false;
    return { targetId: this.id, path: snapshot.path, write, writes: [write, state], modelCount, removed };
  },
};
