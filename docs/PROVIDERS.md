# Providers e Fontes de Modelos Gratuitos

Este documento detalha os providers suportados pelo **AgentModelKit**, como o roteamento dinâmico funciona e onde consultar catálogos gratuitos verificados.

---

## 1. OpenCode (`opencode`)

O provider `opencode` (`src/providers/opencode.mjs`) utiliza o catálogo curado em [`data/opencode-catalog.json`](../data/opencode-catalog.json) (baseado em [OpenCode Console Models](https://opencode.ai/docs/console/models/) e OpenCode Go), com atualização em tempo real opcional via `--live`.

### Licenças / Tiers combináveis

Você pode ativar um único tier, combinar licenças (`--tiers go,free`) ou ativar tudo (`--tiers all`), inclusive selecionando modelos individuais com checkboxes no terminal ou via `--models`:

| Tier | Grupo no Copilot CLI (`provider`) | Label no VS Code | Prefixo no `/model` | Qtd. no catálogo | Base URL |
| --- | --- | --- | --- | --- | --- |
| `free` *(padrão)* | `opencode-free-go` | `OpenCode Free` | `[OpenCode Free]` | 4 modelos | `https://opencode.ai/inference/go/openai/v1` |
| `go` | `opencode-go` | `OpenCode Go` | `[OpenCode Go]` | 27 modelos | `https://opencode.ai/inference/go/openai/v1` |
| `payg` | `opencode-payg` | `OpenCode PAYG` | `[OpenCode PAYG]` | 45 modelos | `https://opencode.ai/inference/openai/v1` |

Combinando `--tiers all` (`go,free,payg`), são configurados **76 modelos ativos de 2026** (excluindo modelos `deprecatedIds` e legados de 2025).

### Exemplos por licença / filtro

- **Somente grátis (`free`, padrão):**
  ```bash
  agentmodelkit init --providers opencode --tiers free
  ```
  Modelos: `hungerg-free`, `hy4-flash-free`, `beam-free`, `iceman-contributor-free`.
- **Assinantes Go (`go,free`) + seleção exata de modelos:**
  ```bash
  agentmodelkit copilot --providers opencode --tiers go,free --models claude-haiku-5-5,gpt-6-luna,hungerg-free
  ```
- **Catálogo completo (`all`):**
  ```bash
  agentmodelkit init --providers opencode --tiers all --live
  ```

### Headers obrigatórios e privacidade no OpenCode

1. **Header `x-opencode-session`:** o endpoint **OpenCode Go** (`/inference/go/openai/v1`) exige `x-opencode-session` (sem ele retorna `400 MissingSessionID`). O `AgentModelKit` configura `"x-opencode-session": "copilot-cli"` no Copilot CLI e `"x-opencode-session": "vscode-copilot"` em `requestHeaders` do VS Code.
2. **Free-tier Zen vs. Go Free:** conforme a documentação oficial (`https://opencode.ai/docs/console/models/`), modelos `*-free` do Console Zen exigem o próprio OpenCode CLI/TUI. Já os 4 modelos gratuitos do Go funcionam diretamente em outros clientes.
3. **Privacidade no Console:** `deepseek-v4.1-flash`, `deepseek-v4-pro` e `longcat-2.5` exigem **Regions: Global**; `muse-spark-1.3-contributor`, `muse-spark-1.2-contributor` e `iceman-contributor-free` exigem **Allow paid endpoints that train on request data**.

---

## 2. FreeLLMAPI (`freellmapi`)

O provider `freellmapi` (`src/providers/freellmapi.mjs`) integra o roteador gratuito open-source [FreeLLMAPI](https://freellmapi.co/models) (`tashfeenahmed/freellmapi`).

### Por que o FreeLLMAPI usa modo roteador (`auto`) por padrão

Conforme o [catálogo oficial do FreeLLMAPI](https://freellmapi.co/models) e seu guia para VS Code/OpenCode, o próprio roteador gerencia **450+ a 1.300+ modelos gratuitos entre 51–87 providers**, cuidando automaticamente de:
- Escolha dinâmica do melhor modelo disponível;
- Failover automático quando um provider atinge `rate-limit` (429);
- Controle de cota e cooldown por chave gratuita configurada no dashboard.

Por isso, o **padrão do AgentModelKit (`--freellmapi-mode auto`)** registra **apenas o roteador `auto`** (`FreeLLMAPI Auto Router`) no cliente — mantendo seu VS Code / Copilot CLI limpo e deixando o FreeLLMAPI cuidar da orquestração.

Caso prefira expor mais opções:
- `--freellmapi-mode auto` *(padrão)*: apenas `auto` (limpo, recomendado).
- `--freellmapi-mode strategies`: 6 roteadores virtuais (`auto`, `auto:smart`, `auto:fast`, `auto:reliable`, `auto:balanced`, `fusion`).
- `--freellmapi-mode ready` *(ou `--live`)*: consulta `GET <baseUrl>/models?execution_status=ready` na sua instância e inclui os modelos individuais atualmente prontos (que você também pode filtrar com checkboxes no assistente ou via `--models`).

### Porta e endereço dinâmicos (`--url`, `--port` e Desktop `config.json`)

A porta do FreeLLMAPI pode variar (Docker/Node com `PORT`, LAN, servidor remoto ou Desktop App usando `listenWithScan` entre `31415..31465`). O `AgentModelKit` resolve o endereço nesta ordem:
1. `--url <url-ou-porta>` (aceita URL completa `https://...`, `127.0.0.1:4000` ou apenas a porta `"4000"`)
2. `--port <numero>` ou variável `FREELLMAPI_PORT`
3. Variáveis `FREELLMAPI_URL` / `FREELLMAPI_BASE_URL`
4. Leitura automática do `config.json` do FreeLLMAPI Desktop (`~/Library/Application Support/FreeLLMAPI/config.json` no macOS, `%APPDATA%\FreeLLMAPI\config.json` no Windows, `~/.config/FreeLLMAPI/config.json` no Linux)
5. Probe ao vivo nas portas candidatas, usando `http://localhost:3001/v1` como fallback padrão.

### Integrando o FreeLLMAPI com o OpenCode e outros agentes

Como o FreeLLMAPI expõe uma API compatível com OpenAI (`/v1`) e Anthropic (`/messages`), ele pode ser ligado em **qualquer ferramenta** — inclusive **dentro do próprio OpenCode**:

1. Exemplo pronto para `~/.config/opencode/opencode.json` (ver [`examples/opencode.freellmapi.json`](../examples/opencode.freellmapi.json)):
   ```json
   {
     "$schema": "https://opencode.ai/config.json",
     "model": "freellmapi/auto",
     "provider": {
       "freellmapi": {
         "npm": "@ai-sdk/openai-compatible",
         "name": "FreeLLMAPI (local router)",
         "options": {
           "baseURL": "http://localhost:3001/v1"
         },
         "models": {
           "auto": {
             "name": "FreeLLMAPI Auto Router",
             "limit": { "context": 1048576, "output": 65536 }
           }
         }
       }
     }
   }
   ```
2. Em seguida, dentro do OpenCode rode `/connect`, escolha `freellmapi` e cole sua chave unificada (`freellmapi-...`). O header de resposta `X-Routed-Via` indica qual provider/modelo atendeu cada chamada.

---

## 3. Catálogo de APIs Gratuitas Diretas (`awesome-free-llm-apis`)

Além do roteador FreeLLMAPI e do OpenCode, você pode consultar o diretório comunitário [mnfst/awesome-free-llm-apis](https://github.com/mnfst/awesome-free-llm-apis) com provedores que oferecem **free tier permanente sem cartão de crédito** — tanto para adicionar chaves dentro do seu **FreeLLMAPI** quanto para configurar endpoints OpenAI-compatíveis diretos:

| Provider | Base URL compatível OpenAI | Observações do free tier |
| --- | --- | --- |
| **Google AI Studio (Gemini)** | `https://generativelanguage.googleapis.com/v1beta/openai/` | Sem cartão; Gemini Flash/Gemma; prompts free podem ser usados para melhoria do serviço |
| **Groq** | `https://api.groq.com/openai/v1` | Sem cartão; inferência LPU de baixa latência (`gpt-oss-120b`, `qwen3.8-27b` etc.) |
| **Cloudflare Workers AI** | `https://api.cloudflare.com/client/v4/accounts/{account_id}/ai/v1` | 10.000 Neurons/dia gratuitos sem cartão |
| **Cohere** | `https://api.cohere.ai/compatibility/v1` | Chave Trial gratuita (1.000 chamadas/mês, uso não comercial) |
| **AxForge** | `https://api.axforge.ai/v1` | 3M tokens a cada 30 dias na UE, sem cartão |
| **Kilo Code Gateway** | `https://api.kilo.ai/api/gateway` | Modelos `:free` e `kilo-auto/free` sem conta/cartão |

> **Dica:** adicionar 2 ou mais chaves gratuitas (ex.: Google AI Studio + Groq + Cloudflare) dentro do **FreeLLMAPI** multiplica sua cota gratuita diária por trás de um único modelo `auto` com failover automático.
