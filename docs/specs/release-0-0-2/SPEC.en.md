---
description: AgentModelKit 0.0.2
status: aprovado
---

# AgentModelKit 0.0.2 delivery

[Português (Brasil)](SPEC.md) · [Español](SPEC.es.md) · [Roadmap](../../ROADMAP.en.md)

## Objective

Deliver the VS Code setup and version reporting fixes. Verify that the public npmjs tarball matches the CI artifact before mirroring it to GitHub.

## Requirements and scope

- Preserve custom headers and secret references when reapplying setup for the same VS Code endpoint. Previous headers stay with their original endpoint.
- Report the package version through both `agentmodelkit` and `amk`. Keep `npx` execution free of project dependency changes.
- Validate Linux, Windows, and macOS with Node.js 18, 22, and 24. Check guides in Brazilian Portuguese, English, and Spanish.
- Use the protected `npmjs` environment and the workflow identity authorized by Trusted Publisher. Verify the anonymous download before publishing the same package on GitHub.
- The scope covers existing clients and providers. New integrations remain on the [roadmap](../../ROADMAP.en.md#future-work).

## Acceptance criteria and verification plan

Local evidence goes in `.agent-tests/release-0-0-2/`. Public evidence will be linked from the [release record](../../releases/v0-0-2/RELEASE.en.md).

| Criterion | Command and prerequisite | Observable result |
| --- | --- | --- |
| AC-001 | `npm test` with fixture profiles | Key rotation preserves headers and secret references at the same URL. Old headers stay with their original endpoint. |
| AC-002 | `npm run check` and `npm run test:package` across the CI matrix | npm runs the tarball in an empty directory. Both aliases report `0.0.2`, and packaged guides have working relative links. |
| AC-003 | `node --test tests/release.test.mjs` with a simulated registry | The workflow tolerates availability delays and rejects integrity mismatches, different registries, and altered downloads. |
| AC-004 | `Release` workflow on the verified commit, with approval and Trusted Publisher. Then download the artifacts from all three destinations and compare them with the CI tarball | Both `@0.0.2` and `@latest` select the new release. npmjs, GitHub Packages, and GitHub Releases serve the exact CI artifact bytes. |

## References and approval

The maintainer approved the baseline and authorized formalizing and publishing `0.0.2` on November 25, 2026. This is the first spec recorded in the project. [Requirements](../../PRD.en.md) · [Terminal experience](../../UX.en.md) · [Technical design](../../ARCHITECTURE.en.md) · [Publishing](../../RELEASE.en.md)
