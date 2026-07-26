#!/usr/bin/env node
// Mode F — entire-repo stamp + freshness check.
//
// Walks every `__specs__/standards-compliance.yaml` in the repo and runs
// the shape + freshness gates on each. Read-only. Refuses any slice whose
// status is `unlocked`.

import { dirname, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { checkLockShape } from "../verify-mode-d/verify-mode-d.mjs";
import { findAllLocks } from "../verify-mode-inspect/verify-mode-inspect.mjs";
import {
  checkFreshness,
  defaultGitLastCommit,
} from "../verify-standards-freshness/verify-standards-freshness.mjs";

const __filename = fileURLToPath(import.meta.url);
const SCRIPT_DIR = dirname(__filename);
const ROOT = resolve(SCRIPT_DIR, "..", "..");

/**
 * @param {{
 *   rootDir?: string,
 *   findLocks?: (root: string) => string[],
 *   gitLastCommit?: (folder: string, lockFile: string) => string | null,
 *   write?: (s: string) => void,
 *   writeErr?: (s: string) => void,
 *   readFile?: (p: string) => string,
 * }} [io]
 * @returns {{ exitCode: 0 | 1, locksChecked: string[], failures: Array<{ lock: string, gate: "shape" | "freshness", reason: string }> }}
 */
export function main(io = {}) {
  const rootDir = io.rootDir ?? ROOT;
  const findLocks = io.findLocks ?? findAllLocks;
  const gitLastCommit = io.gitLastCommit ?? defaultGitLastCommit;
  const write = io.write ?? ((s) => process.stdout.write(s));
  const writeErr = io.writeErr ?? ((s) => process.stderr.write(s));

  const locks = findLocks(rootDir);
  if (locks.length === 0) {
    write("verify-mode-f: no locks found in the repo — nothing to stamp-check.\n");
    return { exitCode: 0, locksChecked: [], failures: [] };
  }

  write(`verify-mode-f: stamp-checking ${String(locks.length)} lock(s) across the entire repo\n`);
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
      `verify-mode-f: OK (${String(locks.length)} lock(s) locked + verified=100% + fresh vs git history)\n`,
    );
    return { exitCode: 0, locksChecked: locks, failures: [] };
  }

  writeErr(`verify-mode-f: ${String(failures.length)} lock(s) failed\n`);
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
