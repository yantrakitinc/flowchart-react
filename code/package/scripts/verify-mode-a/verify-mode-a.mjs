#!/usr/bin/env node
// Mode A — slice-on-commit verifier.
//
// Targeted verification of a single slice. Invoked by the verifier agent
// at the end of every slice. Stamps the slice's standards-compliance.yaml
// lock on green.
//
// Usage:
//   node scripts/verify-mode-a/verify-mode-a.mjs <slice-path>
//
// Steps:
//   1. Validate slice path + __specs__/ presence
//   2. Compute blast radius (slice sources/tests + callers + callees + caller-tests)
//   3. Run targeted vitest on slice tests + caller tests
//   4. Run eslint scoped to <slice>/ + callers
//   5. Run typecheck (project-wide; tsc doesn't scope cleanly)
//   6. Apply PRIMARY RULE boundary greps inside the slice
//   7. Read + shape-check the slice's standards-compliance.yaml
//   8. On all-green: stamp the lock (last_validated = now)
//   9. Emit a structured report; exit 0 on SHIPPABLE, 1 otherwise

import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { blastRadius } from "../lib/blast-radius.mjs";

const __filename = fileURLToPath(import.meta.url);
const SCRIPT_DIR = dirname(__filename);
const ROOT = resolve(SCRIPT_DIR, "..", "..");

/** @typedef {{ name: string, status: "PASS" | "FAIL" | "SKIP", detail: string }} iGateResult */

/**
 * @param {string} folder absolute slice path
 * @returns {boolean}
 */
export function hasSpecsFolder(folder) {
  return existsSync(join(folder, "__specs__"));
}

/**
 * @param {string} folder
 * @returns {boolean}
 */
export function hasTestsFolder(folder) {
  return existsSync(join(folder, "__tests__"));
}

/**
 * Run vitest scoped to the slice's __tests__/ plus any caller tests in
 * the blast radius. If the slice has no tests AND no callers, skip.
 *
 * @param {string} sliceAbs
 * @param {{ sliceTests?: string[], callerTests?: string[], spawn: typeof spawnSync, cwd?: string }} io
 * @returns {iGateResult}
 */
export function runScopedVitest(sliceAbs, io) {
  const { spawn } = io;
  const cwd = io.cwd ?? ROOT;
  /** @type {string[]} */
  const testPaths = [];
  if (io.sliceTests && io.sliceTests.length > 0) {
    testPaths.push(...io.sliceTests);
  } else if (hasTestsFolder(sliceAbs)) {
    testPaths.push(join(sliceAbs, "__tests__"));
  }
  if (io.callerTests && io.callerTests.length > 0) {
    testPaths.push(...io.callerTests);
  }
  if (testPaths.length === 0) {
    return {
      name: "vitest (slice + caller tests)",
      status: "SKIP",
      detail: `no tests in slice or blast radius of ${relative(ROOT, sliceAbs) || "slice"}`,
    };
  }
  const res = spawn("pnpm", ["vitest", "run", ...testPaths], {
    cwd,
    encoding: "utf8",
  });
  if (res.error) {
    return {
      name: "vitest (slice + caller tests)",
      status: "FAIL",
      detail: `spawn error: ${res.error.message}`,
    };
  }
  return {
    name: "vitest (slice + caller tests)",
    status: res.status === 0 ? "PASS" : "FAIL",
    detail: res.status === 0
      ? `${String(testPaths.length)} test path(s) passed`
      : (res.stdout ?? "") + (res.stderr ?? ""),
  };
}

/**
 * Run eslint scoped to the slice plus the callers in its blast radius.
 *
 * @param {string} sliceAbs
 * @param {{ callers?: string[], spawn: typeof spawnSync, cwd?: string }} io
 * @returns {iGateResult}
 */
export function runScopedLint(sliceAbs, io) {
  const { spawn } = io;
  const cwd = io.cwd ?? ROOT;
  const args = ["eslint", sliceAbs, ...(io.callers ?? [])];
  const res = spawn("pnpm", args, { cwd, encoding: "utf8" });
  if (res.error) {
    return {
      name: "eslint (slice + callers)",
      status: "FAIL",
      detail: `spawn error: ${res.error.message}`,
    };
  }
  return {
    name: "eslint (slice + callers)",
    status: res.status === 0 ? "PASS" : "FAIL",
    detail: res.status === 0
      ? `slice + ${String(io.callers?.length ?? 0)} caller(s) clean`
      : (res.stdout ?? "") + (res.stderr ?? ""),
  };
}

