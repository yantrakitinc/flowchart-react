#!/usr/bin/env node
// Mode E — entire-repo stamp update.
//
// Discovers every slice that owns a `__specs__/standards-compliance.yaml`,
// invokes Mode A against each. Aggregates verdicts. Used to re-stamp the
// whole repo after a sweeping change (e.g., a new mode lands).

import { spawnSync } from "node:child_process";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { findAllLocks } from "../verify-mode-inspect/verify-mode-inspect.mjs";

const __filename = fileURLToPath(import.meta.url);
const SCRIPT_DIR = dirname(__filename);
const ROOT = resolve(SCRIPT_DIR, "..", "..");
const MODE_A = resolve(ROOT, "scripts/verify-mode-a/verify-mode-a.mjs");

/**
 * Convert lock paths (`<slice>/__specs__/standards-compliance.yaml`) into
 * slice roots (`<slice>`).
 *
 * @param {readonly string[]} lockPaths absolute
 * @returns {string[]}
 */
export function slicesFromLocks(lockPaths) {
  /** @type {string[]} */
  const slices = [];
  for (const lock of lockPaths) {
    // strip the trailing `__specs__/standards-compliance.yaml`
    const specsDir = dirname(lock);
    const slice = dirname(specsDir);
    slices.push(slice);
  }
  return [...new Set(slices)].sort();
}

/**
 * @param {{
 *   spawn?: typeof spawnSync,
 *   execPath?: string,
 *   rootDir?: string,
 *   findLocks?: (root: string) => string[],
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
  const findLocks = io.findLocks ?? findAllLocks;
  const write = io.write ?? ((s) => process.stdout.write(s));
  const writeErr = io.writeErr ?? ((s) => process.stderr.write(s));

  const locks = findLocks(rootDir);
  if (locks.length === 0) {
    write("verify-mode-e: no locks found in the repo — nothing to re-stamp.\n");
    return { exitCode: 0, slices: [], perSliceStatus: [] };
  }
  const slices = slicesFromLocks(locks);
  write(`verify-mode-e: re-stamping ${String(slices.length)} slice(s) across the entire repo\n`);

  /** @type {Array<{ slice: string, status: number }>} */
  const perSliceStatus = [];
  let aggregateExit = 0;
  for (const slice of slices) {
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
    `\nmode-e: ${String(passed)}/${String(perSliceStatus.length)} slices PASS; ${String(failed)} FAIL\n`,
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
