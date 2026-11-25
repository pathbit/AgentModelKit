# Roadmap do AgentModelKit

Este roadmap descreve os próximos passos planejados para o **AgentModelKit**. Contribuições da comunidade via Pull Requests são bem-vindas em qualquer uma das fases abaixo.

---

## Fase 1 — Base Multiplataforma (Atual)

- [x] CLI em Node.js puro (`>= 18`, sem dependências externas) para Windows, macOS e Linux
- [x] Gestão segura de chaves `<COPILOT_HOME>/<provider>.key` (`0600`) com `apiKeyCommand` multiplataforma
- [x] Provider **OpenCode** com separação por tiers (`free`, `go`, `payg`, `go,free`, `all`) e modo `--live`
- [x] Provider **FreeLLMAPI** com auto-detecção (`:31415` Desktop / `:3001` Docker) e descoberta via `/v1/models?execution_status=ready`
- [x] Target **VS Code** (`chatLanguageModels.json`) com `${input:...}`, separadores visuais e merge idempotente
- [x] Target **GitHub Copilot CLI** (`~/.copilot/providers.json`) com merge idempotente, backup `.bak` e `copilot config model`
- [x] Assistente interativo (`init`) e comando de diagnóstico (`doctor`)

---

## Fase 2 — Novos Editores, CLIs e Desktop Apps

- [ ] **Claude Code CLI & Claude Desktop**: adaptador para wire API Anthropic (`/v1/messages`), configuração segura de `ANTHROPIC_BASE_URL` / tokens e suporte ao modo de desenvolvedor / gateway local (FreeLLMAPI e OpenCode Anthropic)
- [ ] **Cursor**: configuração de custom API keys/base URLs e lista de modelos
- [ ] **OpenAI Codex CLI**: geração/merge de `~/.codex/config.toml` com `model_providers`
- [ ] **OpenCode CLI (`opencode.json`)**: exportação direta de providers customizados (ex.: FreeLLMAPI no OpenCode)
- [ ] **Cline / Continue / Windsurf**: perfis de modelos compatíveis com OpenAI / Anthropic

---

## Fase 3 — Novos Providers e Autenticação via Login (OAuth / Device Flow)

- [ ] **OpenRouter**, **Groq**, **Together**, **Mistral**, **DeepSeek**, **Google AI Studio**
- [ ] **Providers Locais**: **Ollama**, **LM Studio**, **vLLM** com descoberta automática de modelos instalados
- [ ] **Autenticação via Login / OAuth (`agentmodelkit login <provider>`)**:
  - Fluxo Device Code / PKCE para providers baseados em login ou assinatura sem API key manual

---

## Fase 4 — Experiência de Uso & Publicação

- [ ] Publicação no npm como `@pathbit/agentmodelkit` (`npx @pathbit/agentmodelkit`)
- [ ] Comando `agentmodelkit sync` para atualizar todos os targets configurados de uma vez com `--live`
- [ ] Presets compartilháveis por time (export/import sem segredos)
