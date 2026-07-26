#!/usr/bin/env node
// Mode Verify-All-Random — random ~20% subset of Mode Verify-All.
//
// Samples a random subset of slices (uniform, min 1) and runs Mode
// Verify-All over them. Same per-slice ceremony (unlock → Pristine+Compliance
// → Mode A relock); narrower scope.

import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { findAllLocks } from "../verify-mode-inspect/verify-mode-inspect.mjs";
import { slicesFromLocks } from "../verify-mode-e/verify-mode-e.mjs";
import { sampleSubset } from "../verify-mode-f-random/verify-mode-f-random.mjs";
import { main as verifyAllMain } from "../verify-mode-verify-all/verify-mode-verify-all.mjs";

const __filename = fileURLToPath(import.meta.url);
const SCRIPT_DIR = dirname(__filename);
const FRONTEND_ROOT = resolve(SCRIPT_DIR, "..", "..");

export const DEFAULT_SAMPLE_FRACTION = 0.2;

/**
 * @param {{
 *   rootDir?: string,
 *   findLocks?: (root: string) => string[],
 *   fraction?: number,
 *   rng?: () => number,
 *   resume?: boolean,
 *   progressPath?: string,
 *   spawn?: Parameters<typeof verifyAllMain>[0] extends infer T ? T extends { spawn?: infer S } ? S : never : never,
 *   execPath?: string,
 *   modeAPath?: string,
 *   modePristineAndCompliancePath?: string,
 *   unlock?: (lockPath: string) => void,
 *   write?: (s: string) => void,
 *   writeErr?: (s: string) => void,
 *   verifyAll?: typeof verifyAllMain,
 * }} [io]
 * @returns {ReturnType<typeof verifyAllMain>}
 */
export function main(io = {}) {
  const rootDir = io.rootDir ?? FRONTEND_ROOT;
  const findLocks = io.findLocks ?? findAllLocks;
  const fraction = io.fraction ?? DEFAULT_SAMPLE_FRACTION;
  const rng = io.rng ?? Math.random;
  const verifyAll = io.verifyAll ?? verifyAllMain;
  const write = io.write ?? ((s) => process.stdout.write(s));

  const allLocks = findLocks(rootDir);
  const allSlices = slicesFromLocks(allLocks);
  const sample = sampleSubset(allSlices, fraction, rng);
  write(
    `verify-mode-verify-all-random: sampled ${String(sample.length)} of ${String(allSlices.length)} slice(s) (~${String(Math.round(fraction * 100))}%)\n`,
  );
  return verifyAll({
    rootDir,
    slices: sample,
    resume: io.resume,
    progressPath: io.progressPath,
    spawn: io.spawn,
    execPath: io.execPath,
    modeAPath: io.modeAPath,
    modePristineAndCompliancePath: io.modePristineAndCompliancePath,
    unlock: io.unlock,
    write: io.write,
    writeErr: io.writeErr,
  });
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
