# Publishing

[Português (Brasil)](RELEASE.md) · [Español](RELEASE.es.md)

The package is `@pathbit/agentmodelkit`. It has its own version lifecycle, with code on `main` and releases identified by tags. The workflow validates the code, tests the tarball with npm exec and publishes the same file to npmjs, GitHub Packages and GitHub Releases.

## Run the published package

Once the version is available, run it directly with npm/npx:

```bash
npx --yes @pathbit/agentmodelkit@0.0.1 opencode vscode copilot
npx --yes https://github.com/pathbit/AgentModelKit/releases/download/v0.0.1/pathbit-agentmodelkit-0.0.1.tgz freellmapi
```

The second command uses the public tarball attached to the GitHub Release. To use the GitHub Packages registry, configure npm authentication for the `@pathbit` scope. [Authenticating to GitHub Packages](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry#authenticating-to-github-packages).

## Before the first publication

1. Keep code changes on `main` and confirm CI for the candidate commit.
2. Run `npm run check`, `npm test` and `npm run test:package`. Test the local build with the client versions you intend to support.
3. Request explicit maintainer approval to create and push the tag. The tag starts with `v` followed by the version in `package.json`. The first tag will be `v0.0.1`.
4. Configure the GitHub Actions `npmjs` environment to require maintainer approval. To create the npm package on first publication, use a temporary granular token with publishing access to the `@pathbit` scope. Save it as `NPMJS_BOOTSTRAP_TOKEN` in that environment. For `v0.0.1`, the workflow also accepts the repository's `NPMJS_TOKEN` if it has permission to create the package. After the first release, configure npm Trusted Publishing for `pathbit/AgentModelKit`, workflow `release.yml` and environment `npmjs`. Remove the bootstrap secret after verifying OIDC. [Official Trusted Publishing setup](https://docs.npmjs.com/trusted-publishers/).

## Tag validation and destinations

The [Release workflow](https://github.com/pathbit/AgentModelKit/blob/main/.github/workflows/release.yml) reruns the test matrix for the tag, verifies that it belongs to the default branch history and uploads a single validated tarball as an artifact. npmjs publication uses the protected environment. GitHub publication uses `GITHUB_TOKEN` with `packages: write` and `contents: write`. The release attaches the published tarball.

If the version already exists, the workflow compares its integrity with the tarball. Resolve mismatches before continuing. Published versions are immutable. If a job fails after writing to one destination, retry the job for the same tag after fixing the cause.

[Documentation index](README.en.md)
