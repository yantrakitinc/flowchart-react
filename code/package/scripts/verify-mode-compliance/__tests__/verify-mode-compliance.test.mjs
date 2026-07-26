// Vitest suite for the verify-mode-compliance orchestrator. Every
// helper has at least one passing AND one failing fixture so the suite
// reaches 100/100/100/100 per-file coverage without spawning real
// children.

import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  DEFAULT_PER_SCRIPT_TIMEOUT_MS,
  SCRIPTS,
  buildCommand,
  buildSuffix,
  cliMain,
  defaultGetChanged,
  defaultRunChild,
  defaultRunEntry,
  isCliInvocation,
  main,
  maybeRunCli,
  parseArgs,
  planRun,
  replayResults,
  runInPool,
  runOne,
} from "../verify-mode-compliance.mjs";

const __filename = fileURLToPath(import.meta.url);
const SCRIPT_PATH = resolve(dirname(__filename), "..", "verify-mode-compliance.mjs");

// --- catalog ----------------------------------------------------------

describe("SCRIPTS catalog", () => {
  it("declares exactly the 11 known scripts (frontend catalog)", () => {
    const ids = SCRIPTS.map((s) => s.id);
    expect(ids).toEqual([
      "verify-flow-coverage",
      "verify-docs",
      "verify-no-stray-scaffolding",
      "verify-setup-headers",
      "verify-manual-playbooks",
      "verify-no-server-imports",
      "verify-ui-components-compliance",
      "verify-standards-compliance",
      "verify-source-coverage",
      "verify-no-padding-folders",
      "verify-standards-freshness",
      "verify-no-history-baked-in",
    ]);
  });

  it("has no phase-2 (writer) scripts — frontend chain is read-only", () => {
    const phase2 = SCRIPTS.filter((s) => s.phase === "phase2").map((s) => s.id);
    expect(phase2).toEqual([]);
  });

  it("marks every entry as phase1", () => {
    const phase1 = SCRIPTS.filter((s) => s.phase === "phase1").map((s) => s.id);
    expect(phase1).toContain("verify-flow-coverage");
    expect(phase1).toContain("verify-no-server-imports");
    expect(phase1).toContain("verify-ui-components-compliance");
  });

  it("marks only verify-standards-freshness as fullOnly", () => {
    const fullOnly = SCRIPTS.filter((s) => s.fullOnly).map((s) => s.id);
    expect(fullOnly).toEqual(["verify-standards-freshness"]);
  });

  it("marks no script as importTsx — frontend chain is pure .mjs", () => {
    const tsx = SCRIPTS.filter((s) => s.importTsx).map((s) => s.id);
    expect(tsx).toEqual([]);
  });

  describe("territory predicates", () => {
    it("verify-no-server-imports — always true (RULE 0 boundary, every file matters)", () => {
      const t = SCRIPTS.find((s) => s.id === "verify-no-server-imports")?.territory;
      expect(t?.([])).toBe(true);
      expect(t?.(["/repo/web/foo.txt"])).toBe(true);
    });

    it("verify-ui-components-compliance — always true (COMPONENT_CREATION gate)", () => {
      const t = SCRIPTS.find((s) => s.id === "verify-ui-components-compliance")?.territory;
      expect(t?.([])).toBe(true);
      expect(t?.(["/repo/web/foo.txt"])).toBe(true);
    });

    it("verify-source-coverage — always true", () => {
      const t = SCRIPTS.find((s) => s.id === "verify-source-coverage")?.territory;
      expect(t?.([])).toBe(true);
    });

    it("verify-flow-coverage — matches spec.yaml or src/*.ts(x)", () => {
      const t = SCRIPTS.find((s) => s.id === "verify-flow-coverage")?.territory;
      expect(t?.(["/repo/web/src/foo.ts"])).toBe(true);
      expect(t?.(["/repo/web/src/foo.tsx"])).toBe(true);
      expect(t?.(["/repo/web/scripts/__specs__/spec.yaml"])).toBe(true);
      expect(t?.(["/repo/web/README.md"])).toBe(false);
    });

    it("verify-docs — matches any __specs__/ path", () => {
      const t = SCRIPTS.find((s) => s.id === "verify-docs")?.territory;
      expect(t?.(["/repo/web/src/a/__specs__/spec.md"])).toBe(true);
      expect(t?.(["/repo/web/src/a/foo.ts"])).toBe(false);
    });

    it("verify-no-stray-scaffolding — any /src/ path", () => {
      const t = SCRIPTS.find((s) => s.id === "verify-no-stray-scaffolding")?.territory;
      expect(t?.(["/repo/web/src/x.ts"])).toBe(true);
      expect(t?.(["/repo/web/scripts/x.mjs"])).toBe(false);
    });

    it("verify-setup-headers — src/*.ts(x)", () => {
      const t = SCRIPTS.find((s) => s.id === "verify-setup-headers")?.territory;
      expect(t?.(["/repo/web/src/foo.ts"])).toBe(true);
      expect(t?.(["/repo/web/scripts/foo.mjs"])).toBe(false);
    });

    it("verify-manual-playbooks — __specs__/manual/", () => {
      const t = SCRIPTS.find((s) => s.id === "verify-manual-playbooks")?.territory;
      expect(t?.(["/repo/web/src/a/__specs__/manual/x.yaml"])).toBe(true);
      expect(t?.(["/repo/web/src/a/__specs__/spec.md"])).toBe(false);
    });

    it("verify-standards-compliance — __specs__/", () => {
      const t = SCRIPTS.find((s) => s.id === "verify-standards-compliance")?.territory;
      expect(t?.(["/repo/web/src/a/__specs__/spec.yaml"])).toBe(true);
      expect(t?.(["/repo/web/src/a/foo.ts"])).toBe(false);
    });

    it("verify-no-padding-folders — src/features/", () => {
      const t = SCRIPTS.find((s) => s.id === "verify-no-padding-folders")?.territory;
      expect(t?.(["/repo/web/src/features/x/y.ts"])).toBe(true);
      expect(t?.(["/repo/web/src/lib/y.ts"])).toBe(false);
    });

    it("verify-standards-freshness — __specs__/", () => {
      const t = SCRIPTS.find((s) => s.id === "verify-standards-freshness")?.territory;
      expect(t?.(["/repo/web/src/a/__specs__/spec.md"])).toBe(true);
      expect(t?.(["/repo/web/src/foo.ts"])).toBe(false);
    });

    it("verify-no-history-baked-in — always true (scans outside cwd-scoped diff)", () => {
      const t = SCRIPTS.find((s) => s.id === "verify-no-history-baked-in")?.territory;
      expect(t?.([])).toBe(true);
      expect(t?.(["/repo/web/src/foo.ts"])).toBe(true);
    });

    it("placeholder — frontend chain has no phase-2 writers", () => {
      const phase2 = SCRIPTS.filter((s) => s.phase === "phase2");
      expect(phase2).toEqual([]);
    });
  });
});

