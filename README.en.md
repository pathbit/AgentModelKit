# AgentModelKit

[Português](README.md) · [Documentation](docs/README.md) · [Examples](examples/README.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Node.js >= 18](https://img.shields.io/badge/Node.js-%3E%3D18-blue.svg)](https://nodejs.org/)

Zero-dependency, cross-platform (**Windows, macOS, Linux**) Node.js CLI to configure **AI model providers, service/license tiers, interactive checkbox model selection, and API keys** across coding editors and CLIs — starting with **VS Code** (`chatLanguageModels.json`) and **GitHub Copilot CLI** (`~/.copilot/providers.json`).

Sister repository to [AgentDevKit](https://github.com/pathbit/AgentDevKit): `AgentDevKit` distributes reusable agent skills and rules, while **`AgentModelKit`** manages model endpoints, licenses, routing, and credentials across tools.

## Highlights

- **Terminal checkbox wizard (`npx`):** toggle targets (`VS Code`, `Copilot CLI`), combined services/licenses (`OpenCode Free`, `OpenCode Go`, `OpenCode PAYG`, `FreeLLMAPI`), and individual models interactively.
- **Dynamic FreeLLMAPI port & clean `auto` mode:** detects FreeLLMAPI Desktop's runtime `config.json` port or server port dynamically, accepts custom `--url` / `--port`, and configures only the `auto` smart router by default (letting FreeLLMAPI handle model routing & failover).
- **VS Code `customendpoint` compliant:** emits valid `"vendor": "customendpoint"` blocks and `${input:...}` secret vault references.
- **Cross-platform Copilot CLI `apiKeyCommand`:** reads `<COPILOT_HOME>/<provider>.key` (`0600`) cleanly in `cmd.exe`, macOS, and Linux without editing shell profiles.

## Quick start

```bash
# Guided interactive checkbox wizard
node bin/agentmodelkit.mjs

# Configure OpenCode Free + FreeLLMAPI (clean auto router) on VS Code & Copilot CLI
node bin/agentmodelkit.mjs init --providers opencode,freellmapi --tiers free --targets all

# Configure FreeLLMAPI on a custom dynamic port
node bin/agentmodelkit.mjs init --providers freellmapi --port 31416 --targets all

# Filter specific model IDs non-interactively
node bin/agentmodelkit.mjs copilot --providers opencode --tiers go,free --models claude-haiku-5-5,hungerg-free

# Check binaries, detected FreeLLMAPI URL, config paths, and saved .key files
node bin/agentmodelkit.mjs doctor
```

## Development

```bash
npm run check
npm test
npm pack --dry-run
```

## License

[MIT](LICENSE) © PathBit
