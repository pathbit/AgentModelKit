# Exemplos de saída (`examples/`)

Snapshots anonimizados (sem API keys reais) mostrando os arquivos gerados pelo **AgentModelKit** ao ativar **OpenCode (`free`) + FreeLLMAPI**:

- [`vscode.chatLanguageModels.free.json`](vscode.chatLanguageModels.free.json): blocos para o `chatLanguageModels.json` do VS Code com separadores `"vendor": "comentario"` e referências ao cofre `${input:...}`.
- [`copilot.providers.free.json`](copilot.providers.free.json): payload para o `~/.copilot/providers.json` com `apiKeyCommand` multiplataforma lendo `.key`.

Para gerar na sua máquina com seus dados:

```bash
node bin/agentmodelkit.mjs init --providers opencode,freellmapi --tiers free --targets all --dry-run
```
