# Source code

[Português (Brasil)](README.md) · [Español](README.es.md)

The code uses native Node.js ES modules. See the [architecture](../docs/ARCHITECTURE.en.md) and [provider reference](../docs/PROVIDERS.en.md).

The [entry point](agentmodelkit.mjs) exposes the `agentmodelkit` and `amk` package commands. [cli.mjs](cli.mjs) handles options and execution. For development, use `npm run cli -- --help` to see the options and `npm run cli -- --version` to print the version declared in the package. See the [package usage examples](../README.en.md).