/**
 * Run project-wide typecheck. Can't be scoped to a slice — tsc walks the
 * whole project graph.
 *
 * @param {{ spawn: typeof spawnSync, cwd?: string }} io
 * @returns {iGateResult}
 */
export function runTypecheck(io) {
  const { spawn } = io;
  const cwd = io.cwd ?? ROOT;
  const res = spawn("pnpm", ["typecheck"], { cwd, encoding: "utf8" });
  if (res.error) {
    return {
      name: "typecheck (project-wide)",
      status: "FAIL",
      detail: `spawn error: ${res.error.message}`,
    };
  }
  return {
    name: "typecheck (project-wide)",
    status: res.status === 0 ? "PASS" : "FAIL",
    detail: res.status === 0 ? "tsc clean" : (res.stdout ?? "") + (res.stderr ?? ""),
  };
}

/**
 * Drop `grep -rn` output lines whose content (the substring after
 * `<path>:<lineno>:`) is a comment — JSDoc (`*`, `*/`, `/*`) or single-line
 * (`//`) with optional leading whitespace. Comments mentioning forbidden
 * literals are documentation, not violations.
 *
 * The line shape from `grep -rn` is `<path>:<lineno>:<content>`. Filenames
 * never contain `:`, and `<lineno>` is digits-only, so we split on the
 * second `:` (the boundary between line number and content).
 *
 * @param {string} stdout raw grep output (multi-line)
 * @returns {string} filtered output (kept lines joined with \n), trimmed
 */
export function dropCommentLines(stdout) {
  if (!stdout) return "";
  /** @type {string[]} */
  const kept = [];
  for (const line of stdout.split(/\r?\n/)) {
    if (line === "") continue;
    // Split on the first two `:` — path : lineno : content
    const firstColon = line.indexOf(":");
    if (firstColon < 0) {
      kept.push(line);
      continue;
    }
    const secondColon = line.indexOf(":", firstColon + 1);
    if (secondColon < 0) {
      kept.push(line);
      continue;
    }
    const content = line.slice(secondColon + 1);
    // Strip leading whitespace; treat lines starting with comment markers as comments.
    const trimmed = content.replace(/^\s+/, "");
    if (
      trimmed.startsWith("*/") ||
      trimmed.startsWith("/*") ||
      trimmed.startsWith("//") ||
      trimmed.startsWith("*")
    ) {
      continue;
    }
    kept.push(line);
  }
  return kept.join("\n");
}

/**
 * Build the PRIMARY RULE grep boundary check configs scoped to `sliceAbs`.
 * Exported so tests can assert the per-grep `filterComments` flag without
 * having to monkey-patch the spawn used inside {@link runBoundaryGreps}.
 *
 * Comment-line post-filter (`filterComments`) is per-grep:
 *   - `direct DB-driver imports`     → `true`  (mentions in JSDoc are documentation)
 *   - `@ts-ignore / @ts-expect-error` → `false` (the directive IS a `//` comment by language design; filtering would neutralize the gate)
 *   - `AuthorizedPrincipal cast`     → `true`  (mentions in JSDoc are documentation)
 *
 * The DB-driver pattern matches actual import statements only — `from
 * "drizzle-orm"`, `from "drizzle-orm/postgres-js/migrator"`, `from
 * "postgres-js"`, `from "postgres"`, `from "pg"`. It deliberately does NOT
 * match `from "@/db/..."` (the typed boundary composition roots are
 * supposed to use) or bare identifier usage like `getDb()` /
 * `drizzleHandle`. The rule from `AUTHORIZATION_STANDARDS.yaml` is about
 * DB-driver imports, not function-name usage of the typed boundary.
 *
 * @param {string} sliceAbs
 * @returns {Array<{ desc: string, args: string[], filterComments: boolean }>}
 */
