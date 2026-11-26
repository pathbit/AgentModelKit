# Publishing

[Português (Brasil)](RELEASE.md) · [Español](RELEASE.es.md)

The package is `@pathbit/agentmodelkit`. It has its own version lifecycle, with code on `main` and releases identified by tags. The workflow validates the code, tests the tarball with npm exec and publishes the same file to npmjs, GitHub Packages and GitHub Releases.

## Run the published package

Use the [public package on npmjs](https://www.npmjs.com/package/@pathbit/agentmodelkit) by default. Use `@latest` for the newest stable release or specify the version number to run the same version every time.

```bash
npx --yes @pathbit/agentmodelkit@latest opencode
npx --yes @pathbit/agentmodelkit@0.0.2 opencode vscode copilot
npx --yes --allow-remote=root https://github.com/pathbit/AgentModelKit/releases/download/v0.0.2/pathbit-agentmodelkit-0.0.2.tgz freellmapi
```

On npm 11 or earlier, omit `--allow-remote=root` from the tarball command.

The command with the GitHub URL uses the public tarball attached to the GitHub Release. To use `@latest` or an exact version through GitHub Packages, set `@pathbit:registry=https://npm.pkg.github.com` in the npm environment where you will run the command and configure authentication. [Authenticating to GitHub Packages](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry#authenticating-to-github-packages).

To run the code from `main` with Git, see [Other ways to run](../README.en.md#other-ways-to-run).

## Before publishing

1. Keep code changes on `main` and confirm CI for the candidate commit.
2. Run `npm run check`, `npm test` and `npm run test:package`. Test the local build with the client versions you intend to support.
3. Request explicit maintainer approval before merging an increase to the version in `package.json`. CI must approve the exact `main` commit before automation creates its tag.
4. Configure the `NPMJS_TOKEN` GitHub Actions secret in AgentModelKit with an npm token that can publish `@pathbit/agentmodelkit`. The npmjs job uses the protected `npmjs` environment.

## Tag validation and destinations

Publish stable versions in ascending order. npm updates `latest` by default on each stable publication. After publishing a new stable version, check that `npm view @pathbit/agentmodelkit@latest version` returns the published version number. Use `npm view @pathbit/agentmodelkit@0.0.2 dist.integrity`, with the release's version number, to compare that version with the validated tarball's integrity. [npm dist-tag](https://docs.npmjs.com/cli/v11/commands/npm-dist-tag/).

After a successful CI run for a push to `main` that increases the version, the [Automatic release tag workflow](https://github.com/pathbit/AgentModelKit/blob/main/.github/workflows/auto-release.yml) creates the tag and dispatches [Release](https://github.com/pathbit/AgentModelKit/blob/main/.github/workflows/release.yml). The workflow verifies the tag commit and uses the tarball tested and stored by that commit's CI. GitHub Packages and GitHub Releases receive the same tarball using `GITHUB_TOKEN`.

To recover an existing tag, run `Release` on `main` with `tag`, `expected_commit`, and `source_run_id`. Provide the tag, its original SHA, and the run holding the artifact. The workflow verifies the source and reuses the validated archive.

If the version already exists, the workflow compares its integrity with the tarball. Resolve mismatches before continuing. Published versions are immutable. If a job fails after writing to one destination, retry the job for the same tag after fixing the cause.
Before publishing to GitHub, the workflow checks npmjs without credentials and waits for the public tarball. The workflow checks stable version selection and compares both registry integrity metadata and downloaded bytes with the CI artifact. If a newer stable version exists, retrying an earlier release verifies its artifact and preserves the current `latest`.

[Documentation index](README.en.md)
