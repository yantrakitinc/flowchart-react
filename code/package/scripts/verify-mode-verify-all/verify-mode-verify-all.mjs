#!/usr/bin/env node
// Mode Verify-All — feature-by-feature deep ceremony.
//
// For each slice in the repo (resumable from `.verify-all-progress.json`):
//   (1) unlock the slice (status: unlocked + clear last_validated)
//   (2) run Mode Pristine+Compliance
//   (3) on pass: invoke Mode A to relock with fresh stamp
//        on fail: leave the slice unlocked (signal that validation failed)
//   (4) record per-slice verdict in .verify-all-progress.json
//
// Hours-long. Manual. Survives interruption — re-running picks up where
// the progress file left off.

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { findAllLocks } from "../verify-mode-inspect/verify-mode-inspect.mjs";
import { slicesFromLocks } from "../verify-mode-e/verify-mode-e.mjs";
import { unlockLock } from "../verify-mode-a/verify-mode-a.mjs";

const __filename = fileURLToPath(import.meta.url);
const SCRIPT_DIR = dirname(__filename);
const FRONTEND_ROOT = resolve(SCRIPT_DIR, "..", "..");
const REPO_ROOT = resolve(FRONTEND_ROOT, "..");
const PROGRESS_FILE = resolve(FRONTEND_ROOT, ".verify-all-progress.json");
const MODE_A = resolve(FRONTEND_ROOT, "scripts/verify-mode-a/verify-mode-a.mjs");
const MODE_PRISTINE_AND_COMPLIANCE = resolve(
  FRONTEND_ROOT,
  "scripts/verify-mode-pristine-and-compliance/verify-mode-pristine-and-compliance.mjs",
);

/**
 * @typedef {{ slice: string, verdict: "pass" | "fail", lastRun: string }} VerifyAllRow
 */

/**
 * @param {string} progressPath
 * @param {{ readFile?: (p: string) => string }} [io]
 * @returns {Record<string, VerifyAllRow>}
 */
export function loadProgress(progressPath, io = {}) {
  const readFile = io.readFile ?? ((p) => readFileSync(p, "utf8"));
  if (!existsSync(progressPath)) return {};
  try {
    const body = readFile(progressPath);
    /** @type {unknown} */
    const parsed = JSON.parse(body);
    if (parsed === null || typeof parsed !== "object") return {};
    return /** @type {Record<string, VerifyAllRow>} */ (parsed);
  } catch {
    return {};
  }
}

/**
 * @param {string} progressPath
 * @param {Record<string, VerifyAllRow>} state
 * @param {{ writeFile?: (p: string, c: string) => void }} [io]
 */
export function saveProgress(progressPath, state, io = {}) {
  const writeFile =
    io.writeFile ?? ((p, c) => writeFileSync(p, c, "utf8"));
  writeFile(progressPath, JSON.stringify(state, null, 2) + "\n");
}

/**
 * @param {{
 *   rootDir?: string,
 *   findLocks?: (root: string) => string[],
 *   slices?: string[],
 *   progressPath?: string,
 *   resume?: boolean,
 *   spawn?: typeof spawnSync,
 *   execPath?: string,
 *   modeAPath?: string,
 *   modePristineAndCompliancePath?: string,
 *   unlock?: (lockPath: string) => void,
 *   write?: (s: string) => void,
 *   writeErr?: (s: string) => void,
 *   now?: () => Date,
 *   readFile?: (p: string) => string,
 *   writeFile?: (p: string, c: string) => void,
 * }} [io]
 * @returns {{ exitCode: 0 | 1, rows: VerifyAllRow[] }}
 */