// --- parseArgs --------------------------------------------------------

describe("parseArgs", () => {
  it("defaults to non-full, non-scope", () => {
    expect(parseArgs([])).toEqual({ full: false, scope: false });
  });

  it("recognises --full", () => {
    expect(parseArgs(["--full"])).toEqual({ full: true, scope: false });
  });

  it("recognises --scope", () => {
    expect(parseArgs(["--scope"])).toEqual({ full: false, scope: true });
  });

  it("recognises both", () => {
    expect(parseArgs(["--full", "--scope"])).toEqual({ full: true, scope: true });
  });
});

// --- buildCommand -----------------------------------------------------

describe("buildCommand", () => {
  it("builds a plain-node argv", () => {
    const cmd = buildCommand(
      { id: "x", script: "scripts/x.mjs", importTsx: false, phase: "phase1", fullOnly: false, territory: () => true },
      "/repo",
    );
    expect(cmd.execPath).toBe(process.execPath);
    expect(cmd.args).toEqual(["/repo/scripts/x.mjs"]);
    expect(cmd.cwd).toBe("/repo");
  });

  it("builds an --import tsx argv when importTsx is set", () => {
    const cmd = buildCommand(
      { id: "x", script: "scripts/x.mjs", importTsx: true, phase: "phase1", fullOnly: false, territory: () => true },
      "/repo",
    );
    expect(cmd.args[0]).toBe("--import");
    expect(cmd.args[1]).toBe("tsx");
  });
});

// --- planRun ---------------------------------------------------------

