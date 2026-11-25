# AgentModelKit

[Português](README.md) · [Documentation](docs/README.md) · [Examples](examples/README.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Node.js >= 18](https://img.shields.io/badge/Node.js-%3E%3D18-blue.svg)](https://nodejs.org/)

Zero-dependency, cross-platform (**Windows, macOS, Linux**) Node.js CLI to configure **AI model providers, model tiers, and API keys** across coding editors and CLIs — starting with **VS Code** (`chatLanguageModels.json`) and **GitHub Copilot CLI** (`~/.copilot/providers.json`).

Sister repository to [AgentDevKit](https://github.com/pathbit/AgentDevKit): `AgentDevKit` distributes reusable agent skills and workflows, while **`AgentModelKit`** manages model endpoints, tiers, and credentials cleanly across tools.

## Quick start

```bash
# Guided interactive wizard
node bin/agentmodelkit.mjs

# Configure OpenCode free tier only + FreeLLMAPI for both VS Code and Copilot CLI
node bin/agentmodelkit.mjs init --providers opencode,freellmapi --tiers free --targets all

# Configure Copilot CLI only with OpenCode Go + Free
node bin/agentmodelkit.mjs copilot --providers opencode --tiers go,free

# Check detected binaries, config paths, and saved .key files
node bin/agentmodelkit.mjs doctor
```

## Development

```bash
npm run check
npm test
npm pack --dry-run
```

See [docs/README.md](docs/README.md) and [CONTRIBUTING.md](CONTRIBUTING.md) for architecture details and how to contribute new providers or editor/CLI targets (such as Claude Code Desktop, Cursor, or Codex CLI).

## License

[MIT](LICENSE) © PathBit
