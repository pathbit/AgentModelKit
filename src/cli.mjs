import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { getProvider, listProviders } from "./providers/index.mjs";
import { listTargets, normalizeTargets, TARGETS } from "./targets/index.mjs";
import { promptLine, readSavedKey, resolveProviderApiKey } from "./keys.mjs";
import { getCopilotDir, getCopilotProvidersPath, getKeyFilePath, getVSCodeChatModelsPath } from "./utils/paths.mjs";
import { readJsonOrNull } from "./utils/json.mjs";

const USAGE = `AgentModelKit (@pathbit/agentmodelkit)

Uso:
  agentmodelkit [comando] [opcoes]

Comandos:
  init               Assistente interativo completo (padrao sem argumentos)
  copilot            Configura apenas o GitHub Copilot CLI (~/.copilot/providers.json)
  vscode             Configura apenas o VS Code (chatLanguageModels.json)
  list               Lista providers, tiers e targets suportados
  doctor             Diagnostica caminhos, Node.js, copilot CLI, VS Code e chaves
  key <provider>     Imprime a chave salva em <COPILOT_HOME>/<provider>.key

Opcoes:
  -p, --providers <lista>    opencode, freellmapi ou opencode,freellmapi
  -t, --targets <lista>      vscode, copilot-cli ou all (padrao: ambos)
  --tiers <lista>            OpenCode: free | go | payg | go,free | all (padrao: free)
  --url <url>                URL base customizada (ex: FreeLLMAPI :3001 ou :31415)
  -k, --key <valor>          Informa a API key diretamente (para 1 provider)
  --key-file <caminho>       Caminho customizado do arquivo .key
  -m, --default-model <id>   Modelo padrao para \`copilot config model\`
  --live                     Busca modelos ao vivo nas APIs antes de gravar
  --inline-key               Grava a chave literal no JSON em vez de apiKeyCommand
  --no-save-key              Nao cria <COPILOT_HOME>/<provider>.key
  --no-default-model         Nao altera \`copilot config model\`
  --dry-run                  Simula e mostra resumo sem gravar arquivos
  -y, --yes                  Modo nao interativo usando defaults seguros
  -h, --help                 Exibe esta ajuda

Exemplos:
  agentmodelkit
  agentmodelkit copilot --providers opencode --tiers free
  agentmodelkit vscode --providers opencode,freellmapi --tiers go,free
  agentmodelkit init --providers freellmapi --url http://localhost:3001/v1 --targets all`;

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
    else if (a === "--tiers" || a === "--tier") opts.tiers = args[++i];
    else if (a === "--url") opts.url = args[++i];
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

function cmdDoctor(env = process.env) {
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

  console.log(`Chaves em ${getCopilotDir(env)}:`);
  for (const p of listProviders()) {
    const kf = getKeyFilePath(p.keyFile, env);
    console.log(`  - ${p.id} (${kf}): ${fs.existsSync(kf) ? "OK" : "nao configurada"}`);
  }
}

async function promptChoice(title, options, defaultChoice = "1") {
  console.log(`\n${title}`);
  for (let i = 0; i < options.length; i++) {
    console.log(`  ${i + 1}) ${options[i].label}`);
  }
  const raw = await promptLine(`Escolha [padrao ${defaultChoice}]: `);
  const idx = parseInt(raw || defaultChoice, 10) - 1;
  if (Number.isNaN(idx) || idx < 0 || idx >= options.length) {
    return options[parseInt(defaultChoice, 10) - 1].value;
  }
  return options[idx].value;
}

async function gatherInteractiveConfig(opts) {
  if (!opts.targets && !opts.command) {
    opts.targets = await promptChoice(
      "Quais ferramentas voce quer configurar?",
      [
        { label: "VS Code + GitHub Copilot CLI (ambos)", value: "vscode,copilot-cli" },
        { label: "Somente GitHub Copilot CLI", value: "copilot-cli" },
        { label: "Somente VS Code", value: "vscode" },
      ],
      "1"
    );
  }

  if (!opts.providers) {
    opts.providers = await promptChoice(
      "Quais providers deseja configurar?",
      [
        { label: "OpenCode + FreeLLMAPI (ambos)", value: "opencode,freellmapi" },
        { label: "Somente OpenCode", value: "opencode" },
        { label: "Somente FreeLLMAPI (100% gratis local)", value: "freellmapi" },
      ],
      "2"
    );
  }

  const providerList = String(opts.providers).split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (providerList.includes("opencode") && !opts.tiers) {
    opts.tiers = await promptChoice(
      "Para OpenCode, quais tiers deseja ativar?",
      [
        { label: "Somente Free (4 modelos gratuitos no Go)", value: "free" },
        { label: "Go + Free (26 modelos para assinantes Go)", value: "go,free" },
        { label: "Somente Go (22 modelos pagos da assinatura)", value: "go" },
        { label: "Tudo: Go + Free + PAYG (71 modelos)", value: "all" },
      ],
      "1"
    );
  }

  if (providerList.includes("freellmapi") && !opts.url) {
    const urlChoice = await promptChoice(
      "Onde o seu FreeLLMAPI roda?",
      [
        { label: "Auto-detectar local (:31415 Desktop / :3001 Docker)", value: "auto" },
        { label: "Docker / Server (http://localhost:3001/v1)", value: "http://localhost:3001/v1" },
        { label: "Desktop App (http://127.0.0.1:31415/v1)", value: "http://127.0.0.1:31415/v1" },
        { label: "Informar outra URL", value: "custom" },
      ],
      "1"
    );
    if (urlChoice === "custom") {
      opts.url = await promptLine("Digite a URL base do FreeLLMAPI (ex: http://localhost:3001/v1): ");
    } else if (urlChoice !== "auto") {
      opts.url = urlChoice;
    }
  }
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
    cmdDoctor(env);
    return;
  }
  if (opts.command === "key") {
    const val = readSavedKey(opts.positional[0], env);
    process.stdout.write(val);
    return;
  }

  const interactive = !opts.yes && (!opts.providers || (!opts.targets && !opts.command));
  if (interactive && process.stdin.isTTY) {
    await gatherInteractiveConfig(opts);
  }

  const targetIds = normalizeTargets(opts.targets || "vscode,copilot-cli");
  const providerIds = (opts.providers ? String(opts.providers).split(",") : ["opencode"])
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  const nonInteractive = Boolean(opts.yes || !process.stdin.isTTY);
  const inlineApiKeys = {};
  const resolvedProviders = [];

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
      apiKey,
      live: pid === "freellmapi" ? true : opts.live,
    });
    resolvedProviders.push(resolved);
    const totalModels = resolved.groups.reduce((acc, g) => acc + g.models.length, 0);
    console.log(`[${provider.id}] ${totalModels} modelos preparados (origem: ${resolved.source}).`);
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
      console.log(`[DRY-RUN -> ${tid}] ${res.modelCount} modelos seriam gravados em ${res.path}`);
    } else {
      console.log(`[${tid}] ${res.modelCount} modelos gravados em: ${res.path}` + (res.backupPath ? ` (backup: ${res.backupPath})` : ""));
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
