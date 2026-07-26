#!/usr/bin/env node
// Mode C — push-time slice re-verify.
//
// Identifies the unique slices touched by the current diff against
// origin/master + invokes Mode A against each. Aggregates verdicts.
// Opt-in at the final-push prompt for tricky / security-sensitive
// features. Mode D is the heavier alternative.

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { getChangedPaths } from "../lib/changed-paths.mjs";

const __filename = fileURLToPath(import.meta.url);
const SCRIPT_DIR = dirname(__filename);
const ROOT = resolve(SCRIPT_DIR, "..", "..");
const MODE_A = resolve(ROOT, "scripts/verify-mode-a/verify-mode-a.mjs");

/**
 * Walk up from a changed path until we find a folder containing
 * `__specs__/standards-compliance.yaml`. That folder IS the slice.
 *
 * Returns null when no ancestor has a lock (the change is outside any
 * spec'd feature — typically scripts/lib or top-level config).
 *
 * @param {string} startAbs
 * @param {string} rootAbs
 * @returns {string | null}
 */
export function findSliceRoot(startAbs, rootAbs) {
  let cur = startAbs;
  while (cur.length > rootAbs.length) {
    const lock = join(cur, "__specs__", "standards-compliance.yaml");
    if (existsSync(lock)) return cur;
    const parent = dirname(cur);
    if (parent === cur) break;
    cur = parent;
  }
  return null;
}

/**
 * From an unordered list of changed absolute paths, return the unique
 * set of slice roots (folders that own each changed path).
 *
 * @param {readonly string[]} changedPaths
 * @param {string} rootAbs
 * @returns {string[]}
 */
export function slicesFromChangedPaths(changedPaths, rootAbs) {
  /** @type {Set<string>} */
  const slices = new Set();
  for (const p of changedPaths) {
    const slice = findSliceRoot(p, rootAbs);
    if (slice !== null) slices.add(slice);
  }
  return [...slices].sort();
}

/**
 * @param {{
 *   spawn?: typeof spawnSync,
 *   execPath?: string,
 *   rootDir?: string,
 *   getChanged?: (baseRef?: string) => string[],
 *   modeAPath?: string,
 *   write?: (s: string) => void,
 *   writeErr?: (s: string) => void,
 * }} [io]
 * @returns {{ exitCode: 0 | 1, slices: string[], perSliceStatus: Array<{ slice: string, status: number }> }}
 */
export function main(io = {}) {
  const spawn = io.spawn ?? spawnSync;
  const execPath = io.execPath ?? process.execPath;
  const rootDir = io.rootDir ?? ROOT;
  const modeAPath = io.modeAPath ?? MODE_A;
  const getChanged = io.getChanged ?? ((baseRef) => getChangedPaths(baseRef, { cwd: rootDir }));
  const write = io.write ?? ((s) => process.stdout.write(s));
  const writeErr = io.writeErr ?? ((s) => process.stderr.write(s));

  const changed = getChanged("origin/master");
  if (changed.length === 0) {
    write("verify-mode-c: no changed paths against origin/master — nothing to verify.\n");
    return { exitCode: 0, slices: [], perSliceStatus: [] };
  }

  const slices = slicesFromChangedPaths(changed, rootDir);
  if (slices.length === 0) {
    write("verify-mode-c: changed paths don't resolve to any spec'd slice — nothing to verify.\n");
    return { exitCode: 0, slices: [], perSliceStatus: [] };
  }

  write(`verify-mode-c: re-verifying ${String(slices.length)} slice(s) in this push\n`);
  /** @type {Array<{ slice: string, status: number }>} */
  const perSliceStatus = [];
  let aggregateExit = 0;
  for (const slice of slices) {
    // `findSliceRoot` guarantees `slice` is strictly deeper than rootDir,
    // so `relative(rootDir, slice)` is always a non-empty path.
    const rel = relative(rootDir, slice);
    write(`\n--- slice: ${rel} ---\n`);
    const res = spawn(execPath, [modeAPath, slice], { cwd: rootDir, encoding: "utf8" });
    if (res.stdout) write(res.stdout);
    if (res.stderr) writeErr(res.stderr);
    const status = res.status ?? 1;
    perSliceStatus.push({ slice, status });
    if (status !== 0) aggregateExit = 1;
  }

  const passed = perSliceStatus.filter((s) => s.status === 0).length;
  const failed = perSliceStatus.length - passed;
  write(
    `\nmode-c: ${String(passed)}/${String(perSliceStatus.length)} slices PASS; ${String(failed)} FAIL\n`,
  );
  return { exitCode: aggregateExit === 0 ? 0 : 1, slices, perSliceStatus };
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
 *   getChanged?: (baseRef?: string) => string[],
 *   write?: (s: string) => void,
 *   writeErr?: (s: string) => void,
 *   rootDir?: string,
 *   spawn?: typeof import("node:child_process").spawnSync,
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
