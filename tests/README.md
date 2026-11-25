# Testes (`tests/`)

Suíte de testes automatizados utilizando apenas o runner nativo `node:test` (Node.js `>= 18`, sem dependências externas).

## Arquivos

- [`cli.test.mjs`](cli.test.mjs): resolução cross-platform de caminhos, `apiKeyCommand`, catálogo e tiers do OpenCode, schema `customendpoint` do VS Code, filtro `--models`, gravação `0600` de `.key`, downgrade idempotente e `--dry-run`.
- [`freellmapi.test.mjs`](freellmapi.test.mjs): normalização de URL/porta, leitura dinâmica de `config.json` do Desktop App, detecção `--port` / env, modo padrão `auto`, estratégias virtuais e descoberta ao vivo contra servidor HTTP mock (`/v1/models?execution_status=ready`).
- [`prompts.test.mjs`](prompts.test.mjs): simulação de interação via teclado (`↑`, `↓`, `Espaço`, `a`, `Enter`) e fallback não-TTY para os seletores com checkboxes.
- [`repo-structure.test.mjs`](repo-structure.test.mjs): valida estrutura padrão do repositório, vendors válidos do VS Code e ausência de segredos versionados.

## Como executar

```bash
npm run check
npm test
```
