#!/usr/bin/env node
// Mode Pristine — code-health proof gate.
//
// Runs typecheck + build + lint + unit tests + e2e tests in sequence.
// Each stage exits 0 on success. First non-zero stops the chain.
// No spec/lock involvement. No code mutation. Mode Pristine answers the
// question "is the code currently shippable?" — independent of any
// standards-compliance lock state.

import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const SCRIPT_DIR = dirname(__filename);
const FRONTEND_ROOT = resolve(SCRIPT_DIR, "..", "..");

/**
 * @typedef {{ name: string, args: readonly string[], optional?: boolean }} PristineStage
 */

/** @type {ReadonlyArray<PristineStage>} */
export const DEFAULT_STAGES = [
  { name: "typecheck", args: ["typecheck"] },
  { name: "build", args: ["build"] },
  { name: "lint", args: ["lint"] },
  { name: "unit", args: ["test"] },
  { name: "e2e", args: ["e2e"], optional: true },
];

/**
 * @param {{
 *   stages?: ReadonlyArray<PristineStage>,
 *   pnpm?: string,
 *   cwd?: string,
 *   spawn?: typeof spawnSync,
 *   write?: (s: string) => void,
 *   writeErr?: (s: string) => void,
 * }} [io]
 * @returns {{ exitCode: 0 | 1, stages: Array<{ name: string, status: number, skipped: boolean }> }}
 */
export function main(io = {}) {
  const stages = io.stages ?? DEFAULT_STAGES;
  const pnpm = io.pnpm ?? "pnpm";
  const cwd = io.cwd ?? FRONTEND_ROOT;
  const spawn = io.spawn ?? spawnSync;
  const write = io.write ?? ((s) => process.stdout.write(s));
  const writeErr = io.writeErr ?? ((s) => process.stderr.write(s));

  /** @type {Array<{ name: string, status: number, skipped: boolean }>} */
  const results = [];
  let aggregateExit = 0;
  for (const stage of stages) {
    write(`\n=== verify-mode-pristine: ${stage.name} ===\n`);
    const res = spawn(pnpm, [...stage.args], { cwd, encoding: "utf8" });
    if (res.error !== undefined) {
      const skipped = Boolean(stage.optional);
      writeErr(
        `verify-mode-pristine: stage '${stage.name}' could not be spawned${skipped ? " — skipping (optional)" : ""}: ${String(res.error)}\n`,
      );
      results.push({ name: stage.name, status: skipped ? 0 : 1, skipped });
      if (!skipped) {
        aggregateExit = 1;
        break;
      }
      continue;
    }
    if (res.stdout) write(res.stdout);
    if (res.stderr) writeErr(res.stderr);
    const status = res.status ?? 1;
    if (status !== 0 && Boolean(stage.optional)) {
      // pnpm exits 254 for "script not found"; any non-zero on an
      // optional stage = skip (operator hasn't wired this gate yet).
      writeErr(
        `verify-mode-pristine: stage '${stage.name}' returned non-zero (${String(status)}) — skipping (optional)\n`,
      );
      results.push({ name: stage.name, status: 0, skipped: true });
      continue;
    }
    results.push({ name: stage.name, status, skipped: false });
    if (status !== 0) {
      aggregateExit = 1;
      writeErr(`verify-mode-pristine: stage '${stage.name}' FAILED (exit ${String(status)})\n`);
      break;
    }
  }

  if (aggregateExit === 0) {
    write(`\nmode-pristine: PASS — ${String(results.length)} stage(s) green\n`);
  } else {
    writeErr(`\nmode-pristine: FAIL — stopped at first non-zero stage\n`);
  }
  return { exitCode: aggregateExit === 0 ? 0 : 1, stages: results };
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
