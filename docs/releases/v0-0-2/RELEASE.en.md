---
status: publicado
---

# AgentModelKit 0.0.2

[Português (Brasil)](RELEASE.md) · [Español](RELEASE.es.md) · [Roadmap](../../ROADMAP.en.md)

## Delivery scope

- Reapply VS Code settings and preserve custom headers and editor secrets for the same endpoint.
- Report the package version with `agentmodelkit --version` or `amk -v`.
- Verify the public npmjs release and compare the downloaded bytes with the CI tarball.

## Checks

| Criterion | Expected evidence |
| --- | --- |
| AC-001 | Key rotation preserves headers and secret references for the same URL. Old headers stay with their original endpoint. |
| AC-002 | npm runs the tarball in an empty directory, and both aliases report `0.0.2`. |
| AC-003 | CI simulates npmjs propagation delay and rejects integrity mismatches, foreign origins, and altered downloads. |
| AC-004 | `@0.0.2` and `@latest` ran version `0.0.2`. All three destinations served the tarball approved by CI. |

The maintainer approved the product, experience, and design baseline and authorized publication on November 25, 2026.

The `v0.0.2` tag passed all nine checks in the OS and Node.js matrix. CI produced the tarball, and the maintainer approved the protected deployment. npmjs returned `ENEEDAUTH`. After the attempt, the npmjs `latest` tag still pointed to `0.0.1`, and the registry did not list `0.0.2`. The maintainer authorized resuming through GitHub Actions with `NPMJS_TOKEN`. [First attempt](https://github.com/pathbit/AgentModelKit/actions/runs/45742845489).

[Approved spec](../../specs/release-0-0-2/SPEC.en.md) · [Publishing procedure](../../RELEASE.en.md)

The workflow on `main` recovered the original `v0.0.2` tag using `NPMJS_TOKEN` in the approved environment. npmjs resolved `@0.0.2` and `@latest` to `0.0.2`. All three destinations served the exact tarball bytes approved by CI. SHA-256 `bb559bb943bc9f6949d2d3bae49be5befa2d72d5dae351218e1434a9f10f6c42`. [Publication run](https://github.com/pathbit/AgentModelKit/actions/runs/45823791970) · [Tag CI](https://github.com/pathbit/AgentModelKit/actions/runs/45742845489) · [npmjs](https://www.npmjs.com/package/@pathbit/agentmodelkit/v/0.0.2) · [GitHub Packages](https://github.com/pathbit/AgentModelKit/pkgs/npm/agentmodelkit) · [GitHub Release](https://github.com/pathbit/AgentModelKit/releases/tag/v0.0.2)
