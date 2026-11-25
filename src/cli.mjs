import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { getProvider, listProviders } from "./providers/index.mjs";
import { detectFreeLLMApiBaseUrl, normalizeFreeLLMBaseUrl } from "./providers/freellmapi.mjs";
import { loadCustomProviders } from "./providers/custom.mjs";
import { normalizeOpenCodeTiers } from "./providers/opencode.mjs";
import { OPEN_CODE_GROUPS, fetchModelRows, fetchOpenCodeDirectory } from "./catalogs/opencode.mjs";
import { getCatalogDir, loadCatalog, refreshCatalogs } from "./catalogs/index.mjs";
import { listTargets, normalizeTargets, TARGETS } from "./targets/index.mjs";
import { describeApply } from "./targets/config.mjs";
import { readSavedKey, resolveProviderApiKey } from "./keys.mjs";
import { getCopilotDir, getCopilotProvidersPath, getKeyFilePath, getVSCodeChatModelsPath } from "./utils/paths.mjs";
import { commitWrites, jsonWrite, parseSnapshot, readJsonOrNull, readSnapshot } from "./utils/json.mjs";
import { promptMultiSelect, promptSelect, promptText } from "./ui/prompts.mjs";

const USAGE = `AgentModelKit (@pathbit/agentmodelkit)

Uso: agentmodelkit [comando] [opcoes]

  init, add          Adiciona ou atualiza providers e modelos (init e o padrao)
  copilot, vscode    Configura apenas o cliente indicado
  prune              Simula remocao de modelos ausentes na origem. Use --apply para gravar
  catalog list       Mostra os catalogos utilizados
  catalog update     Atualiza o cache a partir das fontes oficiais
  list, doctor       Lista integracoes ou diagnostica a configuracao local
  key <provider>     Imprime a chave salva

Selecao:
  -p, --providers <lista>    opencode, freellmapi ou um provider manual custom-*
  -t, --targets <lista>      vscode, copilot-cli ou all
  --tiers <lista>            OpenCode: go, payg ou all (free apenas para prune)
  --models <lista>           IDs exatos ou <grupo>/<modelo>
  --powerful                Adiciona todos os destaques da curadoria para os tiers escolhidos
  --provider-file <json>     Manifesto local de provider (repetivel)
  --replace                 Substitui a selecao dos providers indicados
  --live                    Consulta disponibilidade antes de adicionar
  --url <url-ou-porta>       Endereco base do FreeLLMAPI
  --port <numero>            Porta do FreeLLMAPI
  --freellmapi-mode <modo>   auto | strategies | ready

Credenciais e aplicacao:
  -k, --key <valor>           Chave para um unico provider
  --key-file <arquivo>       Le a chave de um arquivo
  --no-save-key             Omite copia separada da chave em .key
  -m, --default-model <id>   Define o modelo padrao no Copilot CLI
  --dry-run                 Exibe as mudancas previstas
  --apply                   Aplica prune
  -y, --yes                  Usa modo nao interativo
  -h, --help                 Mostra esta ajuda

Catalogos:
  catalog list [--source opencode|freellmapi|all]
  catalog update [--source opencode|freellmapi|all] [--dry-run]`;

const commands = new Set(["init", "add", "copilot", "vscode", "prune", "catalog", "list", "doctor", "key", "help"]);
const flags = {
  "-h": "help", "--help": "help", "-y": "yes", "--yes": "yes", "--live": "live",
  "--inline-key": "inlineKey", "--no-save-key": "noSaveKey", "--no-default-model": "noDefaultModel",
  "--dry-run": "dryRun", "--powerful": "powerful", "--replace": "replace", "--apply": "apply",
};
const params = {
  "-p": "providers", "--provider": "providers", "--providers": "providers",
  "-t": "targets", "--target": "targets", "--targets": "targets",
  "--tiers": "tiers", "--tier": "tiers", "--licenses": "tiers",
  "--url": "url", "--port": "port", "--freellmapi-mode": "freellmapiMode",
  "--models": "models", "--model-filter": "models", "--provider-file": "providerFiles",
  "-k": "key", "--key": "key", "--key-file": "keyFile",
  "-m": "defaultModel", "--default-model": "defaultModel", "--source": "source",
};

