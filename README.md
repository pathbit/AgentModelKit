# AgentModelKit

[English](README.en.md) · [Documentação](docs/README.md) · [Exemplos](examples/README.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Node.js >= 18](https://img.shields.io/badge/Node.js-%3E%3D18-blue.svg)](https://nodejs.org/)

CLI multiplataforma (**Windows, macOS e Linux**, sem dependências externas) para configurar **providers, tiers de modelos e API keys** em editores e ferramentas de agentes de código — começando por **VS Code** (`chatLanguageModels.json`) e **GitHub Copilot CLI** (`~/.copilot/providers.json`).

Projeto irmão do [AgentDevKit](https://github.com/pathbit/AgentDevKit): enquanto o `AgentDevKit` gerencia skills, regras e instruções de agentes, o **`AgentModelKit`** gerencia os **motores de IA (providers, endpoints, modelos e chaves)**.

---

## Por que usar

- **Configuração em 1 comando:** escolha **VS Code**, **GitHub Copilot CLI** ou **ambos**.
- **Controle por tier:** no OpenCode, ative **somente `free`**, **`go` + `free`**, somente **`go`**, ou **`all`** (`go` + `free` + `payg`). No **FreeLLMAPI**, ative o roteador **100% grátis** com auto-detecção local (`:3001` Docker/Server ou `:31415` Desktop) e descoberta ao vivo de modelos prontos (`/v1/models?execution_status=ready`).
- **Zero segredos expostos e zero `zshrc`:**
  - No **Copilot CLI**, o `providers.json` usa um `apiKeyCommand` multiplataforma (`node -e "..."` — sem `sh -c` e sem `$`/`%`) lendo `<COPILOT_HOME>/<provider>.key` (`chmod 600`). Funciona igual em `cmd.exe` (Windows), macOS e Linux.
  - No **VS Code**, usa o cofre nativo `${input:chat.lm.secret...}` com separadores visuais por provider.
- **Merge não destrutivo:** preserva todos os outros providers/modelos que você já tiver configurados e gera backup `.bak` antes de gravar.
- **Extensível para contribuições:** arquitetura simples em `src/providers/` e `src/targets/` para adicionar novos providers e clientes (Claude Code Desktop, Cursor, Codex, OpenCode CLI etc.).

---

## Pré-requisitos

- **Node.js ≥ 18** (`node -v`)
- Ferramentas que você quiser configurar:
  - **VS Code** com GitHub Copilot Chat
  - **GitHub Copilot CLI** (`copilot`)

---

## Uso rápido

### 1) Modo interativo (assistente guiado)

```bash
npx @pathbit/agentmodelkit
# ou localmente dentro do repositorio:
node bin/agentmodelkit.mjs
```

O assistente pergunta:
1. Quais ferramentas configurar (`VS Code`, `Copilot CLI` ou ambos)
2. Quais providers ativar (`OpenCode`, `FreeLLMAPI` ou ambos)
3. Para `OpenCode`: qual tier (`free`, `go,free`, `go` ou `all`)
4. Para `FreeLLMAPI`: auto-detecção (`:31415` / `:3001`) ou URL customizada
5. Sua API key (somente na primeira vez; salva em `~/.copilot/<provider>.key` ou `%USERPROFILE%\.copilot\<provider>.key`)

### 2) Exemplos diretos por linha de comando

#### Ativar OpenCode **somente grátis (`free`)** + FreeLLMAPI no VS Code e Copilot CLI:
```bash
node bin/agentmodelkit.mjs init --providers opencode,freellmapi --tiers free --targets all
```

#### Configurar **apenas o GitHub Copilot CLI** com OpenCode (`go,free`):
```bash
node bin/agentmodelkit.mjs copilot --providers opencode --tiers go,free
```

#### Configurar **apenas o VS Code** com todos os 71 modelos atuais do OpenCode (`all`):
```bash
node bin/agentmodelkit.mjs vscode --providers opencode --tiers all
```

#### Configurar **FreeLLMAPI** com descoberta ao vivo de modelos:
```bash
node bin/agentmodelkit.mjs init --providers freellmapi --url http://localhost:3001/v1 --targets all
```

#### Buscar catálogo mais recente do OpenCode ao vivo da API (`--live`) ou simular (`--dry-run`):
```bash
node bin/agentmodelkit.mjs init --providers opencode --tiers go,free --live --dry-run
```

#### Verificar diagnóstico de caminhos, binários e chaves:
```bash
node bin/agentmodelkit.mjs doctor
```

---

## Comandos e opções

| Comando | Descrição |
| --- | --- |
| `init` *(padrão)* | Configura um ou mais providers nos targets escolhidos |
| `copilot` | Atalho direto para configurar apenas o GitHub Copilot CLI |
| `vscode` | Atalho direto para configurar apenas o VS Code |
| `list` | Lista providers, tiers e targets disponíveis |
| `doctor` | Verifica Node.js, `copilot`, `code`, arquivos de config e `.key` salvos |
| `key <provider>` | Imprime a chave salva em `<COPILOT_HOME>/<provider>.key` |

| Flag | Descrição |
| --- | --- |
| `-p, --providers <lista>` | `opencode`, `freellmapi` ou `opencode,freellmapi` |
| `-t, --targets <lista>` | `vscode`, `copilot-cli` ou `all` |
| `--tiers <lista>` | Para OpenCode: `free`, `go`, `payg`, `go,free` ou `all` |
| `--url <url>` | URL base para FreeLLMAPI (`http://localhost:3001/v1` ou `http://127.0.0.1:31415/v1`) |
| `-k, --key <valor>` | Informa a chave diretamente na chamada |
| `--key-file <caminho>` | Lê a chave de um arquivo específico |
| `-m, --default-model <id>` | Define o modelo padrão no `copilot config model` |
| `--live` | Atualiza o catálogo do OpenCode consultando os endpoints públicos antes de gravar |
| `--inline-key` | Grava a chave literal no JSON em vez de `apiKeyCommand` / `${input:...}` |
| `--no-save-key` | Não salva `<provider>.key` em `<COPILOT_HOME>` |
| `--dry-run` | Simula sem alterar arquivos no disco |

---

## Providers incluídos

- **OpenCode (`opencode`)** — [ver detalhes em docs/PROVIDERS.md](docs/PROVIDERS.md)
  - `free`: 4 modelos gratuitos do Go que funcionam no VS Code e Copilot CLI (`hungerg-free`, `hy4-flash-free`, `beam-free`, `iceman-contributor-free`)
  - `go`: 22 modelos pagos inclusos no plano Go (`/inference/go/openai/v1` com header `x-opencode-session`)
  - `payg`: 45 modelos ativos de 2026 do OpenCode Console (Pay-as-you-go), excluindo descontinuados e legados de 2025
- **FreeLLMAPI (`freellmapi`)** — [ver detalhes em docs/PROVIDERS.md](docs/PROVIDERS.md)
  - `free`: roteador local 100% gratuito (`auto`, `auto:smart`, `auto:fast`, `auto:reliable`, `auto:balanced`, `fusion`) + descoberta automática dos modelos prontos via `GET /v1/models?execution_status=ready`

---

## Documentação

- [Índice geral da documentação](docs/README.md)
- [Arquitetura e como estender](docs/ARCHITECTURE.md)
- [Providers suportados (OpenCode & FreeLLMAPI)](docs/PROVIDERS.md)
- [Clientes suportados (VS Code & Copilot CLI)](docs/CLIENTS.md)
- [Exemplos de saída (VS Code & Copilot CLI)](examples/README.md)
- [Roadmap público (Claude Code Desktop, Cursor, Codex, Login OAuth)](docs/ROADMAP.md)
- [Guia de contribuição](CONTRIBUTING.md) · [Changelog](CHANGELOG.md)

---

## Licença

[MIT](LICENSE) © PathBit