export function buildBoundaryGrepChecks(sliceAbs) {
  return [
    {
      desc: "direct DB-driver imports outside src/db/",
      args: [
        "-rn",
        "-E",
        "from\\s+['\"](drizzle-orm|postgres-js|postgres|pg)([/'\"])",
        sliceAbs,
        "--include=*.ts",
        "--exclude-dir=__tests__",
      ],
      filterComments: true,
    },
    {
      desc: "@ts-ignore / @ts-expect-error outside __tests__/",
      args: ["-rn", "-E", "@ts-ignore|@ts-expect-error", sliceAbs, "--include=*.ts", "--exclude-dir=__tests__"],
      // The directive IS a `// @ts-(ignore|expect-error)` comment by language
      // design. Filtering comment lines here would neutralize the gate.
      filterComments: false,
    },
    {
      desc: "AuthorizedPrincipal cast bypass",
      args: ["-rn", "-E", "as AuthorizedPrincipal|as unknown as AuthorizedPrincipal", sliceAbs, "--include=*.ts", "--exclude-dir=__tests__"],
      filterComments: true,
    },
  ];
}

/**
 * Apply the PRIMARY RULE grep boundary checks scoped to the slice. Each
 * check must return zero hits inside the slice. All three greps exclude
 * `__tests__/` (test files legitimately exercise these tokens).
 *
 * See {@link buildBoundaryGrepChecks} for the per-grep `filterComments` setting.
 *
 * Allowances:
 *   - direct DB-driver imports permitted inside `src/db/` (the canonical
 *     DB-access location — drizzle-orm / postgres / pg legitimately live here)
 *   - `as AuthorizedPrincipal` permitted inside `src/lib/authz/mint/` (the
 *     canonical brand-entry location; the cast IS the sanctioned bypass)
 *
 * @param {string} sliceAbs
 * @param {{ spawn: typeof spawnSync }} io
 * @returns {iGateResult}
 */
export function runBoundaryGreps(sliceAbs, io) {
  const { spawn } = io;
  /** @type {Array<{ desc: string, args: string[], filterComments: boolean }>} */
  const checks = buildBoundaryGrepChecks(sliceAbs);
  /** @type {string[]} */
  const offenders = [];
  const sliceRel = relative(ROOT, sliceAbs);
  const fileInDbFolder = (f) => /(^|\/)db\//.test(f);
  const isDbSlice = sliceRel.startsWith("src/db/") || sliceRel === "src/db" || sliceRel.includes("/db/") || sliceRel.endsWith("/db");
  const isMintSlice =
    sliceRel.startsWith("src/lib/authz/mint") || sliceRel.includes("/lib/authz/mint");
  for (const c of checks) {
    const res = spawn("grep", c.args, { encoding: "utf8" });
    if (res.error) continue;
    // grep exit 1 = no matches (good); exit 0 = matches found
    const allowDbDriverImport = c.desc.includes("DB-driver imports") && isDbSlice;
    const allowCast = c.desc.includes("AuthorizedPrincipal cast") && isMintSlice;
    if (res.status === 0 && !allowDbDriverImport && !allowCast) {
      const raw = res.stdout ?? "";
      const filtered = c.filterComments ? dropCommentLines(raw) : raw.replace(/\s+$/, "");
      if (filtered !== "") {
        offenders.push(`${c.desc}:\n${filtered}`);
      }
    }
  }
  if (offenders.length === 0) {
    return {
      name: "PRIMARY RULE boundary greps",
      status: "PASS",
      detail: "no forbidden patterns in slice",
    };
  }
  return {
    name: "PRIMARY RULE boundary greps",
    status: "FAIL",
    detail: offenders.join("\n\n"),
  };
}

/**
 * Read + shape-check the slice's standards-compliance.yaml lock.
 *
 * @param {string} sliceAbs
 * @param {{ readFile?: (p: string) => string }} [io]
 * @returns {iGateResult & { lockPath?: string, lastValidatedMs?: number }}
 */
