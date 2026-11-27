import { sameDistributionInputs } from './distribution-inputs.mjs';
import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { setTimeout as wait } from "node:timers/promises";
import { pathToFileURL } from "node:url";
import { isCurrentOrNewer, stableVersion } from "./verify-npm-release.mjs";

const repository = "pathbit/AgentModelKit";
const api = `/repos/${repository}`;
const branch = "main";
const ciPath = ".github/workflows/ci.yml";
const releasePath = ".github/workflows/release.yml";
const shaPattern = /^[a-f0-9]{40}$/;
const idPattern = /^[1-9]\d*$/;
const legacyJobs = ["package", ...["ubuntu-latest", "macos-latest", "windows-latest"].flatMap(os =>
  [18, 22, 24].map(node => `test / ${os} / Node ${node}`))];

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

function packageVersion(pkg) {
  requireCondition(pkg?.name === "@pathbit/agentmodelkit" && stableVersion.test(pkg.version),
    "Expected the canonical package and a stable version.");
  return pkg.version;
}

function ownedRun(run, commit) {
  return run?.event === "push" && run.head_repository?.full_name === repository
    && run.repository?.full_name === repository && run.head_sha === commit;
}

function approvedCI(run, commit) {
  return ownedRun(run, commit) && run.head_branch === branch && run.path === ciPath
    && run.status === "completed" && run.conclusion === "success";
}

async function tagCommit(request, tag) {
  let object = (await request("GET", `${api}/git/ref/tags/${tag}`))?.object;
  for (let depth = 0; object?.type === "tag" && depth < 5; depth++) {
    requireCondition(shaPattern.test(object.sha), "Invalid annotated tag.");
    object = (await request("GET", `${api}/git/tags/${object.sha}`))?.object;
  }
  if (!object) return null;
  requireCondition(object.type === "commit" && shaPattern.test(object.sha), "The tag does not point to a commit.");
  return object.sha;
}

async function artifactId(request, run, name) {
  requireCondition(Number.isSafeInteger(run.id) && run.id > 0 && Number.isSafeInteger(run.run_attempt)
    && run.run_attempt > 0, "Invalid source CI run or attempt.");
  const response = await request("GET", `${api}/actions/runs/${run.id}/artifacts?per_page=100`);
  const artifacts = response?.artifacts?.filter(item => item.name === name && item.expired === false) || [];
  requireCondition(artifacts.length === 1 && Number.isSafeInteger(artifacts[0].id) && artifacts[0].id > 0,
    "The approved CI artifact is unavailable or ambiguous.");
  return artifacts[0].id;
}

// The first release workflow packaged only after all nine matrix jobs. Its npm
// job could fail independently, so recovery proves the packaging prerequisites.
async function approvedLegacyArtifact(request, run, tag) {
  if (run?.path !== releasePath || run.status !== "completed" || run.head_branch !== tag
    || !["success", "failure"].includes(run.conclusion) || run.run_attempt !== 1) return false;
  const response = await request("GET", `${api}/actions/runs/${run.id}/attempts/1/jobs?per_page=100`);
  const jobs = response?.jobs || [];
  return legacyJobs.every(name => jobs.filter(job => job.name === name).length === 1
    && jobs.some(job => job.name === name && job.status === "completed" && job.conclusion === "success"));
}

export async function resolveRelease({ tag, expectedCommit, runId, request, isMainAncestor }) {
  requireCondition(typeof tag === "string" && tag.startsWith("v") && stableVersion.test(tag.slice(1)), "Expected a stable release tag.");
  requireCondition(!expectedCommit || shaPattern.test(expectedCommit), "Invalid expected commit.");
  requireCondition(!runId || idPattern.test(runId), "Invalid CI run id.");
  const commit = await tagCommit(request, tag);
  requireCondition(commit && (!expectedCommit || expectedCommit === commit) && isMainAncestor(commit),
    "The release tag must match the expected commit in main.");
  const response = runId ? null : await request("GET", `${api}/actions/workflows/ci.yml/runs?event=push&head_sha=${commit}&per_page=100`);
  const run = runId ? await request("GET", `${api}/actions/runs/${runId}`)
    : response?.workflow_runs?.find(candidate => approvedCI(candidate, commit));
  requireCondition(ownedRun(run, commit) && (!runId || String(run.id) === runId), "The CI run does not belong to the release commit.");
  const standard = approvedCI(run, commit);
  requireCondition(standard || await approvedLegacyArtifact(request, run, tag), "The source did not complete the required CI checks.");
  const name = standard ? `agentmodelkit-${commit}-${run.run_attempt}` : "agentmodelkit-release";
  const artifact = await artifactId(request, run, name);
  const contents = await request("GET", `${api}/contents/package.json?ref=${commit}`);
  requireCondition(contents?.encoding === "base64", "The tagged package manifest is unavailable.");
  const version = packageVersion(JSON.parse(Buffer.from(contents.content, "base64").toString("utf8")));
  requireCondition(tag === `v${version}`, "The tag differs from the package version.");
  return { tag, version, commit, "run-id": run.id, "artifact-id": artifact };
}

