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

Usage: agentmodelkit [command] [options]

  init, add          Adds or updates providers and models (init is the default)
  copilot, vscode    Configures only the named client
  prune              Previews removal of models missing upstream. Use --apply to write changes
  catalog list       Shows the catalogs in use
  catalog update     Refreshes the cache from official sources
  list, doctor       Lists integrations or diagnoses the local configuration
  key <provider>     Prints the saved key

Selection:
  -p, --providers <list>     opencode, freellmapi or a manual custom-* provider
  -t, --targets <list>       opencode (default), vscode, copilot-cli or all
  --tiers <list>             OpenCode: go, payg or all (free only for prune)
  --models <list>            Exact IDs or <group>/<model>
  --powerful                Adds curated highlights for the selected plans
  --project-dir <path>      OpenCode project directory (defaults to the working directory)
  --provider-file <json>     Local provider manifest (repeatable)
  --replace                 Replaces the managed selection for the specified providers
  --live                    Checks availability before adding
  --url <url-or-port>        FreeLLMAPI base address
  --port <number>            FreeLLMAPI port
  --freellmapi-mode <mode>   auto | strategies | ready

Credentials and application:
  -k, --key <value>          Key for one provider
  --key-file <file>          Reads the key from a file
  --no-save-key             Skips the separate copy of the key in .key
  -m, --default-model <id>   Sets the default model in Copilot CLI
  --dry-run                 Shows the proposed changes
  --apply                   Applies prune
  -y, --yes                  Uses non-interactive mode
  -h, --help                 Shows this help

Catalogs:
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
  "-m": "defaultModel", "--default-model": "defaultModel", "--source": "source", "--project-dir": "projectDir",
};

export function parseCliArgs(argv) {
  const args = [...argv];
  const command = args[0] && !args[0].startsWith("-") ? args.shift().toLowerCase() : null;
  if (command && !commands.has(command)) throw new Error(`Unknown command: ${command}`);
  const opts = { command, providerFiles: [], positional: [] };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (Object.hasOwn(flags, arg)) opts[flags[arg]] = true;
    else if (Object.hasOwn(params, arg)) {
      const value = args[++i];
      if (!value?.trim() || value.startsWith("-")) throw new Error(`Provide a value for ${arg}`);
      const name = params[arg];
      if (name === "providerFiles") opts.providerFiles.push(value);
      else if (Object.hasOwn(opts, name)) throw new Error(`Duplicate option: ${arg}`);
      else opts[name] = value;
    } else if (arg.startsWith("-")) throw new Error(`Unknown option: ${arg}`);
    else opts.positional.push(arg);
  }
  if (command === "copilot" || command === "vscode") {
    if (opts.targets) throw new Error("Use init, add or prune to select --targets.");
    opts.targets = command === "copilot" ? "copilot-cli" : "vscode";
  }
  return opts;
}

function list(raw) {
  const values = String(raw).split(",").map((item) => item.trim());
  if (values.some((item) => !item)) throw new Error("Separate values with commas and omit empty entries.");
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
  if (unknown.length) throw new Error(`Models unavailable in the selection: ${unknown.join(", ")}`);
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
    return "not found on PATH";
  }
}

async function cmdDoctor(env, projectDir) {
  console.log(`=== AgentModelKit Doctor ===\n${process.platform}/${process.arch} | Node.js ${process.version}`);
  console.log(`GitHub Copilot CLI: ${checkBinaryVersion("copilot", env)}`);
  console.log(`VS Code CLI: ${checkBinaryVersion("code", env)}`);
  console.log(`OpenCode CLI: ${checkBinaryVersion("opencode", env)}`);
  const project = path.resolve(projectDir ?? process.cwd(), ".opencode", "opencode.json");
  for (const location of [getCopilotProvidersPath(env), getVSCodeChatModelsPath(process.platform, env), project]) {
    try {
      const data = readJsonOrNull(location);
      const count = location === project
        ? Object.values(data?.providers ?? {}).reduce((sum, provider) => sum + Object.keys(provider.models ?? {}).length, 0)
        : Array.isArray(data) ? data.reduce((sum, block) => sum + (block.models?.length ?? 0), 0) : data?.models?.length;
      console.log(`${location}: ${data ? `${count ?? 0} model(s)` : "missing"}`);
    } catch (error) {
      console.log(`${location}: ${error.message}`);
    }
  }
  console.log(`Detected FreeLLMAPI URL: ${await detectFreeLLMApiBaseUrl({ env })}`);
  for (const p of listProviders()) console.log(`${p.id}: local key ${fs.existsSync(getKeyFilePath(p.keyFile, env)) ? "OK" : "missing"}`);
}

