import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { verify } from "node:crypto";
import { fileURLToPath } from "node:url";
import { buildOpenCodeCatalog, fetchOpenCodeDirectory, OPEN_CODE_GROUPS } from "./opencode.mjs";
import { commitWrites, jsonWrite, readSnapshot } from "../utils/json.mjs";

export const bundledDir = fileURLToPath(new URL("../../data/", import.meta.url));
const OPEN_CODE = "opencode-catalog.json";
const FREE_LLM = "freellmapi-catalog.json";
const FREE_LLM_URL = "https://api.freellmapi.co/v1/latest";
const FREE_LLM_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEAq9yv4+3EeyMHKsfVYBhkcz1lYgIXSUeHNnN6tNgYX3k=
-----END PUBLIC KEY-----`;

export function getCatalogDir(env = process.env) {
  return path.resolve(env.AGENTMODELKIT_CATALOG_DIR ||
    path.join(env.XDG_CACHE_HOME || path.join(os.homedir(), ".cache"), "agentmodelkit", "catalogs"));
}

function readCatalog(dir, filename) {
  return JSON.parse(fs.readFileSync(path.join(dir, filename), "utf8"));
}

export function loadCuration() {
  return readCatalog(bundledDir, "curation.json");
}

export function loadCatalog(filename, env = process.env) {
  try {
    return readCatalog(getCatalogDir(env), filename);
  } catch (error) {
    if (error.code !== "ENOENT") throw new Error(`Cache invalido em ${getCatalogDir(env)}. Execute catalog update.`, { cause: error });
    return readCatalog(bundledDir, filename);
  }
}

export async function fetchFreeLLMCatalog(previous, fetchImpl) {
  const response = await fetchImpl(FREE_LLM_URL, { signal: AbortSignal.timeout(15000), redirect: "error" });
  if (!response.ok) throw new Error(`FreeLLMAPI catalogo: HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  const signature = response.headers.get("x-catalog-signature");
  if (!signature || !verify(null, bytes, FREE_LLM_PUBLIC_KEY, Buffer.from(signature, "base64"))) {
    throw new Error("Assinatura invalida do catalogo mensal FreeLLMAPI.");
  }
  const payload = JSON.parse(bytes.toString("utf8"));
  if (payload.tier !== "monthly" || !/^\d{4}\.\d{2}\.\d{2}/.test(payload.version) ||
      !Array.isArray(payload.models) || !payload.models.length ||
      payload.models.some((row) => !row?.platform || !row.modelId || typeof row.enabled !== "boolean")) {
    throw new Error("Catalogo mensal FreeLLMAPI invalido.");
  }
  return {
    sourceUrls: [FREE_LLM_URL, "https://github.com/tashfeenahmed/freellmapi"],
    upstreamVersion: payload.version,
    strategies: previous.strategies,
    router: previous.router,
    models: payload.models.map((row) => ({
      platform: row.platform,
      id: row.modelId,
      name: row.displayName,
      enabled: row.enabled,
      size: row.sizeLabel,
      contextWindow: row.contextWindow,
      toolCalling: row.supportsTools === true,
      vision: row.supportsVision === true,
    })),
  };
}

function stamp(previous, next) {
  const { updatedAt, ...previousData } = previous;
  return {
    ...next,
    updatedAt: JSON.stringify(previousData) === JSON.stringify(next) ? updatedAt : new Date().toISOString().slice(0, 10),
  };
}

export async function refreshCatalogs({
  dir = getCatalogDir(), source = "all", dryRun = false, fetchImpl = globalThis.fetch,
} = {}) {
  if (!["all", "opencode", "freellmapi"].includes(source)) {
    throw new Error("Fonte invalida. Use opencode, freellmapi ou all.");
  }
  const files = source === "all" ? [OPEN_CODE, FREE_LLM] : [source === "opencode" ? OPEN_CODE : FREE_LLM];
  const plans = await Promise.all(files.map(async (file) => {
    const snapshot = readSnapshot(path.join(dir, file));
    // A refresh can recover a damaged cache using the bundled catalog as its baseline.
    let previous = readCatalog(bundledDir, file);
    if (snapshot.content !== null) {
      try {
        previous = JSON.parse(snapshot.content);
      } catch {
        // Keep the bundled baseline.
      }
    }
    const data = file === OPEN_CODE
      ? buildOpenCodeCatalog(await fetchOpenCodeDirectory(fetchImpl))
      : await fetchFreeLLMCatalog(readCatalog(bundledDir, file), fetchImpl);
    return jsonWrite(snapshot, stamp(previous ?? {}, data), { mode: dir === bundledDir ? 0o644 : 0o600 });
  }));
  const results = dryRun ? plans : commitWrites(plans);
  return results.map((result) => ({
    path: result.path,
    changed: result.changed,
    backupPath: result.backupPath,
  }));
}

export function validateBundledCatalogs() {
  const opencode = readCatalog(bundledDir, OPEN_CODE);
  const freellmapi = readCatalog(bundledDir, FREE_LLM);
  const curation = loadCuration();
  for (const { id, channel } of OPEN_CODE_GROUPS) {
    const ids = opencode.groups[id].map((model) => model.id);
    if (new Set(ids).size !== ids.length || ids.some((modelId) => !opencode.availableIds[channel].includes(modelId))) {
      throw new Error(`Grupo invalido: ${id}`);
    }
  }
  if (!freellmapi.strategies.some(({ id }) => id === freellmapi.router) || !freellmapi.models.length) {
    throw new Error("Catalogo FreeLLMAPI incompleto.");
  }
  if (curation.opencode.some((key) => {
    const [group, ...model] = key.split("/");
    return !opencode.groups[group]?.some(({ id }) => id === model.join("/"));
  }) || curation.freellmapi.some((id) => !freellmapi.strategies.some((model) => model.id === id))) {
    throw new Error("Curadoria referencia modelos ausentes no pacote.");
  }
}
