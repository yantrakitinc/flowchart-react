#!/usr/bin/env node
// Mode D — push-time stamp + freshness check (slices touched vs origin).
//
// For every feature slice touched by the current diff against
// origin/master:
//   (1) read its __specs__/standards-compliance.yaml and assert shape
//       (status:locked, verified:100%, last_validated valid ISO-8601 UTC);
//   (2) assert git-history freshness — the most recent commit touching
//       the folder (excluding the lock itself) is ≤ last_validated + the
//       same-commit grace window from LOCK_FILES.yaml.
//
// No code execution. Pre-push hook gate. Push-scoped: walks ONLY locks
// for slices in this push, not the full repo.

import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { getChangedPaths } from "../lib/changed-paths.mjs";
import {
  checkFreshness,
  defaultGitLastCommit,
} from "../verify-standards-freshness/verify-standards-freshness.mjs";

const __filename = fileURLToPath(import.meta.url);
const SCRIPT_DIR = dirname(__filename);
const ROOT = resolve(SCRIPT_DIR, "..", "..");

const ISO_UTC_RE =
  /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?Z$/;

/**
 * Walk up from `startAbs` toward `rootAbs` to find the nearest ancestor
 * that contains `__specs__/standards-compliance.yaml`. Returns the
 * absolute path to the lock file, or null if no ancestor has one.
 *
 * @param {string} startAbs
 * @param {string} rootAbs
 * @returns {string | null}
 */
