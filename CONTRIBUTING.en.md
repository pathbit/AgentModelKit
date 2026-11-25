# Contributing

[Português (Brasil)](CONTRIBUTING.md) · [Español](CONTRIBUTING.es.md)

AgentModelKit is a PathBit project. Changes go to `main` after verification.

## Environment

Use [Node.js](https://nodejs.org/en/download) 18 or later. The CLI uses native Node.js modules.

```bash
npm run check
npm test
npm run test:package
```

The package test runs the published commands from a local tarball using a temporary cache and profiles. Set `COPILOT_HOME`, `VSCODE_USER_DIR` and `AGENTMODELKIT_CATALOG_DIR` to keep tests separate from your regular profiles.

When changing a provider or client, test the generated configuration, coexistence with existing entries, and failure during file writes or source queries. When updating data, regenerate it as described in [the catalog guide](data/README.en.md) and review model IDs in [data/curation.json](data/curation.json).

Use English for source code, scripts, tests and terminal messages. Update documentation in Brazilian Portuguese, English and Spanish together. The unsuffixed Markdown file is the Brazilian Portuguese default. Keep translated pages in the same directory using `.en.md` and `.es.md` and link to the corresponding language.

The maintainer authorizes creation of the tag and publication following the [release process](docs/RELEASE.en.md).
