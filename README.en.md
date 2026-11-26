# AgentModelKit

[Português (Brasil)](README.md) · [Español](README.es.md) · [Documentation](docs/README.en.md) · [Examples](examples/README.en.md)
· [Package on npmjs][npm-package] · [GitHub releases][github-releases]

AgentModelKit configures AI providers and models in **OpenCode**, **VS Code** and **GitHub Copilot CLI**. The CLI runs on Windows, macOS and Linux, accepts parameters for automation, and includes an interactive terminal picker. PathBit maintains it alongside [AgentDevKit](https://github.com/pathbit/AgentDevKit/blob/main/README.en.md).

CLI help and messages are in English.

## Prerequisites

**Required.** Install [Node.js](https://nodejs.org/en/download) to run AgentModelKit. The minimum version is 18. Use a current LTS release whenever possible. Node.js includes `npm` and `npx`. Check them with `node -v` and `npx --version`.

To **use** a configured model, you also need the chosen client. If you choose FreeLLMAPI, it must already be running. Your provider may require an account or a key. AgentModelKit can generate the configuration before the client is available.

Git is required when running from the source on GitHub. [Download Git][git-download]

## Quick start

Open a terminal in your project folder. npmjs is the default way to run the kit. Use `@latest` for the newest stable release. Specify the version number to run the same version every time.

```console
npx --yes @pathbit/agentmodelkit@latest opencode
npx --yes @pathbit/agentmodelkit@0.0.1 opencode vscode copilot
```

Use **↑↓** to navigate, **Space** to mark each client and **Enter** to confirm the selection. Press **A** to select all or clear the selection. The wizard asks for a plan or connection and for the token when needed.

Add `--project-dir <path>` to configure OpenCode in another project.

| To… | Quick option |
| --- | --- |
| Choose the project's clients | Mark several in the wizard, pass `vscode copilot` after the provider, or use `--targets all`. |
| Add a model or provider | Use `add --providers <id> --models <ids>` or `add --provider-file ./my-provider.json`. |
| Load recommended models | Add `--powerful`. |
| Refresh the catalog | Use `catalog update`. |
| Check and remove missing models | Run `prune --providers <id>` and add `--apply` to apply. |
| Review detected files and clients | Run `doctor`. |

## Other ways to run

### From a GitHub release

Run the `.tgz` for a published version. It requires Node.js and its bundled `npx`.

```console
npx --yes https://github.com/pathbit/AgentModelKit/releases/download/v0.0.1/pathbit-agentmodelkit-0.0.1.tgz opencode
```

### From the source on GitHub

With [Git installed][git-download], run the development version from the `main` branch.

```console
npx --yes "git+https://github.com/pathbit/AgentModelKit.git#main" opencode
```

## Direct use and automation

`npx` downloads the package to the npm cache and runs the CLI. The command configures client files and leaves installation of editors, extensions, providers, runtimes and models to you. A `--dry-run` leaves configuration, credentials and backups untouched.

To run the examples from GitHub, replace `@pathbit/agentmodelkit` with the tarball or Git URL shown in [Other ways to run](#other-ways-to-run).

```bash
# Configure OpenCode in VS Code and Copilot CLI.
npx --yes @pathbit/agentmodelkit opencode vscode copilot

# Configure local FreeLLMAPI in VS Code (the wizard asks for the unified key).
npx --yes @pathbit/agentmodelkit freellmapi vscode --connection local --url http://127.0.0.1:3001/v1

# Preview local FreeLLMAPI setup in all three clients.
npx --yes @pathbit/agentmodelkit freellmapi --targets all --url http://127.0.0.1:3001/v1 --dry-run

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
npx --yes @pathbit/agentmodelkit prune --url 'https://llm.example.com/v1/t/EXAMPLE_TOKEN'
```

Every change to an existing file saves its previous bytes in a unique `.bak` file. The CLI prints the backup paths. Invalid configuration JSON stops the operation before either client is written.

## Providers and catalogs

| Provider | Options |
| --- | --- |
| OpenCode | `--tiers go` for a subscription and `--tiers payg` for Console. `all` includes both. OpenCode Free is restricted to the OpenCode client. Free entries appear in `catalog list` for reference. |
| FreeLLMAPI | For local setup, enter the server URL and unified key. An agent URL includes the credential. The default router is `auto`. See [remote setup and advanced modes](docs/PROVIDERS.en.md#freellmapi). |
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
- In **VS Code**, guided commands configure authentication through headers in the user profile. Keep the profile and backups private. To use the editor's secret storage, see [Clients](docs/CLIENTS.en.md#vs-code).
- `doctor` reports versions, paths and key-file presence. See [Clients](docs/CLIENTS.en.md) for custom paths, backups and restoration.

## Development and publishing

```bash
npm run check
npm test
npm run test:package
npm run catalog:update -- --dry-run
```

Reviewed changes go to `main`. The maintainer approves the release tag after testing. The [release process](docs/RELEASE.en.md) validates the tag, tests the package and uses the same tarball for npmjs, GitHub Packages and GitHub Releases.

---

## AgentDevKit

The [shared kit](https://github.com/pathbit/AgentModelKit/blob/main/.pbai4devs/README.md), [Codex references](https://github.com/pathbit/AgentModelKit/tree/main/.codex) and
[AGENTS.md](https://github.com/pathbit/AgentModelKit/blob/main/AGENTS.md) are included in the repository.

The kit CLI requires [Node.js 24+ with npm and npx](https://nodejs.org/en/download).
Run this from the project root to generate the local selection and indexes.

```console
npx @pathbit/agentdevkit@0.0.40 init
```

On the first run, the CLI adds a managed reference block to `AGENTS.md`.
Use the arrow keys and **Space** to select agents. Press **Enter** to confirm.
The guide also covers updates and diagnostics. [AgentDevKit quick start](https://github.com/pathbit/AgentDevKit/blob/main/README.en.md#quick-start)

---

## Contributing and Branch Protection

- Open a pull request from your fork targeting `main`. Check that CI passes before requesting review.
- See the [contribution guide](CONTRIBUTING.en.md). For bugs or requests to support new providers, open an [issue](https://github.com/pathbit/AgentModelKit/issues).

---

## 📄 License

The project uses the MIT License. Read the full text in [LICENSE](LICENSE).

You may use, modify, and distribute the software, including commercially, provided that copies include the copyright and license notices. The software comes without warranty.

[npm-package]: https://www.npmjs.com/package/@pathbit/agentmodelkit
[github-releases]: https://github.com/pathbit/AgentModelKit/releases
[git-download]: https://git-scm.com/install/

---

Developed with ❤️ by [Pathbit](https://www.pathbit.com.br/)
