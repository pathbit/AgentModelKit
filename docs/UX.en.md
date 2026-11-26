---
description: CLI setup experience.
status: aprovado
---

# Terminal experience

[Português (Brasil)](UX.md) · [Español](UX.es.md) · [Requirements](PRD.en.md)

1. Choose the provider and press **Space** to mark clients. Press **A** to select or clear all, then **Enter** to confirm. Select at least one client.
2. Supply the plan, URL, and models when required. Enter a token in the hidden prompt, or use an environment variable or `--key-file`.
3. The output shows affected clients, configuration files, and backup paths. Use `--dry-run` to preview changes. In automation, pass your choices and use `--yes` as a CLI option.
4. A preflight error identifies the file or option to fix. See [clients and backups](CLIENTS.en.md) for profile paths.

Check the menu using the [examples](../README.en.md#quick-start) and [tests](https://github.com/pathbit/AgentModelKit/blob/main/tests/README.en.md). CI exercises automated selection and writes. Real terminal checks are recorded by client and version.

The maintainer approved this baseline on November 25, 2026 for the `0.0.2` delivery.
