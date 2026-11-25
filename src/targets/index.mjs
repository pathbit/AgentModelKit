import { vscodeTarget } from "./vscode.mjs";
import { copilotCliTarget } from "./copilot-cli.mjs";
import { opencodeTarget } from "./opencode.mjs";

export const TARGETS = {
  [opencodeTarget.id]: opencodeTarget,
  [vscodeTarget.id]: vscodeTarget,
  [copilotCliTarget.id]: copilotCliTarget,
};

export const TARGET_ALIASES = {
  vscode: "vscode",
  code: "vscode",
  "copilot-cli": "copilot-cli",
  copilot: "copilot-cli",
  cli: "copilot-cli",
  opencode: "opencode",
};

export function normalizeTargets(rawTargets) {
  if (!rawTargets || rawTargets.length === 0) {
    return ["opencode"];
  }
  const items = Array.isArray(rawTargets) ? rawTargets : String(rawTargets).split(",");
  const cleaned = items.map((s) => s.trim().toLowerCase());

  const out = [];
  for (const item of cleaned) {
    if (item === "all") continue;
    const resolved = Object.hasOwn(TARGET_ALIASES, item) ? TARGET_ALIASES[item] : null;
    if (!resolved) {
      throw new Error(`Unknown target: '${item}'. Available: vscode, copilot-cli, opencode, all.`);
    }
    if (!out.includes(resolved)) out.push(resolved);
  }
  return cleaned.includes("all") ? Object.keys(TARGETS) : out;
}

export function listTargets() {
  return Object.values(TARGETS);
}
