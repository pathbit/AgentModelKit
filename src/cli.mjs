import fs from "node:fs";
import { execFileSync } from "node:child_process";
import { getProvider, listProviders } from "./providers/index.mjs";
import { detectFreeLLMApiBaseUrl } from "./providers/freellmapi.mjs";
import { listTargets, normalizeTargets, TARGETS } from "./targets/index.mjs";
import { readSavedKey, resolveProviderApiKey } from "./keys.mjs";
import { getCopilotDir, getCopilotProvidersPath, getKeyFilePath, getVSCodeChatModelsPath } from "./utils/paths.mjs";
import { readJsonOrNull } from "./utils/json.mjs";
import { promptMultiSelect, promptSelect, promptText } from "./ui/prompts.mjs";

const USAGE = `AgentModelKit (@pathbit/agentmodelkit)

Uso:
  agentmodelkit [comando] [opcoes]

Comandos:
  init               Assistente interativo com checkboxes (padrao sem argumentos)
  copilot            Configura apenas o GitHub Copilot CLI (~/.copilot/providers.json)
  vscode             Configura apenas o VS Code (chatLanguageModels.json)
  list               Lista providers, tiers e targets suportados
  doctor             Diagnostica caminhos, Node.js, copilot CLI, VS Code e chaves
  key <provider>     Imprime a chave salva em <COPILOT_HOME>/<provider>.key

Opcoes:
  -p, --providers <lista>        opencode, freellmapi ou opencode,freellmapi
  -t, --targets <lista>          vscode, copilot-cli ou all (padrao: ambos)
  --tiers <lista>                OpenCode: free | go | payg | go,free | all (padrao: free)
  --url <url-ou-porta>           URL ou porta do FreeLLMAPI (ex: http://localhost:4000/v1 ou 4000)
  --port <numero>                Porta dinamica para FreeLLMAPI (ex: 31416)
  --freellmapi-mode <modo>       auto (padrao, somente roteador) | strategies | ready
  --models <lista>               Filtra IDs especificos de modelos (ex: hungerg-free,auto)
  -k, --key <valor>              Informa a API key diretamente (para 1 provider)
  --key-file <caminho>           Caminho customizado do arquivo .key
  -m, --default-model <id>       Modelo padrao para \`copilot config model\`
  --live                         Busca modelos ao vivo nas APIs antes de gravar
  --inline-key                   Grava a chave literal no JSON em vez de apiKeyCommand
  --no-save-key                  Nao cria <COPILOT_HOME>/<provider>.key
  --no-default-model             Nao altera \`copilot config model\`
  --dry-run                      Simula e mostra resumo sem gravar arquivos
  -y, --yes                      Modo nao interativo usando defaults seguros
  -h, --help                     Exibe esta ajuda

Exemplos:
  agentmodelkit
  agentmodelkit copilot --providers opencode --tiers free
  agentmodelkit init --providers freellmapi --port 31416 --targets all
  agentmodelkit init --providers opencode,freellmapi --tiers go,free --models claude-haiku-5-5,auto`;

export function parseCliArgs(argv) {
  const args = [...argv];
  let command = null;
  const positional = [];

  if (args.length > 0 && !args[0].startsWith("-")) {
    const candidate = args[0].toLowerCase();
    if (["init", "copilot", "vscode", "list", "doctor", "key", "help"].includes(candidate)) {
      command = args.shift().toLowerCase();
    }
  }

  const opts = {
    command,
    providers: null,
    targets: null,
    tiers: null,
    url: null,
    port: null,
    freellmapiMode: null,
    models: null,
    key: null,
    keyFile: null,
    defaultModel: null,
    live: false,
    inlineKey: false,
    noSaveKey: false,
    noDefaultModel: false,
    dryRun: false,
    yes: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "-h" || a === "--help") opts.help = true;
    else if (a === "-y" || a === "--yes") opts.yes = true;
    else if (a === "--live") opts.live = true;
    else if (a === "--inline-key") opts.inlineKey = true;
    else if (a === "--no-save-key") opts.noSaveKey = true;
    else if (a === "--no-default-model") opts.noDefaultModel = true;
    else if (a === "--dry-run") opts.dryRun = true;
    else if (a === "-p" || a === "--provider" || a === "--providers") opts.providers = args[++i];
    else if (a === "-t" || a === "--target" || a === "--targets") opts.targets = args[++i];
    else if (a === "--tiers" || a === "--tier" || a === "--licenses") opts.tiers = args[++i];
    else if (a === "--url") opts.url = args[++i];
    else if (a === "--port") opts.port = args[++i];
    else if (a === "--freellmapi-mode") opts.freellmapiMode = args[++i];
    else if (a === "--models" || a === "--model-filter") opts.models = args[++i];
    else if (a === "-k" || a === "--key") opts.key = args[++i];
    else if (a === "--key-file") opts.keyFile = args[++i];
    else if (a === "-m" || a === "--default-model") opts.defaultModel = args[++i];
    else if (!a.startsWith("-")) positional.push(a);
    else throw new Error(`Opcao desconhecida: ${a}`);
  }

  if (command === "copilot") opts.targets = "copilot-cli";
  else if (command === "vscode") opts.targets = "vscode";

  opts.positional = positional;
  return opts;
}

