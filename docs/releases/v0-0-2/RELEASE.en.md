---
status: planejado
---

# AgentModelKit 0.0.2 verified for publication

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
| AC-004 | The approved publication confirms the exact version, `@latest`, and the public tarball. Record the run and hash after publication. |

The maintainer approved the product, experience, and design baseline and authorized publication on November 25, 2026.

The `v0.0.2` tag passed all nine checks in the OS and Node.js matrix. CI produced the tarball, and the maintainer approved the protected deployment. npmjs returned `ENEEDAUTH`. After the attempt, the npmjs `latest` tag still pointed to `0.0.1`, and the registry did not list `0.0.2`. The maintainer authorized resuming through GitHub Actions with `NPMJS_TOKEN`. AC-004 remains pending verification of the artifact at all three destinations. [Release run](https://github.com/pathbit/AgentModelKit/actions/runs/45742845489).

[Approved spec](../../specs/release-0-0-2/SPEC.en.md) · [Publishing procedure](../../RELEASE.en.md)
