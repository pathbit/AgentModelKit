---
description: Technical design of the AgentModelKit CLI.
status: aprovado
---

# Architecture

[Português (Brasil)](ARCHITECTURE.md) · [Español](ARCHITECTURE.es.md)

The CLI uses ESM modules and built-in Node.js APIs, with no runtime package dependencies. Adapters write each client's configuration. The application requires no daemon or database.

- [src/agentmodelkit.mjs](../src/agentmodelkit.mjs) exposes the CLI and prints terminal errors.
- [src/cli.mjs](../src/cli.mjs) parses options, obtains credentials as needed, resolves models and plans the file updates before any write.
- [src/providers](../src/providers) resolves connection metadata, tiers and models for each provider. Manual manifests use the same internal format.
- [src/catalogs](../src/catalogs) reads snapshots, normalizes OpenCode APIs and verifies the signed public FreeLLMAPI catalog.
- [src/targets](../src/targets) converts groups into client configurations, preserves manual entries and updates only selected or managed models.
- [src/utils/json.mjs](../src/utils/json.mjs) stages temporary files, detects concurrent edits under locks, makes backups and renames files. On a write failure it attempts to restore the files already changed.

OpenCode uses `.opencode/opencode.json` and an adjacent managed-model record. Copilot CLI groups connections by protocol. VS Code records each model's endpoint and stores the ownership record in an adjacent file. Configurations from earlier development versions are recognized by the project's markers and can migrate incrementally.

Removal checks a complete, validated upstream list independently of the set of configurable models. A partial, empty or invalid list stops the operation.

The release workflow uses one tarball produced and tested by CI. Each destination receives that file. After publication, the npmjs check reads the public package, checks version selection, and compares the downloaded bytes with the tarball integrity.

The maintainer approved this baseline on November 25, 2026 for the `0.0.2` delivery.

[Documentation index](README.en.md)