async function cmdCatalog(opts, env) {
  const [action = "list"] = opts.positional;
  const source = opts.source ?? "all";
  if (!["all", "opencode", "freellmapi"].includes(source) || opts.positional.length > 1) throw new Error("See catalog --help.");
  const dir = getCatalogDir(env);
  if (action === "update") {
    const results = await refreshCatalogs({ dir, source, dryRun: opts.dryRun });
    for (const { path: file, changed } of results) console.log(`${changed ? (opts.dryRun ? "Would update" : "Updated") : "Current"} ${file}`);
    return;
  }
  if (action !== "list") throw new Error("Use catalog list or catalog update.");
  if (source !== "freellmapi") {
    const { groups, updatedAt } = loadCatalog("opencode-catalog.json", env);
    console.log(`OpenCode (${updatedAt}):`);
    for (const [group, models] of Object.entries(groups)) console.log(`  ${group}: ${models.map(({ id }) => id).join(", ")}`);
  }
  if (source !== "opencode") {
    const data = loadCatalog("freellmapi-catalog.json", env);
    console.log(`FreeLLMAPI (${data.upstreamVersion}): ${data.models.length} reference entries. Strategies: ${data.strategies.map(({ id }) => id).join(", ")}`);
  }
}

async function gatherInteractiveConfig(opts) {
  if (!opts.targets) {
    opts.targets = (await promptMultiSelect({
      title: "Which coding agents would you like to configure?",
      options: listTargets().map((target) => ({ label: target.label, value: target.id, checked: target.id === "opencode" })),
    })).join(",");
  }
  if (!opts.providers && !opts.providerFiles.length) {
    const services = await promptMultiSelect({
      title: "Which providers would you like to enable?",
      options: listProviders().map((provider) => ({ label: provider.label, value: provider.id, checked: provider.id === "freellmapi" })),
    });
    opts.providers = services.join(",");
  }
  if (opts.providers?.split(",").some((id) => id.trim().toLowerCase() === "opencode") && !opts.tiers && !opts.powerful) {
    opts.tiers = (await promptMultiSelect({
      title: "Which OpenCode plans would you like to use?",
      options: [
        { label: "Go (subscription)", value: "go" },
        { label: "Console (PAYG)", value: "payg", checked: true },
      ],
    })).join(",");
  }
  if (opts.providers?.split(",").some((id) => id.trim().toLowerCase() === "freellmapi") && !opts.freellmapiMode && !opts.powerful && !opts.live) {
    if (!opts.url && !opts.port) opts.url = await promptText("FreeLLMAPI URL or port [Enter = detect]: ");
    opts.freellmapiMode = await promptSelect({
      title: "Select the FreeLLMAPI models",
      options: [
        { label: "Auto router only", value: "auto" },
        { label: "Virtual strategies", value: "strategies" },
        { label: "Ready models on the local server", value: "ready" },
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
    title: `Enable all ${items.length} models?`,
    options: [{ label: "Enable all", value: "all" }, { label: "Select models individually", value: "pick" }],
  });
  if (mode === "all") return resolved;
  const ids = await promptMultiSelect({ title: "Select models", options: items });
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
  if (matches.length !== 1) throw new Error("Default model unavailable or ambiguous. Specify <group>/<model> and include Copilot in the targets.");
  const [{ selection: selected }] = matches;
  const snapshot = readSnapshot(path.join(getCopilotDir(env), "settings.json"));
  const existing = parseSnapshot(snapshot, {});
  if (!existing || typeof existing !== "object" || Array.isArray(existing)) throw new Error(`Invalid format in ${snapshot.path}`);
  const { modelProviderId, ...settings } = existing;
  return { write: jsonWrite(snapshot, { ...settings, model: selected }), selected };
}

function planRetiredCopilotDefaults(plans, env) {
  const plan = plans.find(({ targetId }) => targetId === "copilot-cli");
  if (!plan?.removed.length) return null;
  const snapshot = readSnapshot(path.join(getCopilotDir(env), "settings.json"));
  if (!snapshot.content) return null;
  const settings = parseSnapshot(snapshot);
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) throw new Error(`Invalid format in ${snapshot.path}`);
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
    if (opts.positional.length !== 1) throw new Error("Specify the provider name.");
    process.stdout.write(readSavedKey(opts.positional[0], env));
    return;
  }
  if (opts.positional.length) throw new Error(`Unexpected argument: ${opts.positional[0]}`);
  if (opts.command === "list") return cmdList();
  if (opts.command === "doctor") return cmdDoctor(env, opts.projectDir);

  const prune = opts.command === "prune";
  if (opts.inlineKey) throw new Error("Use the VS Code model manager to store the key in the editor. Copilot CLI receives apiKey automatically.");
  if (opts.apply && !prune) throw new Error("--apply is available only with prune.");
  if (opts.url && opts.port) throw new Error("Choose --url or --port.");
  if (opts.key && opts.keyFile) throw new Error("Choose --key or --key-file.");
  if (opts.powerful && opts.models) throw new Error("Choose --powerful or --models.");
  if (opts.defaultModel && opts.noDefaultModel) throw new Error("Choose --default-model or --no-default-model.");
  if (prune && (opts.replace || opts.models || opts.powerful || opts.defaultModel ||
      opts.freellmapiMode || opts.live || (opts.apply && opts.dryRun))) {
    throw new Error("Use prune with --providers and --targets. Add --apply to save changes. See --help.");
  }
  const interactive = !opts.yes && !prune && process.stdin.isTTY && process.stdout.isTTY;
  const wizard = interactive && !opts.providers && !opts.providerFiles.length;
  if (wizard) await gatherInteractiveConfig(opts);
  const targetIds = normalizeTargets(opts.targets);
  if (opts.projectDir && !targetIds.includes("opencode")) throw new Error("--project-dir requires the opencode target.");
  if (opts.key && opts.noSaveKey && targetIds.includes("opencode")) {
    throw new Error("Use --key-file or a provider environment variable with --no-save-key for OpenCode.");
  }
  const providers = selectProviders(opts);
  if ((opts.key || opts.keyFile) && providers.length > 1) throw new Error("Use provider-specific environment variables when selecting multiple providers.");
  const providerIds = providers.map(({ id }) => id);
  if (opts.tiers && !providerIds.includes("opencode")) throw new Error("--tiers applies to OpenCode.");
  if (!prune && opts.tiers && normalizeOpenCodeTiers(opts.tiers).every((tier) => tier === "free")) {
    throw new Error("OpenCode Free is restricted to OpenCode itself. Use freellmapi, go or payg.");
  }
  if ((opts.url || opts.port || opts.freellmapiMode) && !providerIds.includes("freellmapi")) throw new Error("Select freellmapi to use server options.");
  const dryRun = Boolean(opts.dryRun || (prune && !opts.apply));
  const config = { dryRun, apiKeys: new Map(), projectKeyRefs: new Map(), projectDir: opts.projectDir };
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
    if (!resolved.length) throw new Error("No models selected.");
    if (opts.replace) config.replace = new Set(resolved.map(({ providerId }) => providerId));
    const required = targetIds.includes("copilot-cli") || opts.key || opts.keyFile;
    for (const { providerId } of resolved) {
      const provider = providers.find(({ id }) => id === providerId);
      if (targetIds.includes("opencode") && provider.requiresKey) {
        config.projectKeyRefs.set(providerId, `{env:${provider.envVar}}`);
      }
      if (!required && !keys.has(providerId)) continue;
      const key = await getKey(provider);
      if (!key.apiKey) continue;
      config.apiKeys.set(providerId, key.apiKey);
      if (key.write) keyWrites.push(key.write);
      if (targetIds.includes("opencode") && provider.requiresKey && (opts.keyFile || key.write)) {
        const file = path.resolve(opts.keyFile ?? key.keyFilePath);
        if (file.includes("}")) throw new Error("OpenCode key file paths cannot contain a closing brace.");
        config.projectKeyRefs.set(providerId, `{file:${file}}`);
      }
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
    const action = dryRun ? "dry run" : result.changed ? "updated" : "no changes";
    const summary = prune ? `${result.removed.length} removal(s)` : `${result.modelCount} selected model(s)`;
    console.log(`[${result.targetId}] ${action} · ${summary} · ${result.path}`);
    for (const model of result.removed) console.log(`  - ${model}`);
  }
  for (const outcome of outcomes) if (outcome.backupPath) console.log(`Backup: ${outcome.backupPath}`);
  if (clearedDefault) console.log(`Cleared Copilot selections: ${clearedDefault.removed.join(", ")}`);
  if (!dryRun && targetIds.includes("vscode") && resolved.some((provider) =>
    provider.groups.some((group) => group.vscodeSecretId))) {
    console.log("[vscode] Use Chat: Manage Language Models to enter keys in the editor.");
  }
  if (!dryRun && targetIds.includes("opencode") && !prune) {
    console.log("[opencode] Open this project in OpenCode and choose an AgentModelKit model with /models.");
  }
  if (defaultModel) console.log(`${dryRun ? "Planned default model" : "Default model set"}: ${defaultModel.selected}`);
  return results;
}
