# Clientes / Targets Suportados

Este guia explica como cada cliente configurado pelo **AgentModelKit** armazena modelos, chaves e marcações visuais, além de notas sobre futuros adaptadores desktop.

---

## 1. VS Code (`vscode`)

O target `vscode` (`src/targets/vscode.mjs`) configura o arquivo `chatLanguageModels.json` do GitHub Copilot Chat (BYOK / `customendpoint`).

### Caminhos por sistema operacional

| Sistema | Caminho padrão |
| --- | --- |
| **macOS** | `~/Library/Application Support/Code/User/chatLanguageModels.json` |
| **Windows** | `%APPDATA%\Code\User\chatLanguageModels.json` |
| **Linux** | `${XDG_CONFIG_HOME:-~/.config}/Code/User/chatLanguageModels.json` |

É possível sobrescrever o diretório via variável `VSCODE_USER_DIR`.

### Estrutura gerada e compatibilidade com o schema do VS Code

1. Todo item de grupo e separador visual usa `"vendor": "customendpoint"` (um dos valores oficiais aceitos pelo schema `vscode://schemas/language-models`):
   ```json
   {
   	"name": "+++++++ CONFIGURACAO OPENCODE +++++++",
   	"vendor": "customendpoint"
   }
   ```
   *(Outros valores aceitos pelo VS Code incluem `openai`, `anthropic`, `azure`, `gemini`, `ollama`, `openrouter`, `xai`, `copilot`; `"comentario"` não existe no schema e gera erro de validação).*
2. Cada grupo ativo vira um bloco `"vendor": "customendpoint"` (ex.: `OpenCode Free`, `OpenCode Go`, `OpenCode PAYG`, `FreeLLMAPI`).
3. A propriedade `"apiKey"` usa o cofre nativo do VS Code (`${input:chat.lm.secret...}`), evitando chaves em texto plano (a menos que `--inline-key` seja passado).
4. Cada modelo dentro de `models[]` segue as propriedades válidas de `customendpoint`: `id`, `name`, `url` (`<baseUrl>/chat/completions`), `toolCalling`, `vision`, `maxInputTokens`, `maxOutputTokens`, além de `thinking` e `supportsReasoningEffort` para modelos com raciocínio e `requestHeaders` sem headers reservados (como `Authorization`).

### Pós-instalação no VS Code

1. Execute **`Developer: Reload Window`** na Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`).
2. Abra o seletor de modelos do Chat -> **Manage Language Models**.
3. Na primeira seleção de um grupo `${input:...}`, o VS Code pedirá sua API key uma única vez e a guardará no cofre nativo do sistema.

---

## 2. GitHub Copilot CLI (`copilot-cli`)

O target `copilot-cli` (`src/targets/copilot-cli.mjs`) gerencia o arquivo `providers.json` (com permissão `0600`).

### Caminhos por sistema operacional

| Item | Caminho padrão | Override |
| --- | --- | --- |
| Diretório base | `~/.copilot` (macOS/Linux) ou `%USERPROFILE%\.copilot` (Windows) | `COPILOT_HOME` |
| Config de providers | `<COPILOT_HOME>/providers.json` | `COPILOT_PROVIDERS_CONFIG` |
| Chaves salvas (`0600`) | `<COPILOT_HOME>/<provider>.key` | `--key-file` |

### Autenticação cross-platform sem editar `~/.zshrc`

Cada entrada em `providers[]` recebe:
```json
"apiKeyCommand": "node -e \"const f=require('fs'),o=require('os'),p=require('path');process.stdout.write(f.readFileSync(p.join(process.env.COPILOT_HOME||p.join(o.homedir(),'.copilot'),'opencode.key'),'utf8').trim())\""
```
- O Copilot CLI executa `apiKeyCommand` via `sh -c` no macOS/Linux e via `cmd.exe /d /s /c` no Windows.
- Sem `$`, `%`, `sh -c` ou aspas duplas internas, o comando funciona igualmente em **Windows, macOS e Linux** sem exigir variáveis de ambiente globais no terminal.

### Prefixos de modelo e comportamento do `Shift+Tab`

No Copilot CLI interativo, o comando `/model` usa `Shift+Tab` para alternar o modo de agrupamento (`provider`, `recommended`, `vendor`, `category`). Como modelos customizados em `providers.json` não possuem metadados nativos de `vendor`/`category`, o `AgentModelKit` prefixa cada nome (`[OpenCode Free]`, `[OpenCode Go]`, `[OpenCode PAYG]`, `[FreeLLMAPI]`) para filtragem rápida ao digitar no seletor.

### Definindo ou trocando o modelo padrão

Modelos customizados exigem o prefixo `<provider>/<model-id>`:

```bash
copilot config model opencode-free-go/hungerg-free
copilot config model opencode-go/claude-haiku-5-5
copilot config model freellmapi/auto
```

---

## 3. Notas sobre Claude Code Desktop e clientes futuros

Para suportar **Claude Code CLI / Claude Desktop** em versões futuras (ver [ROADMAP.md](./ROADMAP.md)):
- O Claude Code e o Claude Desktop (via opção **Setup -> Gateway**) falam a **Anthropic Messages API** (`/v1/messages`).
- No **FreeLLMAPI**, a URL base para o Claude Desktop/Code deve apontar para a **raiz sem `/v1`** (ex.: `http://127.0.0.1:31415` ou `http://localhost:3001`), pois o Claude adiciona `/v1/models` e `/v1/messages`.
- Em ambientes com auto mode no Claude Code CLI, define-se `ANTHROPIC_BASE_URL`, `ANTHROPIC_AUTH_TOKEN` e `CLAUDE_CODE_AUTO_MODE_SERVER=0`.
