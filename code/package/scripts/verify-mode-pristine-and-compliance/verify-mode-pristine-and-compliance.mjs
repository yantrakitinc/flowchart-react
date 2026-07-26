#!/usr/bin/env node
// Mode Pristine+Compliance — pre-merge composite gate.
//
// Runs Mode Pristine, then Mode Compliance. First non-zero stops the chain.
// Manual / on-demand. The developer's pre-merge gate.

import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const SCRIPT_DIR = dirname(__filename);
const FRONTEND_ROOT = resolve(SCRIPT_DIR, "..", "..");
const MODE_PRISTINE = resolve(FRONTEND_ROOT, "scripts/verify-mode-pristine/verify-mode-pristine.mjs");
const MODE_COMPLIANCE = resolve(FRONTEND_ROOT, "scripts/verify-mode-compliance/verify-mode-compliance.mjs");

/**
 * @param {{
 *   spawn?: typeof spawnSync,
 *   execPath?: string,
 *   cwd?: string,
 *   modePristinePath?: string,
 *   modeCompliancePath?: string,
 *   write?: (s: string) => void,
 *   writeErr?: (s: string) => void,
 * }} [io]
 * @returns {{ exitCode: 0 | 1, stages: Array<{ name: string, status: number }> }}
 */
export function main(io = {}) {
  const spawn = io.spawn ?? spawnSync;
  const execPath = io.execPath ?? process.execPath;
  const cwd = io.cwd ?? FRONTEND_ROOT;
  const pristinePath = io.modePristinePath ?? MODE_PRISTINE;
  const compliancePath = io.modeCompliancePath ?? MODE_COMPLIANCE;
  const write = io.write ?? ((s) => process.stdout.write(s));
  const writeErr = io.writeErr ?? ((s) => process.stderr.write(s));

  /** @type {Array<{ name: string, status: number }>} */
  const stages = [];

  for (const stage of [
    { name: "pristine", path: pristinePath },
    { name: "compliance", path: compliancePath },
  ]) {
    write(`\n=== verify-mode-pristine-and-compliance: ${stage.name} ===\n`);
    const res = spawn(execPath, [stage.path], { cwd, encoding: "utf8" });
    if (res.stdout) write(res.stdout);
    if (res.stderr) writeErr(res.stderr);
    const status = res.status ?? 1;
    stages.push({ name: stage.name, status });
    if (status !== 0) {
      writeErr(`verify-mode-pristine-and-compliance: stage '${stage.name}' FAILED (exit ${String(status)})\n`);
      return { exitCode: 1, stages };
    }
  }

  write(`\nmode-pristine-and-compliance: PASS — pristine + compliance both green\n`);
  return { exitCode: 0, stages };
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
