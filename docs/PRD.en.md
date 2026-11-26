---
description: AgentModelKit product requirements.
status: rascunho
---

# Product requirements

[Português (Brasil)](PRD.md) · [Español](PRD.es.md) · [Documentation](README.en.md)

AgentModelKit configures access to AI models in new and existing projects. It serves people who use multiple coding agents and want consistent providers and model choices without configuring every client by hand.

## Requirements

1. Run through `npx` with Node.js 18 or newer. npmjs offers `@latest` and pinned releases. Each GitHub Release also offers a public tarball.
2. Configure OpenCode by project, VS Code by profile, and Copilot CLI through the user configuration file. Use the menu to select multiple clients or use arguments for automation.
3. Configure OpenCode Go/PAYG, local or remote FreeLLMAPI, and manifest-defined providers. The default flow uses bundled catalogs.
4. Preview changes with `--dry-run`, back up existing files before replacing them, and preserve manual entries.
5. Maintain documentation in Brazilian Portuguese, English, and Spanish. Use English in the CLI, code, and scripts.

## Verification

The [quick start](../README.en.md) documents the user flow. The [terminal experience](UX.en.md) describes the menu and errors. The [architecture](ARCHITECTURE.en.md) records the project and profile boundaries. The [roadmap](ROADMAP.en.md) links deliverables to checks for the next release.

## Boundaries and decisions

Coding clients and inference servers have their own installations and credentials. The CLI generates their files with the supplied inputs. Additional clients, integrations, and credential changes enter the roadmap when their requirements can be verified.

Baseline drawn from the code, documentation, and published `0.0.1`. Formal maintainer approval is pending.
