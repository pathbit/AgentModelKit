import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { publishPackage, releaseArchiveName, resolveReleaseArchive } from "../scripts/publish-package.mjs";
import { verifyNpmRelease } from "../scripts/verify-npm-release.mjs";

const artifact = "reviewed package";
const integrity = "sha512-" + createHash("sha512").update(artifact).digest("base64");
const version = "0.0.2";
const tarball = "https://registry.npmjs.org/@pathbit/agentmodelkit/-/agentmodelkit-0.0.2.tgz";

function metadata(latest, dist = { integrity, tarball }) {
  return new Response(JSON.stringify({
    "dist-tags": { latest },
    versions: { [latest]: {}, [version]: { dist } },
  }));
}

test("release verification waits for the public tarball and checks current metadata", async () => {
  const responses = [
    new Response("", { status: 404 }),
    metadata("0.0.1"),
    metadata(version),
    new Response("", { status: 404 }),
    metadata(version),
    new Response(new ReadableStream({ start(controller) { controller.error(new Error("Interrupted download")); } })),
    metadata(version),
    new Response(artifact),
  ];
  let waits = 0;
  const verified = await verifyNpmRelease(version, integrity, {
    request: async () => responses.shift(),
    wait: async () => { waits++; },
    attempts: 5,
  });
  assert.deepEqual(verified, { version, latest: version, integrity });
  assert.equal(waits, 4);
  assert.equal(responses.length, 0);
});

test("release verification allows retrying an older version with a newer stable latest", async () => {
  const responses = [metadata("0.0.10"), new Response(artifact)];
  const result = await verifyNpmRelease(version, integrity, {
    request: async () => responses.shift(), attempts: 1,
  });
  assert.equal(result.latest, "0.0.10");

  await assert.rejects(verifyNpmRelease(version, integrity, {
    request: async () => metadata("0.0.0-stage"), attempts: 1,
  }), /current latest tag/);
});

test("release verification rejects byte and metadata mismatches and foreign tarball origins", async () => {
  for (const [responses, error] of [
    [[metadata(version), new Response("other package")], /downloaded npmjs tarball differs/],
    [[metadata(version, { integrity: "different", tarball })], /integrity.*differs/],
    [[metadata(version, { integrity, tarball: "https://example.com/package.tgz" })], /public npmjs registry/],
  ]) {
    await assert.rejects(verifyNpmRelease(version, integrity, {
      request: async () => responses.shift(), attempts: 1,
    }), error);
    assert.equal(responses.length, 0);
  }
});

test("release verification rejects latest below a newer stable version", async () => {
  const body = await metadata(version).json();
  body.versions["0.0.10"] = {};
  body.versions["0.0.11-beta.1"] = {};
  await assert.rejects(verifyNpmRelease(version, integrity, {
    request: async () => new Response(JSON.stringify(body)), attempts: 1,
  }), /current latest tag/);
});

test("publishing checks the verified version and latest before issuing any write", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "amk-release-test-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const archive = join(directory, "package.tgz");
  writeFileSync(archive, artifact);
  const ok = (stdout) => ({ status: 0, stdout });
  const failed = (code) => ({ status: 1, stdout: "", stderr: `npm error code ${code}\n` });
  const missing = failed("E404");
  const olderVersions = ok(JSON.stringify(["0.0.1"]));
  const cases = [
    { responses: [ok(JSON.stringify(integrity))], result: "verified", writes: 0 },
    { responses: [ok(JSON.stringify([integrity]))], result: "verified", writes: 0 },
    { responses: [ok(JSON.stringify([integrity, integrity]))], error: /single value/, writes: 0 },
    { destination: "github", responses: [missing, olderVersions, ok('["0.0.10"]')], error: /prevents publishing/, writes: 0 },
    { destination: "github", responses: [missing, olderVersions, ok('["0.0.1"]'), ok("")], result: "published", writes: 1 },
    { responses: [failed("E429")], error: /E429/, writes: 0 },
    { responses: [missing, failed("E429")], error: /E429/, writes: 0 },
    { responses: [missing, olderVersions, failed("E401")], error: /E401/, writes: 0 },
    { responses: [missing, olderVersions, ok("latest: 0.0.10\n")], error: /prevents publishing/, writes: 0 },
    { responses: [missing, ok('["0.0.1","0.0.10"]')], error: /newer stable/, writes: 0 },
    { responses: [missing, olderVersions, ok(`latest: ${version}\n`)], result: "awaiting availability", writes: 0 },
    { responses: [missing, olderVersions, ok("latest: 0.0.1\n"), ok("")], result: "published", writes: 1 },
    { responses: [missing, missing, failed("E401"), ok("")], result: "published", writes: 1 },
    { responses: [missing, olderVersions, ok("latest: 0.0.1\n"), failed("E403")], error: /E403/, writes: 1 },
  ];
  for (const scenario of cases) {
    const writes = [];
    const destination = scenario.destination ?? "npmjs";
    const publish = () => publishPackage({
      destination, version, archive, integrity,
      execute(executable, args, options) {
        assert.equal(executable, "npm");
        assert.equal(options.cwd, directory);
        const registry = destination === "npmjs" ? "https://registry.npmjs.org" : "https://npm.pkg.github.com";
        assert.ok(args.includes(`--registry=${registry}`));
        if (args[0] === "publish") writes.push(args);
        return scenario.responses.shift();
      },
    });
    if (scenario.error) assert.throws(publish, scenario.error);
    else assert.equal(publish(), scenario.result);
    assert.equal(writes.length, scenario.writes);
    if (writes.length) assert.ok(writes[0].includes("--tag=latest"));
    assert.equal(scenario.responses.length, 0);
  }
});

test("release archive names match the package and retain older CI artifacts", () => {
  const directory = mkdtempSync(join(tmpdir(), "agentmodelkit-archive-name-"));
  try {
    const name = releaseArchiveName(version);
    assert.equal(name, "agentmodelkit-0.0.2.tgz");
    assert.throws(() => resolveReleaseArchive(directory, version), /archive is missing/);
    const legacy = join(directory, `pathbit-${name}`);
    writeFileSync(legacy, artifact);
    assert.equal(resolveReleaseArchive(directory, version), legacy);
    const canonical = join(directory, name);
    writeFileSync(canonical, artifact);
    assert.equal(resolveReleaseArchive(directory, version), canonical);
    assert.throws(() => releaseArchiveName("0.0.2-next"), /stable package version/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
