import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

export function readSnapshot(filePath) {
  const resolved = path.resolve(filePath);
  try {
    const stat = fs.lstatSync(resolved);
    if (!stat.isFile()) throw new Error(`Esperado um arquivo regular: ${resolved}`);
    return { path: resolved, content: fs.readFileSync(resolved), mode: stat.mode & 0o777 };
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    return { path: resolved, content: null, mode: null };
  }
}

export function parseSnapshot(snapshot, fallback) {
  if (snapshot.content === null) return fallback;
  try {
    return JSON.parse(snapshot.content.toString("utf8").replace(/^\uFEFF/, ""));
  } catch {
    throw new Error(`JSON invalido em ${snapshot.path}. Corrija o arquivo antes de continuar.`);
  }
}

export function jsonWrite(snapshot, data, { mode = 0o600 } = {}) {
  let unchanged = false;
  if (snapshot.content !== null) {
    try {
      unchanged = isDeepStrictEqual(parseSnapshot(snapshot), data);
    } catch {
      // Catalog refresh can replace an invalid derived cache.
    }
  }
  const restrictiveMode = snapshot.mode === null ? mode : snapshot.mode & mode;
  return {
    ...snapshot,
    mode: restrictiveMode,
    next: Buffer.from(JSON.stringify(data, null, "\t") + "\n"),
    changed: !unchanged || (process.platform !== "win32" && snapshot.mode !== restrictiveMode),
  };
}

function sameContent(left, right) {
  return left === right || (left !== null && right !== null && left.equals(right));
}

function storeBackup(plan) {
  if (plan.content === null) return null;
  const first = `${plan.path}.bak`;
  for (const target of [first, `${plan.path}.${randomUUID()}.bak`]) {
    try {
      fs.writeFileSync(target, plan.content, { flag: "wx", mode: 0o600 });
      return target;
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
    }
  }
  throw new Error(`Nao foi possivel criar backup de ${plan.path}`);
}

// Synchronous commit avoids yielding between validation, backup and replacement.
export function commitWrites(plans) {
  const canonical = new Set();
  const locks = [];
  const staged = [];
  const applied = [];
  const transactionId = randomUUID();
  try {
    for (const plan of plans) {
      const parent = path.dirname(plan.path);
      if (!plan.changed && plan.content === null) continue;
      fs.mkdirSync(parent, { recursive: true, mode: 0o700 });
      const target = path.join(fs.realpathSync(parent), path.basename(plan.path));
      const key = process.platform === "linux" ? target : target.toLowerCase();
      if (canonical.has(key)) throw new Error(`Dois arquivos apontam para ${plan.path}`);
      canonical.add(key);
      const lock = `${target}.agentmodelkit.lock`;
      try {
        const fd = fs.openSync(lock, "wx", 0o600);
        locks.push(lock);
        fs.closeSync(fd);
      } catch (error) {
        if (error.code !== "EEXIST") throw error;
        throw new Error(`Arquivo ocupado: ${plan.path}. Tente novamente quando a outra operacao terminar.`);
      }
      const current = readSnapshot(plan.path);
      if (!sameContent(current.content, plan.content)) {
        throw new Error(`Arquivo alterado durante a preparacao: ${plan.path}. Execute novamente.`);
      }
      if (!plan.changed) continue;
      const temp = `${plan.path}.${transactionId}.tmp`;
      const entry = { plan, temp, originalMode: current.mode, backupPath: null };
      staged.push(entry);
      fs.writeFileSync(temp, plan.next, { flag: "wx", mode: plan.mode });
    }
    for (const entry of staged) entry.backupPath = storeBackup(entry.plan);
    for (const entry of staged) {
      const { plan, temp } = entry;
      if (!sameContent(readSnapshot(plan.path).content, plan.content)) {
        throw new Error(`Arquivo alterado durante a gravacao: ${plan.path}. Execute novamente.`);
      }
      fs.renameSync(temp, plan.path);
      applied.push(entry);
    }
    const backups = new Map(staged.map(({ plan, backupPath }) => [plan.path, backupPath]));
    return plans.map((plan) => ({ ...plan, backupPath: backups.get(plan.path) ?? null }));
  } catch (error) {
    const recoveryErrors = [];
    for (const { plan, temp, originalMode, backupPath } of applied.reverse()) {
      try {
        if (!sameContent(readSnapshot(plan.path).content, plan.next)) {
          throw new Error(`Arquivo editado externamente: ${plan.path}`);
        }
        if (plan.content === null) fs.unlinkSync(plan.path);
        else {
          fs.writeFileSync(temp, plan.content, { flag: "wx", mode: originalMode });
          fs.renameSync(temp, plan.path);
        }
      } catch (recoveryError) {
        recoveryErrors.push(`${recoveryError.message} (backup: ${backupPath ?? "arquivo originalmente ausente"})`);
      }
    }
    if (recoveryErrors.length) throw new Error(`${error.message}\n${recoveryErrors.join("\n")}`, { cause: error });
    throw error;
  } finally {
    for (const { temp } of staged) fs.rmSync(temp, { force: true });
    for (const lock of locks) fs.rmSync(lock, { force: true });
  }
}

export function readJsonOrNull(filePath) {
  return parseSnapshot(readSnapshot(filePath), null);
}

export function writeJsonWithBackup(filePath, data, options) {
  return commitWrites([jsonWrite(readSnapshot(filePath), data, options)])[0];
}
