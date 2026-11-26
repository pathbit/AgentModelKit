---
status: planejado
---

# AgentModelKit 0.0.2 in preparation

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

The formal spec awaits approval of the product, experience, and design baseline. Tagging and publishing require their own approval. [Publishing procedure](../../RELEASE.en.md)
