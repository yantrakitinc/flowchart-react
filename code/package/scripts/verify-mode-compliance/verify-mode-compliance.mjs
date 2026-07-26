#!/usr/bin/env node
// Scope-aware + parallel verify orchestrator.
//
// Aggregate runner for the standards-compliance verification scripts. Exits 0 only
// when every individual script that ran exited 0.
//
// Modes:
//   pnpm verify           — every Phase-1 script in parallel (capped pool)
//                           followed by the Phase-2 writers in sequence.
//   pnpm verify --scope   — same orchestration, but each script's
//                           "territory" is intersected with the list of
//                           changed paths (vs origin/master). Scripts whose
//                           territory is disjoint are skipped with a one
//                           line reason.
//   pnpm verify:full      — adds the slow git-history-based freshness gate
//                           to Phase 1.
//
// Constraints:
//   - Zero external dependencies (no p-limit). The worker pool is ~30
//     lines of plain Node below.
//   - Per-script behaviour is unchanged — only the orchestration is new.
//   - Output is buffered per-script and replayed in deterministic order
//     after each phase so the operator never sees interleaved logs.

import { spawn as childSpawn } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { getChangedPaths } from "../lib/changed-paths.mjs";

const __filename = fileURLToPath(import.meta.url);
const SCRIPT_DIR = dirname(__filename);
const ROOT = resolve(SCRIPT_DIR, "..", "..");

// ---------- script catalog -------------------------------------------

/**
 * @typedef {object} iScriptEntry
 * @property {string} id              short identifier for logs/skip lines
 * @property {string} script          path relative to ROOT
 * @property {boolean} importTsx      run with `node --import tsx`?
 * @property {"phase1" | "phase2"} phase  phase1 = read-only/parallel; phase2 = writer/sequential
 * @property {boolean} fullOnly       only run in --full mode
 * @property {(changed: ReadonlyArray<string>) => boolean} territory
 *   Predicate: does any changed path live in this script's territory?
 *   Receives an array of absolute paths. Must return true when at least
 *   one path matches. When `--scope` is NOT set, the territory is
 *   ignored and every entry runs.
 */

/**
 * Catalog. Order matters — Phase-1 entries run in a pool but their
 * BUFFERED OUTPUT is replayed in this order, and Phase-2 entries run
 * sequentially in this order.
 *
 * @type {ReadonlyArray<iScriptEntry>}
 */