export function checkLockShape(sliceAbs, io = {}) {
  const readFile = io.readFile ?? ((p) => readFileSync(p, "utf8"));
  const lockPath = join(sliceAbs, "__specs__", "standards-compliance.yaml");
  if (!existsSync(lockPath)) {
    return {
      name: "lock shape",
      status: "FAIL",
      detail: `no lock file at ${lockPath}`,
    };
  }
  /** @type {string} */
  let contents;
  try {
    contents = readFile(lockPath);
  } catch (err) {
    return {
      name: "lock shape",
      status: "FAIL",
      detail: `cannot read lock: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
  /** @type {Record<string, string>} */
  const fields = {};
  for (const line of contents.split(/\r?\n/)) {
    const m = line.match(/^([a-z_]+):\s*(.*)$/);
    if (m) {
      const [, k, vRaw] = m;
      const v = vRaw.replace(/^["']|["']$/g, "").trim();
      fields[k] = v;
    }
  }
  if (fields["status"] !== "locked") {
    return {
      name: "lock shape",
      status: "FAIL",
      detail: `status='${fields["status"] ?? ""}'; expected 'locked'`,
    };
  }
  if (fields["verified"] !== "100%") {
    return {
      name: "lock shape",
      status: "FAIL",
      detail: `verified='${fields["verified"] ?? ""}'; expected '100%'`,
    };
  }
  const stamp = fields["last_validated"] ?? "";
  const iso = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?Z$/;
  if (!iso.test(stamp)) {
    return {
      name: "lock shape",
      status: "FAIL",
      detail: `last_validated='${stamp}'; expected ISO-8601 UTC`,
    };
  }
  const ms = Date.parse(stamp);
  if (Number.isNaN(ms)) {
    return {
      name: "lock shape",
      status: "FAIL",
      detail: `last_validated='${stamp}' did not parse`,
    };
  }
  return {
    name: "lock shape",
    status: "PASS",
    detail: `locked + 100% + last_validated=${stamp}`,
    lockPath,
    lastValidatedMs: ms,
  };
}

/**
 * Flip the lock's `status:` field to `unlocked`. Used at the start of Mode A
 * before running gates. Interrupt mid-gates leaves the slice unlocked — that's
 * the correct signal that the slice was not re-validated.
 *
 * @param {string} lockPath
 * @param {{ readFile?: (p: string) => string, writeFile?: (p: string, c: string) => void }} [io]
 * @returns {void}
 */
export function unlockLock(lockPath, io = {}) {
  const readFile = io.readFile ?? ((p) => readFileSync(p, "utf8"));
  const writeFile = io.writeFile ?? ((p, c) => writeFileSync(p, c, "utf8"));
  const contents = readFile(lockPath);
  const next = contents.replace(/^status:\s*.*$/m, "status: unlocked");
  writeFile(lockPath, next);
}

/**
 * Stamp the lock with the current UTC time AND flip `status:` → `locked`.
 * Called by Mode A on a successful gate pass — completes the unlock→relock
 * state machine. `verified:` is normalized to `"100%"`.
 *
 * @param {string} lockPath
 * @param {{ readFile?: (p: string) => string, writeFile?: (p: string, c: string) => void, now?: () => Date }} [io]
 * @returns {string} the new last_validated value
 */
export function stampLock(lockPath, io = {}) {
  const readFile = io.readFile ?? ((p) => readFileSync(p, "utf8"));
  const writeFile = io.writeFile ?? ((p, c) => writeFileSync(p, c, "utf8"));
  const now = io.now ?? (() => new Date());
  const iso = now().toISOString().replace(/\.\d+Z$/, "Z");
  const contents = readFile(lockPath);
  let next = contents.replace(/^status:\s*.*$/m, "status: locked");
  next = next.replace(/^verified:\s*.*$/m, 'verified: "100%"');
  next = next.replace(/^last_validated:\s*.*$/m, `last_validated: ${iso}`);
  writeFile(lockPath, next);
  return iso;
}

/**
 * @param {Array<iGateResult>} results
 * @param {string} sliceRel
 * @param {string | null} stampedIso
 * @returns {string}
 */
export function formatReport(results, sliceRel, stampedIso) {
  const lines = [`# Mode A — slice: ${sliceRel}`, ""];
  for (const r of results) {
    lines.push(`- ${r.name}: ${r.status}`);
    if (r.status !== "PASS") {
      lines.push(`    detail: ${r.detail.split("\n").slice(0, 5).join("\n             ")}`);
    }
  }
  const failed = results.some((r) => r.status === "FAIL");
  lines.push("");
  lines.push(`Verdict: ${failed ? "NOT SHIPPABLE" : "SHIPPABLE"}`);
  if (!failed && stampedIso) {
    lines.push(`Lock stamped: last_validated = ${stampedIso}`);
  }
  return lines.join("\n");
}

/**
 * @param {string} slicePath relative or absolute
 * @param {{
 *   rootDir?: string,
 *   skipTypecheck?: boolean,
 *   skipStamp?: boolean,
 *   spawn?: typeof spawnSync,
 *   readFile?: (p: string) => string,
 *   writeFile?: (p: string, c: string) => void,
 *   now?: () => Date,
 *   write?: (s: string) => void,
 * }} [io]
 * @returns {{ exitCode: 0 | 1, results: iGateResult[], stampedIso: string | null }}
 */
export function main(slicePath, io = {}) {
  const rootDir = io.rootDir ?? ROOT;
  const write = io.write ?? ((s) => process.stdout.write(s));
  // Single default-spawn boundary for the whole orchestrator: the
  // gates below are now spawn-required (no per-gate `?? spawnSync`),
  // so all PATH lookups funnel through this one binding.
  const spawn = io.spawn ?? spawnSync;
  const sliceAbs = resolve(rootDir, slicePath);
  const sliceRel = relative(rootDir, sliceAbs) || ".";

  /** @type {iGateResult[]} */
  const results = [];

  if (!existsSync(sliceAbs)) {
    results.push({
      name: "slice path",
      status: "FAIL",
      detail: `does not exist: ${sliceAbs}`,
    });
    write(formatReport(results, sliceRel, null) + "\n");
    return { exitCode: 1, results, stampedIso: null };
  }
  if (!hasSpecsFolder(sliceAbs)) {
    results.push({
      name: "slice __specs__",
      status: "FAIL",
      detail: `missing __specs__/ in ${sliceRel}`,
    });
    write(formatReport(results, sliceRel, null) + "\n");
    return { exitCode: 1, results, stampedIso: null };
  }

  // First, verify the lock's RESTING shape (status: locked + verified=100% +
  // valid ISO timestamp). This is a precondition for Mode A — we refuse to
  // unlock a slice whose lock is malformed.
  const lockResult = checkLockShape(sliceAbs, { readFile: io.readFile });
  results.push(lockResult);

  // Now unlock the slice's lock BEFORE running gates. Interrupt mid-gates
  // leaves the slice unlocked — that's the correct signal that the slice was
  // not re-validated. `stampLock` re-locks on success.
  // `checkLockShape` returns `lockPath` exactly when status is PASS, so the
  // `lockResult.lockPath` narrowing below is implied by the PASS check.
  if (lockResult.status === "PASS") {
    unlockLock(/** @type {string} */ (lockResult.lockPath), {
      readFile: io.readFile,
      writeFile: io.writeFile,
    });
  }

  // Compute blast radius: slice sources/tests + callers + callees + caller-tests
  const radius = io.blastRadius ?? blastRadius(sliceAbs, rootDir, { spawn });
  const ioForChild = { spawn, cwd: rootDir };
  results.push(
    runScopedVitest(sliceAbs, {
      ...ioForChild,
      sliceTests: radius.sliceTests,
      callerTests: radius.callerTests,
    }),
  );
  results.push(
    runScopedLint(sliceAbs, {
      ...ioForChild,
      callers: radius.callers,
    }),
  );
  if (!io.skipTypecheck) {
    results.push(runTypecheck(ioForChild));
  }
  results.push(runBoundaryGreps(sliceAbs, { spawn }));

  const failed = results.some((r) => r.status === "FAIL");
  /** @type {string | null} */
  let stampedIso = null;
  if (!failed && !io.skipStamp && lockResult.lockPath) {
    stampedIso = stampLock(lockResult.lockPath, {
      readFile: io.readFile,
      writeFile: io.writeFile,
      now: io.now,
    });
  }

  write(formatReport(results, sliceRel, stampedIso) + "\n");
  return { exitCode: failed ? 1 : 0, results, stampedIso };
}

/**
 * CLI dispatcher. Exported for tests.
 *
 * @param {{ argv?: readonly string[], exit?: (code: number) => void }} [io]
 * @returns {void}
 */
export function cliMain(io = {}) {
  const argv = io.argv ?? process.argv.slice(2);
  const exit = io.exit ?? ((code) => process.exit(code));
  if (argv.length === 0) {
    process.stderr.write(
      "verify-mode-a: missing slice path. Usage: node verify-mode-a.mjs <slice-path>\n",
    );
    exit(1);
    return;
  }
  const slicePath = argv[0];
  const { exitCode } = main(slicePath);
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
 * @param {{ importMetaUrl: string, argv1: string | undefined, argv?: readonly string[], exit?: (code: number) => void }} io
 * @returns {boolean}
 */
export function maybeRunCli(io) {
  if (!isCliInvocation(io.importMetaUrl, io.argv1)) return false;
  cliMain({ argv: io.argv, exit: io.exit });
  return true;
}

maybeRunCli({ importMetaUrl: import.meta.url, argv1: process.argv[1] });