/**
 * Filter resolved provider groups down to a selected list of model IDs (or `<provider>/<id>`),
 * dropping empty groups and keeping `defaultModel` valid.
 */
export function filterResolvedProvidersByModelIds(resolvedProviders, rawSelectedIds) {
  const tokens = Array.isArray(rawSelectedIds)
    ? rawSelectedIds
    : String(rawSelectedIds || "").split(",").map((s) => s.trim()).filter(Boolean);

  if (tokens.length === 0) return resolvedProviders;
  const want = new Set(tokens);

  const filteredProviders = [];
  for (const resolved of resolvedProviders) {
    const groups = [];
    for (const group of resolved.groups) {
      const models = group.models.filter((m) => want.has(m.id) || want.has(`${group.id}/${m.id}`));
      if (models.length > 0) {
        groups.push({ ...group, models });
      }
    }
    if (groups.length > 0) {
      const hasOriginalDefault = groups.some((g) => g.models.some((m) => `${g.id}/${m.id}` === resolved.defaultModel));
      const fallbackDefault = `${groups[0].id}/${groups[0].models[0].id}`;
      filteredProviders.push({
        ...resolved,
        groups,
        defaultModel: hasOriginalDefault ? resolved.defaultModel : fallbackDefault,
      });
    }
  }
  return filteredProviders;
}

function cmdList() {
  console.log("=== Providers ===");
  for (const p of listProviders()) {
    console.log(`- ${p.id} (${p.label}): ${p.description}`);
    console.log(`  Tiers: ${p.availableTiers.join(", ")} | Key file: ${p.keyFile} | Env: ${p.envVar}`);
  }
  console.log("\n=== Targets ===");
  for (const t of listTargets()) {
    console.log(`- ${t.id}: ${t.description}`);
  }
}

