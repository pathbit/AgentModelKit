# Exemplos de saída (`examples/`)

Snapshots anonimizados (sem API keys reais) mostrando o que o **AgentModelKit** gera e exemplos extras de integração:

- [`vscode.chatLanguageModels.free.json`](vscode.chatLanguageModels.free.json): blocos para o `chatLanguageModels.json` do VS Code com `"vendor": "customendpoint"`, separadores visuais, referências `${input:...}`, `OpenCode (free)` e `FreeLLMAPI (auto)`.
- [`copilot.providers.free.json`](copilot.providers.free.json): payload para o `~/.copilot/providers.json` com `apiKeyCommand` multiplataforma lendo `.key`.
- [`opencode.freellmapi.json`](opencode.freellmapi.json): exemplo pronto para conectar o **OpenCode CLI** diretamente no roteador local **FreeLLMAPI** (`auto`).

Para simular na sua máquina sem gravar arquivos:

```bash
node bin/agentmodelkit.mjs init --providers opencode,freellmapi --tiers free --targets all --dry-run
```
