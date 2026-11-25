# Changelog

Alterações verificáveis por versão do **AgentModelKit**.

## 0.1.0

- Cria CLI multiplataforma (`Windows`, `macOS` e `Linux`) em Node.js puro (`>= 18`), sem dependências externas (`agentmodelkit`, `amk`).
- Adiciona assistente interativo com checkboxes (`src/ui/prompts.mjs`) para combinar clientes, serviços/licenças e selecionar modelos individuais no terminal (`--models`).
- Adiciona suporte ao provider **OpenCode** (`free`: 4 modelos, `go`: 27 modelos, `payg`: 45 modelos ativos = 76 modelos), header `x-opencode-session` e atualização `--live`.
- Adiciona suporte ao provider **FreeLLMAPI** com porta/URL dinâmica (`--url`, `--port`, `FREELLMAPI_URL`/`PORT`, leitura de `config.json` do Desktop), modo padrão enxuto `auto` (roteador único), estratégias (`strategies`) e descoberta ao vivo (`ready`).
- Adiciona target **VS Code** (`chatLanguageModels.json`) compatível com o schema oficial `"vendor": "customendpoint"`, `thinking`/`supportsReasoningEffort`, cofre `${input:...}`, merge idempotente e backup `.bak`.
- Adiciona target **GitHub Copilot CLI** (`providers.json`) com `apiKeyCommand` multiplataforma lendo `<COPILOT_HOME>/<provider>.key` (`chmod 600`), prefixos no `/model`, merge idempotente, backup `.bak` e `copilot config model`.
- Adiciona comandos `init`, `copilot`, `vscode`, `list`, `doctor` e `key <provider>`.
