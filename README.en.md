# AgentModelKit

[Português (Brasil)](README.md) · [Español](README.es.md) · [Documentation](docs/README.en.md) · [Examples](examples/README.en.md)

AgentModelKit configures AI providers and models in **OpenCode**, **VS Code** and **GitHub Copilot CLI**. The CLI runs on Windows, macOS and Linux, accepts parameters for automation, and includes an interactive terminal picker. PathBit maintains it alongside [AgentDevKit](https://github.com/pathbit/AgentDevKit/blob/main/README.en.md).

CLI help and messages are in English.

## Required prerequisite

**Install only [Node.js](https://nodejs.org/en/download)** to run AgentModelKit. The minimum version is 18. Use a current LTS release whenever possible. Node.js includes `npm` and `npx`. Check them with `node -v` and `npx --version`.

To **use** a configured model, you also need the chosen client. If you choose FreeLLMAPI, it must already be running. Your provider may require an account or a key. AgentModelKit can generate the configuration before the client is available.

## Quick start

1. With Node.js installed, open a terminal in your project directory.
2. Run the command below. Use ↑↓ to navigate, **Space** to check agents, providers and models, and **Enter** to confirm.
3. Open the selected client to use the model. OpenCode is the default and reads the project configuration from `.opencode/opencode.json`. VS Code and Copilot CLI use profile files.

```bash
npx --yes @pathbit/agentmodelkit
```

Until the first publication, run `node bin/agentmodelkit.mjs` from the local repository. To preview a parameterized configuration in this project, use `npx --yes @pathbit/agentmodelkit init --providers freellmapi --dry-run`.

| To… | Quick option |
| --- | --- |
| Choose the project's agents | Run the wizard or pass `--targets opencode,vscode,copilot-cli`. |
| Add a model or provider | Use `add --providers <id> --models <ids>` or `add --provider-file ./my-provider.json`. |
| Load recommended models | Add `--powerful`. |
| Refresh the catalog | Use `catalog update`. |
| Check and remove missing models | Run `prune --providers <id>` and add `--apply` to apply. |
| Review detected files and clients | Run `doctor`. |

## Direct use and automation

`npx` downloads the package to the npm cache and runs the CLI. The command configures client files and leaves installation of editors, extensions, providers, runtimes and models to you. A `--dry-run` leaves configuration, credentials and backups untouched.

**While the package is in local development**, run the examples from this repository by replacing `npx --yes @pathbit/agentmodelkit` with `node bin/agentmodelkit.mjs`. The package name will be available on npm after the first release.

```bash
# Select clients, providers and models interactively.
npx --yes @pathbit/agentmodelkit

# Preview FreeLLMAPI configuration with the auto router.
npx --yes @pathbit/agentmodelkit init --providers freellmapi --targets all --dry-run

# Configure an existing FreeLLMAPI server.
npx --yes @pathbit/agentmodelkit add --providers freellmapi --port 31415 --key-file ./freellmapi.key --yes

# Add an OpenCode Console model to Copilot CLI.
npx --yes @pathbit/agentmodelkit add --providers opencode --tiers payg --models gpt-6.2-sol --targets copilot-cli --key-file ./opencode.key --yes

# Preview adding the curated models from Go and Console.
npx --yes @pathbit/agentmodelkit add --providers opencode --tiers all --powerful --dry-run
```

`--yes` **after the package name** disables AgentModelKit prompts. `--yes` before the name confirms npm's cache prompt.

To configure OpenCode in another directory, pass `--project-dir <directory>`. Without `--targets`, OpenCode is also the non-interactive default. Use `--targets all` to include all three clients.

## Add, replace and remove models

- `add` and `init` add models and update selected entries. Other models and providers remain available.
- `--replace` replaces managed selections for the specified providers after creating backups. Preview the changes with `--dry-run`.
- `--models` accepts comma-separated IDs. Use `<group>/<model>` to distinguish the same ID in Go and PAYG.
- `--default-model` explicitly sets the Copilot CLI default. Pass the model ID or the qualified selection shown by the command.
- `prune` queries the full upstream list and previews removal of managed models that have disappeared. Add `--apply` to remove them. A FreeLLMAPI model still listed upstream stays configured even if it currently needs a key or has exhausted its quota.

```bash
npx --yes @pathbit/agentmodelkit prune --providers opencode
npx --yes @pathbit/agentmodelkit prune --providers opencode --apply
npx --yes @pathbit/agentmodelkit prune --providers freellmapi --port 31415 --key-file ./freellmapi.key
```

Every change to an existing file saves its previous bytes in a unique `.bak` file. The CLI prints the backup paths. Invalid configuration JSON stops the operation before either client is written.

## Providers and catalogs

| Provider | Options |
| --- | --- |
| OpenCode | `--tiers go` for a subscription and `--tiers payg` for Console. `all` includes both. OpenCode Free is restricted to the OpenCode client. Free entries appear in `catalog list` for reference. |
| FreeLLMAPI | `auto` by default or `--freellmapi-mode strategies\|ready`. Use `--url` or `--port` for a particular server. `ready` queries the models that can serve requests on that server. |
| Manual provider | Pass a [JSON manifest](examples/provider.local.example.json) with `--provider-file`. Repeat the flag to include multiple providers. |

`--powerful` loads the editorial selection from [data/curation.json](data/curation.json). For FreeLLMAPI it includes router strategies. For a manual provider, list recommended models in `powerfulIds`. The selection is versioned and can be reviewed monthly. AgentModelKit uses the published data directly when selecting models.

```bash
# List the catalogs in use.
npx --yes @pathbit/agentmodelkit catalog list

# Fetch the official OpenCode catalog and the signed FreeLLMAPI distribution.
npx --yes @pathbit/agentmodelkit catalog update

# Preview one catalog refresh.
npx --yes @pathbit/agentmodelkit catalog update --source opencode --dry-run

# Load models from your endpoint using a local manifest.
npx --yes @pathbit/agentmodelkit add --provider-file ./my-provider.json --dry-run
```

The package includes catalog files in `data/`. `catalog update` uses a cache outside the package. Use `--live` to query OpenCode during configuration. FreeLLMAPI live configuration queries your server. Its published catalog serves as a product reference. [Sources, cache and monthly refresh details](data/README.en.md).

## Credentials and clients

- **OpenCode 2** reads models from `.opencode/opencode.json`. The key stays as a reference to the provider environment variable or the file passed with `--key-file`. Use `--no-save-key` to keep only the file you provided.
- **Copilot CLI** uses `apiKey` in the named-provider `providers.json` schema. Use `--key-file`, `OPENCODE_API_KEY`, `FREELLMAPI_API_KEY` or the masked terminal prompt. `--no-save-key` skips the separate `.key` copy. Managed files and backups use restrictive permissions on POSIX systems.
- **VS Code** uses a secret reference by default. Enter the key in the model manager. The key stays in VS Code secret storage. The client uses `chatLanguageModels.json` from the chosen profile.
- `doctor` reports versions, paths and key-file presence. See [Clients](docs/CLIENTS.en.md) for custom paths, backups and restoration.

## Development and publishing

```bash
npm run check
npm test
npm run test:package
npm run catalog:update -- --dry-run
```

Reviewed changes go to `main`. The maintainer approves the release tag after testing. The [release process](docs/RELEASE.en.md) validates the tag, tests the package and uses the same tarball for npmjs, GitHub Packages and GitHub Releases.

[MIT](LICENSE) © PathBit