export function findSliceLock(startAbs, rootAbs) {
  let cur = startAbs;
  while (cur.length > rootAbs.length) {
    const lock = join(cur, "__specs__", "standards-compliance.yaml");
    if (existsSync(lock)) return lock;
    const parent = dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return null;
}

/**
 * From a list of changed absolute paths, return the unique set of lock
 * files that should be checked. Files outside any spec'd slice are
 * silently dropped.
 *
 * @param {readonly string[]} changedPaths
 * @param {string} rootAbs
 * @returns {string[]}
 */
export function locksFromChangedPaths(changedPaths, rootAbs) {
  /** @type {Set<string>} */
  const out = new Set();
  for (const p of changedPaths) {
    const lock = findSliceLock(p, rootAbs);
    if (lock !== null) out.add(lock);
  }
  return [...out].sort();
}

/**
 * Parse a lock file's flat key/value fields. Returns a map of scalar
 * fields (multi-line and list values are ignored — Mode B only needs
 * status / verified / last_validated which are all scalars).
 *
 * @param {string} contents
 * @returns {Record<string, string>}
 */
export function parseScalarFields(contents) {
  /** @type {Record<string, string>} */
  const out = {};
  for (const line of contents.split(/\r?\n/)) {
    const m = line.match(/^([a-z_]+):\s*(.*)$/);
    if (m === null) continue;
    const [, k, vRaw] = m;
    const v = vRaw.replace(/^["']|["']$/g, "").trim();
    out[k] = v;
  }
  return out;
}

/**
 * Assert the shape of a single lock file. Returns the per-lock verdict
 * along with the parsed `last_validated` epoch ms (consumed by the
 * freshness gate downstream).
 *
 * @param {string} lockPath absolute
 * @param {{ readFile?: (p: string) => string }} [io]
 * @returns {{ ok: true, lastValidatedMs: number } | { ok: false, reason: string }}
 */
export function checkLockShape(lockPath, io = {}) {
  const readFile = io.readFile ?? ((p) => readFileSync(p, "utf8"));
  /** @type {string} */
  let contents;
  try {
    contents = readFile(lockPath);
  } catch (err) {
    return { ok: false, reason: `cannot read: ${err instanceof Error ? err.message : String(err)}` };
  }
  const fields = parseScalarFields(contents);
  if (fields["status"] !== "locked") {
    return { ok: false, reason: `status='${fields["status"] ?? ""}'; expected 'locked'` };
  }
  if (fields["verified"] !== "100%") {
    return { ok: false, reason: `verified='${fields["verified"] ?? ""}'; expected '100%'` };
  }
  const stamp = fields["last_validated"] ?? "";
  if (!ISO_UTC_RE.test(stamp)) {
    return { ok: false, reason: `last_validated='${stamp}'; expected ISO-8601 UTC` };
  }
  const stampMs = Date.parse(stamp);
  if (Number.isNaN(stampMs)) {
    return { ok: false, reason: `last_validated='${stamp}' did not parse as Date` };
  }
  return { ok: true, lastValidatedMs: stampMs };
}

/**
 * @param {{
 *   rootDir?: string,
 *   getChanged?: (baseRef?: string) => string[],
 *   readFile?: (p: string) => string,
 *   gitLastCommit?: (folder: string, lockFile: string) => string | null,
 *   write?: (s: string) => void,
 *   writeErr?: (s: string) => void,
 * }} [io]
 * @returns {{ exitCode: 0 | 1, locksChecked: string[], failures: Array<{ lock: string, gate: "shape" | "freshness", reason: string }> }}
 */
export function main(io = {}) {
  const rootDir = io.rootDir ?? ROOT;
  const getChanged = io.getChanged ?? ((baseRef) => getChangedPaths(baseRef, { cwd: rootDir }));
  const gitLastCommit = io.gitLastCommit ?? defaultGitLastCommit;
  const write = io.write ?? ((s) => process.stdout.write(s));
  const writeErr = io.writeErr ?? ((s) => process.stderr.write(s));

  const changed = getChanged("origin/master");
  if (changed.length === 0) {
    write("verify-mode-d: no changed paths against origin/master — nothing to stamp-check.\n");
    return { exitCode: 0, locksChecked: [], failures: [] };
  }

  const locks = locksFromChangedPaths(changed, rootDir);
  if (locks.length === 0) {
    write("verify-mode-d: changed paths don't resolve to any spec'd slice — nothing to stamp-check.\n");
    return { exitCode: 0, locksChecked: [], failures: [] };
  }

  write(`verify-mode-d: stamp-checking ${String(locks.length)} lock(s) for slices in this push\n`);
  /** @type {Array<{ lock: string, gate: "shape" | "freshness", reason: string }>} */
  const failures = [];
  for (const lock of locks) {
    const shape = checkLockShape(lock, { readFile: io.readFile });
    if (!shape.ok) {
      failures.push({ lock, gate: "shape", reason: shape.reason });
      continue;
    }
    const fresh = checkFreshness(lock, shape.lastValidatedMs, { gitLastCommit });
    if (!fresh.ok) {
      failures.push({ lock, gate: "freshness", reason: `${fresh.reason} — ${fresh.detail}` });
    }
  }

  if (failures.length === 0) {
    write(
      `verify-mode-d: OK (${String(locks.length)} lock(s) locked + verified=100% + fresh vs git history)\n`,
    );
    return { exitCode: 0, locksChecked: locks, failures: [] };
  }

  writeErr(`verify-mode-d: ${String(failures.length)} lock(s) failed\n`);
  for (const f of failures) {
    writeErr(`  - ${relative(rootDir, f.lock)} [${f.gate}]\n`);
    writeErr(`      reason: ${f.reason}\n`);
  }
  return { exitCode: 1, locksChecked: locks, failures };
}

/**
 * @param {Parameters<typeof main>[0] & { exit?: (code: number) => void }} [io]
 */
export function cliMain(io = {}) {
  const { exit, ...mainIo } = io;
  const doExit = exit ?? ((code) => process.exit(code));
  const { exitCode } = main(mainIo);
  doExit(exitCode);
}

/**
 * @param {string} importMetaUrl
 * @param {string | undefined} argv1
 * @returns {boolean}
 */
export function isCliInvocation(importMetaUrl, argv1) {
  if (argv1 === undefined || argv1 === "") return false;
  return importMetaUrl === pathToFileURL(argv1).href;
}

/**
 * @param {{
 *   importMetaUrl: string,
 *   argv1: string | undefined,
 *   exit?: (code: number) => void,
 *   getChanged?: Parameters<typeof main>[0] extends infer T
 *     ? T extends { getChanged?: infer G } ? G : never
 *     : never,
 *   gitLastCommit?: Parameters<typeof defaultGitLastCommit>,
 *   write?: (s: string) => void,
 *   writeErr?: (s: string) => void,
 *   readFile?: (p: string) => string,
 *   rootDir?: string,
 * }} io
 * @returns {boolean}
 */
export function maybeRunCli(io) {
  if (!isCliInvocation(io.importMetaUrl, io.argv1)) return false;
  // Forward injectable io so tests can drive this branch without
  // touching the real workspace.
  const { importMetaUrl: _ignored1, argv1: _ignored2, ...rest } = io;
  void _ignored1;
  void _ignored2;
  cliMain(rest);
  return true;
}

maybeRunCli({ importMetaUrl: import.meta.url, argv1: process.argv[1] });
