#!/usr/bin/env node
// Standards-compliance lock-file FRESHNESS verifier.
//
// For every __specs__/standards-compliance.yaml under the supplied root,
// asks git for the most recent commit that touched any file in the
// feature folder (excluding the lock file itself), and compares that
// date to the lock's last_validated. Stale = commit date is more than
// SAME_COMMIT_GRACE_MS newer than last_validated.
//
// Git history is the freshness signal because it's stable across
// `git checkout` / `git pull` / `git clone`. Filesystem mtime would
// reset on every git operation and produce false-positive staleness on
// clean clones. See .claude/standards/$1.rationale.md —
// "Why git log, not filesystem mtime" — for the full rationale.
//
// Slower than verify-standards-compliance: one `git log` invocation per
// lock file. Runs on `pnpm verify:full` (not on the default `pnpm verify`
// chain) so local iteration stays fast.
//
// Helpers are exported so the Vitest suite can exercise every branch
// without spawning the script. Locks that fail PRESENCE are skipped here
// — verify-standards-compliance owns that gate.

import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const SCRIPT_DIR = dirname(__filename);
const REPO_ROOT = resolve(SCRIPT_DIR, "..", "..");

// Self-contained: roots to scan for standards-compliance.yaml locks + the file IO
// and walker. (Previously imported from verify-standards-compliance, whose vendored
// copy is a CLI with no exports.) Presence/shape validation stays that gate's job;
// here we only need each lock's last_validated to compare against git history.
// Freshness validates PRODUCT feature locks under src/. Vendored tooling under
// scripts/ is re-vendored + committed without re-stamping (its lock freshness
// carries no product meaning), so it is intentionally out of scope here — the
// compliance gate still checks scripts/ presence + shape.
export const DEFAULT_ROOTS = [resolve(REPO_ROOT, "src")];
const DEFAULT_ROOT = DEFAULT_ROOTS[0];
export const defaultReadFile = (/** @type {string} */ p) => readFileSync(p, "utf8");
export const defaultListFiles = (/** @type {string} */ root) => {
  /** @type {string[]} */
  const out = [];
  const walk = (/** @type {string} */ dir) => {
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const full = join(dir, e.name);
      if (e.isDirectory()) { if (e.name !== "node_modules" && e.name !== ".next") walk(full); }
      else out.push(full);
    }
  };
  walk(root);
  return out;
};

/**
 * Grace window applied when comparing the latest git-commit date to
 * `last_validated`. A developer or agent writes `last_validated = now()`
 * in the YAML, then iterates / runs hooks / runs `git commit`. The
 * commit's author-date is recorded by git AFTER the YAML value was set;
 * the gap can be substantial (a bare commit takes ~1 second, a full
 * pre-commit hook chain 30-90 seconds, and a multi-step iteration
 * between spec-lock and commit can stretch to many minutes).
 *
 * 30 minutes covers the iteration cycles observed in practice. Real
 * drift (forgetting to re-stamp across days/weeks) is far outside this
 * window, so the gate's signal is preserved.
 *
 * @type {number}
 */
export const SAME_COMMIT_GRACE_MS = 30 * 60 * 1000;

/**
 * Default-IO ports — broken out so the test suite can mark them covered.
 */
export const defaultStdoutWrite = (/** @type {string} */ s) =>
  process.stdout.write(s);
export const defaultStderrWrite = (/** @type {string} */ s) =>
  process.stderr.write(s);

/**
 * Default git-history adapter: returns the ISO-8601 date of the most
 * recent commit that touched any file in `folder`, EXCLUDING the lock
 * file itself (re-stamping the lock would otherwise always look like a
 * fresh change).
 *
 * Returns `null` when:
 * - The folder has no commits yet (new feature on a feature branch).
 * - Git is unavailable / cwd is not a repo / the folder is outside the repo.
 *
 * Upstream treats `null` as "fresh" — a verify failure cannot be the
 * right response to a git-environment problem (CI without git installed,
 * fresh clone before fetch, etc.).
 *
 * Uses `execFileSync` (not shell) so paths can't be injected.
 *
 * @param {string} folder absolute path to the feature folder
 * @param {string} lockFile absolute path to the lock file inside `folder/__specs__/`
 * @returns {string | null}
 */