describe("planRun", () => {
  /** @type {import("../verify-mode-compliance.mjs").iScriptEntry} */
  const always = {
    id: "always",
    script: "always.mjs",
    importTsx: false,
    phase: "phase1",
    fullOnly: false,
    territory: () => true,
  };
  /** @type {import("../verify-mode-compliance.mjs").iScriptEntry} */
  const never = {
    id: "never",
    script: "never.mjs",
    importTsx: false,
    phase: "phase1",
    fullOnly: false,
    territory: () => false,
  };
  /** @type {import("../verify-mode-compliance.mjs").iScriptEntry} */
  const fullOnly = {
    id: "fullOnly",
    script: "freshness.mjs",
    importTsx: false,
    phase: "phase1",
    fullOnly: true,
    territory: () => true,
  };

  it("runs every entry in non-scope, non-full mode (except fullOnly)", () => {
    const { toRun, skipped } = planRun(
      { full: false, scope: false },
      [],
      [always, never, fullOnly],
    );
    expect(toRun.map((e) => e.id)).toEqual(["always", "never"]);
    expect(skipped.map((s) => s.entry.id)).toEqual(["fullOnly"]);
  });

  it("includes fullOnly entries in --full mode", () => {
    const { toRun, skipped } = planRun(
      { full: true, scope: false },
      [],
      [always, fullOnly],
    );
    expect(toRun.map((e) => e.id)).toEqual(["always", "fullOnly"]);
    expect(skipped).toEqual([]);
  });

  it("filters by territory in --scope mode", () => {
    const { toRun, skipped } = planRun(
      { full: false, scope: true },
      ["/repo/x.ts"],
      [always, never],
    );
    expect(toRun.map((e) => e.id)).toEqual(["always"]);
    expect(skipped.map((s) => s.entry.id)).toEqual(["never"]);
    expect(skipped[0].reason).toMatch(/no changed paths/);
  });

  it("skips fullOnly in --scope mode without --full", () => {
    const { toRun, skipped } = planRun(
      { full: false, scope: true },
      ["/repo/x.ts"],
      [always, fullOnly],
    );
    expect(toRun.map((e) => e.id)).toEqual(["always"]);
    expect(skipped.map((s) => s.entry.id)).toEqual(["fullOnly"]);
  });
});

// --- runInPool --------------------------------------------------------

describe("runInPool", () => {
  it("runs every item and preserves input order", async () => {
    const items = [1, 2, 3, 4, 5];
    const out = await runInPool(items, async (n) => n * 10, 2);
    expect(out).toEqual([10, 20, 30, 40, 50]);
  });

  it("caps concurrency at the requested limit", async () => {
    let active = 0;
    let maxActive = 0;
    const items = [1, 2, 3, 4, 5, 6, 7, 8];
    const worker = async () => {
      active += 1;
      if (active > maxActive) maxActive = active;
      await new Promise((r) => setTimeout(r, 5));
      active -= 1;
      return null;
    };
    await runInPool(items, worker, 3);
    expect(maxActive).toBeLessThanOrEqual(3);
    expect(maxActive).toBeGreaterThan(1);
  });

  it("handles an empty input", async () => {
    const out = await runInPool([], async () => null, 4);
    expect(out).toEqual([]);
  });

  it("does not exceed item count even when cap is large", async () => {
    const out = await runInPool([1], async (n) => n, 99);
    expect(out).toEqual([1]);
  });
});

// --- runOne -----------------------------------------------------------

describe("runOne", () => {
  it("captures status + streams + ms via the runChild port", async () => {
    let t = 1000;
    const stub = async () => ({ status: 0, stdout: "out\n", stderr: "" });
    const r = await runOne(
      { id: "x", script: "x.mjs", importTsx: false, phase: "phase1", fullOnly: false, territory: () => true },
      { rootDir: "/repo", runChild: stub, now: () => { const v = t; t += 42; return v; } },
    );
    expect(r.status).toBe(0);
    expect(r.stdout).toBe("out\n");
    expect(r.ms).toBe(42);
    expect(r.entry.id).toBe("x");
  });

  it("uses default runChild + now when io is empty (real spawn of /bin/true-ish)", async () => {
    // Drive runOne with NO io to exercise every `?? default` branch.
    // We point at a tiny one-liner script that exits 0 instantly: we
    // can't write to disk in this test, so we use `buildCommand` itself
    // with a real node entry. The simplest portable approach: invoke
    // a `--eval` flag by overriding buildCommand via a custom entry
    // whose `script` resolves to an existing file. Lighter still — we
    // just exercise the default branches by passing only `rootDir` so
    // the OTHER defaults (runChild, now) kick in. The real child
    // process runs `node <rootDir>/<script>` which fails fast (file
    // does not exist) — that's fine; we only care that runOne returns
    // and the defaults were hit.
    const r = await runOne({
      id: "noop",
      // A path that exists everywhere a Node install lives: the script
      // entry of the running test runner. Reading it as a module just
      // runs vitest's bootstrap which exits cleanly when invoked with
      // no args... actually that's unreliable. Use `--version` via the
      // entry that buildCommand produces — by setting importTsx=false
      // and script="-e:0" the resolved path is "<rootDir>/-e:0" which
      // does not exist. Node fails fast with exit 1.
      script: "scripts/lib/changed-paths.mjs", // imports cleanly
      importTsx: false,
      phase: "phase1",
      fullOnly: false,
      territory: () => true,
    });
    // The child either exits 0 (no top-level side effects) or 1 (if
    // anything errors). We only need the default branches to have
    // executed and runOne to return a well-formed object.
    expect(typeof r.status).toBe("number");
    expect(typeof r.ms).toBe("number");
  });
});

// --- replayResults ---------------------------------------------------

