# Arquitetura do AgentModelKit

O **AgentModelKit** (`@pathbit/agentmodelkit`) é uma CLI em Node.js puro (ESM, `engines.node >= 18`, **zero dependências externas**) desenhada para configurar **providers de IA**, **tiers de modelos** e **credenciais seguras** em múltiplos clientes de coding agents a partir de uma única interface.

---

## Estrutura de diretórios

```text
AgentModelKit/
├── bin/
│   └── agentmodelkit.mjs       # Ponto de entrada executável (bin: agentmodelkit, amk)
├── data/
│   └── opencode-catalog.json   # Catálogo estático curado do OpenCode (free, go, payg)
├── docs/
│   ├── ARCHITECTURE.md         # Este documento
│   ├── CLIENTS.md              # Guia dos targets (VS Code, Copilot CLI e futuros)
│   ├── PROVIDERS.md            # Guia dos providers (OpenCode e FreeLLMAPI)
│   └── ROADMAP.md              # Próximos targets, providers e fluxos OAuth/login
├── src/
│   ├── providers/
│   │   ├── index.mjs           # Registro central de providers (`PROVIDERS`)
│   │   ├── opencode.mjs        # OpenCode (Free, Go, PAYG + opção `--live`)
│   │   └── freellmapi.mjs      # FreeLLMAPI (:31415/:3001 + `/v1/models?execution_status=ready`)
│   ├── targets/
│   │   ├── index.mjs           # Registro central e aliases (`TARGETS`, `TARGET_ALIASES`)
│   │   ├── vscode.mjs          # Gerador/merge de `chatLanguageModels.json`
│   │   └── copilot-cli.mjs     # Gerador/merge de `~/.copilot/providers.json`
│   ├── utils/
│   │   ├── paths.mjs           # Caminhos cross-platform (Windows, macOS, Linux)
│   │   └── json.mjs            # Backup `.bak`, escrita JSON e `apiKeyCommand` multiplataforma
│   ├── keys.mjs                # Resolução, prompt e persistência segura (`0600`) de `.key`
│   └── cli.mjs                 # Parser de CLI, assistente interativo, `doctor`, `list` e `key`
└── tests/
    ├── cli.test.mjs            # Testes unitários e de integração da CLI/targets/chaves
    └── freellmapi.test.mjs     # Testes com servidor HTTP mock para FreeLLMAPI
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
           ├── 1. Assistente interativo (se TTY e flags omitidas) ou flags CLI
           │
           ├── 2. `resolveProviderApiKey` (src/keys.mjs)
           │      Ordem de resolução:
           │      `--key` → `--key-file` → `<COPILOT_HOME>/<provider>.key` →
           │      `./<provider>.key` → env (`OPENCODE_API_KEY` / `FREELLMAPI_API_KEY`) → prompt
           │      (salva automaticamente em `<COPILOT_HOME>/<provider>.key` com permissão `0600`)
           │
           ├── 3. `provider.resolve(...)` (src/providers/*.mjs)
           │      Retorna grupos normalizados (`groups[]`), headers por cliente,
           │      listas `managedGroupIds` / `managedVSCodeNames` e `defaultModel`
           │
           └── 4. `target.apply(resolvedProviders, opts, env)` (src/targets/*.mjs)
                  Faz merge não destrutivo, remove apenas IDs/blocos antigos
                  do mesmo provider, cria backup `.bak` e grava JSON formatado
```

---

## Decisões de design

### 1. Zero dependência de `~/.zshrc`, `.bashrc` ou variáveis de sistema
Devs não precisam exportar variáveis globais no shell. O **AgentModelKit**:
- No **GitHub Copilot CLI**, grava o comando multiplataforma gerado por `buildCrossPlatformKeyCommand(keyFileName)` no campo `apiKeyCommand` de `providers.json`:
  ```text
  node -e "const f=require('fs'),o=require('os'),p=require('path');process.stdout.write(f.readFileSync(p.join(process.env.COPILOT_HOME||p.join(o.homedir(),'.copilot'),'opencode.key'),'utf8').trim())"
  ```
  - Não usa `sh -c`, `$`, `%` ou aspas duplas internas.
  - Funciona nativamente tanto no `sh -c` (macOS/Linux) quanto no `cmd.exe /d /s /c` (Windows).
  - Respeita `COPILOT_HOME` customizado.
- No **VS Code**, usa o cofre nativo de segredos `${input:chat.lm.secret...}` para que nenhuma chave sensível fique em texto plano no `chatLanguageModels.json` (a menos que `--inline-key` seja explicitamente solicitado).

### 2. Merge idempotente e troca segura de tiers
Cada provider resolved retorna `managedGroupIds` e `managedVSCodeNames` listando todos os grupos que pertencem a ele (por exemplo, `opencode-go`, `opencode-free-go`, `opencode-payg`).  
Ao rodar novamente trocando de `--tiers all` para `--tiers free`:
- Os blocos antigos `opencode-go` e `opencode-payg` são removidos automaticamente;
- Outros providers configurados (como `freellmapi` ou endpoints manuais do usuário) são preservados intactos;
- Um backup `.bak` é criado antes de gravar o arquivo final.

### 3. Separadores e agrupamento visual
- **VS Code**: injeta blocos marcadores com `"vendor": "comentario"` antes dos grupos de cada provider (`+++++++ CONFIGURACAO OPENCODE +++++++`, `+++++++ CONFIGURACAO FREELLMAPI +++++++`).
- **Copilot CLI**: adiciona `_comment` por provider e prefixa os nomes dos modelos com `[OpenCode Go]`, `[OpenCode Free]`, `[OpenCode PAYG]` e `[FreeLLMAPI]`, facilitando filtragem no comando `/model` independente do modo de agrupamento (`Shift+Tab`).

---

## Estendendo o projeto

- Veja [CONTRIBUTING.md](../CONTRIBUTING.md) para o contrato exato de `provider` e `target`.
- Veja [docs/ROADMAP.md](./ROADMAP.md) para próximos clientes (Claude Code Desktop, Cursor, Codex CLI) e fluxos OAuth.
