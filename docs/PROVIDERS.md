# Providers

[English](PROVIDERS.en.md) · [Español](PROVIDERS.es.md)

## OpenCode Console e Go

Use `--providers opencode` e selecione `--tiers payg`, `go` ou `all`. PAYG usa os créditos e a política do seu workspace. Go exige uma assinatura compatível. O catálogo também exibe os modelos Free, que o OpenCode restringe ao cliente OpenCode. Modelos de chat usam Chat Completions, Responses ou Messages conforme o catálogo. Para modelos com API nativa Gemini, os outros protocolos podem ser usados por meio da tradução do Console. [OpenCode Console e clientes externos](https://opencode.ai/docs/console/harnesses/).

O OpenCode Go pede um identificador de sessão por conversa. O AgentModelKit usa headers estáticos com um identificador por perfil no VS Code e no Copilot CLI ou por projeto no OpenCode. As conversas no mesmo perfil ou projeto compartilham o identificador. A compatibilidade com Go também depende das regras de sessão e das políticas da sua conta. [Requisitos e clientes validados do Go](https://opencode.ai/docs/console/go/#where-can-i-use-it).

A chave pode ser passada em `OPENCODE_API_KEY` ou `--key-file`. A lista de disponibilidade para remoção vem dos endpoints públicos do Go e do Console.

## FreeLLMAPI

Execute `freellmapi` e escolha os clientes. **Local** é a primeira opção. Informe o endereço do servidor, por exemplo `http://127.0.0.1:3001/v1` no Docker ou a URL exibida no aplicativo Desktop. Use a chave unificada do painel. Para automação, informe `--url` ou `FREELLMAPI_URL` e passe a chave com `FREELLMAPI_API_KEY` ou `--key-file`.

**Remoto** usa a URL HTTPS de uma instância sua, definida em `FREELLMAPI_REMOTE_URL` ou fornecida com `--url`. A opção usa `FREELLMAPI_REMOTE_API_KEY` ou pede a chave dessa instância. Para selecionar o modo em scripts, use `--connection remote`. O domínio público `api.freellmapi.co` serve o catálogo. Consulte o [guia oficial de implantação](https://github.com/tashfeenahmed/freellmapi/blob/main/docs/en/install/01-install.md) para expor sua instância.

O painel **Keys → Agents** também gera uma URL com token revogável, no formato `https://llm.example.com/v1/t/EXAMPLE_TOKEN`. Essa URL autentica por conta própria. O assistente oculta o que for colado. O OpenCode guarda uma referência a um arquivo privado. O VS Code e o Copilot CLI guardam a URL nos arquivos de perfil.

- `auto` registra o roteador único.
- `strategies` registra as estratégias virtuais incluídas em `data/`.
- `ready` consulta `/v1/models?execution_status=ready` e também inclui as estratégias. Uma falha na consulta interrompe a configuração.
- `prune` consulta `/v1/models` do servidor configurado. Modelos que ainda estiverem no catálogo, sem chave ou temporariamente indisponíveis, permanecem.

O catálogo público mensal serve para pesquisa. A prontidão depende das chaves, dos limites e do estado do servidor que você configurou. [API do FreeLLMAPI](https://github.com/tashfeenahmed/freellmapi/blob/main/docs/en/api/01-rest-api.md#model-listing).

## Providers manuais

Crie um JSON a partir do [exemplo](../examples/provider.local.example.json). Use um ID único no formato `custom-*`, uma URL HTTP(S), o protocolo e os limites de tokens de cada modelo. Deixe as chaves fora do manifesto. Se `requiresKey` for verdadeiro (o padrão), use uma variável derivada do ID, como `CUSTOM_MEU_PROVIDER_API_KEY`, ou passe `--key-file`.

`modelsUrl` é opcional e deve ficar na mesma origem do endpoint. Declare-o para usar `--live` e `prune`. A resposta deve ser uma lista OpenAI compatível, completa e sem paginação. Para `--powerful`, declare os IDs em `powerfulIds`. Para o protocolo Messages, informe a base incluindo `/v1` quando esse prefixo fizer parte da rota `/v1/messages`.

[Índice da documentação](README.md)
