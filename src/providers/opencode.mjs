import { createHash } from "node:crypto";
import { getCopilotProvidersPath, getVSCodeChatModelsPath } from "../utils/paths.mjs";
import { loadCatalog, loadCuration } from "../catalogs/index.mjs";
import {
  buildOpenCodeCatalog, fetchOpenCodeDirectory, OPEN_CODE_GROUPS, openCodeBaseUrl,
} from "../catalogs/opencode.mjs";

export function normalizeOpenCodeTiers(rawTiers) {
  const items = Array.isArray(rawTiers) ? rawTiers : String(rawTiers ?? "payg").split(",");
  const cleaned = [...new Set(items.map((value) => value.trim().toLowerCase()))];
  if (!cleaned.length || cleaned.some((value) => !["free", "go", "payg", "all"].includes(value))) {
    throw new Error("Invalid OpenCode tier. Use free, go, payg or all.");
  }
  return cleaned.includes("all") ? ["go", "free", "payg"] : cleaned;
}

export const opencodeProvider = {
  id: "opencode",
  label: "OpenCode",
  description: "OpenCode Go subscription and pay-as-you-go Console",
  availableTiers: ["free", "go", "payg"],
  defaultTiers: ["payg"],
  keyFile: "opencode.key",
  envVar: "OPENCODE_API_KEY",
  keyPlaceholder: "oc_sk_...",
  requiresKey: true,

  async resolve({ tiers, live = false, powerful = false, env, fetchImpl, secretInputId = "chat.lm.secret.66290ed1" } = {}) {
    const selectedTiers = normalizeOpenCodeTiers(tiers).filter((tier) => tier !== "free");
    const sessionHeaders = (client, configPath) => {
      const id = createHash("sha256").update(`${client}\0${configPath}`).digest("hex").slice(0, 32);
      return { "x-opencode-session": `ses_${id}` };
    };
    let catalog = loadCatalog("opencode-catalog.json", env);
    if (live) catalog = buildOpenCodeCatalog(await fetchOpenCodeDirectory(fetchImpl));
    const curated = new Set(powerful ? loadCuration().opencode : []);
    const groups = OPEN_CODE_GROUPS.filter((group) => selectedTiers.includes(group.tier)).map((group) => ({
      ...group,
      prefix: `[${group.label}]`,
      baseUrl: openCodeBaseUrl(group.channel, "chat-completions"),
      copilotHeaders: group.channel === "go" ? sessionHeaders("copilot-cli", getCopilotProvidersPath(env)) : null,
      vscodeHeaders: group.channel === "go" ? sessionHeaders("vscode", getVSCodeChatModelsPath(process.platform, env)) : null,
      vscodeSecretId: secretInputId,
      models: catalog.groups[group.id].filter((model) => !powerful || curated.has(`${group.id}/${model.id}`))
        .map((model) => ({ ...model, baseUrl: openCodeBaseUrl(group.channel, model.apiType) })),
    })).filter((group) => group.models.length);
    return { providerId: this.id, source: live ? "live" : "catalog", groups };
  },
};