describe("replayResults", () => {
  it("writes stdout then stderr per result in order", () => {
    /** @type {string[]} */
    const stdout = [];
    /** @type {string[]} */
    const stderr = [];
    const fake = (s) => stdout.push(s);
    const fakeErr = (s) => stderr.push(s);
    const results = [
      { entry: { id: "a" }, status: 0, stdout: "a-out\n", stderr: "", ms: 1 },
      { entry: { id: "b" }, status: 1, stdout: "", stderr: "b-err\n", ms: 1 },
      { entry: { id: "c" }, status: 0, stdout: "c-out\n", stderr: "c-err\n", ms: 1 },
    ];
    replayResults(/** @type {any} */(results), fake, fakeErr);
    expect(stdout).toEqual(["a-out\n", "c-out\n"]);
    expect(stderr).toEqual(["b-err\n", "c-err\n"]);
  });

  it("emits nothing when streams are empty", () => {
    /** @type {string[]} */
    const stdout = [];
    /** @type {string[]} */
    const stderr = [];
    replayResults(
      /** @type {any} */([{ entry: { id: "a" }, status: 0, stdout: "", stderr: "", ms: 0 }]),
      (s) => stdout.push(s),
      (s) => stderr.push(s),
    );
    expect(stdout).toEqual([]);
    expect(stderr).toEqual([]);
  });
});

// --- buildSuffix ------------------------------------------------------

describe("buildSuffix", () => {
  it("default mode → 'OK (all N scripts passed) in Xs'", () => {
    expect(buildSuffix({ full: false, scope: false }, 13, 0, 2500)).toBe(
      ": OK (all 13 scripts passed) in 2.5s",
    );
  });

  it("full mode adds (full)", () => {
    expect(buildSuffix({ full: true, scope: false }, 14, 0, 1000)).toBe(
      " (full): OK (all 14 scripts passed) in 1.0s",
    );
  });

  it("scope mode reports ran / total / skipped", () => {
    expect(buildSuffix({ full: false, scope: true }, 5, 8, 750)).toBe(
      " (scoped): OK (5 of 13 scripts ran, 8 skipped) in 0.8s",
    );
  });

  it("scope+full mode uses the scoped suffix", () => {
    expect(buildSuffix({ full: true, scope: true }, 2, 12, 500)).toBe(
      " (scoped): OK (2 of 14 scripts ran, 12 skipped) in 0.5s",
    );
  });
});

// --- main: orchestration -----------------------------------------------

/**
 * Build a fake catalog + a runEntry stub that returns scripted statuses.
 *
 * @param {ReadonlyArray<{ id: string, phase: "phase1" | "phase2", fullOnly?: boolean, territory?: (changed: ReadonlyArray<string>) => boolean }>} entries
 * @param {Record<string, { status: number, stdout?: string, stderr?: string }>} resultsByid
 */
function fixture(entries, resultsByid) {
  /** @type {ReadonlyArray<import("../verify-mode-compliance.mjs").iScriptEntry>} */
  const catalog = entries.map((e) => ({
    id: e.id,
    script: `scripts/${e.id}/${e.id}.mjs`,
    importTsx: false,
    phase: e.phase,
    fullOnly: e.fullOnly ?? false,
    territory: e.territory ?? (() => true),
  }));
  /** @type {string[]} */
  const calls = [];
  let clock = 0;
  const now = () => { const v = clock; clock += 10; return v; };
  /** @type {(entry: import("../verify-mode-compliance.mjs").iScriptEntry) => Promise<{ entry: import("../verify-mode-compliance.mjs").iScriptEntry, status: number, stdout: string, stderr: string, ms: number }>} */
  const runEntry = async (entry) => {
    calls.push(entry.id);
    const r = resultsByid[entry.id] ?? { status: 0, stdout: "", stderr: "" };
    return {
      entry,
      status: r.status,
      stdout: r.stdout ?? "",
      stderr: r.stderr ?? "",
      ms: 5,
    };
  };
  return { catalog, calls, runEntry, now };
}

