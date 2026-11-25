# Testes (`tests/`)

Suíte de testes automatizados utilizando apenas o runner nativo `node:test` (Node.js `>= 18`, sem dependências externas).

## Arquivos

- [`cli.test.mjs`](cli.test.mjs): resolução cross-platform de caminhos, `apiKeyCommand`, tiers do OpenCode, gravação `0600` de `.key`, downgrade idempotente, backups `.bak` e `--dry-run`.
- [`freellmapi.test.mjs`](freellmapi.test.mjs): normalização de URL, auto-detecção `:31415`/`:3001`, descoberta ao vivo contra servidor HTTP mock (`/v1/models?execution_status=ready`) e fallback offline.
- [`repo-structure.test.mjs`](repo-structure.test.mjs): valida presença de diretórios/arquivos básicos do repositório, JSONs válidos e ausência de segredos versionados.

## Como executar

```bash
npm run check
npm test
```
