import assert from "node:assert/strict";
import test from "node:test";
import { autoRelease, resolveRelease } from "../scripts/release-source.mjs";

const repository = "pathbit/AgentModelKit";
const api = `/repos/${repository}`;
const tag = "v0.0.2";
const commit = "a".repeat(40);
const pkg = { name: "@pathbit/agentmodelkit", version: "0.0.2" };
const manifest = { encoding: "base64", content: Buffer.from(JSON.stringify(pkg)).toString("base64") };
const ci = { id: 11, run_attempt: 2, event: "push", head_branch: "main", head_sha: commit,
  path: ".github/workflows/ci.yml", status: "completed", conclusion: "success",
  repository: { full_name: repository }, head_repository: { full_name: repository } };
const ref = { object: { type: "commit", sha: commit } };
const tagPath = `${api}/git/ref/tags/${tag}`;
const jobs = ["package", ...["ubuntu-latest", "macos-latest", "windows-latest"].flatMap(os =>
  [18, 22, 24].map(node => `test / ${os} / Node ${node}`))]
  .map(name => ({ name, status: "completed", conclusion: "success" }));
const artifactPath = `${api}/actions/runs/11/artifacts?per_page=100`;
const available = { artifacts: [{ name: `agentmodelkit-${commit}-2`, id: 21, expired: false }] };

function reader(entries) {
  return async (method, path) => {
    assert.equal(method, "GET");
    assert.ok(Object.hasOwn(entries, path), `Unexpected GitHub request: ${path}`);
    return entries[path];
  };
}

const source = { tag, expectedCommit: commit, runId: "11", isMainAncestor: value => value === commit };
const ciResponses = {
  [tagPath]: ref,
  [`${api}/actions/runs/11`]: ci,
  [artifactPath]: available,
  [`${api}/contents/package.json?ref=${commit}`]: manifest,
};

test("release resolves the exact main CI artifact and the tag commit", async () => {
  const actual = await resolveRelease({ ...source, request: reader(ciResponses) });
  assert.deepEqual(actual, { tag, version: pkg.version, commit, "run-id": 11, "artifact-id": 21 });
});

test("release rejects moved tags, PR artifacts, failed CI and stale artifacts", async () => {
  await assert.rejects(resolveRelease({
    ...source, request: reader({ [tagPath]: { object: { type: "commit", sha: "b".repeat(40) } } }),
  }), /expected commit/);
  for (const run of [{ ...ci, event: "pull_request" }, { ...ci, conclusion: "failure" }]) {
    await assert.rejects(resolveRelease({
      ...source, request: reader({ ...ciResponses, [`${api}/actions/runs/11`]: run }),
    }), /does not belong|required CI checks/);
  }
  const expired = { artifacts: available.artifacts.map(artifact => ({ ...artifact, expired: true })) };
  await assert.rejects(resolveRelease({
    ...source, request: reader({ ...ciResponses, [artifactPath]: expired }),
  }), /artifact is unavailable/);
});

test("recovery reuses the original tag artifact after an npm authentication failure", async () => {
  const legacy = { ...ci, head_branch: tag, path: ".github/workflows/release.yml",
    run_attempt: 1, conclusion: "failure" };
  const jobPath = `${api}/actions/runs/11/attempts/1/jobs?per_page=100`;
  const responses = { ...ciResponses, [`${api}/actions/runs/11`]: legacy, [jobPath]: { jobs },
    [artifactPath]: { artifacts: [{ name: "agentmodelkit-release", id: 91, expired: false }] } };
  const resolved = await resolveRelease({ ...source, request: reader(responses) });
  assert.equal(resolved["artifact-id"], 91);
  const failedTests = jobs.map(job => job.name.includes("Windows") || job.name.includes("windows")
    ? { ...job, conclusion: "failure" } : job);
  await assert.rejects(resolveRelease({
    ...source, request: reader({ ...responses, [jobPath]: { jobs: failedTests } }),
  }), /required CI checks/);
});

test("automatic release can tag an approved main version even if an earlier push changed it", async () => {
  let marked = null;
  const writes = [];
  const reads = reader({
    ...ciResponses,
    [`${api}/git/ref/heads/main`]: ref,
    [`${api}/git/matching-refs/tags/v`]: [{ ref: "refs/tags/v0.0.1" }],
    [`${api}/releases/tags/${tag}`]: null,
    [`${api}/actions/workflows/release.yml/runs?per_page=100`]: {
      workflow_runs: [{ display_title: "Release v0.0.1", status: "in_progress" }],
    },
  });
  const status = await autoRelease({
    runId: "11", commit, pkg, previous: pkg,
    request: async (method, path, body) => {
      if (method === "GET") return path === tagPath ? marked : reads(method, path);
      writes.push({ method, path, body });
      if (path === `${api}/git/refs`) marked = ref;
    },
  });
  assert.equal(status, "Dispatched v0.0.2.");
  assert.deepEqual(writes, [
    { method: "POST", path: `${api}/git/refs`, body: { ref: "refs/tags/v0.0.2", sha: commit } },
    { method: "POST", path: `${api}/actions/workflows/release.yml/dispatches`,
      body: { ref: "main", inputs: { tag, expected_commit: commit, source_run_id: "11" } } },
  ]);
});

test("an unchanged version with an existing tag and a superseded main commit skip publication", async () => {
  const context = { runId: "11", commit, pkg };
  assert.equal(await autoRelease({ ...context, previous: pkg, request: reader({
    ...ciResponses,
    [`${api}/git/ref/heads/main`]: ref,
    [tagPath]: { object: { type: "commit", sha: "d".repeat(40) } },
  }) }), "Version already marked.");
  assert.equal(await autoRelease({
    ...context, previous: { ...pkg, version: "0.0.1" },
    request: reader({ ...ciResponses, [`${api}/git/ref/heads/main`]: { object: { sha: "c".repeat(40) } } }),
  }), "Main has advanced.");
});
