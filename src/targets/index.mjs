import { vscodeTarget } from "./vscode.mjs";
import { copilotCliTarget } from "./copilot-cli.mjs";

export const TARGETS = {
  [vscodeTarget.id]: vscodeTarget,
  [copilotCliTarget.id]: copilotCliTarget,
};

export const TARGET_ALIASES = {
  vscode: "vscode",
  code: "vscode",
  "copilot-cli": "copilot-cli",
  copilot: "copilot-cli",
  cli: "copilot-cli",
};

export function normalizeTargets(rawTargets) {
  if (!rawTargets || rawTargets.length === 0) {
    return ["vscode", "copilot-cli"];
  }
  const items = Array.isArray(rawTargets) ? rawTargets : String(rawTargets).split(",");
  const cleaned = items.map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (cleaned.includes("all")) return ["vscode", "copilot-cli"];

  const out = [];
  for (const item of cleaned) {
    const resolved = TARGET_ALIASES[item];
    if (!resolved) {
      throw new Error(`Target desconhecido: '${item}'. Disponiveis: vscode, copilot-cli, all.`);
    }
    if (!out.includes(resolved)) out.push(resolved);
  }
  return out.length ? out : ["vscode", "copilot-cli"];
}

export function listTargets() {
  return Object.values(TARGETS);
}
