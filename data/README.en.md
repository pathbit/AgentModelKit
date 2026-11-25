# Catalogs

[Português (Brasil)](README.md) · [Español](README.es.md)

The files in this directory are included in the npm tarball.

| File | Source and use |
| --- | --- |
| `opencode-catalog.json` | Official Go and Console APIs. Includes chat models with protocol metadata and the full set of IDs per source for review. |
| `freellmapi-catalog.json` | FreeLLMAPI's public monthly catalog, verified using the project's published Ed25519 key. Includes reference models and the virtual strategies used by the CLI. |
| `curation.json` | Editorial selection. Review the IDs, criteria and date when the catalog changes. |
| `awesome-free-providers.json` | Community reference snapshot. Use it to research endpoints and create a manual manifest with the details you verify. |

Users can update the cache with `catalog update [--source opencode|freellmapi|all]`. Set `AGENTMODELKIT_CATALOG_DIR` to override the location. The default is `$XDG_CACHE_HOME/agentmodelkit/catalogs` or `~/.cache/agentmodelkit/catalogs`. The CLI uses the bundled snapshot when a source has no cache yet.

Maintainers run `npm run catalog:update -- --write` to regenerate the snapshots in `data/`. `--check` returns an error when it finds differences. The monthly workflow downloads the official sources and provides a patch for review. Edit `curation.json` when reviewing changes to the `--powerful` selection.

Sources are the [OpenCode model APIs](https://opencode.ai/docs/console/api/models/) and [FreeLLMAPI monthly catalog](https://github.com/tashfeenahmed/freellmapi/blob/main/docs/en/architecture/05-catalog-sync.md). The community snapshot comes from [Awesome Free LLM APIs](https://github.com/mnfst/awesome-free-llm-apis).