export const defaultGitLastCommit = (
  /** @type {string} */ folder,
  /** @type {string} */ lockFile,
) => {
  try {
    // Run git from inside the folder; pathspecs are interpreted relative
    // to that cwd. `.` matches every file in the folder; `:(exclude)<rel>`
    // removes the lock file so re-stamps don't register as "the folder
    // changed". Pathspec magic prefixes don't work with absolute paths
    // reliably across git versions, so we pass a folder-relative path.
    const lockRel = relative(folder, lockFile);
    const out = execFileSync(
      "git",
      ["log", "-1", "--format=%aI", "--", ".", `:(exclude)${lockRel}`],
      { encoding: "utf8", cwd: folder, stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
    return out === "" ? null : out;
  } catch {
    return null;
  }
};

/**
 * Returns a freshness verdict for a single lock file.
 *
 * Stale = the folder's most recent commit (other than the lock file
 * itself) has an ISO-8601 author date strictly greater than
 * `lastValidatedMs + SAME_COMMIT_GRACE_MS`.
 *
 * @param {string} lockFileAbs absolute path to the lock file
 * @param {number} lastValidatedMs epoch ms of the lock's last_validated
 * @param {{ gitLastCommit?: (folder: string, lockFile: string) => string | null }} [injected]
 * @returns {{ ok: true } | { ok: false, reason: string, detail: string }}
 */
export function checkFreshness(lockFileAbs, lastValidatedMs, injected = {}) {
  const gitLastCommit = injected.gitLastCommit ?? defaultGitLastCommit;
  const specsDir = dirname(lockFileAbs);
  const featureDir = dirname(specsDir);

  const lastCommitIso = gitLastCommit(featureDir, lockFileAbs);
  if (lastCommitIso === null) {
    return { ok: true };
  }

  const commitMs = Date.parse(lastCommitIso);
  if (Number.isNaN(commitMs)) {
    return {
      ok: false,
      reason: "git log returned unparseable date",
      detail: `'${lastCommitIso}' did not parse as a Date`,
    };
  }

  if (commitMs <= lastValidatedMs + SAME_COMMIT_GRACE_MS) {
    // Within the grace window — same-commit re-stamp where the YAML value
    // was written seconds-to-minutes before git recorded the commit date.
    return { ok: true };
  }

  const stamped = new Date(lastValidatedMs).toISOString();
  return {
    ok: false,
    reason: "folder modified after last_validated",
    detail: `last_validated=${stamped}; last git commit touching ${relative(REPO_ROOT, featureDir)}=${lastCommitIso}`,
  };
}

/**
 * Walks `rootDir`, finds every standards-compliance.yaml, parses it via
 * the shared parseLockFile + checkPresence helpers (from
 * verify-standards-compliance — that script owns the presence gate, so a
 * presence failure here is silently skipped, not double-reported), and
 * runs the freshness check on every lock that passes presence.
 *
 * @param {string} rootDir absolute path to walk
 * @param {{ readFile?: (p: string) => string, listFiles?: (root: string) => string[], gitLastCommit?: (folder: string, lockFile: string) => string | null }} [injected]
 * @returns {{
 *   checked: number,
 *   failures: Array<{ filePath: string, reason: string, detail: string }>,
 * }}
 */
export function audit(rootDir, injected = {}) {
  const readFile = injected.readFile ?? defaultReadFile;
  const listFiles = injected.listFiles ?? defaultListFiles;
  const allFiles = listFiles(rootDir);
  const lockFiles = allFiles.filter((f) =>
    f.endsWith("/__specs__/standards-compliance.yaml"),
  );
  /** @type {Array<{ filePath: string, reason: string, detail: string }>} */
  const failures = [];
  for (const lock of lockFiles) {
    /** @type {string} */
    let contents;
    try {
      contents = readFile(lock);
    } catch {
      // Read failure is verify-standards-compliance's job to surface.
      continue;
    }
    // last_validated is all freshness needs; presence/shape is the compliance gate's job.
    const m = contents.match(/^\s*last_validated:\s*["']?([^"'\n]+?)["']?\s*$/m);
    if (!m) continue;
    const lastValidatedMs = Date.parse(m[1].trim());
    if (Number.isNaN(lastValidatedMs)) continue;
    const freshness = checkFreshness(lock, lastValidatedMs, {
      gitLastCommit: injected.gitLastCommit,
    });
    if (!freshness.ok) {
      failures.push({
        filePath: lock,
        reason: freshness.reason,
        detail: freshness.detail,
      });
    }
  }
  return { checked: lockFiles.length, failures };
}

/**
 * Format the audit result for stdout / stderr.
 *
 * @param {{ checked: number, failures: Array<{ filePath: string, reason: string, detail: string }> }} result
 * @param {string} rootDir absolute root used by the walk (for relative paths)
 * @returns {{ exitCode: 0 | 1, stdout: string, stderr: string }}
 */
export function formatReport(result, rootDir) {
  if (result.failures.length === 0) {
    return {
      exitCode: 0,
      stdout: `verify-standards-freshness: OK (${String(result.checked)} lock file(s) fresh vs git history)\n`,
      stderr: "",
    };
  }
  const lines = [
    `verify-standards-freshness: ${String(result.failures.length)} lock file(s) stale`,
  ];
  for (const f of result.failures) {
    lines.push(`  - ${relative(rootDir, f.filePath)}`);
    lines.push(`      reason: ${f.reason}`);
    lines.push(`      detail: ${f.detail}`);
  }
  return {
    exitCode: 1,
    stdout: "",
    stderr: `${lines.join("\n")}\n`,
  };
}

/**
 * Entry-point. Defaults to walking code/web/src.
 *
 * @param {string} [rootDir]
 * @param {{
 *   readFile?: (p: string) => string,
 *   listFiles?: (root: string) => string[],
 *   gitLastCommit?: (folder: string, lockFile: string) => string | null,
 *   write?: (s: string) => void,
 *   writeErr?: (s: string) => void,
 * }} [io]
 * @returns {{ exitCode: 0 | 1 }}
 */
export function main(rootDir = DEFAULT_ROOT, io = {}) {
  const write = io.write ?? defaultStdoutWrite;
  const writeErr = io.writeErr ?? defaultStderrWrite;
  const result = audit(rootDir, {
    readFile: io.readFile,
    listFiles: io.listFiles,
    gitLastCommit: io.gitLastCommit,
  });
  const report = formatReport(result, rootDir);
  if (report.stdout) write(report.stdout);
  if (report.stderr) writeErr(report.stderr);
  return { exitCode: report.exitCode };
}

/**
 * CLI entry — invoked from the conditional below when the script is
 * executed directly. Exported so tests can drive it without spawning a
 * child process.
 *
 * @param {{
 *   argv?: ReadonlyArray<string>,
 *   env?: Record<string, string | undefined>,
 *   exit?: (code: number) => void,
 * }} [io]
 * @returns {void}
 */
export function cliMain(io = {}) {
  const env = io.env ?? process.env;
  const exit = io.exit ?? ((code) => process.exit(code));
  const forced = env["FORCE_ROOT"];
  const roots = forced !== undefined ? [forced] : DEFAULT_ROOTS;
  let aggregateExit = 0;
  for (const root of roots) {
    const { exitCode } = main(root);
    if (exitCode !== 0) aggregateExit = 1;
  }
  exit(/** @type {0 | 1} */ (aggregateExit));
}

/**
 * True when this script is being executed as a CLI (`node verify-...mjs`).
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
 * Wrapped CLI dispatcher — computes the guard + fires the CLI in one
 * place so both branches are reachable from the test suite.
 *
 * @param {{
 *   importMetaUrl: string,
 *   argv1: string | undefined,
 *   env?: Record<string, string | undefined>,
 *   exit?: (code: number) => void,
 * }} io
 * @returns {boolean}
 */
export function maybeRunCli(io) {
  if (!isCliInvocation(io.importMetaUrl, io.argv1)) return false;
  cliMain({ env: io.env, exit: io.exit });
  return true;
}

// Module-load CLI gate. Imports during the test run see argv1 pointing
// at vitest, so `maybeRunCli` short-circuits. Direct invocations satisfy
// the predicate and fire cliMain.
maybeRunCli({ importMetaUrl: import.meta.url, argv1: process.argv[1] });