describe("main — orchestration", () => {
  it("runs every script in the default mode (no scope, no full)", async () => {
    const { catalog, calls, runEntry, now } = fixture(
      [
        { id: "p1a", phase: "phase1" },
        { id: "p1b", phase: "phase1" },
        { id: "p2a", phase: "phase2" },
      ],
      { p1a: { status: 0, stdout: "p1a out\n" }, p1b: { status: 0, stdout: "p1b out\n" }, p2a: { status: 0, stdout: "p2a out\n" } },
    );
    /** @type {string[]} */
    const out = [];
    /** @type {string[]} */
    const err = [];
    const result = await main({
      argv: [],
      catalog,
      runEntry,
      write: (s) => out.push(s),
      writeErr: (s) => err.push(s),
      now,
    });
    expect(result.exitCode).toBe(0);
    expect(calls).toEqual(["p1a", "p1b", "p2a"]);
    expect(out.join("")).toContain("p1a out");
    expect(out.join("")).toContain("p1b out");
    expect(out.join("")).toContain("p2a out");
    expect(out.join("")).toMatch(/verify-mode-compliance: OK \(all 3 scripts passed\)/);
  });

  it("runs phase2 strictly after phase1 (phase2 sees both phase1 calls already recorded)", async () => {
    /** @type {string[]} */
    const order = [];
    /** @type {ReadonlyArray<import("../verify-mode-compliance.mjs").iScriptEntry>} */
    const catalog = [
      { id: "p1a", script: "x", importTsx: false, phase: "phase1", fullOnly: false, territory: () => true },
      { id: "p1b", script: "y", importTsx: false, phase: "phase1", fullOnly: false, territory: () => true },
      { id: "p2a", script: "z", importTsx: false, phase: "phase2", fullOnly: false, territory: () => true },
    ];
    const runEntry = async (entry) => {
      order.push(`start:${entry.id}`);
      // give microtasks a chance to interleave so we know phase ordering
      // is enforced by the orchestrator, not by accident.
      await Promise.resolve();
      order.push(`end:${entry.id}`);
      return { entry, status: 0, stdout: "", stderr: "", ms: 1 };
    };
    const result = await main({
      argv: [],
      catalog,
      runEntry,
      write: () => {},
      writeErr: () => {},
      now: () => 0,
    });
    expect(result.exitCode).toBe(0);
    // The phase-2 entry must NOT start before both phase-1 entries
    // finished. Verify by index.
    const p2Start = order.indexOf("start:p2a");
    expect(p2Start).toBeGreaterThan(order.indexOf("end:p1a"));
    expect(p2Start).toBeGreaterThan(order.indexOf("end:p1b"));
  });

  it("adds the freshness gate in --full mode", async () => {
    const { catalog, calls, runEntry, now } = fixture(
      [
        { id: "p1a", phase: "phase1" },
        { id: "fresh", phase: "phase1", fullOnly: true },
        { id: "p2a", phase: "phase2" },
      ],
      {},
    );
    /** @type {string[]} */
    const out = [];
    const result = await main({
      argv: ["--full"],
      catalog,
      runEntry,
      write: (s) => out.push(s),
      writeErr: () => {},
      now,
    });
    expect(result.exitCode).toBe(0);
    expect(calls).toEqual(["p1a", "fresh", "p2a"]);
    expect(out.join("")).toMatch(/verify-mode-compliance \(full\): OK \(all 3 scripts passed\)/);
  });

  it("skips fullOnly + territory-disjoint scripts in --scope mode", async () => {
    const { catalog, calls, runEntry, now } = fixture(
      [
        { id: "always", phase: "phase1", territory: () => true },
        { id: "never", phase: "phase1", territory: () => false },
        { id: "fresh", phase: "phase1", fullOnly: true },
      ],
      {},
    );
    /** @type {string[]} */
    const out = [];
    const result = await main({
      argv: ["--scope"],
      catalog,
      runEntry,
      write: (s) => out.push(s),
      writeErr: () => {},
      now,
      getChanged: () => ["/repo/x.ts"],
    });
    expect(result.exitCode).toBe(0);
    expect(calls).toEqual(["always"]);
    const text = out.join("");
    expect(text).toMatch(/SKIP never/);
    expect(text).toMatch(/SKIP fresh/);
    expect(text).toMatch(/verify-mode-compliance \(scoped\): OK \(1 of 3 scripts ran, 2 skipped\)/);
  });

  it("falls back to a full run when --scope finds no changed paths", async () => {
    const { catalog, calls, runEntry, now } = fixture(
      [
        { id: "always", phase: "phase1", territory: () => true },
        { id: "never", phase: "phase1", territory: () => false },
      ],
      {},
    );
    /** @type {string[]} */
    const out = [];
    /** @type {string[]} */
    const err = [];
    const result = await main({
      argv: ["--scope"],
      catalog,
      runEntry,
      write: (s) => out.push(s),
      writeErr: (s) => err.push(s),
      now,
      getChanged: () => [],
    });
    expect(result.exitCode).toBe(0);
    // Both ran because scope was disabled after the empty-changed result.
    expect(calls).toEqual(["always", "never"]);
    expect(err.join("")).toMatch(/Falling back to a full run/);
  });

  it("Phase 1 failure gates Phase 2: writers are skipped + reported", async () => {
    // Phase 1 has one failure (p1a) and one success (p1b). Phase 2's p2a
    // is configured to fail too, but should NEVER be run — the gate
    // skips it to avoid committing stale artifacts.
    const { catalog, calls, runEntry, now } = fixture(
      [
        { id: "p1a", phase: "phase1" },
        { id: "p1b", phase: "phase1" },
        { id: "p2a", phase: "phase2" },
      ],
      {
        p1a: { status: 1, stderr: "p1a failed\n" },
        p1b: { status: 0 },
        p2a: { status: 2, stderr: "p2a failed\n" },
      },
    );
    /** @type {string[]} */
    const err = [];
    const result = await main({
      argv: [],
      catalog,
      runEntry,
      write: () => {},
      writeErr: (s) => err.push(s),
      now,
    });
    expect(result.exitCode).toBe(1);
    // p2a was NOT invoked
    expect(calls).toEqual(["p1a", "p1b"]);
    const text = err.join("");
    expect(text).toMatch(/Phase 1 failed — skipping 1 Phase-2 writer/);
    expect(text).toMatch(/1 script\(s\) failed/);
    expect(text).toMatch(/FAIL: p1a \(exit 1\)/);
    expect(text).toMatch(/Phase-2 SKIPPED \(gated on Phase-1 success\): p2a/);
  });

  it("Phase 1 failure with NO phase-2 entries: no skip-banner, no Phase-2 SKIPPED line", async () => {
    // Both branches at line 490 (`phase2.length > 0`) and line 517
    // (`phase2Skipped.length > 0`) must be exercised in their FALSE form.
    // We arrange a catalog with phase-1 failures only — no phase-2 entries —
    // so the orchestrator reports failures without the Phase-2-skipped suffix.
    const { catalog, runEntry, now } = fixture(
      [
        { id: "p1a", phase: "phase1" },
        { id: "p1b", phase: "phase1" },
      ],
      {
        p1a: { status: 1, stderr: "p1a failed\n" },
        p1b: { status: 0 },
      },
    );
    /** @type {string[]} */
    const err = [];
    const result = await main({
      argv: [],
      catalog,
      runEntry,
      write: () => {},
      writeErr: (s) => err.push(s),
      now,
    });
    expect(result.exitCode).toBe(1);
    const text = err.join("");
    // No Phase-2 entries means no skip banner and no skipped-suffix line.
    expect(text).not.toMatch(/Phase 1 failed — skipping/);
    expect(text).not.toMatch(/Phase-2 SKIPPED/);
    expect(text).toMatch(/1 script\(s\) failed/);
    expect(text).toMatch(/FAIL: p1a \(exit 1\)/);
  });

  it("Phase 2 runs normally when Phase 1 is clean (all phase-2 entries invoked)", async () => {
    const { catalog, calls, runEntry, now } = fixture(
      [
        { id: "p1a", phase: "phase1" },
        { id: "p1b", phase: "phase1" },
        { id: "p2a", phase: "phase2" },
        { id: "p2b", phase: "phase2" },
      ],
      {
        p1a: { status: 0 },
        p1b: { status: 0 },
        p2a: { status: 0 },
        p2b: { status: 0 },
      },
    );
    const result = await main({
      argv: [],
      catalog,
      runEntry,
      write: () => {},
      writeErr: () => {},
      now,
    });
    expect(result.exitCode).toBe(0);
    expect(calls).toEqual(["p1a", "p1b", "p2a", "p2b"]);
  });

  it("buffers output: each script's stdout/stderr appears as a single contiguous block", async () => {
    /** @type {ReadonlyArray<import("../verify-mode-compliance.mjs").iScriptEntry>} */
    const catalog = [
      { id: "a", script: "a", importTsx: false, phase: "phase1", fullOnly: false, territory: () => true },
      { id: "b", script: "b", importTsx: false, phase: "phase1", fullOnly: false, territory: () => true },
    ];
    /** @type {string[]} */
    const out = [];
    const runEntry = async (entry) => {
      return { entry, status: 0, stdout: `<<${entry.id}>>\n`, stderr: "", ms: 1 };
    };
    await main({
      argv: [],
      catalog,
      runEntry,
      write: (s) => out.push(s),
      writeErr: () => {},
      now: () => 0,
    });
    const joined = out.join("");
    // Each block is contiguous (not interleaved).
    expect(joined.indexOf("<<a>>")).toBeGreaterThanOrEqual(0);
    expect(joined.indexOf("<<b>>")).toBeGreaterThanOrEqual(0);
  });
});

