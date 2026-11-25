# Código-fonte (`src/`)

Implementação da CLI, gestão de chaves, providers de IA e adaptadores de destino (targets).

## Estrutura

| Caminho | Responsabilidade |
| --- | --- |
| [`cli.mjs`](cli.mjs) | Parser de argumentos, assistente interativo, `list`, `doctor`, `key` e orquestração |
| [`keys.mjs`](keys.mjs) | Resolução e gravação segura (`0600`) de `<COPILOT_HOME>/<provider>.key` |
| [`providers/`](providers/index.mjs) | Adaptadores de providers (`opencode.mjs`, `freellmapi.mjs`) |
| [`targets/`](targets/index.mjs) | Adaptadores de clientes (`vscode.mjs`, `copilot-cli.mjs`) |
| [`utils/`](utils/paths.mjs) | Caminhos cross-platform, backup `.bak`, gravação JSON e `apiKeyCommand` |

Veja o guia de contribuição em [CONTRIBUTING.md](../CONTRIBUTING.md) e a [arquitetura detalhada](../docs/ARCHITECTURE.md).
