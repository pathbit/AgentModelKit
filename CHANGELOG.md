# Changelog

Alterações verificáveis por versão do **AgentModelKit**.

## 0.1.0

- Cria CLI multiplataforma (`Windows`, `macOS` e `Linux`) em Node.js puro (`>= 18`), sem dependências externas (`agentmodelkit`, `amk`).
- Adiciona suporte ao provider **OpenCode** com seleção granular por tier (`free`, `go`, `payg`, `go,free`, `all`), header obrigatório `x-opencode-session` no Go/Free e atualização opcional ao vivo (`--live`).
- Adiciona suporte ao provider **FreeLLMAPI** (`free`) com auto-detecção local (`:31415` Desktop / `:3001` Docker/Server), 6 modelos virtuais de roteamento e descoberta automática de modelos prontos via `/v1/models?execution_status=ready`.
- Adiciona target **VS Code** (`chatLanguageModels.json`) com cofre nativo `${input:...}`, separadores visuais (`"vendor": "comentario"`), merge idempotente e backup `.bak`.
- Adiciona target **GitHub Copilot CLI** (`providers.json`) com `apiKeyCommand` multiplataforma lendo `<COPILOT_HOME>/<provider>.key` (`chmod 600`), prefixos de modelo para `/model` (`Shift+Tab`), merge idempotente, backup `.bak` e integração com `copilot config model`.
- Adiciona comandos `init` *(assistente interativo)*, `copilot`, `vscode`, `list`, `doctor` e `key <provider>`.