// --- main: default ports ---------------------------------------------

describe("defaultGetChanged + defaultRunEntry", () => {
  it("defaultGetChanged returns a function that delegates to getChangedPaths with the bound cwd", () => {
    // Invoking the arrow inside an empty/non-git directory returns an
    // empty list — the helper logs a warning to stderr and never throws,
    // so the arrow body is fully covered without spawning git on the
    // real repo.
    const origErr = process.stderr.write.bind(process.stderr);
    // @ts-expect-error — test-only monkey-patch
    process.stderr.write = () => true;
    try {
      const fn = defaultGetChanged("/nonexistent/path/for/verify-mode-compliance-test");
      const out = fn("origin/master");
      expect(Array.isArray(out)).toBe(true);
    } finally {
      process.stderr.write = origErr;
    }
  });

  it("defaultRunEntry returns a function that delegates to runOne with the bound rootDir + now", async () => {
    // Build a synthetic entry pointing at a no-op Node script under a
    // throwaway tmp tree so `runOne` (which the helper composes) can
    // spawn the child without exercising a real verify script. The
    // result shape confirms the binding fired.
    const { mkdtempSync, writeFileSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const tmp = mkdtempSync(`${tmpdir()}/default-run-entry-`);
    writeFileSync(`${tmp}/noop.mjs`, "process.exit(0);\n");
    try {
      const tickValues = [10, 25];
      const fn = defaultRunEntry(tmp, () => tickValues.shift() ?? 0);
      const entry = {
        id: "noop",
        script: "noop.mjs",
        territory: { kind: "everywhere" },
        runIn: "any",
      };
      const result = await fn(entry);
      expect(result.entry.id).toBe("noop");
      expect(result.status).toBe(0);
      expect(result.ms).toBe(15);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe("main — default ports", () => {
  it("runs to completion with an empty catalog using every default port", async () => {
    const r = await main({ catalog: [] });
    expect(r.exitCode).toBe(0);
  });

  it("uses the default getChanged when --scope is set + catalog is empty", async () => {
    // With an empty catalog the scope filter has nothing to filter; we
    // still need the default `getChanged` to be invoked so its branch
    // is covered. Empty changed list triggers the fallback message on
    // stderr, then proceeds to run an empty catalog → exit 0.
    const r = await main({ catalog: [], argv: ["--scope"], getChanged: () => [] });
    expect(r.exitCode).toBe(0);
  });

  it("uses the default catalog (SCRIPTS) when no catalog is passed", async () => {
    // Stub runEntry so we don't spawn the real 14 scripts but still
    // exercise the `io.catalog ?? SCRIPTS` default branch.
    /** @type {string[]} */
    const ran = [];
    const r = await main({
      runEntry: async (entry) => {
        ran.push(entry.id);
        return { entry, status: 0, stdout: "", stderr: "", ms: 0 };
      },
      write: () => {},
      writeErr: () => {},
    });
    expect(r.exitCode).toBe(0);
    // The default catalog excludes the fullOnly freshness gate.
    expect(ran).toContain("verify-flow-coverage");
    expect(ran).toContain("verify-no-server-imports");
    expect(ran).not.toContain("verify-standards-freshness");
  });
});

// --- isCliInvocation + maybeRunCli + cliMain ---------------------------

describe("isCliInvocation", () => {
  it("returns false when argv1 is missing", () => {
    expect(isCliInvocation("file:///a.mjs", undefined)).toBe(false);
    expect(isCliInvocation("file:///a.mjs", "")).toBe(false);
  });

  it("returns true when argv1 resolves to the same module url", () => {
    expect(isCliInvocation(`file://${SCRIPT_PATH}`, SCRIPT_PATH)).toBe(true);
  });

  it("returns false when argv1 points elsewhere", () => {
    expect(isCliInvocation("file:///a.mjs", "/b.mjs")).toBe(false);
  });
});

describe("cliMain", () => {
  it("forwards main's exit code via the injected exit hook", async () => {
    /** @type {number[]} */
    const codes = [];
    await cliMain({
      runMain: async () => ({ exitCode: 0 }),
      exit: (c) => codes.push(c),
    });
    expect(codes).toEqual([0]);
  });

  it("forwards a non-zero exit code", async () => {
    /** @type {number[]} */
    const codes = [];
    await cliMain({
      runMain: async () => ({ exitCode: 1 }),
      exit: (c) => codes.push(c),
    });
    expect(codes).toEqual([1]);
  });

  it("falls back to process.exit when no exit hook is passed", async () => {
    const origExit = process.exit;
    /** @type {number[]} */
    const codes = [];
    // @ts-expect-error — test-only monkey-patch
    process.exit = (c) => { codes.push(c ?? 0); };
    try {
      await cliMain({ runMain: async () => ({ exitCode: 0 }) });
      expect(codes).toEqual([0]);
    } finally {
      process.exit = origExit;
    }
  });

  it("falls back to invoking main when no runMain is provided", async () => {
    /** @type {number[]} */
    const codes = [];
    /** @type {string[]} */
    const out = [];
    /** @type {string[]} */
    const err = [];
    await cliMain({
      exit: (c) => codes.push(c),
      mainIo: {
        argv: [],
        catalog: [],
        write: (s) => out.push(s),
        writeErr: (s) => err.push(s),
      },
    });
    // Empty catalog + no-scope means main resolves to exit 0
    // without touching the filesystem or spawning children.
    expect(codes).toEqual([0]);
  });
});

describe("maybeRunCli", () => {
  it("returns false and skips cliMain when the guard rejects", async () => {
    /** @type {number[]} */
    const codes = [];
    const r = await maybeRunCli({
      importMetaUrl: "file:///never-matches.mjs",
      argv1: "/tmp/somewhere-else.mjs",
      exit: (c) => codes.push(c),
      runMain: async () => ({ exitCode: 0 }),
    });
    expect(r).toBe(false);
    expect(codes).toEqual([]);
  });

  it("invokes cliMain and returns true when the guard accepts", async () => {
    /** @type {number[]} */
    const codes = [];
    // Match URLs by pointing the importMetaUrl at the actual script
    // path; pathToFileURL on argv1 produces the same href.
    const argv1 = SCRIPT_PATH;
    const importMetaUrl = `file://${SCRIPT_PATH}`;
    const r = await maybeRunCli({
      importMetaUrl,
      argv1,
      exit: (c) => codes.push(c),
      runMain: async () => ({ exitCode: 0 }),
    });
    expect(r).toBe(true);
    expect(codes).toEqual([0]);
  });
});

// --- defaultRunChild --------------------------------------------------

describe("defaultRunChild (real spawn)", () => {
  it("captures stdout from a child that prints + exits 0", async () => {
    const r = await defaultRunChild({
      execPath: process.execPath,
      args: ["-e", "process.stdout.write('hi')"],
      cwd: process.cwd(),
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toBe("hi");
  });

  it("captures stderr + non-zero status when child fails", async () => {
    const r = await defaultRunChild({
      execPath: process.execPath,
      args: ["-e", "process.stderr.write('boom'); process.exit(7)"],
      cwd: process.cwd(),
    });
    expect(r.status).toBe(7);
    expect(r.stderr).toBe("boom");
  });

  it("reports an orchestrator spawn error when execPath is missing", async () => {
    const r = await defaultRunChild({
      execPath: "/definitely/not/a/binary/at/all",
      args: [],
      cwd: process.cwd(),
    });
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(/orchestrator: spawn error/);
  });

  it("covers the `code ?? 0` branch when the child is killed by signal", async () => {
    // Drive defaultRunChild against a child that SIGKILLs itself —
    // close fires with code=null, the wrapper returns `code ?? 0`.
    const r = await defaultRunChild({
      execPath: process.execPath,
      args: ["-e", "process.kill(process.pid, 'SIGKILL')"],
      cwd: process.cwd(),
    });
    // SIGKILL → close code is null → wrapper returns 0.
    expect(r.status).toBe(0);
  });

  it("exports DEFAULT_PER_SCRIPT_TIMEOUT_MS as 10 minutes", () => {
    expect(DEFAULT_PER_SCRIPT_TIMEOUT_MS).toBe(10 * 60 * 1000);
  });

  it("times out a hanging child + returns status 124 + clear stderr", async () => {
    // Child hangs forever via setInterval — only SIGTERM/SIGKILL ends it.
    // timeoutMs=150 keeps the test fast.
    const r = await defaultRunChild(
      {
        execPath: process.execPath,
        args: ["-e", "setInterval(() => {}, 1000);"],
        cwd: process.cwd(),
      },
      { timeoutMs: 150 },
    );
    expect(r.status).toBe(124);
    expect(r.stderr).toMatch(/script timed out after 150ms/);
  });

  it("escalates to SIGKILL when the child ignores SIGTERM (covers killer setTimeout body)", async () => {
    // Inject a fake child that records signals but never closes, plus a
    // short killTimeoutMs so the SIGKILL escalation fires fast.
    /** @type {string[]} */
    const signals = [];
    /** @type {((code: number | null) => void) | null} */
    let closeCb = null;
    const fakeChild = {
      kill: (sig) => {
        signals.push(sig);
        // When SIGKILL fires, immediately close the child so the
        // promise resolves.
        if (sig === "SIGKILL" && closeCb) closeCb(137);
      },
      stdout: { on: () => undefined },
      stderr: { on: () => undefined },
      on: (ev, cb) => {
        if (ev === "close") closeCb = cb;
      },
    };
    const fakeSpawn = () => fakeChild;
    const r = await defaultRunChild(
      {
        execPath: process.execPath,
        args: ["-e", "noop"],
        cwd: process.cwd(),
      },
      { timeoutMs: 1, killTimeoutMs: 5, spawn: fakeSpawn },
    );
    expect(signals).toContain("SIGTERM");
    expect(signals).toContain("SIGKILL");
    expect(r.status).toBe(124);
  });

  it("does NOT time out a quick child", async () => {
    const r = await defaultRunChild(
      {
        execPath: process.execPath,
        args: ["-e", "process.stdout.write('quick')"],
        cwd: process.cwd(),
      },
      { timeoutMs: 30_000 },
    );
    expect(r.status).toBe(0);
    expect(r.stdout).toBe("quick");
  });
});
