#!/usr/bin/env node
// Stray-scaffolding verifier.
//
// Walks `src/` (and `e2e/` when present) and flags "old style" scaffolding
// folders / files that escaped the locked `__specs__/` landing zone. The
// purpose is to keep the codebase from carrying half-migrated layouts:
// a `flows/` directory at any depth that is NOT directly inside a
// `__specs__/` parent has either been mis-placed or was never moved during
// a migration. Same story for `specs/` siblings and `FLOWS.md` /
// `CODE_CONFIDENCE.md` files outside `__specs__/`.
//
// Transitional carve-outfolders named `__specs__.backup/`
// are skipped entirely. They are the parking spot for legacy `spec.md` +
// `*.flow.md` content while a feature is being retrofitted to the new
// `spec.yaml` + `*.flow.yaml` shape. The backup folder is deleted at the
// end of the slice; the carve-out is needed in between so
// the verify chain stays green for the duration of the migration.
//
// Pure Node + zero external dependencies. Helpers are exported so the
// Vitest suite can exercise every branch without spawning the script.

import { dirname, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { listAllDirs, listAllFiles } from "../lib/walk.mjs";

const __filename = fileURLToPath(import.meta.url);
const SCRIPT_DIR = dirname(__filename);
const ROOT_DIR = resolve(SCRIPT_DIR, "..", "..");
const DEFAULT_SRC = resolve(ROOT_DIR, "src");
const DEFAULT_E2E = resolve(ROOT_DIR, "e2e");

/**
 * Default IO ports — broken out so the test suite can mark them
 * covered by calling them directly.
 */
export const defaultListAllDirs = (/** @type {string} */ p) => listAllDirs(p);
export const defaultListAllFiles = (/** @type {string} */ p) => listAllFiles(p);
export const defaultStdoutWrite = (/** @type {string} */ s) =>
  process.stdout.write(s);
export const defaultStderrWrite = (/** @type {string} */ s) =>
  process.stderr.write(s);

/**
 * Backup-folder carve-out. Any path under `__specs__.backup/` is skipped
 * so operators can park legacy doc content without tripping this gate.
 */
export const BACKUP_SEGMENT = "__specs__.backup";

/**
 * True when `path` lives inside (or IS) a `__specs__.backup/` tree.
 *
 * Match-on-segment, not substring: a file literally named
 * `__specs__.backupX` would NOT be skipped.
 *
 * @param {string} path absolute path
 * @returns {boolean}
 */
export function isInsideBackupFolder(path) {
  const segments = path.split("/");
  return segments.includes(BACKUP_SEGMENT);
}

/**
 * Detect a stray directory. Returns a stray-descriptor when `dir` is one
 * of the banned shapes; null otherwise.
 *
 *   - <folder>/flows/        outside __specs__/
 *   - <folder>/specs/        (must use __specs__/)
 *   - <folder>/__spec__/     (typo — must use __specs__/)
 *   - <folder>/_specs_/      (typo — must use __specs__/)
 *
 * @param {string} dir absolute directory path
 * @returns {{ kind: string, detail: string } | null}
 */
export function classifyDirStray(dir) {
  const segments = dir.split("/");
  const last = segments[segments.length - 1];
  const parent = segments[segments.length - 2];
  if (last === "flows" && parent !== "__specs__") {
    return { kind: "flows-outside-specs", detail: "flows/ must live inside __specs__/" };
  }
  if (last === "specs" || last === "__spec__" || last === "_specs_") {
    return { kind: "wrong-specs-folder", detail: "must use __specs__/" };
  }
  return null;
}

/**
 * Detect a stray file. Returns a stray-descriptor when `file` is one of
 * the banned shapes; null otherwise.
 *
 *   - FLOWS.md anywhere (no master index — AI agents crawl __specs__/)
 *   - CODE_CONFIDENCE.md outside `__specs__/`
 *
 * @param {string} file absolute file path
 * @returns {{ kind: string, detail: string } | null}
 */
export function classifyFileStray(file) {
  const fileName = file.split("/").pop();
  if (fileName === "FLOWS.md") {
    return {
      kind: "flows-md",
      detail: "no FLOWS.md anywhere — AI agent crawls __specs__/",
    };
  }
  if (fileName === "CODE_CONFIDENCE.md" && !file.includes("/__specs__/")) {
    return {
      kind: "code-confidence-outside-specs",
      detail: "CODE_CONFIDENCE.md must live inside __specs__/",
    };
  }
  return null;
}

/**
 * Walks `roots` and returns every detected stray. Each stray points at
 * the offending absolute path plus a one-line reason.
 *
 * @param {ReadonlyArray<string>} roots absolute root paths
 * @param {{
 *   listDirs?: (root: string) => string[],
 *   listFiles?: (root: string) => string[],
 * }} [injected]
 * @returns {{ strays: Array<{ path: string, kind: string, detail: string }> }}
 */
export function audit(roots, injected = {}) {
  const listDirs = injected.listDirs ?? defaultListAllDirs;
  const listFiles = injected.listFiles ?? defaultListAllFiles;
  /** @type {Array<{ path: string, kind: string, detail: string }>} */
  const strays = [];

  for (const root of roots) {
    for (const dir of listDirs(root)) {
      if (isInsideBackupFolder(dir)) continue;
      const verdict = classifyDirStray(dir);
      if (verdict !== null) {
        strays.push({ path: dir, kind: verdict.kind, detail: verdict.detail });
      }
    }
    for (const file of listFiles(root)) {
      if (isInsideBackupFolder(file)) continue;
      const verdict = classifyFileStray(file);
      if (verdict !== null) {
        strays.push({ path: file, kind: verdict.kind, detail: verdict.detail });
      }
    }
  }

  return { strays };
}

/**
 * Format the audit result for stdout / stderr.
 *
 * @param {{ strays: Array<{ path: string, kind: string, detail: string }> }} result
 * @param {string} rootDir absolute root used for relative path display
 * @returns {{ exitCode: 0 | 1, stdout: string, stderr: string }}
 */
export function formatReport(result, rootDir) {
  if (result.strays.length === 0) {
    return {
      exitCode: 0,
      stdout: "verify-no-stray-scaffolding: OK (no strays found)\n",
      stderr: "",
    };
  }
  const lines = [
    `verify-no-stray-scaffolding: ${String(result.strays.length)} stray item(s)`,
  ];
  for (const s of result.strays) {
    lines.push(`  STRAY: ${relative(rootDir, s.path)} (${s.detail})`);
  }
  return {
    exitCode: 1,
    stdout: "",
    stderr: `${lines.join("\n")}\n`,
  };
}

/**
 * Entry point. Defaults to walking `src/` + (if present) `e2e/`.
 *
 * @param {{
 *   src?: string,
 *   e2e?: string,
 *   rootDir?: string,
 *   listDirs?: (root: string) => string[],
 *   listFiles?: (root: string) => string[],
 *   write?: (s: string) => void,
 *   writeErr?: (s: string) => void,
 * }} [io]
 * @returns {{ exitCode: 0 | 1 }}
 */
export function main(io = {}) {
  const src = io.src ?? DEFAULT_SRC;
  const e2e = io.e2e ?? DEFAULT_E2E;
  const rootDir = io.rootDir ?? ROOT_DIR;
  const write = io.write ?? defaultStdoutWrite;
  const writeErr = io.writeErr ?? defaultStderrWrite;
  const result = audit([src, e2e], {
    listDirs: io.listDirs,
    listFiles: io.listFiles,
  });
  const report = formatReport(result, rootDir);
  if (report.stdout) write(report.stdout);
  if (report.stderr) writeErr(report.stderr);
  return { exitCode: report.exitCode };
}

/**
 * CLI entry — exported so the test suite can drive it without spawning a
 * child process.
 *
 * @param {{ exit?: (code: number) => void }} [io]
 * @returns {void}
 */
export function cliMain(io = {}) {
  const exit = io.exit ?? ((code) => process.exit(code));
  const { exitCode } = main();
  exit(exitCode);
}

/**
 * True when the script is being executed as a CLI.
 *
 * @param {string} importMetaUrl
 * @param {string | undefined} argv1
 * @returns {boolean}
 */
export function isCliInvocation(importMetaUrl, argv1) {
  if (argv1 === undefined || argv1 === "") return false;
  return importMetaUrl === pathToFileURL(argv1).href;
}

/**
 * Wrapped CLI dispatcher. Computes the guard predicate AND fires the CLI
 * body in one place — the function-call makes both branches reachable
 * from the test suite (one happy invocation passes the guard with a
 * captured exit hook; one passes a non-matching argv1 so the guard
 * returns early without firing cliMain).
 *
 * @param {{
 *   importMetaUrl: string,
 *   argv1: string | undefined,
 *   exit?: (code: number) => void,
 * }} io
 * @returns {boolean} true when cliMain was invoked, false when the guard
 *   short-circuited
 */
export function maybeRunCli(io) {
  if (!isCliInvocation(io.importMetaUrl, io.argv1)) return false;
  cliMain({ exit: io.exit });
  return true;
}

// Module-load CLI gate. Imports during the test run see argv1 pointing
// at vitest, so `maybeRunCli` short-circuits.
maybeRunCli({ importMetaUrl: import.meta.url, argv1: process.argv[1] });