export function parseCliArgs(argv) {
  const args = [...argv];
  const command = args[0] && !args[0].startsWith("-") ? args.shift().toLowerCase() : null;
  if (command && !commands.has(command)) throw new Error(`Comando desconhecido: ${command}`);
  const opts = { command, providerFiles: [], positional: [] };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (Object.hasOwn(flags, arg)) opts[flags[arg]] = true;
    else if (Object.hasOwn(params, arg)) {
      const value = args[++i];
      if (!value?.trim() || value.startsWith("-")) throw new Error(`Informe o valor de ${arg}`);
      const name = params[arg];
      if (name === "providerFiles") opts.providerFiles.push(value);
      else if (Object.hasOwn(opts, name)) throw new Error(`Opcao repetida: ${arg}`);
      else opts[name] = value;
    } else if (arg.startsWith("-")) throw new Error(`Opcao desconhecida: ${arg}`);
    else opts.positional.push(arg);
  }
  if (command === "copilot" || command === "vscode") {
    if (opts.targets) throw new Error("Use init, add ou prune para escolher --targets.");
    opts.targets = command === "copilot" ? "copilot-cli" : "vscode";
  }
  return opts;
}

function list(raw) {
  const values = String(raw).split(",").map((item) => item.trim());
  if (values.some((item) => !item)) throw new Error("Separe valores por virgulas e omita itens vazios.");
  return [...new Set(values)];
}

export function filterResolvedProvidersByModelIds(resolvedProviders, raw) {
  const requested = new Set(Array.isArray(raw) ? raw : list(raw));
  const matched = new Set();
  const filtered = resolvedProviders.map((resolved) => ({
    ...resolved,
    groups: resolved.groups.map((group) => ({
      ...group,
      models: group.models.filter(({ id }) => {
        const keys = [id, `${group.id}/${id}`, `${resolved.providerId}/${id}`].filter((key) => requested.has(key));
        for (const key of keys) matched.add(key);
        return keys.length > 0;
      }),
    })).filter((group) => group.models.length > 0),
  })).filter((resolved) => resolved.groups.length > 0);
  const unknown = [...requested].filter((key) => !matched.has(key));
  if (unknown.length) throw new Error(`Modelos indisponiveis na selecao: ${unknown.join(", ")}`);
  return filtered;
}

function cmdList() {
  for (const p of listProviders()) console.log(`${p.id}: ${p.description} | ${p.availableTiers.join(", ")} | ${p.envVar}`);
  for (const t of listTargets()) console.log(`${t.id}: ${t.description}`);
}

