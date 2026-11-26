import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { isCurrentOrNewer, stableVersion } from "./verify-npm-release.mjs";

const packageName = "@pathbit/agentmodelkit";
const registries = {
  npmjs: "https://registry.npmjs.org",
  github: "https://npm.pkg.github.com",
};

export function releaseArchiveName(version) {
  if (!stableVersion.test(version)) throw new Error("Expected a stable package version.");
  return `agentmodelkit-${version}.tgz`;
}

export function resolveReleaseArchive(directory, version) {
  const canonical = releaseArchiveName(version);
  const archive = [canonical, `pathbit-${canonical}`].map(name => join(directory, name)).find(existsSync);
  if (!archive) throw new Error("The approved release archive is missing.");
  return archive;
}

function registryString(output) {
  const parsed = JSON.parse(output);
  if (typeof parsed === "string") return parsed;
  if (Array.isArray(parsed) && parsed.length === 1 && typeof parsed[0] === "string") return parsed[0];
  throw new Error("The registry did not return a single value.");
}

export function publishPackage({ destination, version, archive, integrity, execute = spawnSync }) {
  if (!Object.hasOwn(registries, destination) || !stableVersion.test(version)) {
    throw new Error("Expected a known registry and a stable package version.");
  }
  const digest = createHash("sha512").update(readFileSync(archive)).digest("base64");
  if (`sha512-${digest}` !== integrity) throw new Error("The artifact differs from the approved package.");
  const registry = `--registry=${registries[destination]}`;
  function npm(args, allowMissing = false, unpublishedPackage = false) {
    const result = execute("npm", [...args, registry, "--prefer-online"], {
      cwd: dirname(archive), encoding: "utf8", timeout: 120000,
    });
    if (!result.error && result.status === 0) return result.stdout.trim();
    const code = /^npm (?:error|ERR!) code (E[A-Z0-9_]+)\r?$/m.exec(result.stderr || "")?.[1];
    if (allowMissing && !result.error && !result.signal && result.status > 0
      && (code === "E404" || unpublishedPackage && args[0] === "dist-tag" && code === "E401")) return null;
    throw new Error(`npm ${args[0]} failed${code ? ` (${code})` : ""} for ${destination}.`);
  }

  const existing = npm(["view", `${packageName}@${version}`, "dist.integrity", "--json"], true);
  if (existing !== null) {
    if (registryString(existing) !== integrity) throw new Error("The registry already contains different bytes for this version.");
    return "verified";
  }

  const available = npm(["view", packageName, "versions", "--json"], true);
  const versions = available === null ? [] : JSON.parse(available);
  if (!Array.isArray(versions)) throw new Error("The registry did not return a version list.");
  if (versions.some((candidate) => candidate !== version && isCurrentOrNewer(candidate, version))) {
    throw new Error("A newer stable version prevents publishing this version.");
  }

  // npmjs exposes dist-tags before a scanned package can be downloaded.
  const tagLookup = destination === "npmjs"
    ? ["dist-tag", "ls", packageName]
    : ["view", `${packageName}@latest`, "version", "--json"];
  const reported = npm(tagLookup, true, available === null);
  let latest = null;
  if (reported !== null) {
    latest = destination === "npmjs" ? /^latest: ([^\s]+)$/m.exec(reported)?.[1] : registryString(reported);
  }
  if (latest !== null && !stableVersion.test(latest)) throw new Error("The registry did not return a stable latest tag.");
  if (latest === version || versions.includes(version)) {
    if (destination === "npmjs") return "awaiting availability";
    throw new Error("The GitHub registry lists this version before serving its integrity. Check availability and retry.");
  }
  if (latest !== null && isCurrentOrNewer(latest, version)) {
    throw new Error("An existing latest tag prevents publishing this version.");
  }

  npm(["publish", archive, "--access=public", "--tag=latest", "--ignore-scripts"]);
  return "published";
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [destination, version, directory] = process.argv.slice(2);
  try {
    const archive = resolveReleaseArchive(directory, version);
    const integrity = readFileSync(join(directory, "integrity.txt"), "utf8").trim();
    const status = publishPackage({ destination, version, archive, integrity });
    console.log(`${packageName}@${version} on ${destination}: ${status}.`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