export function main(io = {}) {
  const rootDir = io.rootDir ?? FRONTEND_ROOT;
  const findLocks = io.findLocks ?? findAllLocks;
  const progressPath = io.progressPath ?? PROGRESS_FILE;
  const resume = io.resume ?? true;
  const spawn = io.spawn ?? spawnSync;
  const execPath = io.execPath ?? process.execPath;
  const modeAPath = io.modeAPath ?? MODE_A;
  const modePcPath = io.modePristineAndCompliancePath ?? MODE_PRISTINE_AND_COMPLIANCE;
  const unlock = io.unlock ?? unlockLock;
  const write = io.write ?? ((s) => process.stdout.write(s));
  const writeErr = io.writeErr ?? ((s) => process.stderr.write(s));
  const now = io.now ?? (() => new Date());

  const locks = findLocks(rootDir);
  const slices = io.slices ?? slicesFromLocks(locks);

  /** @type {Record<string, VerifyAllRow>} */
  let progress = resume ? loadProgress(progressPath, { readFile: io.readFile }) : {};

  write(
    `verify-mode-verify-all: ${String(slices.length)} slice(s) total; ${String(
      Object.values(progress).filter((r) => r.verdict === "pass").length,
    )} already passed${resume ? " (resuming)" : ""}\n`,
  );

  let aggregateExit = 0;
  /** @type {VerifyAllRow[]} */
  const rows = [];

  for (const slice of slices) {
    const rel = relative(rootDir, slice);
    const prior = progress[rel];
    if (resume && prior !== undefined && prior.verdict === "pass") {
      write(`\n--- slice: ${rel} — already PASSED; skipping ---\n`);
      rows.push(prior);
      continue;
    }

    write(`\n--- slice: ${rel} ---\n`);
    const lockPath = join(slice, "__specs__", "standards-compliance.yaml");

    // Run Pristine+Compliance WITH the lock still locked. Compliance's
    // verify-standards-compliance scans every lock in the repo and would
    // fail on any `status: unlocked`; if we unlock first the chain
    // self-rejects. The unlock signal happens AFTER a failure (so the
    // unlocked state correctly marks "validation failed"), not before.
    const pcRes = spawn(execPath, [modePcPath], { cwd: rootDir, encoding: "utf8" });
    if (pcRes.stdout) write(pcRes.stdout);
    if (pcRes.stderr) writeErr(pcRes.stderr);
    if ((pcRes.status ?? 1) !== 0) {
      writeErr(`verify-mode-verify-all: ${rel} FAILED Pristine+Compliance; unlocking\n`);
      try {
        unlock(lockPath);
      } catch (err) {
        writeErr(`verify-mode-verify-all: also could not unlock ${rel}: ${String(err)}\n`);
      }
      const row = /** @type {VerifyAllRow} */ ({
        slice: rel,
        verdict: "fail",
        lastRun: now().toISOString(),
      });
      progress[rel] = row;
      rows.push(row);
      saveProgress(progressPath, progress, { writeFile: io.writeFile });
      aggregateExit = 1;
      continue;
    }

    // P+C passed — invoke Mode A to refresh the stamp. Mode A unlocks
    // briefly during its own scoped Pristine run and relocks on pass.
    // Its scope is narrow (slice + blast radius) so it doesn't trip
    // verify-standards-compliance over the unlock window.
    const aRes = spawn(execPath, [modeAPath, slice], { cwd: rootDir, encoding: "utf8" });
    if (aRes.stdout) write(aRes.stdout);
    if (aRes.stderr) writeErr(aRes.stderr);
    if ((aRes.status ?? 1) !== 0) {
      writeErr(`verify-mode-verify-all: ${rel} FAILED Mode A relock; unlocking\n`);
      try {
        unlock(lockPath);
      } catch (err) {
        writeErr(`verify-mode-verify-all: also could not unlock ${rel}: ${String(err)}\n`);
      }
      const row = /** @type {VerifyAllRow} */ ({
        slice: rel,
        verdict: "fail",
        lastRun: now().toISOString(),
      });
      progress[rel] = row;
      rows.push(row);
      saveProgress(progressPath, progress, { writeFile: io.writeFile });
      aggregateExit = 1;
      continue;
    }

    const row = /** @type {VerifyAllRow} */ ({
      slice: rel,
      verdict: "pass",
      lastRun: now().toISOString(),
    });
    progress[rel] = row;
    rows.push(row);
    saveProgress(progressPath, progress, { writeFile: io.writeFile });
  }

  // Mark unused REPO_ROOT to silence linters that flag unused module-level
  // constants — kept for documentation; future repo-relative work will use it.
  void REPO_ROOT;

  const passed = rows.filter((r) => r.verdict === "pass").length;
  write(
    `\nmode-verify-all: ${String(passed)}/${String(rows.length)} slices PASS\n`,
  );
  return { exitCode: aggregateExit === 0 ? 0 : 1, rows };
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
