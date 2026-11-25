import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = path.resolve(__dirname, "../../data/opencode-catalog.json");

const GO_BASE_URL = "https://opencode.ai/inference/go/openai/v1";
const PAYG_BASE_URL = "https://opencode.ai/inference/openai/v1";

function loadStaticCatalog() {
  return JSON.parse(fs.readFileSync(CATALOG_PATH, "utf8"));
}

function normalizeRemoteModel(m) {
  const caps = m.capabilities || {};
  const lim = m.limit || {};
  const mods = m.modalities?.input || [];
  const costInput = m.cost?.text?.input?.price;
  const efforts = caps.reasoning?.effort || [];
  let reasoningEffort = null;
  if (caps.reasoning?.supported) {
    for (const pref of ["high", "medium", "max", "xhigh", "low"]) {
      if (efforts.includes(pref)) {
        reasoningEffort = pref;
        break;
      }
    }
    if (!reasoningEffort && efforts.length) reasoningEffort = efforts[efforts.length - 1];
  }
  const idLower = m.id.toLowerCase();
  const tier = costInput === 0
    ? "efficiency"
    : /(flash|mini|nano|haiku|lite|ember|luna|spark)/.test(idLower)
      ? "balance"
      : "intelligence";

  return {
    id: m.id,
    name: m.name || m.id,
    toolCalling: Boolean(caps.tools?.supported),
    vision: mods.some((x) => x.startsWith("image/")),
    reasoningEffort,
    tier,
    maxInputTokens: lim.input || lim.context || 128000,
    maxOutputTokens: lim.output || 8192,
  };
}

async function fetchLiveOpenCodeCatalog(staticCatalog) {
  const fetchFn = globalThis.fetch;
  if (!fetchFn) return staticCatalog;

  const [goRes, zenRes] = await Promise.all([
    fetchFn("https://opencode.ai/inference/go/v1/models", { signal: AbortSignal.timeout(8000) }),
    fetchFn("https://opencode.ai/inference/v1/models", { signal: AbortSignal.timeout(8000) }),
  ]);
  if (!goRes.ok || !zenRes.ok) {
    throw new Error(`HTTP ${goRes.status}/${zenRes.status}`);
  }
  const goJson = await goRes.json();
  const zenJson = await zenRes.json();

  const deprecated = new Set(staticCatalog.deprecatedIds || []);
  const legacy2025 = new Set(staticCatalog.legacy2025Ids || []);
  const goData = goJson.data || [];
  const goAllIds = new Set(goData.map((m) => m.id));

  const free = [];
  const go = [];
  for (const m of goData) {
    if (m.type !== "chat") continue;
    const price = m.cost?.text?.input?.price;
    if (price === 0) free.push(normalizeRemoteModel(m));
    else if (!deprecated.has(m.id)) go.push(normalizeRemoteModel(m));
  }

  const payg = (zenJson.data || [])
    .filter((m) =>
      m.type === "chat" &&
      (m.cost?.text?.input?.price || 0) > 0 &&
      !goAllIds.has(m.id) &&
      !deprecated.has(m.id) &&
      !legacy2025.has(m.id)
    )
    .sort((a, b) => (b.release_date || "").localeCompare(a.release_date || "") || a.id.localeCompare(b.id))
    .map(normalizeRemoteModel);

  return {
    ...staticCatalog,
    tiers: { free, go, payg },
  };
}

export function normalizeOpenCodeTiers(rawTiers) {
  if (!rawTiers || rawTiers.length === 0) return ["free"];
  const items = Array.isArray(rawTiers) ? rawTiers : String(rawTiers).split(",");
  const cleaned = items.map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (cleaned.includes("all")) return ["go", "free", "payg"];
  const valid = new Set(["free", "go", "payg"]);
  const unique = [];
  for (const item of cleaned) {
    if (!valid.has(item)) {
      throw new Error(`Tier invalido para OpenCode: '${item}'. Use: free, go, payg ou all.`);
    }
    if (!unique.includes(item)) unique.push(item);
  }
  return unique.length ? unique : ["free"];
}

export const opencodeProvider = {
  id: "opencode",
  label: "OpenCode",
  description: "OpenCode Go (Free / Go) e Console (PAYG)",
  availableTiers: ["free", "go", "payg"],
  defaultTiers: ["free"],
  keyFile: "opencode.key",
  envVar: "OPENCODE_API_KEY",
  keyPlaceholder: "oc_sk_...",
  requiresKey: true,

  async resolve({ tiers, live = false, secretInputId = "chat.lm.secret.66290ed1" } = {}) {
    const selectedTiers = normalizeOpenCodeTiers(tiers);
    let catalog = loadStaticCatalog();
    let source = "catalog";

    if (live) {
      try {
        catalog = await fetchLiveOpenCodeCatalog(catalog);
        source = "live";
      } catch {
        source = "catalog-fallback";
      }
    }

    const groups = [];
    if (selectedTiers.includes("go")) {
      groups.push({
        id: "opencode-go",
        label: "OpenCode Go",
        prefix: "[OpenCode Go]",
        comment: "+++++++ OPENCODE GO (PLANO GO) +++++++",
        baseUrl: GO_BASE_URL,
        copilotHeaders: { "x-opencode-session": "copilot-cli" },
        vscodeHeaders: {
          "x-opencode-session": "vscode-copilot",
        },
        vscodeSecretId: secretInputId,
        models: catalog.tiers.go,
      });
    }

    if (selectedTiers.includes("free")) {
      groups.push({
        id: "opencode-free-go",
        label: "OpenCode Free",
        prefix: "[OpenCode Free]",
        comment: "+++++++ OPENCODE FREE (GRATIS NO GO) +++++++",
        baseUrl: GO_BASE_URL,
        copilotHeaders: { "x-opencode-session": "copilot-cli" },
        vscodeHeaders: {
          "x-opencode-session": "vscode-copilot",
        },
        vscodeSecretId: secretInputId,
        models: catalog.tiers.free,
      });
    }

    if (selectedTiers.includes("payg")) {
      groups.push({
        id: "opencode-payg",
        label: "OpenCode PAYG",
        prefix: "[OpenCode PAYG]",
        comment: "+++++++ OPENCODE PAYG (PAY-AS-YOU-GO) +++++++",
        baseUrl: PAYG_BASE_URL,
        copilotHeaders: null,
        vscodeHeaders: null,
        vscodeSecretId: secretInputId,
        models: catalog.tiers.payg,
      });
    }

    let defaultModel = "opencode-free-go/hungerg-free";
    if (selectedTiers.includes("go")) defaultModel = "opencode-go/claude-haiku-5-5";
    else if (selectedTiers.includes("payg") && !selectedTiers.includes("free")) defaultModel = "opencode-payg/gpt-6.2-sol";

    return {
      providerId: "opencode",
      separatorName: "+++++++ CONFIGURACAO OPENCODE +++++++",
      copilotRootComment: "+++++++ CONFIGURACAO OPENCODE (WINDOWS / MACOS / LINUX) +++++++",
      managedGroupIds: ["opencode-go", "opencode-free-go", "opencode-payg"],
      managedVSCodeNames: ["+++++++ CONFIGURACAO OPENCODE +++++++", "OpenCode Go", "OpenCode Free", "OpenCode PAYG"],
      keyFile: "opencode.key",
      defaultModel,
      source,
      groups,
    };
  },
};
