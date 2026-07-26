#!/usr/bin/env node
// Mode B.5 — uncommitted-working-tree stamp + freshness check.
//
// Scope: paths modified in the working tree vs HEAD (staged + unstaged + untracked).
// For each owning slice's lock:
//   (1) shape gate: status:locked, verified:100%, last_validated valid ISO-8601 UTC
//   (2) freshness gate: most recent commit touching the slice ≤ stamp + grace
//
// Read-only. Refuses any slice whose status is `unlocked`.

import { dirname, relative, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  checkLockShape,
  locksFromChangedPaths,
} from "../verify-mode-d/verify-mode-d.mjs";
import { findRepoRoot } from "../lib/changed-paths.mjs";
import {
  checkFreshness,
  defaultGitLastCommit,
} from "../verify-standards-freshness/verify-standards-freshness.mjs";

import { spawnSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const SCRIPT_DIR = dirname(__filename);
const ROOT = resolve(SCRIPT_DIR, "..", "..");

/**
 * Working-tree changes vs HEAD (staged + unstaged tracked + untracked-but-not-ignored).
 *
 * @param {{ cwd?: string, exec?: (file: string, args: string[], opts: { cwd: string }) => string }} [io]
 * @returns {string[]}
 */
export function getWorkingTreeChangedPaths(io = {}) {
  const cwd = io.cwd ?? process.cwd();
  const exec =
    io.exec ?? ((file, args, opts) => execFileSync(file, args, opts).toString());
  /** @type {string} */
  let stdout;
  try {
    stdout = exec(
      "git",
      ["status", "--porcelain=v1", "--untracked-files=normal"],
      { cwd },
    );
  } catch {
    return [];
  }
  // git outputs paths relative to the repo toplevel. When cwd != toplevel
  // we must resolve against the toplevel; resolve(cwd, ...) double-applies
  // the `frontend/` segment.
  const repoRoot = findRepoRoot(cwd, spawnSync) ?? cwd;
  /** @type {Set<string>} */
  const paths = new Set();
  for (const raw of stdout.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (line.length < 4) continue;
    // porcelain v1: XY<space>path; for renames the path part is "old -> new"
    const tail = line.slice(3);
    const arrow = tail.indexOf(" -> ");
    const rel = arrow === -1 ? tail : tail.slice(arrow + 4);
    if (rel.length === 0) continue;
    paths.add(resolve(repoRoot, rel));
  }
  return [...paths];
}

/**
 * @param {{
 *   rootDir?: string,
 *   getChanged?: () => string[],
 *   gitLastCommit?: (folder: string, lockFile: string) => string | null,
 *   write?: (s: string) => void,
 *   writeErr?: (s: string) => void,
 *   readFile?: (p: string) => string,
 * }} [io]
 * @returns {{ exitCode: 0 | 1, locksChecked: string[], failures: Array<{ lock: string, gate: "shape" | "freshness", reason: string }> }}
 */
export function main(io = {}) {
  const rootDir = io.rootDir ?? ROOT;
  const getChanged = io.getChanged ?? (() => getWorkingTreeChangedPaths({ cwd: rootDir }));
  const gitLastCommit = io.gitLastCommit ?? defaultGitLastCommit;
  const write = io.write ?? ((s) => process.stdout.write(s));
  const writeErr = io.writeErr ?? ((s) => process.stderr.write(s));

  const changed = getChanged();
  if (changed.length === 0) {
    write("verify-mode-b5: working tree is clean — nothing to stamp-check.\n");
    return { exitCode: 0, locksChecked: [], failures: [] };
  }

  const locks = locksFromChangedPaths(changed, rootDir);
  if (locks.length === 0) {
    write("verify-mode-b5: working-tree changes don't resolve to any spec'd slice — nothing to stamp-check.\n");
    return { exitCode: 0, locksChecked: [], failures: [] };
  }

  write(`verify-mode-b5: stamp-checking ${String(locks.length)} lock(s) for slices with uncommitted changes\n`);
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
      `verify-mode-b5: OK (${String(locks.length)} lock(s) locked + verified=100% + fresh vs git history)\n`,
    );
    return { exitCode: 0, locksChecked: locks, failures: [] };
  }

  writeErr(`verify-mode-b5: ${String(failures.length)} lock(s) failed\n`);
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
 * @param {Parameters<typeof cliMain>[0] & { importMetaUrl: string, argv1: string | undefined }} io
 * @returns {boolean}
 */
export function maybeRunCli(io) {
  if (!isCliInvocation(io.importMetaUrl, io.argv1)) return false;
  const { importMetaUrl: _1, argv1: _2, ...rest } = io;
  void _1;
  void _2;
  cliMain(rest);
  return true;
}

maybeRunCli({ importMetaUrl: import.meta.url, argv1: process.argv[1] });
