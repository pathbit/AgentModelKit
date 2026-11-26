import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { pathToFileURL } from "node:url";

const registry = "https://registry.npmjs.org";
const packageName = "@pathbit/agentmodelkit";
const stableVersion = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

function isCurrentOrNewer(latest, version) {
  if (typeof latest !== "string" || !stableVersion.test(latest)) return false;
  const current = latest.split(".").map(BigInt);
  const requested = version.split(".").map(BigInt);
  const firstDifference = current.findIndex((value, index) => value !== requested[index]);
  return firstDifference < 0 || current[firstDifference] > requested[firstDifference];
}

async function availableBody(url, request) {
  let response;
  try {
    response = await request(url, { redirect: "error", signal: AbortSignal.timeout(10000) });
  } catch {
    return null;
  }
  if (response.status === 404 || response.status === 429 || response.status >= 500) return null;
  if (!response.ok) throw new Error(`npmjs returned HTTP ${response.status} for ${url.pathname}`);
  try {
    return Buffer.from(await response.arrayBuffer());
  } catch {
    return null;
  }
}

export async function verifyNpmRelease(version, integrity, {
  request = globalThis.fetch, attempts = 60, wait = () => delay(15000),
} = {}) {
  if (!stableVersion.test(version)) throw new Error("Expected a stable package version.");
  if (!/^sha512-[A-Za-z0-9+/]{86}==$/.test(integrity)) throw new Error("Expected a SHA-512 package integrity value.");
  const metadataUrl = new URL("/" + packageName.replace("/", "%2f"), registry);
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const metadata = await availableBody(metadataUrl, request);
    if (metadata) {
      const packument = JSON.parse(metadata.toString("utf8"));
      const latest = packument["dist-tags"]?.latest;
      const published = packument.versions?.[version];
      if (published && published.dist?.integrity !== integrity) {
        throw new Error(`The npmjs integrity for ${packageName}@${version} differs from the CI artifact.`);
      }
      if (published && isCurrentOrNewer(latest, version) && packument.versions[latest]) {
        const tarball = new URL(published.dist.tarball);
        if (tarball.origin !== registry || tarball.username || tarball.password) {
          throw new Error("Expected the published tarball on the public npmjs registry.");
        }
        const bytes = await availableBody(tarball, request);
        if (bytes) {
          const digest = createHash("sha512").update(bytes).digest("base64");
          if (`sha512-${digest}` !== integrity) throw new Error("The downloaded npmjs tarball differs from the CI artifact.");
          return { version, latest, integrity };
        }
      }
    }
    if (attempt < attempts) await wait();
  }
  throw new Error(`npmjs did not serve a verified tarball and current latest tag for ${packageName}@${version}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [version, integrityPath] = process.argv.slice(2);
  verifyNpmRelease(version, readFileSync(integrityPath, "utf8").trim()).then(
    ({ latest }) => console.log(`Verified npmjs ${packageName}@${version} (latest: ${latest}).`),
    (error) => { console.error(error.message); process.exitCode = 1; },
  );
}
