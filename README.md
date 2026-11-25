# AgentModelKit

[English](README.en.md) · [Documentação](docs/README.md) · [Exemplos](examples/README.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Node.js >= 18](https://img.shields.io/badge/Node.js-%3E%3D18-blue.svg)](https://nodejs.org/)

CLI multiplataforma (**Windows, macOS e Linux**, **zero dependências externas**) para configurar **providers de IA, licenças/tiers, seleção de modelos com checkboxes no terminal e API keys** em editores e ferramentas de código — começando por **VS Code** (`chatLanguageModels.json`) e **GitHub Copilot CLI** (`~/.copilot/providers.json`).

Projeto irmão do [AgentDevKit](https://github.com/pathbit/AgentDevKit): enquanto o `AgentDevKit` distribui skills, regras e instruções de agentes, o **`AgentModelKit`** gerencia os **motores de IA (endpoints, licenças, roteamento e credenciais)**.

---

## Por que usar

- **Checkboxes interativos no terminal (`npx`):** marque com `Espaço` e setas ↑↓ os clientes (`VS Code`, `Copilot CLI`), as licenças/serviços combinados (`OpenCode Free`, `OpenCode Go`, `OpenCode PAYG`, `FreeLLMAPI`) e até **modelos individuais** que deseja habilitar.
- **FreeLLMAPI com porta dinâmica & modo `auto` enxuto:** detecta automaticamente a porta dinâmica do FreeLLMAPI Desktop (`config.json`) ou Docker (`:3001`), aceita `--url` ou `--port` customizados e registra apenas o roteador `auto` por padrão — deixando o próprio FreeLLMAPI escolher modelos e fazer failover entre provedores gratuitos.
- **Zero segredos expostos e zero `~/.zshrc`:**
  - **GitHub Copilot CLI:** grava `apiKeyCommand` multiplataforma (`node -e "..."`, sem `sh -c`, `$` ou `%`) lendo `<COPILOT_HOME>/<provider>.key` (`0600`) igual no Windows `cmd.exe`, macOS e Linux.
  - **VS Code (`customendpoint`):** usa `${input:chat.lm.secret...}` com separadores visuais compatíveis com o schema oficial `"vendor": "customendpoint"`.
- **Merge idempotente e backup `.bak`:** alternar de `--tiers all` para `--tiers free` limpa apenas os grupos antigos do provider mantendo todos os demais intactos.

---

## Pré-requisitos

- **Node.js ≥ 18** (`node -v`)
- Clientes suportados: **VS Code** (GitHub Copilot Chat) e/ou **GitHub Copilot CLI** (`copilot`)

---

## Uso rápido

### 1) Assistente interativo com checkboxes (`init`)

```bash
npx @pathbit/agentmodelkit
# ou localmente dentro do repositorio:
node bin/agentmodelkit.mjs
```

No assistente interativo você escolhe com `[x]`:
1. Quais ferramentas configurar (`VS Code`, `GitHub Copilot CLI` ou ambas)
2. Quais serviços / licenças combinar ao mesmo tempo (`OpenCode Free`, `OpenCode Go`, `OpenCode PAYG`, `FreeLLMAPI`)
3. Para `FreeLLMAPI`: URL ou porta dinâmica (`Enter` = auto-detectar) e modo (`auto` roteador único recomendado, `strategies` ou modelos `ready` ao vivo)
4. Se deseja instalar todos os modelos das licenças marcadas ou **selecionar modelos um a um com checkboxes `[x]`**
5. Sua API key (salva em `<COPILOT_HOME>/<provider>.key` na primeira vez)

### 2) Exemplos diretos por linha de comando

```bash
# OpenCode SOMENTE Free (4 modelos) + FreeLLMAPI (somente roteador auto) no VS Code e Copilot CLI:
node bin/agentmodelkit.mjs init --providers opencode,freellmapi --tiers free --targets all

# FreeLLMAPI apontando para uma porta dinâmica ou servidor LAN customizado:
node bin/agentmodelkit.mjs init --providers freellmapi --port 31416 --targets all
node bin/agentmodelkit.mjs init --providers freellmapi --url http://192.168.1.50:4000/v1 --targets all

# OpenCode Go + Free filtrando exatamente os modelos desejados:
node bin/agentmodelkit.mjs copilot --providers opencode --tiers go,free --models claude-haiku-5-5,gpt-6-luna,hungerg-free

# FreeLLMAPI listando modelos prontos ao vivo (/v1/models?execution_status=ready):
node bin/agentmodelkit.mjs init --providers freellmapi --freellmapi-mode ready --targets all

# Atualizar catálogo do OpenCode direto da API ao vivo e simular sem gravar:
node bin/agentmodelkit.mjs init --providers opencode --tiers all --live --dry-run

# Diagnóstico de caminhos, URL do FreeLLMAPI detectada e chaves salvas:
node bin/agentmodelkit.mjs doctor
```

---

## Comandos e opções

| Comando | Descrição |
| --- | --- |
| `init` *(padrão)* | Assistente interativo com checkboxes para clientes, serviços, licenças e modelos |
| `copilot` | Configura apenas o GitHub Copilot CLI (`~/.copilot/providers.json`) |
| `vscode` | Configura apenas o VS Code (`chatLanguageModels.json`) |
| `list` | Lista providers, tiers e targets disponíveis |
| `doctor` | Verifica Node.js, `copilot`, `code`, configs, URL do FreeLLMAPI e chaves `.key` |
| `key <provider>` | Imprime a chave salva em `<COPILOT_HOME>/<provider>.key` |

| Flag | Descrição |
| --- | --- |
| `-p, --providers <lista>` | `opencode`, `freellmapi` ou `opencode,freellmapi` |
| `-t, --targets <lista>` | `vscode`, `copilot-cli` ou `all` |
| `--tiers <lista>` | OpenCode (`--licenses`): `free`, `go`, `payg`, `go,free` ou `all` |
| `--url <url-ou-porta>` | Endereço base ou porta do FreeLLMAPI (ex.: `http://localhost:4000/v1` ou `4000`) |
| `--port <numero>` | Porta dinâmica do FreeLLMAPI (ex.: `31416`) |
| `--freellmapi-mode <modo>` | `auto` *(padrão: somente roteador)* \| `strategies` \| `ready` |
| `--models <lista>` | Filtra IDs de modelos específicos (ex.: `hungerg-free,claude-haiku-5-5,auto`) |
| `-k, --key <valor>` | Passa a API key diretamente pela linha de comando |
| `--key-file <caminho>` | Lê a chave de um arquivo específico |
| `-m, --default-model <id>` | Define o modelo padrão via `copilot config model` |
| `--live` | Consulta APIs ao vivo antes de gravar |
| `--inline-key` | Grava a chave literal no JSON em vez de `apiKeyCommand` / `${input:...}` |
| `--no-save-key` | Não cria `<COPILOT_HOME>/<provider>.key` |
| `--dry-run` | Simula sem alterar arquivos ou gravar chaves no disco |

---

## Providers e catálogos de referência

- **OpenCode (`opencode`)** — [ver detalhes em docs/PROVIDERS.md](docs/PROVIDERS.md) e [OpenCode Console Models](https://opencode.ai/docs/console/models/):
  - `free`: 4 modelos gratuitos do Go compatíveis com VS Code e Copilot CLI
  - `go`: 27 modelos pagos do plano Go (`/inference/go/openai/v1` + `x-opencode-session`)
  - `payg`: 45 modelos ativos de 2026 do Console (`/inference/openai/v1`)
- **FreeLLMAPI (`freellmapi`)** — [catálogo freellmapi.co/models](https://freellmapi.co/models) e [docs/PROVIDERS.md](docs/PROVIDERS.md):
  - Por padrão configura apenas o roteador `auto` (sem lista gigante de modelos) com porta/URL dinâmica e pode inclusive ser ligado **dentro do OpenCode CLI** (veja [`examples/opencode.freellmapi.json`](examples/opencode.freellmapi.json)).
- **Awesome Free LLM APIs** — veja em [docs/PROVIDERS.md](docs/PROVIDERS.md#3-cat%C3%A1logo-de-apis-gratuitas-diretas-awesome-free-llm-apis) as principais APIs gratuitas sem cartão de [mnfst/awesome-free-llm-apis](https://github.com/mnfst/awesome-free-llm-apis) (Google Gemini, Groq, Cloudflare, Cohere, AxForge, Kilo Gateway).

---

## Documentação e desenvolvimento

- [Índice geral da documentação](docs/README.md)
- [Arquitetura e como estender](docs/ARCHITECTURE.md)
- [Providers suportados (OpenCode, FreeLLMAPI & Awesome Free LLM APIs)](docs/PROVIDERS.md)
- [Clientes suportados (VS Code & Copilot CLI)](docs/CLIENTS.md)
- [Exemplos de saída](examples/README.md)
- [Roadmap público](docs/ROADMAP.md)
- [Guia de contribuição](CONTRIBUTING.md) · [Changelog](CHANGELOG.md)

```bash
npm run check
npm test
npm pack --dry-run
```

## Licença

[MIT](LICENSE) © PathBit
