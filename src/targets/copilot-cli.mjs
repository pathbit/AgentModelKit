import { execFileSync } from "node:child_process";
import { getCopilotProvidersPath } from "../utils/paths.mjs";
import { buildCrossPlatformKeyCommand, readJsonOrNull, writeJsonWithBackup } from "../utils/json.mjs";

/**
 * Build Copilot CLI `providers.json` payload from resolved provider outputs.
 */
export function buildCopilotPayload(resolvedProviders, { inlineApiKeys = {} } = {}) {
  const providers = [];
  const models = [];

  for (const resolved of resolvedProviders) {
    for (const group of resolved.groups) {
      const provEntry = {
        ...(group.comment ? { _comment: group.comment } : {}),
        name: group.id,
        type: "openai",
        baseUrl: group.baseUrl,
        wireApi: "completions",
      };
      if (group.copilotHeaders) {
        provEntry.headers = { ...group.copilotHeaders };
      }

      const inlineKey = inlineApiKeys[resolved.providerId];
      if (inlineKey) {
        provEntry.apiKey = inlineKey;
      } else {
        provEntry.apiKeyCommand = buildCrossPlatformKeyCommand(resolved.keyFile);
      }

      providers.push(provEntry);

      for (const m of group.models) {
        models.push({
          id: m.id,
          name: `${group.prefix} ${m.name}`,
          provider: group.id,
          maxPromptTokens: m.maxInputTokens,
          maxOutputTokens: m.maxOutputTokens,
          capabilities: {
            supports: {
              vision: Boolean(m.vision),
            },
          },
        });
      }
    }
  }

  return {
    _comment: "+++++++ CONFIGURADO POR AGENTMODELKIT (WINDOWS / MACOS / LINUX) +++++++",
    providers,
    models,
  };
}

export const copilotCliTarget = {
  id: "copilot-cli",
  label: "GitHub Copilot CLI (~/.copilot/providers.json)",
  description: "Configura providers.json e modelo padrao no GitHub Copilot CLI.",

  apply(resolvedProviders, opts = {}, env = process.env) {
    const targetPath = opts.copilotProvidersPath || getCopilotProvidersPath(env);
    const incoming = buildCopilotPayload(resolvedProviders, {
      inlineApiKeys: opts.inlineApiKeys,
    });
    const managedProviderNames = new Set(incoming.providers.map((p) => p.name));
    for (const resolved of resolvedProviders) {
      for (const id of resolved.managedGroupIds || []) {
        managedProviderNames.add(id);
      }
    }

    const existing = readJsonOrNull(targetPath);
    let merged = incoming;
    if (existing && Array.isArray(existing.providers) && Array.isArray(existing.models)) {
      const keptProviders = existing.providers.filter((p) => !managedProviderNames.has(p?.name));
      const keptModels = existing.models.filter((m) => !managedProviderNames.has(m?.provider));
      merged = {
        _comment: incoming._comment,
        providers: [...keptProviders, ...incoming.providers],
        models: [...keptModels, ...incoming.models],
      };
    }

    const defaultModel = opts.defaultModel || resolvedProviders[0]?.defaultModel || null;

    if (opts.dryRun) {
      return {
        targetId: "copilot-cli",
        path: targetPath,
        dryRun: true,
        modelCount: incoming.models.length,
        providerCount: incoming.providers.length,
        defaultModel,
        merged,
      };
    }

    const { backupPath } = writeJsonWithBackup(targetPath, merged, { mode: 0o600 });

    let defaultModelApplied = false;
    if (defaultModel && !opts.noDefaultModel) {
      try {
        execFileSync("copilot", ["config", "model", defaultModel], { stdio: "ignore", env });
        defaultModelApplied = true;
      } catch {
        defaultModelApplied = false;
      }
    }

    return {
      targetId: "copilot-cli",
      path: targetPath,
      backupPath,
      modelCount: incoming.models.length,
      providerCount: incoming.providers.length,
      defaultModel,
      defaultModelApplied,
    };
  },
};
