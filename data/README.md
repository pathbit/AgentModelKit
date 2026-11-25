# Catálogos

Os arquivos nesta pasta são incluídos no tarball npm.

| Arquivo | Origem e uso |
| --- | --- |
| `opencode-catalog.json` | APIs oficiais do Go e Console. Traz os modelos de chat com metadados de protocolo e o conjunto completo de IDs por origem para auditoria. |
| `freellmapi-catalog.json` | Catálogo público mensal do FreeLLMAPI, validado com a chave Ed25519 publicada pelo projeto. Inclui modelos de referência e as estratégias virtuais usadas pela CLI. |
| `curation.json` | Seleção editorial. Revise os IDs, os critérios e a data quando houver mudança de catálogo. |
| `awesome-free-providers.json` | Snapshot de referência comunitário. Use-o para pesquisar endpoints e crie um manifesto manual com os dados que você verificar. |

O usuário pode atualizar o cache com `catalog update [--source opencode|freellmapi|all]`. O cache fica em `AGENTMODELKIT_CATALOG_DIR` quando definido. O padrão é `$XDG_CACHE_HOME/agentmodelkit/catalogs` ou `~/.cache/agentmodelkit/catalogs`. O CLI usa o snapshot do pacote quando ainda não existe cache para uma fonte.

Quem mantém o repositório roda `npm run catalog:update -- --write` para regenerar os snapshots em `data/`. A opção `--check` retorna erro se houver diferença. O workflow mensal baixa as fontes oficiais e disponibiliza um patch para revisão. Mudanças na seleção `--powerful` são revisadas em `curation.json`.

As listas públicas vêm das APIs de [modelos do OpenCode](https://opencode.ai/docs/console/api/models/) e do [catálogo mensal do FreeLLMAPI](https://github.com/tashfeenahmed/freellmapi/blob/main/docs/en/architecture/05-catalog-sync.md). O snapshot comunitário usa o projeto [Awesome Free LLM APIs](https://github.com/mnfst/awesome-free-llm-apis).
