import { commitWrites } from "../utils/json.mjs";

export function describeApply(result, dryRun, outcomes = []) {
  const { write, writes, ...details } = result;
  return {
    ...details,
    dryRun,
    changed: writes.some((plan) => plan.changed),
    backupPath: outcomes.find((item) => item.path === write.path)?.backupPath ?? null,
  };
}

export function applyTarget(target, resolvedProviders, opts, env) {
  const plan = target.plan(resolvedProviders, opts, env);
  return describeApply(plan, Boolean(opts.dryRun), opts.dryRun ? [] : commitWrites(plan.writes));
}

export function shouldRemove(opts, ownership, id, url) {
  if (!ownership) return false;
  if (opts.replace?.has(ownership.providerId)) return true;
  const rule = opts.prune?.get(ownership.providerId);
  return Boolean(rule?.(ownership.groupId, id, url));
}

export function assertConfig(condition, snapshot) {
  if (!condition) throw new Error(`Formato de configuracao invalido em ${snapshot.path}.`);
}
