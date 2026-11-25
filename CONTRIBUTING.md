# Contribuindo para o AgentModelKit

Contribuições são muito bem-vindas! O projeto foi desenhado para facilitar a adição de **novos providers de IA** e **novos editores / CLIs / apps desktop**.

## Como adicionar um novo Provider

1. Crie `src/providers/<seu-provider>.mjs` exportando um objeto com:
   - `id`, `label`, `description`
   - `availableTiers`, `defaultTiers`
   - `keyFile`, `envVar`, `keyPlaceholder`, `requiresKey`
   - `async resolve({ tiers, baseUrl, port, mode, apiKey, live })` retornando:
     ```js
     {
       providerId: "seu-provider",
       separatorName: "+++++++ CONFIGURACAO SEU PROVIDER +++++++",
       copilotRootComment: "+++++++ CONFIGURACAO SEU PROVIDER +++++++",
       managedGroupIds: ["seu-provider"],
       managedVSCodeNames: ["+++++++ CONFIGURACAO SEU PROVIDER +++++++", "Seu Provider"],
       keyFile: "seu-provider.key",
       defaultModel: "seu-provider/modelo-padrao",
       source: "catalog",
       groups: [
         {
           id: "seu-provider",
           label: "Seu Provider",
           prefix: "[Seu Provider]",
           comment: "+++++++ SEU PROVIDER +++++++",
           baseUrl: "https://api.exemplo.com/v1",
           copilotHeaders: null,
           vscodeHeaders: null,
           vscodeSecretId: "chat.lm.secret.seuprovider",
           models: [
             {
               id: "modelo-padrao",
               name: "Modelo Padrao",
               toolCalling: true,
               vision: false,
               reasoningEffort: "high",
               tier: "intelligence",
               maxInputTokens: 128000,
               maxOutputTokens: 16384,
             },
           ],
         },
       ],
     }
     ```
2. Registre o provider em `src/providers/index.mjs`.
3. Adicione testes em `tests/` e rode `npm run check && npm test`.

## Como adicionar um novo Target (Editor / CLI / Desktop)

1. Crie `src/targets/<seu-target>.mjs` implementando:
   - `id`, `label`, `description`
   - `apply(resolvedProviders, opts, env)` (respeitando `opts.dryRun`, preservando configurações não gerenciadas e criando backup `.bak` antes de gravar).
2. Registre em `src/targets/index.mjs`.
3. Documente em `docs/CLIENTS.md` e adicione testes em `tests/`.

## Verificação antes de abrir PR

```bash
npm test
node bin/agentmodelkit.mjs list
node bin/agentmodelkit.mjs doctor
```
