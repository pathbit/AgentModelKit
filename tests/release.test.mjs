import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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
