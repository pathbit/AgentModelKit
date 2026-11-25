import { getVSCodeChatModelsPath } from "../utils/paths.mjs";
import { readJsonOrNull, writeJsonWithBackup } from "../utils/json.mjs";

const RESERVED_VSCODE_HEADERS = new Set(["authorization", "api-key", "content-type"]);

function toVSCodeModel(model, group) {
  const entry = {
    id: model.id,
    name: model.name,
    url: `${group.baseUrl}/chat/completions`,
    toolCalling: Boolean(model.toolCalling),
    vision: Boolean(model.vision),
  };
  if (model.reasoningEffort) {
    entry.thinking = true;
    entry.supportsReasoningEffort = ["low", "medium", "high"];
  }
  entry.maxInputTokens = model.maxInputTokens;
  entry.maxOutputTokens = model.maxOutputTokens;
  if (group.vscodeHeaders) {
    const filtered = Object.fromEntries(
      Object.entries(group.vscodeHeaders).filter(([k]) => !RESERVED_VSCODE_HEADERS.has(k.toLowerCase()))
    );
    if (Object.keys(filtered).length > 0) {
      entry.requestHeaders = filtered;
    }
  }
  return entry;
}

/**
 * Build VS Code `chatLanguageModels.json` blocks conforming to the `customendpoint` schema.
 */
export function buildVSCodeBlocks(resolvedProviders, { inlineApiKeys = {} } = {}) {
  const blocks = [];
  for (const resolved of resolvedProviders) {
    if (resolved.separatorName) {
      blocks.push({
        name: resolved.separatorName,
        vendor: "customendpoint",
      });
    }
    for (const group of resolved.groups) {
      const inlineKey = inlineApiKeys[resolved.providerId];
      blocks.push({
        name: group.label,
        vendor: "customendpoint",
        apiKey: inlineKey || `\${input:${group.vscodeSecretId}}`,
        models: group.models.map((m) => toVSCodeModel(m, group)),
      });
    }
  }
  return blocks;
}

export const vscodeTarget = {
  id: "vscode",
  label: "VS Code (chatLanguageModels.json)",
  description: "Configura GitHub Copilot Chat custom endpoints no VS Code (Windows, macOS, Linux).",

  apply(resolvedProviders, opts = {}, env = process.env) {
    const targetPath = opts.vscodePath || getVSCodeChatModelsPath(process.platform, env);
    const incoming = buildVSCodeBlocks(resolvedProviders, { inlineApiKeys: opts.inlineApiKeys });
    const managedNames = new Set(incoming.map((b) => b.name));
    for (const resolved of resolvedProviders) {
      for (const name of resolved.managedVSCodeNames || []) {
        managedNames.add(name);
      }
    }

    const existing = readJsonOrNull(targetPath);
    const kept = Array.isArray(existing)
      ? existing.filter((b) => !managedNames.has(b?.name))
      : [];
    const merged = [...kept, ...incoming];

    const modelCount = incoming.reduce((acc, b) => acc + (b.models?.length || 0), 0);
    if (opts.dryRun) {
      return {
        targetId: "vscode",
        path: targetPath,
        dryRun: true,
        modelCount,
        groupCount: incoming.filter((b) => b.vendor === "customendpoint" && Array.isArray(b.models)).length,
        merged,
      };
    }

    const { backupPath } = writeJsonWithBackup(targetPath, merged);
    return {
      targetId: "vscode",
      path: targetPath,
      backupPath,
      modelCount,
      groupCount: incoming.filter((b) => b.vendor === "customendpoint" && Array.isArray(b.models)).length,
    };
  },
};