export async function autoRelease({ runId, commit, pkg, previous, request, sleep = wait, sourcesMatch = () => false }) {
  requireCondition(idPattern.test(runId) && shaPattern.test(commit), "Invalid source CI or checkout.");
  const version = packageVersion(pkg);
  const before = packageVersion(previous);
  requireCondition(isCurrentOrNewer(version, before), "A lower version cannot be published automatically.");
  const run = await request("GET", `${api}/actions/runs/${runId}`);
  requireCondition(String(run?.id) === runId && approvedCI(run, commit), "Expected a successful push CI for this main commit.");
  await artifactId(request, run, `agentmodelkit-${commit}-${run.run_attempt}`);
  const main = await request("GET", `${api}/git/ref/heads/main`);
  if (main?.object?.sha !== commit && !sourcesMatch(commit, main?.object?.sha)) return "Main has advanced.";
  const tag = `v${version}`;
  let marked = await tagCommit(request, tag);
  if (marked && marked !== commit && version === before) return "Version already marked.";
  if (!marked) {
    const refs = await request("GET", `${api}/git/matching-refs/tags/v`);
    requireCondition(Array.isArray(refs) && !refs.some(({ ref }) => {
      const existingVersion = ref?.slice("refs/tags/v".length);
      return existingVersion !== version && isCurrentOrNewer(existingVersion, version);
    }), "A newer tag prevents this automatic release.");
    await request("POST", `${api}/git/refs`, { ref: `refs/tags/${tag}`, sha: commit });
    for (const delay of [0, 1000, 2000, 4000, 8000, 16000]) {
      if (delay) await sleep(delay);
      marked = await tagCommit(request, tag);
      if (marked) break;
    }
  }
  requireCondition(marked === commit, "The tag must point to the approved commit.");
  const release = await request("GET", `${api}/releases/tags/${tag}`);
  if (release?.draft === false) return "Release already exists.";
  requireCondition(!release, "An existing draft release requires recovery.");
  const recent = await request("GET", `${api}/actions/workflows/release.yml/runs?per_page=100`);
  requireCondition(Array.isArray(recent?.workflow_runs), "Unable to check active releases.");
  if (recent.workflow_runs.some(candidate => candidate.display_title === `Release ${tag}` && candidate.status !== "completed")) return "A release is already running. Recover this tag if needed.";
  await request("POST", `${api}/actions/workflows/release.yml/dispatches`, {
    ref: branch, inputs: { tag, expected_commit: commit, source_run_id: runId },
  });
  return `Dispatched ${tag}.`;
}

function githubRequest(token) {
  requireCondition(token, "The GitHub Actions token is required.");
  return async (method, path, body) => {
    const response = await fetch(`https://api.github.com${path}`, {
      method, redirect: "error", signal: AbortSignal.timeout(15000),
      headers: {
        Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json",
        ...(body && { "Content-Type": "application/json" }),
      },
      ...(body && { body: JSON.stringify(body) }),
    });
    if (method === "GET" && response.status === 404) return null;
    requireCondition(response.ok, `GitHub ${method} returned HTTP ${response.status}.`);
    return response.status === 204 ? null : response.json();
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const env = process.env;
    requireCondition(env.GITHUB_REPOSITORY === repository, "Release is limited to the canonical repository.");
    const request = githubRequest(env.GH_TOKEN);
    const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();
    if (process.argv[2] === "auto") {
      requireCondition(git("rev-parse", "HEAD") === env.SOURCE_COMMIT, "Checkout differs from the tested commit.");
      console.log(await autoRelease({
        runId: env.SOURCE_RUN_ID, commit: env.SOURCE_COMMIT, request,
        pkg: JSON.parse(readFileSync("package.json", "utf8")),
        previous: JSON.parse(git("show", "HEAD^:package.json")),
        sourcesMatch: (approved, current) => sameDistributionInputs(process.cwd(), approved, current),
      }));
    } else if (process.argv[2] === "check-tag") {
      requireCondition(env.RELEASE_TAG?.startsWith("v") && stableVersion.test(env.RELEASE_TAG.slice(1))
        && shaPattern.test(env.EXPECTED_COMMIT) && await tagCommit(request, env.RELEASE_TAG) === env.EXPECTED_COMMIT,
      "The tag has changed since artifact selection.");
    } else {
      requireCondition(process.argv[2] === "resolve", "Use auto, resolve or check-tag.");
      const resolved = await resolveRelease({
        tag: env.RELEASE_TAG, expectedCommit: env.EXPECTED_COMMIT, runId: env.SOURCE_RUN_ID, request,
        isMainAncestor(commit) {
          try {
            git("merge-base", "--is-ancestor", commit, "refs/remotes/origin/main");
            return true;
          } catch { return false; }
        },
      });
      appendFileSync(env.GITHUB_OUTPUT, Object.entries(resolved).map(([key, value]) => `${key}=${value}\n`).join(""));
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
