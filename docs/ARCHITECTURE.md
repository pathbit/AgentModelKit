# Arquitetura do AgentModelKit

O **AgentModelKit** (`@pathbit/agentmodelkit`) é uma CLI em Node.js puro (ESM, `engines.node >= 18`, **zero dependências externas**) desenhada para configurar **providers de IA**, **licenças/tiers de modelos** e **credenciais seguras** em múltiplos clientes de coding agents a partir de uma única interface.

---

## Estrutura de diretórios

```text
AgentModelKit/
├── .github/                    # Templates de Issue/PR e CI multiplataforma (Win/Mac/Linux)
├── .vscode/                    # Configurações recomendadas de workspace e .gitignore local
├── bin/
│   └── agentmodelkit.mjs       # Ponto de entrada executável (bin: agentmodelkit, amk)
├── data/
│   └── opencode-catalog.json   # Catálogo estático curado do OpenCode (free, go, payg)
├── docs/
│   ├── README.md               # Índice da documentação
│   ├── ARCHITECTURE.md         # Este documento
│   ├── CLIENTS.md              # Guia dos targets (VS Code, Copilot CLI e futuros)
│   ├── PROVIDERS.md            # Guia dos providers (OpenCode, FreeLLMAPI e awesome-free-llm-apis)
│   └── ROADMAP.md              # Próximos targets, providers e fluxos OAuth/login
├── examples/                   # Exemplos anonimizados de saída (VS Code, Copilot CLI e OpenCode)
├── scripts/
│   └── check.mjs               # Validação estrutural, JSONs e links Markdown (`npm run check`)
├── src/
│   ├── ui/
│   │   └── prompts.mjs         # Seletores interativos com checkboxes [x] em Node.js puro
│   ├── providers/
│   │   ├── index.mjs           # Registro central de providers (`PROVIDERS`)
│   │   ├── opencode.mjs        # OpenCode (Free, Go, PAYG + opção `--live`)
│   │   └── freellmapi.mjs      # FreeLLMAPI (porta/URL dinâmica + modo `auto` roteador)
│   ├── targets/
│   │   ├── index.mjs           # Registro central e aliases (`TARGETS`, `TARGET_ALIASES`)
│   │   ├── vscode.mjs          # Gerador/merge de `chatLanguageModels.json` (`customendpoint`)
│   │   └── copilot-cli.mjs     # Gerador/merge de `~/.copilot/providers.json`
│   ├── utils/
│   │   ├── paths.mjs           # Caminhos cross-platform (Windows, macOS, Linux)
│   │   └── json.mjs            # Backup `.bak`, escrita JSON e `apiKeyCommand` multiplataforma
│   ├── keys.mjs                # Resolução, prompt e persistência segura (`0600`) de `.key`
│   └── cli.mjs                 # Parser de CLI, assistente com checkboxes, filtros e subcomandos
└── tests/
    ├── cli.test.mjs            # Testes da CLI, checkboxes, filtros, chaves e targets
    ├── freellmapi.test.mjs     # Testes de porta dinâmica, modo auto e mock HTTP do FreeLLMAPI
    └── repo-structure.test.mjs # Testes da estrutura padrão do repositório
```

---

## Fluxo de execução

```text
  bin/agentmodelkit.mjs
           │
           ▼
     src/cli.mjs (`runCli`)
      ├── subcomandos informativos: `list`, `doctor`, `key <provider>`, `--help`
      └── configuração (`init`, `copilot`, `vscode`):
           │
           ├── 1. Assistente interativo com checkboxes (`src/ui/prompts.mjs`) ou flags CLI:
           │      - Targets (`VS Code`, `GitHub Copilot CLI`)
           │      - Serviços / Licenças (`OpenCode Free/Go/PAYG`, `FreeLLMAPI`)
           │      - Porta/URL dinâmica e modo (`auto` | `strategies` | `ready`) para FreeLLMAPI
           │
           ├── 2. `resolveProviderApiKey` (`src/keys.mjs`)
           │      Ordem: `--key` → `--key-file` → `<COPILOT_HOME>/<provider>.key` →
           │      `./<provider>.key` → env (`OPENCODE_API_KEY` / `FREELLMAPI_API_KEY`) → prompt
           │      (salva automaticamente com `0600`, nunca grava nada em `--dry-run`)
           │
           ├── 3. `provider.resolve(...)` (`src/providers/*.mjs`)
           │      Retorna grupos normalizados (`groups[]`), headers por cliente,
           │      listas `managedGroupIds` / `managedVSCodeNames` e `defaultModel`
           │
           ├── 4. Seleção opcional por modelo (`--models` ou checkboxes `[x]` no terminal)
           │
           └── 5. `target.apply(resolvedProviders, opts, env)` (`src/targets/*.mjs`)
                  Merge não destrutivo, limpeza de tiers antigos do mesmo provider,
                  backup `.bak` e escrita compatível com cada cliente
```

---

## Decisões de design

### 1. Segredos seguros em todos os sistemas operacionais
- **GitHub Copilot CLI**: usa `apiKeyCommand` multiplataforma via `node -e "..."` sem `sh -c`, `$`, `%` ou aspas duplas internas, lendo `<COPILOT_HOME>/<provider>.key` no Windows `cmd.exe`, macOS e Linux.
- **VS Code**: usa `${input:chat.lm.secret...}` com blocos e separadores usando `"vendor": "customendpoint"`, totalmente válido segundo o schema `vscode://schemas/language-models`.

### 2. FreeLLMAPI dinâmico e enxuto por padrão
- Portas nunca ficam presas a um valor único: lê `--url`, `--port`, env `FREELLMAPI_URL` / `FREELLMAPI_PORT` e o `config.json` do FreeLLMAPI Desktop (`listenWithScan`).
- Por padrão usa apenas o modelo `auto` (`--freellmapi-mode auto`), pois o roteador do FreeLLMAPI seleciona automaticamente o melhor endpoint gratuito disponível e faz failover em limites.

### 3. Merge idempotente e filtros granulares
- Cada provider informa `managedGroupIds` e `managedVSCodeNames`, permitindo alternar licenças (`all` -> `free`) ou filtrar modelos via `--models` / checkboxes sem perder configurações de outros providers.

---

## Estendendo o projeto

- Veja [CONTRIBUTING.md](../CONTRIBUTING.md) para o contrato exato de `provider` e `target`.
- Veja [docs/ROADMAP.md](./ROADMAP.md) para próximos clientes e fluxos OAuth.