export const SCRIPTS = [
  {
    id: "verify-flow-coverage",
    script: "scripts/verify-flow-coverage/verify-flow-coverage.mjs",
    importTsx: false,
    phase: "phase1",
    fullOnly: false,
    territory: (changed) =>
      changed.some((p) => p.endsWith("spec.yaml") || /\/src\/.*\.tsx?$/.test(p)),
  },
  {
    id: "verify-docs",
    script: "scripts/verify-docs/verify-docs.mjs",
    importTsx: false,
    phase: "phase1",
    fullOnly: false,
    territory: (changed) => changed.some((p) => p.includes("/__specs__/")),
  },
  {
    id: "verify-no-stray-scaffolding",
    script: "scripts/verify-no-stray-scaffolding/verify-no-stray-scaffolding.mjs",
    importTsx: false,
    phase: "phase1",
    fullOnly: false,
    territory: (changed) => changed.some((p) => p.includes("/src/")),
  },
  {
    id: "verify-setup-headers",
    script: "scripts/verify-setup-headers/verify-setup-headers.mjs",
    importTsx: false,
    phase: "phase1",
    fullOnly: false,
    territory: (changed) => changed.some((p) => /\/src\/.*\.tsx?$/.test(p)),
  },
  {
    id: "verify-manual-playbooks",
    script: "scripts/verify-manual-playbooks/verify-manual-playbooks.mjs",
    importTsx: false,
    phase: "phase1",
    fullOnly: false,
    territory: (changed) => changed.some((p) => p.includes("/__specs__/manual/")),
  },
  {
    id: "verify-no-server-imports",
    script: "scripts/verify-no-server-imports/verify-no-server-imports.mjs",
    importTsx: false,
    phase: "phase1",
    fullOnly: false,
    // Always — G-FRONTEND-BOUNDARY (frontend never imports server/)
    // is non-overridable and covers every source file.
    territory: () => true,
  },
  {
    id: "verify-ui-components-compliance",
    script: "scripts/verify-ui-components-compliance/verify-ui-components-compliance.mjs",
    importTsx: false,
    phase: "phase1",
    fullOnly: false,
    // Always — COMPONENT_FOLDERS.yaml + COMPONENT_LIBRARY_DOCTRINE.yaml compliance (folder shape, semantic
    // tokens, component placement) is non-overridable and any change
    // can introduce a new violation. Fast ( < 1s ) so always-on.
    territory: () => true,
  },
  {
    id: "verify-standards-compliance",
    script: "scripts/verify/verify-standards-compliance.mjs",
    importTsx: false,
    phase: "phase1",
    fullOnly: false,
    territory: (changed) => changed.some((p) => p.includes("/__specs__/")),
  },
  {
    id: "verify-source-coverage",
    script: "scripts/verify/verify-source-coverage.mjs",
    importTsx: false,
    phase: "phase1",
    fullOnly: false,
    // Always — the source-coverage gate guards the whole codebase against
    // orphan files; any change at all can introduce a coverage gap.
    territory: () => true,
  },
  {
    id: "verify-no-padding-folders",
    script: "scripts/verify/verify-no-padding-folders.mjs",
    importTsx: false,
    phase: "phase1",
    fullOnly: false,
    territory: (changed) => changed.some((p) => p.includes("/src/features/")),
  },
  {
    id: "verify-standards-freshness",
    script: "scripts/verify-standards-freshness/verify-standards-freshness.mjs",
    importTsx: false,
    phase: "phase1",
    fullOnly: true,
    territory: (changed) => changed.some((p) => p.includes("/__specs__/")),
  },
  {
    id: "verify-no-history-baked-in",
    script: "../.claude/standards/scripts/verify-no-history-baked-in.mjs",
    importTsx: false,
    phase: "phase1",
    fullOnly: false,
    // Always — scans .claude/agents/ + .claude/standards/, which sit outside
    // code/web's cwd-scoped git diff. Predicate cannot rely on `changed`
    // to know whether those trees moved. Fast (~50ms) so always-on is fine.
    territory: () => true,
  },
  // Phase 2 writers (aggregate-permissions, generate-agents-json) are
  // intentionally omitted in `frontend/` — the BE owns permissions; the
  // agents.json generator is a future port. Frontend verify chain is
  // read-only by design.
];

// ---------- args parsing ---------------------------------------------

/**
 * @param {ReadonlyArray<string>} argv
 * @returns {{ full: boolean, scope: boolean }}
 */
export function parseArgs(argv) {
  return {
    full: argv.includes("--full"),
    scope: argv.includes("--scope"),
  };
}

// ---------- per-script execution -------------------------------------

/**
 * Default per-script timeout. Most scripts complete in under a minute;
 * `verify-eslint-permission-rules` is the slow outlier (spawns 32 eslint
 * fixture compilations). 10 minutes covers the slow outlier under
 * parallel-pool CPU contention. Hanging scripts get SIGTERM, then
 * SIGKILL 5 seconds later.
 */
export const DEFAULT_PER_SCRIPT_TIMEOUT_MS = 10 * 60 * 1000;

/**
 * Default IO port: spawns a child process via `node:child_process` and
 * resolves with the exit status + captured stdout + stderr. Stdio is
 * fully captured (not inherited) so the orchestrator can replay each
 * script's output in deterministic order.
 *
 * Enforces a per-script wall-clock timeout (default
 * `DEFAULT_PER_SCRIPT_TIMEOUT_MS`). On timeout the child is SIGTERM'd;
 * if it doesn't exit within 5s, SIGKILL'd. The returned status is
 * `124` (the conventional Unix "timeout" exit) so the orchestrator's
 * failure path reports a clear cause.
 *
 * @param {{ execPath: string, args: ReadonlyArray<string>, cwd: string }} cmd
 * @param {{ timeoutMs?: number, spawn?: typeof childSpawn, killTimeoutMs?: number }} [options]
 * @returns {Promise<{ status: number, stdout: string, stderr: string }>}
 */
