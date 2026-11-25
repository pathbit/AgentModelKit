# Providers

[English](PROVIDERS.en.md) · [Español](PROVIDERS.es.md)

## OpenCode Console e Go

Use `--providers opencode` e selecione `--tiers payg`, `go` ou `all`. PAYG usa os créditos e a política do seu workspace. Go exige uma assinatura compatível. O catálogo também exibe os modelos Free, que o OpenCode restringe ao cliente OpenCode. Modelos de chat usam Chat Completions, Responses ou Messages conforme o catálogo. Para modelos com API nativa Gemini, os outros protocolos podem ser usados por meio da tradução do Console. [OpenCode Console e clientes externos](https://opencode.ai/docs/console/harnesses/).

O OpenCode Go pede um identificador de sessão por conversa. O AgentModelKit usa headers estáticos com um identificador por perfil no VS Code e no Copilot CLI ou por projeto no OpenCode. As conversas no mesmo perfil ou projeto compartilham o identificador. A compatibilidade com Go também depende das regras de sessão e das políticas da sua conta. [Requisitos e clientes validados do Go](https://opencode.ai/docs/console/go/#where-can-i-use-it).

A chave pode ser passada em `OPENCODE_API_KEY` ou `--key-file`. A lista de disponibilidade para remoção vem dos endpoints públicos do Go e do Console.

## FreeLLMAPI

No painel do servidor FreeLLMAPI, abra **Keys → Agents** e copie a URL de agente. Cole no assistente ou passe com `--url`. Uma URL com token revogável tem o formato `https://llm.example.com/v1/t/EXAMPLE_TOKEN`. O AgentModelKit também aceita a URL copiada com `/chat/completions`. O token na URL autentica o acesso. O modo padrão configura `auto`.

A URL de agente é uma credencial. Prefira colar no assistente, que oculta a digitação. Para automação, use `FREELLMAPI_URL` em um ambiente privado. O OpenCode referencia um arquivo privado fora do projeto. O VS Code e o Copilot CLI armazenam a URL nos arquivos de perfil. Mantenha esses arquivos e seus backups privados.

Para usar o endereço comum do servidor, como `http://localhost:3001/v1`, configure a chave unificada com `FREELLMAPI_API_KEY` ou `--key-file`. O assistente também pode detectar a porta local. Os modos avançados continuam disponíveis.

- `auto` registra o roteador único.
- `strategies` registra as estratégias virtuais incluídas em `data/`.
- `ready` consulta `/v1/models?execution_status=ready` e também inclui as estratégias. Uma falha na consulta interrompe a configuração.
- `prune` consulta `/v1/models` do servidor configurado. Modelos que ainda estiverem no catálogo, sem chave ou temporariamente indisponíveis, permanecem.

O catálogo público mensal serve para pesquisa. A prontidão depende das chaves, dos limites e do estado do servidor que você configurou. [API do FreeLLMAPI](https://github.com/tashfeenahmed/freellmapi/blob/main/docs/en/api/01-rest-api.md#model-listing).

## Providers manuais

Crie um JSON a partir do [exemplo](../examples/provider.local.example.json). Use um ID único no formato `custom-*`, uma URL HTTP(S), o protocolo e os limites de tokens de cada modelo. Deixe as chaves fora do manifesto. Se `requiresKey` for verdadeiro (o padrão), use uma variável derivada do ID, como `CUSTOM_MEU_PROVIDER_API_KEY`, ou passe `--key-file`.

`modelsUrl` é opcional e deve ficar na mesma origem do endpoint. Declare-o para usar `--live` e `prune`. A resposta deve ser uma lista OpenAI compatível, completa e sem paginação. Para `--powerful`, declare os IDs em `powerfulIds`. Para o protocolo Messages, informe a base incluindo `/v1` quando esse prefixo fizer parte da rota `/v1/messages`.

[Índice da documentação](README.md)