function checkBinaryVersion(bin, env) {
  try {
    return execFileSync(bin, ["--version"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"], timeout: 4000, env, shell: process.platform === "win32" }).trim().split(/\r?\n/)[0];
  } catch {
    return "nao encontrado no PATH";
  }
}

async function cmdDoctor(env) {
  console.log(`=== AgentModelKit Doctor ===\n${process.platform}/${process.arch} | Node.js ${process.version}`);
  console.log(`GitHub Copilot CLI: ${checkBinaryVersion("copilot", env)}`);
  console.log(`VS Code CLI: ${checkBinaryVersion("code", env)}`);
  for (const location of [getCopilotProvidersPath(env), getVSCodeChatModelsPath(process.platform, env)]) {
    try {
      const data = readJsonOrNull(location);
      const count = Array.isArray(data) ? data.reduce((sum, block) => sum + (block.models?.length ?? 0), 0) : data?.models?.length;
      console.log(`${location}: ${data ? `${count ?? 0} modelo(s)` : "ausente"}`);
    } catch (error) {
      console.log(`${location}: ${error.message}`);
    }
  }
  console.log(`FreeLLMAPI URL detectada: ${await detectFreeLLMApiBaseUrl({ env })}`);
  for (const p of listProviders()) console.log(`${p.id}: chave local ${fs.existsSync(getKeyFilePath(p.keyFile, env)) ? "OK" : "ausente"}`);
}

async function cmdCatalog(opts, env) {
  const [action = "list"] = opts.positional;
  const source = opts.source ?? "all";
  if (!["all", "opencode", "freellmapi"].includes(source) || opts.positional.length > 1) throw new Error("Consulte catalog --help.");
  const dir = getCatalogDir(env);
  if (action === "update") {
    const results = await refreshCatalogs({ dir, source, dryRun: opts.dryRun });
    for (const { path: file, changed } of results) console.log(`${changed ? (opts.dryRun ? "Atualizaria" : "Atualizado") : "Atual"} ${file}`);
    return;
  }
  if (action !== "list") throw new Error("Use catalog list ou catalog update.");
  if (source !== "freellmapi") {
    const { groups, updatedAt } = loadCatalog("opencode-catalog.json", env);
    console.log(`OpenCode (${updatedAt}):`);
    for (const [group, models] of Object.entries(groups)) console.log(`  ${group}: ${models.map(({ id }) => id).join(", ")}`);
  }
  if (source !== "opencode") {
    const data = loadCatalog("freellmapi-catalog.json", env);
    console.log(`FreeLLMAPI (${data.upstreamVersion}): ${data.models.length} entradas de referencia. Estrategias: ${data.strategies.map(({ id }) => id).join(", ")}`);
  }
}

async function gatherInteractiveConfig(opts) {
  if (!opts.targets) {
    opts.targets = (await promptMultiSelect({
      title: "Quais ferramentas voce quer configurar?",
      options: listTargets().map((target) => ({ label: target.label, value: target.id, checked: true })),
    })).join(",");
  }
  if (!opts.providers && !opts.providerFiles.length) {
    const services = await promptMultiSelect({
      title: "Quais providers deseja ativar?",
      options: listProviders().map((provider) => ({ label: provider.label, value: provider.id, checked: provider.id === "freellmapi" })),
    });
    opts.providers = services.join(",");
  }
  if (opts.providers?.split(",").some((id) => id.trim().toLowerCase() === "opencode") && !opts.tiers && !opts.powerful) {
    opts.tiers = (await promptMultiSelect({
      title: "Quais planos do OpenCode deseja usar?",
      options: [
        { label: "Go (assinatura)", value: "go" },
        { label: "Console (PAYG)", value: "payg", checked: true },
      ],
    })).join(",");
  }
  if (opts.providers?.split(",").some((id) => id.trim().toLowerCase() === "freellmapi") && !opts.freellmapiMode && !opts.powerful && !opts.live) {
    if (!opts.url && !opts.port) opts.url = await promptText("URL ou porta do FreeLLMAPI [Enter = detectar]: ");
    opts.freellmapiMode = await promptSelect({
      title: "Selecione os modelos do FreeLLMAPI",
      options: [
        { label: "Somente roteador auto", value: "auto" },
        { label: "Estrategias virtuais", value: "strategies" },
        { label: "Modelos prontos no servidor local", value: "ready" },
      ],
    });
  }
}

async function maybePickModels(resolved) {
  const items = resolved.flatMap((provider) => provider.groups.flatMap((group) => group.models.map((model) => ({
    label: `${group.label} · ${model.name}`, hint: model.id, value: `${group.id}/${model.id}`, checked: true,
  }))));
  if (items.length <= 1) return resolved;
  const mode = await promptSelect({
    title: `Ativar os ${items.length} modelos?`,
    options: [{ label: "Ativar todos", value: "all" }, { label: "Selecionar modelos individualmente", value: "pick" }],
  });
  if (mode === "all") return resolved;
  const ids = await promptMultiSelect({ title: "Selecione modelos", options: items });
  return filterResolvedProvidersByModelIds(resolved, ids);
}

function selectProviders(opts) {
  const custom = loadCustomProviders(opts.providerFiles);
  const ids = opts.providers ? list(opts.providers.toLowerCase()) :
    (custom.size ? [...custom.keys()] : [opts.command === "prune" ? "opencode" : "freellmapi"]);
  return ids.map((id) => custom.get(id) ?? getProvider(id));
}

async function buildPruneRules(providers, opts, env) {
  const rules = await Promise.all(providers.map(async (provider) => {
    if (provider.id === "opencode") {
      const directory = await fetchOpenCodeDirectory();
      const available = Object.fromEntries(Object.entries(directory).map(([key, values]) => [key, new Set(values.map(({ id }) => id))]));
      const allowed = opts.tiers ? normalizeOpenCodeTiers(opts.tiers) : ["free", "go", "payg"];
      return [provider.id, (groupId, id) => {
        const group = OPEN_CODE_GROUPS.find((entry) => entry.id === groupId);
        return group && allowed.includes(group.tier) && !available[group.channel].has(id);
      }];
    }
    const { apiKey } = await resolveProviderApiKey(provider, { ...opts, noSaveKey: true, nonInteractive: true, optional: !provider.requiresKey }, env);
    if (provider.id === "freellmapi") {
      const baseUrl = opts.url ? normalizeFreeLLMBaseUrl(opts.url) : await detectFreeLLMApiBaseUrl({ port: opts.port, env });
      const data = await fetchModelRows(`${baseUrl}/models`, { apiKey });
      const virtual = loadCatalog("freellmapi-catalog.json", env).strategies;
      const ids = new Set([...data, ...virtual].map(({ id }) => id));
      return [provider.id, (_group, id, url) => [baseUrl, `${baseUrl}/chat/completions`].includes(url) && !ids.has(id)];
    }
    const ids = await provider.availability({ apiKey });
    return [provider.id, (_group, id, url) => {
      const base = url?.replace(/\/(?:chat\/completions|responses|messages)$/, "");
      return (provider.ownsEndpoint(url) || provider.ownsEndpoint(base) || provider.ownsEndpoint(`${base}/v1`)) && !ids.has(id);
    }];
  }));
  return new Map(rules);
}

function planDefaultModel(selection, plans, env) {
  const options = plans.find(({ targetId }) => targetId === "copilot-cli")?.selection ?? [];
  const matches = options.filter((entry) => entry.selection === selection || entry.id === selection);
  if (matches.length !== 1) throw new Error("Modelo padrao indisponivel ou ambiguo. Informe <grupo>/<modelo> e inclua Copilot nos targets.");
  const [{ selection: selected }] = matches;
  const snapshot = readSnapshot(path.join(getCopilotDir(env), "settings.json"));
  const existing = parseSnapshot(snapshot, {});
  if (!existing || typeof existing !== "object" || Array.isArray(existing)) throw new Error(`Formato invalido em ${snapshot.path}`);
  const { modelProviderId, ...settings } = existing;
  return { write: jsonWrite(snapshot, { ...settings, model: selected }), selected };
}

function planRetiredCopilotDefaults(plans, env) {
  const plan = plans.find(({ targetId }) => targetId === "copilot-cli");
  if (!plan?.removed.length) return null;
  const snapshot = readSnapshot(path.join(getCopilotDir(env), "settings.json"));
  if (!snapshot.content) return null;
  const settings = parseSnapshot(snapshot);
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) throw new Error(`Formato invalido em ${snapshot.path}`);
  const removed = [];
  const retained = new Set(plan.modelSelections);
  for (const [modelKey, providerKey] of [["model", "modelProviderId"], ["planModel", "planModelProviderId"]]) {
    const selected = settings[providerKey] ? `${settings[providerKey]}/${settings[modelKey]}` : settings[modelKey];
    if (plan.removed.includes(selected) && !retained.has(selected)) {
      removed.push(selected);
      delete settings[modelKey];
      delete settings[providerKey];
    }
  }
  return removed.length ? { write: jsonWrite(snapshot, settings), removed } : null;
}

export async function runCli(argv = process.argv.slice(2), env = process.env) {
  const opts = parseCliArgs(argv);
  if (opts.help || opts.command === "help") return console.log(USAGE);
  if (opts.command === "catalog") return cmdCatalog(opts, env);
  if (opts.command === "key") {
    if (opts.positional.length !== 1) throw new Error("Informe o nome do provider.");
    process.stdout.write(readSavedKey(opts.positional[0], env));
    return;
  }
  if (opts.positional.length) throw new Error(`Argumento inesperado: ${opts.positional[0]}`);
  if (opts.command === "list") return cmdList();
  if (opts.command === "doctor") return cmdDoctor(env);

  const prune = opts.command === "prune";
  if (opts.inlineKey) throw new Error("Use o gerenciador de modelos do VS Code para salvar a chave no armazenamento do editor. O Copilot CLI recebe apiKey automaticamente.");
  if (opts.apply && !prune) throw new Error("--apply e exclusivo de prune.");
  if (opts.url && opts.port) throw new Error("Escolha --url ou --port.");
  if (opts.key && opts.keyFile) throw new Error("Escolha --key ou --key-file.");
  if (opts.powerful && opts.models) throw new Error("Escolha --powerful ou --models.");
  if (opts.defaultModel && opts.noDefaultModel) throw new Error("Escolha --default-model ou --no-default-model.");
  if (prune && (opts.replace || opts.models || opts.powerful || opts.defaultModel ||
      opts.freellmapiMode || opts.live || (opts.apply && opts.dryRun))) {
    throw new Error("Use prune com --providers, --targets e, para gravar, --apply. Consulte --help.");
  }
  const interactive = !opts.yes && !prune && process.stdin.isTTY && process.stdout.isTTY;
  const wizard = interactive && !opts.providers && !opts.providerFiles.length;
  if (wizard) await gatherInteractiveConfig(opts);
  const targetIds = normalizeTargets(opts.targets);
  const providers = selectProviders(opts);
  if ((opts.key || opts.keyFile) && providers.length > 1) throw new Error("Use variaveis de ambiente por provider quando selecionar mais de um.");
  const providerIds = providers.map(({ id }) => id);
  if (opts.tiers && !providerIds.includes("opencode")) throw new Error("--tiers se aplica ao OpenCode.");
  if (!prune && opts.tiers && normalizeOpenCodeTiers(opts.tiers).every((tier) => tier === "free")) {
    throw new Error("OpenCode Free e restrito ao proprio OpenCode. Use freellmapi, go ou payg.");
  }
  if ((opts.url || opts.port || opts.freellmapiMode) && !providerIds.includes("freellmapi")) throw new Error("Selecione freellmapi para usar opcoes de servidor.");
  const dryRun = Boolean(opts.dryRun || (prune && !opts.apply));
  const config = { dryRun, apiKeys: new Map() };
  const keyWrites = [];
  const keys = new Map();
  async function getKey(provider, discovering = false) {
    if (!provider.requiresKey) return {};
    if (!keys.has(provider.id)) {
      keys.set(provider.id, await resolveProviderApiKey(provider, {
        ...opts, noSaveKey: opts.noSaveKey || dryRun, deferWrite: true,
        optional: dryRun && !discovering, nonInteractive: !interactive,
      }, env));
    }
    return keys.get(provider.id);
  }
  let resolved = [];
  if (prune) config.prune = await buildPruneRules(providers, opts, env);
  else {
    for (const provider of providers) {
      const discovering = (provider.id === "freellmapi" && (opts.freellmapiMode === "ready" || opts.live) && !opts.powerful) ||
        (opts.live && provider.id.startsWith("custom-"));
      const { apiKey } = discovering ? await getKey(provider, true) : {};
      const tiers = opts.tiers ?? (opts.powerful && provider.id === "opencode" ? "all" : provider.defaultTiers);
      resolved.push(await provider.resolve({
        tiers, baseUrl: opts.url, port: opts.port, mode: opts.freellmapiMode, apiKey,
        live: opts.live, powerful: opts.powerful, env,
      }));
    }
    if (opts.models) resolved = filterResolvedProvidersByModelIds(resolved, opts.models);
    else if (wizard && !opts.powerful) resolved = await maybePickModels(resolved);
    resolved = resolved.filter((provider) => provider.groups.length);
    if (!resolved.length) throw new Error("Nenhum modelo selecionado.");
    if (opts.replace) config.replace = new Set(resolved.map(({ providerId }) => providerId));
    const required = targetIds.includes("copilot-cli") || opts.key || opts.keyFile;
    for (const { providerId } of resolved) {
      const provider = providers.find(({ id }) => id === providerId);
      if (!required && !keys.has(providerId)) continue;
      const key = await getKey(provider);
      if (!key.apiKey) continue;
      config.apiKeys.set(providerId, key.apiKey);
      if (key.write) keyWrites.push(key.write);
    }
  }
  const plans = targetIds.map((id) => TARGETS[id].plan(resolved, config, env));
  const defaultModel = opts.defaultModel ? planDefaultModel(opts.defaultModel, plans, env) : null;
  const clearedDefault = defaultModel ? null : planRetiredCopilotDefaults(plans, env);
  const writes = [...plans.flatMap((plan) => plan.writes), ...keyWrites];
  if (defaultModel || clearedDefault) writes.push((defaultModel ?? clearedDefault).write);
  const outcomes = dryRun ? [] : commitWrites(writes);
  const results = plans.map((plan) => describeApply(plan, dryRun, outcomes));
  for (const result of results) {
    const action = dryRun ? "simulacao" : result.changed ? "atualizado" : "sem mudancas";
    const summary = prune ? `${result.removed.length} remocao(oes)` : `${result.modelCount} modelo(s) selecionado(s)`;
    console.log(`[${result.targetId}] ${action} · ${summary} · ${result.path}`);
    for (const model of result.removed) console.log(`  - ${model}`);
  }
  for (const outcome of outcomes) if (outcome.backupPath) console.log(`Backup: ${outcome.backupPath}`);
  if (clearedDefault) console.log(`Selecoes removidas do Copilot: ${clearedDefault.removed.join(", ")}`);
  if (!dryRun && targetIds.includes("vscode") && resolved.some((provider) =>
    provider.groups.some((group) => group.vscodeSecretId))) {
    console.log("[vscode] Use Chat: Manage Language Models para informar as chaves no editor.");
  }
  if (defaultModel) console.log(`Modelo padrao ${dryRun ? "previsto" : "definido"}: ${defaultModel.selected}`);
  return results;
}
