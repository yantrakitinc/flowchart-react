#!/usr/bin/env node
// Mode F-Random — random ~20% subset of Mode F.
//
// Walks every lock via findAllLocks, samples ~20% uniformly at random
// (minimum 1 lock when any exist), then runs Mode F over the sample. Same
// shape + freshness gates, narrower scope. Read-only.

import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { findAllLocks } from "../verify-mode-inspect/verify-mode-inspect.mjs";
import { main as modeFMain } from "../verify-mode-f/verify-mode-f.mjs";

const __filename = fileURLToPath(import.meta.url);
const SCRIPT_DIR = dirname(__filename);
const ROOT = resolve(SCRIPT_DIR, "..", "..");

export const DEFAULT_SAMPLE_FRACTION = 0.2;

/**
 * Sample a fraction of `items` (uniform random, min 1 when items > 0).
 *
 * @template T
 * @param {readonly T[]} items
 * @param {number} fraction
 * @param {() => number} [rng] defaults to Math.random
 * @returns {T[]}
 */
export function sampleSubset(items, fraction, rng = Math.random) {
  if (items.length === 0) return [];
  const target = Math.max(1, Math.floor(items.length * fraction));
  const pool = items.slice();
  /** @type {T[]} */
  const out = [];
  while (out.length < target && pool.length > 0) {
    const idx = Math.floor(rng() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

/**
 * @param {{
 *   rootDir?: string,
 *   findLocks?: (root: string) => string[],
 *   fraction?: number,
 *   rng?: () => number,
 *   gitLastCommit?: (folder: string, lockFile: string) => string | null,
 *   write?: (s: string) => void,
 *   writeErr?: (s: string) => void,
 *   readFile?: (p: string) => string,
 *   modeF?: typeof modeFMain,
 * }} [io]
 * @returns {ReturnType<typeof modeFMain>}
 */
export function main(io = {}) {
  const rootDir = io.rootDir ?? ROOT;
  const findLocks = io.findLocks ?? findAllLocks;
  const fraction = io.fraction ?? DEFAULT_SAMPLE_FRACTION;
  const rng = io.rng ?? Math.random;
  const write = io.write ?? ((s) => process.stdout.write(s));
  const modeF = io.modeF ?? modeFMain;

  const all = findLocks(rootDir);
  const sample = sampleSubset(all, fraction, rng);
  write(
    `verify-mode-f-random: sampled ${String(sample.length)} of ${String(all.length)} lock(s) (~${String(Math.round(fraction * 100))}%)\n`,
  );
  return modeF({
    rootDir,
    findLocks: () => sample,
    gitLastCommit: io.gitLastCommit,
    write: io.write,
    writeErr: io.writeErr,
    readFile: io.readFile,
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
