# AgentModelKit

[Português](README.md) · [Documentation](docs/README.md)

AgentModelKit configures AI providers and models in VS Code and GitHub Copilot CLI. It runs on Windows, macOS and Linux.

## Required prerequisite

Install **[Node.js](https://nodejs.org/en/download)** version 18 or later. A current LTS release is recommended. Node.js includes npm and npx. To run the configured models, use one of the supported clients and follow the provider's requirements for access.

## Run without a permanent installation

After the first npm release, run the assistant with `npx --yes @pathbit/agentmodelkit`. npm caches the package. AgentModelKit writes client configuration and has zero runtime dependencies. While developing from the repository, use `node bin/agentmodelkit.mjs`.

```sh
npx --yes @pathbit/agentmodelkit add --providers freellmapi --targets all --dry-run
npx --yes @pathbit/agentmodelkit add --providers opencode --tiers payg --powerful --dry-run
npx --yes @pathbit/agentmodelkit add --provider-file ./my-provider.json --dry-run
npx --yes @pathbit/agentmodelkit catalog update
npx --yes @pathbit/agentmodelkit prune --providers opencode
```

`add` preserves existing entries and applies the selected additions. `--replace` replaces selections managed for the specified providers. `prune` previews removal after checking the live source without a readiness filter. Use `--apply` to write those changes. Every changed existing file receives a new backup.

Use `--key-file`, the provider's environment variable, or the interactive prompt to supply a key. Copilot CLI's named-provider JSON stores the key directly. VS Code defaults to a secret input reference. Keep keys and configuration backups outside the repository.

The package includes curated catalog snapshots in `data/`. The catalog update command caches fresh data separately. OpenCode Free models are reserved for OpenCode, so use FreeLLMAPI, an eligible OpenCode plan, or your own endpoint for these clients. See the [Portuguese README](README.md) for flag and provider details and the [release process](docs/RELEASE.md) for maintenance.

[MIT](LICENSE) © PathBit