export function defaultRunChild(cmd, options = {}) {
  const timeoutMs = options.timeoutMs ?? DEFAULT_PER_SCRIPT_TIMEOUT_MS;
  const spawn = options.spawn ?? childSpawn;
  const killTimeoutMs = options.killTimeoutMs ?? 5_000;
  return new Promise((resolveP) => {
    const child = spawn(cmd.execPath, cmd.args, {
      cwd: cmd.cwd,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const t = setTimeout(() => {
      timedOut = true;
      child.kill("SIGTERM");
      const killer = setTimeout(() => child.kill("SIGKILL"), killTimeoutMs);
      killer.unref();
    }, timeoutMs);
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (err) => {
      clearTimeout(t);
      resolveP({
        status: 1,
        stdout,
        stderr: `${stderr}orchestrator: spawn error — ${err.message}\n`,
      });
    });
    child.on("close", (code) => {
      clearTimeout(t);
      if (timedOut) {
        resolveP({
          status: 124,
          stdout,
          stderr: `${stderr}orchestrator: script timed out after ${String(timeoutMs)}ms (SIGTERM sent)\n`,
        });
        return;
      }
      resolveP({ status: code ?? 0, stdout, stderr });
    });
  });
}

/**
 * Build the argv for a single script entry.
 *
 * @param {iScriptEntry} entry
 * @param {string} rootDir absolute root
 * @returns {{ execPath: string, args: string[], cwd: string }}
 */
export function buildCommand(entry, rootDir) {
  const full = join(rootDir, entry.script);
  const args = entry.importTsx ? ["--import", "tsx", full] : [full];
  return { execPath: process.execPath, args, cwd: rootDir };
}

/**
 * Run one script. Always resolves (never rejects). The result carries
 * the entry, the captured streams, the exit status, and the wall-clock
 * duration in milliseconds.
 *
 * @param {iScriptEntry} entry
 * @param {{
 *   rootDir?: string,
 *   runChild?: typeof defaultRunChild,
 *   now?: () => number,
 * }} [io]
 * @returns {Promise<{ entry: iScriptEntry, status: number, stdout: string, stderr: string, ms: number }>}
 */
export async function runOne(entry, io = {}) {
  const rootDir = io.rootDir ?? ROOT;
  const runChild = io.runChild ?? defaultRunChild;
  const now = io.now ?? (() => Date.now());
  const cmd = buildCommand(entry, rootDir);
  const started = now();
  const res = await runChild(cmd);
  const ms = now() - started;
  return { entry, status: res.status, stdout: res.stdout, stderr: res.stderr, ms };
}

// ---------- worker pool ----------------------------------------------

/**
 * Capped-concurrency runner. Preserves input order in the returned
 * array. ~30 lines, no external dep.
 *
 * @template T, R
 * @param {ReadonlyArray<T>} items
 * @param {(item: T) => Promise<R>} worker
 * @param {number} concurrency
 * @returns {Promise<R[]>}
 */
export async function runInPool(items, worker, concurrency) {
  const cap = Math.max(1, Math.min(concurrency, items.length));
  /** @type {R[]} */
  const results = new Array(items.length);
  let cursor = 0;
  /** @returns {Promise<void>} */
  async function next() {
    while (true) {
      const idx = cursor;
      cursor += 1;
      if (idx >= items.length) return;
      results[idx] = await worker(items[idx]);
    }
  }
  const workers = [];
  for (let i = 0; i < cap; i += 1) workers.push(next());
  await Promise.all(workers);
  return results;
}

// ---------- scope filtering ------------------------------------------

/**
 * Filter the catalog for a given mode. Returns the entries that should
 * actually run plus a parallel list of skip-reasons (for the entries
 * that were filtered out).
 *
 * @param {{ full: boolean, scope: boolean }} mode
 * @param {ReadonlyArray<string>} changed   absolute paths
 * @param {ReadonlyArray<iScriptEntry>} catalog
 * @returns {{
 *   toRun: iScriptEntry[],
 *   skipped: Array<{ entry: iScriptEntry, reason: string }>,
 * }}
 */
export function planRun(mode, changed, catalog) {
  /** @type {iScriptEntry[]} */
  const toRun = [];
  /** @type {Array<{ entry: iScriptEntry, reason: string }>} */
  const skipped = [];
  for (const entry of catalog) {
    if (entry.fullOnly && !mode.full) {
      skipped.push({ entry, reason: "fullOnly — only runs in --full mode" });
      continue;
    }
    if (mode.scope) {
      if (!entry.territory(changed)) {
        skipped.push({ entry, reason: "no changed paths in territory" });
        continue;
      }
    }
    toRun.push(entry);
  }
  return { toRun, skipped };
}

// ---------- output replay --------------------------------------------

/**
 * Replay buffered output for an ordered list of script results. Each
 * result's stdout precedes its stderr; no interleaving between results.
 *
 * @param {ReadonlyArray<{ entry: iScriptEntry, status: number, stdout: string, stderr: string, ms: number }>} results
 * @param {(s: string) => void} write
 * @param {(s: string) => void} writeErr
 */
export function replayResults(results, write, writeErr) {
  for (const r of results) {
    if (r.stdout) write(r.stdout);
    if (r.stderr) writeErr(r.stderr);
  }
}

// ---------- main ------------------------------------------------------

/**
 * @typedef {object} iMainIo
 * @property {ReadonlyArray<string>} [argv]
 * @property {string} [rootDir]
 * @property {ReadonlyArray<iScriptEntry>} [catalog]
 * @property {(item: iScriptEntry) => Promise<{ entry: iScriptEntry, status: number, stdout: string, stderr: string, ms: number }>} [runEntry]
 * @property {number} [concurrency]
 * @property {(baseRef?: string) => string[]} [getChanged]
 * @property {(s: string) => void} [write]
 * @property {(s: string) => void} [writeErr]
 * @property {() => number} [now]
 */

/**
 * Composition root for the orchestrator. Wires arg parsing, scope
 * planning, parallel/sequential phases, output replay, and the
 * aggregate result line. Resolves with an exit code.
 *
 * @param {iMainIo} [io]
 * @returns {Promise<{ exitCode: 0 | 1 }>}
 */
/**
 * Default `getChanged` port — delegates to {@link getChangedPaths} bound
 * to `rootDir`. Extracted so the `io.getChanged ?? defaultGetChanged(...)`
 * branch has a named function whose coverage is independent of `main`'s
 * full execution.
 *
 * @param {string} rootDir
 * @returns {(baseRef?: string) => string[]}
 */
export function defaultGetChanged(rootDir) {
  return (baseRef) => getChangedPaths(baseRef, { cwd: rootDir });
}

/**
 * Default `runEntry` port — delegates to {@link runOne} bound to
 * `rootDir` + `now`. Extracted so the `io.runEntry ?? defaultRunEntry(...)`
 * branch has a named function whose coverage is independent of `main`'s
 * full execution.
 *
 * @param {string} rootDir
 * @param {() => number} now
 * @returns {(entry: iScriptEntry) => Promise<{ entry: iScriptEntry, status: number, stdout: string, stderr: string, ms: number }>}
 */
export function defaultRunEntry(rootDir, now) {
  return (entry) => runOne(entry, { rootDir, now });
}

export async function main(io = {}) {
  const argv = io.argv ?? process.argv.slice(2);
  const rootDir = io.rootDir ?? ROOT;
  const catalog = io.catalog ?? SCRIPTS;
  const concurrency = io.concurrency ?? 6;
  const write = io.write ?? ((s) => process.stdout.write(s));
  const writeErr = io.writeErr ?? ((s) => process.stderr.write(s));
  const now = io.now ?? (() => Date.now());
  const getChanged = io.getChanged ?? defaultGetChanged(rootDir);
  const runEntry = io.runEntry ?? defaultRunEntry(rootDir, now);

  const parsed = parseArgs(argv);

  /** @type {string[]} */
  let changed = [];
  let effectiveScope = parsed.scope;
  if (parsed.scope) {
    changed = getChanged("origin/master");
    if (changed.length === 0) {
      writeErr(
        "verify-mode-compliance: --scope requested but no changed paths detected (git missing, no upstream, or working tree matches origin/master). Falling back to a full run.\n",
      );
      effectiveScope = false;
    }
  }

  // Effective mode after the scope-fallback. `parsed` is left intact so
  // tests + future consumers can introspect the original argv intent.
  const effectiveMode = { full: parsed.full, scope: effectiveScope };

  const { toRun, skipped } = planRun(effectiveMode, changed, catalog);

  // Emit skip notices upfront, in catalog order. ALL skips are shown
  // — including structural `fullOnly` skips in default mode — so the
  // operator always sees the full picture of what ran vs what didn't.
  for (const s of skipped) {
    write(`verify-mode-compliance: SKIP ${s.entry.id} (${s.reason})\n`);
  }

  const phase1 = toRun.filter((e) => e.phase === "phase1");
  const phase2 = toRun.filter((e) => e.phase === "phase2");

  const startedAt = now();

  // ---- Phase 1: parallel pool ----
  const phase1Results = await runInPool(phase1, runEntry, concurrency);
  replayResults(phase1Results, write, writeErr);

  const phase1Failed = phase1Results.some((r) => r.status !== 0);

  // ---- Phase 2: sequential writers ----
  // Gated on Phase 1 success. If any read-only check failed, do NOT
  // regenerate the write-phase artifacts (aggregate-permissions manifest,
  // public/agents.json) — they'd be written from potentially-bad input,
  // committing stale or corrupt artifacts. Phase 2 entries are reported
  // as skipped in the aggregate report.
  /** @type {Awaited<ReturnType<typeof runEntry>>[]} */
  const phase2Results = [];
  /** @type {iScriptEntry[]} */
  const phase2Skipped = [];
  if (phase1Failed) {
    if (phase2.length > 0) {
      writeErr(
        `verify-mode-compliance: Phase 1 failed — skipping ${String(phase2.length)} Phase-2 writer(s) to avoid committing stale artifacts\n`,
      );
      for (const entry of phase2) {
        phase2Skipped.push(entry);
      }
    }
  } else {
    for (const entry of phase2) {
      const r = await runEntry(entry);
      phase2Results.push(r);
    }
    replayResults(phase2Results, write, writeErr);
  }

  const totalMs = now() - startedAt;
  const allResults = [...phase1Results, ...phase2Results];
  const failures = allResults.filter((r) => r.status !== 0);

  if (failures.length > 0) {
    const lines = [
      `verify-mode-compliance: ${String(failures.length)} script(s) failed (of ${String(allResults.length)} that ran)`,
    ];
    for (const f of failures) {
      lines.push(`  FAIL: ${f.entry.id} (exit ${String(f.status)})`);
    }
    if (phase2Skipped.length > 0) {
      lines.push(
        `  Phase-2 SKIPPED (gated on Phase-1 success): ${phase2Skipped.map((e) => e.id).join(", ")}`,
      );
    }
    writeErr(`${lines.join("\n")}\n`);
    return { exitCode: 1 };
  }

  const suffix = buildSuffix(
    effectiveMode,
    allResults.length,
    skipped.length,
    totalMs,
  );
  write(`verify-mode-compliance${suffix}\n`);
  return { exitCode: 0 };
}

/**
 * Build the success-line suffix. Kept out-of-line so each branch is
 * directly unit-testable.
 *
 * @param {{ full: boolean, scope: boolean }} mode
 * @param {number} ran
 * @param {number} skipped
 * @param {number} totalMs
 * @returns {string}
 */
export function buildSuffix(mode, ran, skipped, totalMs) {
  const seconds = (totalMs / 1000).toFixed(1);
  if (mode.scope) {
    return ` (scoped): OK (${String(ran)} of ${String(ran + skipped)} scripts ran, ${String(skipped)} skipped) in ${seconds}s`;
  }
  if (mode.full) {
    return ` (full): OK (all ${String(ran)} scripts passed) in ${seconds}s`;
  }
  return `: OK (all ${String(ran)} scripts passed) in ${seconds}s`;
}

// ---------- CLI wiring -----------------------------------------------

/**
 * CLI entry — exported so the test suite can drive it without spawning
 * a child process. The `main` port is injectable so tests can swap in a
 * lightweight composition root; alternatively, `mainIo` is forwarded
 * directly into the default `main` so tests can exercise the default
 * fallback against a benign catalog.
 *
 * @param {{
 *   exit?: (code: number) => void,
 *   runMain?: () => Promise<{ exitCode: 0 | 1 }>,
 *   mainIo?: iMainIo,
 * }} [io]
 * @returns {Promise<void>}
 */
export async function cliMain(io = {}) {
  const exit = io.exit ?? ((code) => process.exit(code));
  const mainIo = io.mainIo ?? {};
  const runMain = io.runMain ?? (() => main(mainIo));
  const { exitCode } = await runMain();
  exit(exitCode);
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
 *   runMain?: () => Promise<{ exitCode: 0 | 1 }>,
 * }} io
 * @returns {Promise<boolean>} true when cliMain was invoked
 */
export async function maybeRunCli(io) {
  if (!isCliInvocation(io.importMetaUrl, io.argv1)) return false;
  await cliMain({ exit: io.exit, runMain: io.runMain });
  return true;
}

await maybeRunCli({ importMetaUrl: import.meta.url, argv1: process.argv[1] });
