# Publishing

[Português (Brasil)](RELEASE.md) · [Español](RELEASE.es.md)

The package is `@pathbit/agentmodelkit`. It has its own version lifecycle, with code on `main` and releases identified by tags. The workflow validates the code, tests the tarball with npm exec and publishes the same file to npmjs, GitHub Packages and GitHub Releases.

## Run the published package

Use the [public package on npmjs](https://www.npmjs.com/package/@pathbit/agentmodelkit) by default. Use `@latest` for the newest stable release or specify the version number to run the same version every time.

```bash
npx --yes @pathbit/agentmodelkit@latest opencode
npx --yes @pathbit/agentmodelkit@0.0.1 opencode vscode copilot
npx --yes --allow-remote=root https://github.com/pathbit/AgentModelKit/releases/download/v0.0.1/pathbit-agentmodelkit-0.0.1.tgz freellmapi
```

On npm 11 or earlier, omit `--allow-remote=root` from the tarball command.

The command with the GitHub URL uses the public tarball attached to the GitHub Release. To use `@latest` or an exact version through GitHub Packages, set `@pathbit:registry=https://npm.pkg.github.com` in the npm environment where you will run the command and configure authentication. [Authenticating to GitHub Packages](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry#authenticating-to-github-packages).

To run the code from `main` with Git, see [Other ways to run](../README.en.md#other-ways-to-run).

## Before publishing

1. Keep code changes on `main` and confirm CI for the candidate commit.
2. Run `npm run check`, `npm test` and `npm run test:package`. Test the local build with the client versions you intend to support.
3. Request explicit maintainer approval to create and push the tag. The tag starts with `v` followed by the version in `package.json`. Publish the version that matches the approved commit.
4. Configure the GitHub Actions `npmjs` environment to require maintainer approval. To create the npm package for the first release, `v0.0.1`, use a temporary granular token with publishing access to the `@pathbit` scope. Save it as `NPMJS_BOOTSTRAP_TOKEN` in that environment. For `v0.0.1`, the workflow also accepts the repository's `NPMJS_TOKEN` if it has permission to create the package. For future releases, confirm or configure npm Trusted Publishing for `pathbit/AgentModelKit`, workflow `release.yml` and environment `npmjs`. Remove the bootstrap secret after verifying OIDC. Enable **Allow npm publish** in the trusted publisher settings. [Official Trusted Publishing setup](https://docs.npmjs.com/trusted-publishers/).

## Tag validation and destinations

Publish stable versions in ascending order. npm updates `latest` by default on each stable publication. After publishing a new stable version, check that `npm view @pathbit/agentmodelkit@latest version` returns the published version number. Use `npm view @pathbit/agentmodelkit@0.0.1 dist.integrity`, with the release's version number, to compare that version with the validated tarball's integrity. [npm dist-tag](https://docs.npmjs.com/cli/v11/commands/npm-dist-tag/).

The [Release workflow](https://github.com/pathbit/AgentModelKit/blob/main/.github/workflows/release.yml) reruns the test matrix for the tag, verifies that it belongs to the default branch history and uploads a single validated tarball as an artifact. npmjs publication uses the protected environment. GitHub publication uses `GITHUB_TOKEN` with `packages: write` and `contents: write`. The release attaches the published tarball.

If the version already exists, the workflow compares its integrity with the tarball. Resolve mismatches before continuing. Published versions are immutable. If a job fails after writing to one destination, retry the job for the same tag after fixing the cause.
Before publishing to GitHub, the workflow checks npmjs without credentials and waits for the public tarball. The workflow checks stable version selection and compares both registry integrity metadata and downloaded bytes with the CI artifact. If a newer stable version exists, retrying an earlier release verifies its artifact and preserves the current `latest`.

[Documentation index](README.en.md)