function checkBinaryVersion(bin, args = ["--version"]) {
  try {
    return execFileSync(bin, args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return null;
  }
}

async function cmdDoctor(env = process.env) {
  console.log("=== AgentModelKit Doctor ===");
  console.log(`OS: ${process.platform} (${process.arch}) | Node.js: ${process.version}`);

  const copilotVer = checkBinaryVersion("copilot");
  console.log(`GitHub Copilot CLI: ${copilotVer || "nao encontrado no PATH"}`);

  const codeVer = checkBinaryVersion("code");
  console.log(`VS Code CLI (code): ${codeVer ? codeVer.split("\n")[0] : "nao encontrado no PATH"}`);

  const copilotProviders = getCopilotProvidersPath(env);
  const copilotJson = readJsonOrNull(copilotProviders);
  console.log(
    `Copilot providers.json (${copilotProviders}): ` +
      (copilotJson ? `${copilotJson.providers?.length || 0} providers, ${copilotJson.models?.length || 0} models` : "ausente")
  );

  const vscodePath = getVSCodeChatModelsPath(process.platform, env);
  const vscodeJson = readJsonOrNull(vscodePath);
  const vscModels = Array.isArray(vscodeJson)
    ? vscodeJson.reduce((acc, g) => acc + (g.models?.length || 0), 0)
    : 0;
  console.log(
    `VS Code chatLanguageModels.json (${vscodePath}): ` +
      (vscodeJson ? `${vscodeJson.length} blocos, ${vscModels} models` : "ausente")
  );

  const detectedFreeUrl = await detectFreeLLMApiBaseUrl({ env });
  console.log(`FreeLLMAPI URL detectada: ${detectedFreeUrl}`);

  console.log(`Chaves em ${getCopilotDir(env)}:`);
  for (const p of listProviders()) {
    const kf = getKeyFilePath(p.keyFile, env);
    console.log(`  - ${p.id} (${kf}): ${fs.existsSync(kf) ? "OK" : "nao configurada"}`);
  }
}

async function gatherInteractiveConfig(opts, env) {
  if (!opts.targets && !opts.command) {
    const pickedTargets = await promptMultiSelect({
      title: "Quais ferramentas voce quer configurar?",
      options: [
        { label: "VS Code", value: "vscode", hint: "chatLanguageModels.json", checked: true },
        { label: "GitHub Copilot CLI", value: "copilot-cli", hint: "~/.copilot/providers.json", checked: true },
      ],
      minSelected: 1,
    });
    opts.targets = pickedTargets.join(",");
  }

  if (!opts.providers) {
    const pickedServices = await promptMultiSelect({
      title: "Quais servicos / licencas deseja ativar (pode combinar todos)?",
      options: [
        { label: "OpenCode — Free", value: "opencode:free", hint: "4 modelos gratuitos do Go", checked: true },
        { label: "OpenCode — Go", value: "opencode:go", hint: "27 modelos pagos inclusos no Go", checked: false },
        { label: "OpenCode — Console PAYG", value: "opencode:payg", hint: "45 modelos Pay-as-you-go", checked: false },
        { label: "FreeLLMAPI — Router 100% gratis", value: "freellmapi", hint: "porta dinamica, failover automatico", checked: false },
      ],
      minSelected: 1,
    });

    const selectedProviders = [];
    const selectedOpenCodeTiers = [];
    for (const item of pickedServices) {
      if (item.startsWith("opencode:")) {
        if (!selectedProviders.includes("opencode")) selectedProviders.push("opencode");
        selectedOpenCodeTiers.push(item.slice("opencode:".length));
      } else if (!selectedProviders.includes(item)) {
        selectedProviders.push(item);
      }
    }
    opts.providers = selectedProviders.join(",");
    if (selectedOpenCodeTiers.length > 0 && !opts.tiers) {
      opts.tiers = selectedOpenCodeTiers.join(",");
    }
  }

  const providerList = String(opts.providers).split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (providerList.includes("opencode") && !opts.tiers) {
    const pickedTiers = await promptMultiSelect({
      title: "Para OpenCode, quais licencas/tiers deseja ativar?",
      options: [
        { label: "Free (4 modelos gratuitos no Go)", value: "free", checked: true },
        { label: "Go (27 modelos pagos da assinatura)", value: "go", checked: false },
        { label: "Console PAYG (45 modelos ativos)", value: "payg", checked: false },
      ],
      minSelected: 1,
    });
    opts.tiers = pickedTiers.join(",");
  }

  if (providerList.includes("freellmapi") && !opts.url && !opts.port) {
    const detected = await detectFreeLLMApiBaseUrl({ env });
    const entered = await promptText(
      `\nURL ou porta dinamica do FreeLLMAPI [Enter = auto (${detected})]: `,
      ""
    );
    if (entered) {
      if (/^\d+$/.test(entered)) opts.port = entered;
      else opts.url = entered;
    }
  }

  if (providerList.includes("freellmapi") && !opts.freellmapiMode) {
    opts.freellmapiMode = await promptSelect({
      title: "Como configurar os modelos do FreeLLMAPI?",
      options: [
        { label: "Somente roteador 'auto' (recomendado)", value: "auto", hint: "FreeLLMAPI escolhe e faz failover sozinho" },
        { label: "Estrategias virtuais (6 modos)", value: "strategies", hint: "auto, auto:smart, auto:fast, reliable, balanced, fusion" },
        { label: "Buscar modelos prontos ao vivo", value: "ready", hint: "GET /v1/models?execution_status=ready" },
      ],
      defaultIndex: 0,
    });
  }
}

async function maybePickModelsInteractively(resolvedProviders) {
  const allItems = [];
  for (const resolved of resolvedProviders) {
    for (const group of resolved.groups) {
      for (const model of group.models) {
        allItems.push({
          label: `${group.prefix} ${model.name}`,
          hint: model.id,
          value: `${group.id}/${model.id}`,
          checked: true,
        });
      }
    }
  }

  if (allItems.length <= 1) return resolvedProviders;

  const mode = await promptSelect({
    title: `Foram preparados ${allItems.length} modelos. Como deseja prosseguir?`,
    options: [
      { label: `Ativar todos os ${allItems.length} modelos`, value: "all" },
      { label: "Selecionar modelos manualmente com checkboxes [x]", value: "pick" },
    ],
    defaultIndex: 0,
  });

  if (mode === "all") return resolvedProviders;

  const selectedKeys = await promptMultiSelect({
    title: "Marque os modelos que deseja instalar",
    options: allItems,
    pageSize: 14,
    minSelected: 1,
  });

  return filterResolvedProvidersByModelIds(resolvedProviders, selectedKeys);
}

export async function runCli(argv = process.argv.slice(2), env = process.env) {
  const opts = parseCliArgs(argv);

  if (opts.help || opts.command === "help") {
    console.log(USAGE);
    return;
  }
  if (opts.command === "list") {
    cmdList();
    return;
  }
  if (opts.command === "doctor") {
    await cmdDoctor(env);
    return;
  }
  if (opts.command === "key") {
    const val = readSavedKey(opts.positional[0], env);
    process.stdout.write(val);
    return;
  }

  const interactive = !opts.yes && (!opts.providers || (!opts.targets && !opts.command));
  if (interactive && process.stdin.isTTY) {
    await gatherInteractiveConfig(opts, env);
  }

  const targetIds = normalizeTargets(opts.targets || "vscode,copilot-cli");
  const providerIds = (opts.providers ? String(opts.providers).split(",") : ["opencode"])
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const nonInteractive = Boolean(opts.yes || !process.stdin.isTTY);
  const inlineApiKeys = {};
  let resolvedProviders = [];

  for (const pid of providerIds) {
    const provider = getProvider(pid);
    let apiKey = null;

    if (provider.requiresKey && (targetIds.includes("copilot-cli") || opts.inlineKey || pid === "freellmapi")) {
      try {
        const keyRes = await resolveProviderApiKey(
          provider,
          {
            key: providerIds.length === 1 ? opts.key : null,
            keyFile: providerIds.length === 1 ? opts.keyFile : null,
            noSaveKey: opts.noSaveKey || opts.dryRun,
            nonInteractive,
          },
          env
        );
        apiKey = keyRes.apiKey;
        if (opts.inlineKey) {
          inlineApiKeys[provider.id] = apiKey;
        }
        if (keyRes.savedTo) {
          console.log(`[${provider.id}] Chave salva com seguranca em: ${keyRes.savedTo}`);
        } else {
          console.log(`[${provider.id}] Chave carregada de: ${keyRes.source}`);
        }
      } catch (err) {
        if (targetIds.includes("copilot-cli") || opts.inlineKey) {
          throw err;
        }
      }
    }

    const resolved = await provider.resolve({
      tiers: opts.tiers || provider.defaultTiers,
      baseUrl: pid === "freellmapi" ? opts.url : undefined,
      port: pid === "freellmapi" ? opts.port : undefined,
      mode: pid === "freellmapi" ? opts.freellmapiMode : undefined,
      apiKey,
      live: opts.live,
      env,
    });
    resolvedProviders.push(resolved);
    const totalModels = resolved.groups.reduce((acc, g) => acc + g.models.length, 0);
    console.log(`[${provider.id}] ${totalModels} modelo(s) preparado(s) (origem: ${resolved.source}).`);
  }

  if (opts.models) {
    resolvedProviders = filterResolvedProvidersByModelIds(resolvedProviders, opts.models);
  } else if (interactive && process.stdin.isTTY) {
    resolvedProviders = await maybePickModelsInteractively(resolvedProviders);
  }

  if (resolvedProviders.length === 0) {
    throw new Error("Nenhum modelo selecionado para configuracao.");
  }

  const results = [];
  for (const tid of targetIds) {
    const target = TARGETS[tid];
    const res = target.apply(
      resolvedProviders,
      {
        dryRun: opts.dryRun,
        inlineApiKeys,
        defaultModel: opts.defaultModel,
        noDefaultModel: opts.noDefaultModel,
      },
      env
    );
    results.push(res);

    if (res.dryRun) {
      console.log(`[DRY-RUN -> ${tid}] ${res.modelCount} modelo(s) seriam gravados em ${res.path}`);
    } else {
      console.log(
        `[${tid}] ${res.modelCount} modelo(s) gravados em: ${res.path}` +
          (res.backupPath ? ` (backup: ${res.backupPath})` : "")
      );
      if (tid === "copilot-cli" && res.defaultModel) {
        console.log(
          res.defaultModelApplied
            ? `[copilot-cli] Modelo padrao definido: ${res.defaultModel}`
            : `[copilot-cli] Para definir como padrao rode: copilot config model ${res.defaultModel}`
        );
      }
    }
  }

  if (!opts.dryRun && targetIds.includes("vscode")) {
    console.log("[vscode] Rode 'Developer: Reload Window' no VS Code para atualizar o seletor.");
  }
  return results;
}
