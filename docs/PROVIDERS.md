# Providers Suportados

Este documento detalha os providers nativos do **AgentModelKit**, seus endpoints, tiers, headers obrigatórios e políticas de privacidade/chave.

---

## 1. OpenCode (`opencode`)

O provider `opencode` (`src/providers/opencode.mjs`) utiliza o catálogo curado em [`data/opencode-catalog.json`](../data/opencode-catalog.json) e suporta atualização em tempo real via flag `--live`.

### Tiers disponíveis

| Tier | Grupo no Copilot CLI (`provider`) | Label no VS Code | Prefixo no `/model` | Qtd. no catálogo | Base URL |
| --- | --- | --- | --- | --- | --- |
| `free` *(padrão)* | `opencode-free-go` | `OpenCode Free` | `[OpenCode Free]` | 4 modelos | `https://opencode.ai/inference/go/openai/v1` |
| `go` | `opencode-go` | `OpenCode Go` | `[OpenCode Go]` | 22 modelos | `https://opencode.ai/inference/go/openai/v1` |
| `payg` | `opencode-payg` | `OpenCode PAYG` | `[OpenCode PAYG]` | 45 modelos | `https://opencode.ai/inference/openai/v1` |

Combinando `--tiers all` (`go,free,payg`), são configurados **71 modelos ativos de 2026** (excluindo 6 modelos `deprecatedIds` e 7 `legacy2025Ids` listados no catálogo).

### Exemplos por tier

- **Somente grátis (`free`, padrão):**
  ```bash
  agentmodelkit init --providers opencode --tiers free
  ```
  Modelos incluídos: `hungerg-free`, `hy4-flash-free`, `beam-free`, `iceman-contributor-free`.  
  Modelo padrão sugerido no Copilot CLI: `opencode-free-go/hungerg-free`.

- **Assinantes Go (`go,free`):**
  ```bash
  agentmodelkit init --providers opencode --tiers go,free
  ```
  Inclui os 22 modelos pagos do plano Go + os 4 modelos gratuitos do Go.  
  Modelo padrão sugerido: `opencode-go/claude-haiku-5-5`.

- **Catálogo completo (`all`) ou somente Pay-as-you-go (`payg`):**
  ```bash
  agentmodelkit init --providers opencode --tiers all
  ```
  Adiciona os 45 modelos ativos do OpenCode Console PAYG. Quando apenas `payg` é selecionado, o padrão sugerido é `opencode-payg/gpt-6.2-sol`.

### Headers obrigatórios e por que `Zen *-free` não entra em `free`

1. **Header `x-opencode-session`:** os endpoints do **OpenCode Go** (`/inference/go/openai/v1`) exigem o header `x-opencode-session`; sem ele, a API retorna `400 MissingSessionID`. O `AgentModelKit` configura automaticamente:
   - No **Copilot CLI**: `"headers": { "x-opencode-session": "copilot-cli" }`
   - No **VS Code**: `"requestHeaders": { "Authorization": "Bearer ${apiKey}", "x-opencode-session": "vscode-copilot" }`
2. **Modelos `*-free` do Console Zen vs. Go Free:** modelos gratuitos de fora do endpoint Go (como `tidepool-alpha-free` ou `deepseek-v4.1-flash-free`) retornam erro `403` / `FreeUsageLimitError` quando chamados fora da TUI/CLI oficial do OpenCode. Por isso, o tier `free` do `AgentModelKit` inclui os 4 modelos gratuitos do endpoint Go, que funcionam diretamente no VS Code e Copilot CLI.

### Configurações de privacidade no Console OpenCode

Alguns modelos do OpenCode exigem ajustes nas preferências da sua conta no Console OpenCode para evitar erro de política:
- **Regions: Global** — necessário para `deepseek-v4.1-flash`, `deepseek-v4-pro` e `longcat-2.5`.
- **Allow paid endpoints that train on request data** — necessário para modelos contributor como `muse-spark-1.3-contributor` e `iceman-contributor-free`.

### Modo `--live`

Passando `--live`, a CLI consulta em tempo real:
- `https://opencode.ai/inference/go/v1/models`
- `https://opencode.ai/inference/v1/models`

Se a rede falhar ou estiver offline, o provider faz fallback transparente para [`data/opencode-catalog.json`](../data/opencode-catalog.json).

---

## 2. FreeLLMAPI (`freellmapi`)

O provider `freellmapi` (`src/providers/freellmapi.mjs`) integra o roteador local/self-hosted **100% gratuito** [FreeLLMAPI](https://github.com/tashfeenahmed/freellmapi).

### Portas e auto-detecção

Se `--url` não for informado, o `AgentModelKit` testa automaticamente:
1. `http://127.0.0.1:31415/v1` (FreeLLMAPI Desktop App)
2. `http://localhost:3001/v1` (FreeLLMAPI Server / Docker — fallback padrão)

Você pode forçar qualquer URL com `--url`, e ela será normalizada para terminar em `/v1` (ou remover `/chat/completions` se você colar o endpoint completo).

### Chave de API

- Arquivo salvo: `<COPILOT_HOME>/freellmapi.key` (`chmod 600`)
- Variável de ambiente reconhecida na importação inicial: `FREELLMAPI_API_KEY`
- Formato típico da chave no FreeLLMAPI: `freellmapi-...`

### Modelos virtuais e descoberta automática (`/v1/models?execution_status=ready`)

O provider sempre inclui os **6 modelos virtuais embutidos** de roteamento do FreeLLMAPI:
- `auto` *(modelo padrão no Copilot CLI: `freellmapi/auto`)*
- `auto:smart` (`reasoningEffort: "high"`)
- `auto:fast`
- `auto:reliable`
- `auto:balanced`
- `fusion` (`reasoningEffort: "high"`)

Em seguida, se a instância FreeLLMAPI estiver rodando no momento da configuração, o `AgentModelKit` consulta:
```text
GET <baseUrl>/models?execution_status=ready
Authorization: Bearer <sua-chave-freellmapi>
```
e adiciona automaticamente todos os modelos de `type: "chat"` que estiverem prontos (`execution_status === "ready"`), evitando modelos sem chave configurada ou com cota esgotada.  
Se a instância estiver parada durante a configuração, os 6 modelos virtuais continuam gravados (`source: virtual-fallback`), e o roteador local funcionará assim que você iniciar o FreeLLMAPI.
