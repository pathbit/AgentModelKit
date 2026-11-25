# Clientes / Targets Suportados

Este guia explica como cada cliente configurado pelo **AgentModelKit** armazena modelos, chaves e comentários, além de notas sobre futuros clientes desktop (como **Claude Code Desktop**).

---

## 1. VS Code (`vscode`)

O target `vscode` (`src/targets/vscode.mjs`) configura o arquivo `chatLanguageModels.json` do GitHub Copilot Chat (BYOK / Custom Endpoints).

### Caminhos por sistema operacional

| Sistema | Caminho padrão |
| --- | --- |
| **macOS** | `~/Library/Application Support/Code/User/chatLanguageModels.json` |
| **Windows** | `%APPDATA%\Code\User\chatLanguageModels.json` |
| **Linux** | `${XDG_CONFIG_HOME:-~/.config}/Code/User/chatLanguageModels.json` |

É possível sobrescrever o diretório via variável `VSCODE_USER_DIR`.

### Como funciona no VS Code

1. Para cada provider ativado, é inserido um marcador visual com `"vendor": "comentario"`:
   ```json
   {
   	"name": "+++++++ CONFIGURACAO OPENCODE +++++++",
   	"vendor": "comentario"
   }
   ```
2. Cada grupo de tier vira um bloco `"vendor": "customendpoint"` (ex.: `OpenCode Free`, `OpenCode Go`, `OpenCode PAYG`, `FreeLLMAPI`).
3. A propriedade `"apiKey"` usa referências nativas do cofre de segredos do VS Code:
   - OpenCode: `${input:chat.lm.secret.66290ed1}`
   - FreeLLMAPI: `${input:chat.lm.secret.freellmapi}`
   *(Se quiser gravar a chave literal diretamente no JSON, passe `--inline-key`.)*
4. Os endpoints apontam para `<baseUrl>/chat/completions`, incluindo `requestHeaders` quando exigidos (como `x-opencode-session` no OpenCode Go/Free).

### Pós-instalação no VS Code

1. Execute **`Developer: Reload Window`** na Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`).
2. Abra o seletor de modelos do Chat / Agent Mode -> **Manage Models**.
3. Na primeira seleção de um grupo `${input:...}`, o VS Code pedirá sua API key uma única vez e a guardará no cofre nativo do sistema.

> **Observação conhecida do VS Code:** se algum modelo específico retornar erro de parâmetro de `temperature` / compatibilidade em versões antigas do Copilot Chat, veja o tracking upstream citado na documentação do OpenCode Go (VS Code issue `#334186`).

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
Por que esse formato?
- O Copilot CLI executa `apiKeyCommand` via `sh -c` no macOS/Linux e via `cmd.exe /d /s /c` no Windows.
- Ao evitar `$`, `%`, `sh -c` e aspas duplas internas, o comando funciona igualmente em **Windows, macOS e Linux** sem exigir variáveis de ambiente globais no terminal.

### Prefixos de modelo e comportamento do `Shift+Tab`

No Copilot CLI interativo, o comando `/model` usa `Shift+Tab` para alternar o modo de agrupamento (`provider`, `recommended`, `vendor`, `category`). Como modelos customizados definidos em `providers.json` não carregam metadados nativos de `vendor`/`category`, o `AgentModelKit` adiciona prefixos claros no campo `name` de cada modelo:
- `[OpenCode Free] ...`
- `[OpenCode Go] ...`
- `[OpenCode PAYG] ...`
- `[FreeLLMAPI] ...`

Assim, você pode digitar `Free`, `Go`, `PAYG` ou `FreeLLMAPI` diretamente no seletor `/model` para filtrar na hora.

### Definindo ou trocando o modelo padrão

Em chamadas via CLI ou config, modelos BYOK do Copilot CLI exigem o prefixo `<provider>/<model-id>`:

```bash
copilot config model opencode-free-go/hungerg-free
copilot config model opencode-go/claude-haiku-5-5
copilot config model freellmapi/auto
```

Ou rodando uma única chamada:

```bash
copilot --model freellmapi/auto -p "Explique este repositorio"
```

---

## 3. Notas sobre Claude Code Desktop e clientes futuros

Para suportar **Claude Code Desktop / CLI** em versões futuras (ver [ROADMAP.md](./ROADMAP.md)):
- O Claude Code espera a **wire API da Anthropic** (`/v1/messages`, não `/v1/chat/completions`), controlada por variáveis ou configurações equivalentes a `ANTHROPIC_BASE_URL` e `ANTHROPIC_AUTH_TOKEN` (ou `ANTHROPIC_API_KEY`).
- No **Claude Desktop**, habilitar configurações avançadas / modo de desenvolvedor ou apontar para um gateway local compatível com `/messages` (por exemplo, o endpoint Anthropic do **FreeLLMAPI** fica na raiz sem `/v1`: `http://localhost:3001` ou `http://127.0.0.1:31415`) exige cuidados distintos de editores baseados em OpenAI-compatible JSON.
- O OpenCode Go também possui endpoint Anthropic compatível para clientes Anthropic; esse adaptador será adicionado como um novo target dedicado em `src/targets/claude-code.mjs`.
