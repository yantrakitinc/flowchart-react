// Vitest suite for verify-flow-coverage.
//
// Drives every helper via dependency-injected IO so the suite reaches
// 100/100/100/100 per-file coverage without spawning a child process.

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { afterAll, describe, expect, it } from "vitest";

import {
  FLOW_DOC_EXTENSIONS,
  audit,
  cliMain,
  defaultExistsSync,
  defaultListExportedBehaviors,
  defaultListFiles,
  defaultReadFile,
  defaultStderrWrite,
  defaultStdoutWrite,
  flowDocCandidates,
  formatReport,
  isCliInvocation,
  isInScope,
  main,
  maybeRunCli,
} from "../verify-flow-coverage.mjs";

const __filename = fileURLToPath(import.meta.url);
const SCRIPT_PATH = resolve(
  dirname(__filename),
  "..",
  "verify-flow-coverage.mjs",
);

/** @type {string[]} */
const cleanupDirs = [];
afterAll(() => {
  for (const d of cleanupDirs) {
    try {
      rmSync(d, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
});

// --- FLOW_DOC_EXTENSIONS ----------------------------------------------

describe("FLOW_DOC_EXTENSIONS", () => {
  it("includes both '.flow.yaml' and '.flow.md'", () => {
    expect(FLOW_DOC_EXTENSIONS).toContain(".flow.yaml");
    expect(FLOW_DOC_EXTENSIONS).toContain(".flow.md");
  });

  it("lists .flow.yaml first so new-shape candidates are tried first", () => {
    expect(FLOW_DOC_EXTENSIONS[0]).toBe(".flow.yaml");
  });
});

// --- isInScope ---------------------------------------------------------

describe("isInScope", () => {
  it("returns true for an ordinary behavior file", () => {
    expect(
      isInScope("/src/db/client/client.ts", {
        readFile: () => "// no setup marker\n",
      }),
    ).toBe(true);
  });

  it("returns false for index.ts", () => {
    expect(isInScope("/src/db/index.ts", { readFile: () => "" })).toBe(false);
  });

  it("returns false for types.ts", () => {
    expect(isInScope("/src/db/types.ts", { readFile: () => "" })).toBe(false);
  });

  it("returns false for *.test.ts", () => {
    expect(isInScope("/src/x/y.test.ts", { readFile: () => "" })).toBe(false);
  });

  it("returns false for *.test.tsx", () => {
    expect(isInScope("/src/x/y.test.tsx", { readFile: () => "" })).toBe(false);
  });

  it("returns false for *.config.ts", () => {
    expect(isInScope("/src/x/eslint.config.ts", { readFile: () => "" })).toBe(
      false,
    );
  });

  it("returns false for files under __tests__/", () => {
    expect(
      isInScope("/src/x/__tests__/x.spec.ts", { readFile: () => "" }),
    ).toBe(false);
  });

  it("returns false for files under __specs__/", () => {
    expect(
      isInScope("/src/x/__specs__/notes.ts", { readFile: () => "" }),
    ).toBe(false);
  });

  it("returns false for files under __specs__.backup/ (transitional carve-out)", () => {
    expect(
      isInScope("/src/db/client/__specs__.backup/something.ts", {
        readFile: () => "",
      }),
    ).toBe(false);
  });

  it("returns false for .d.ts files", () => {
    expect(isInScope("/src/x/types.d.ts", { readFile: () => "" })).toBe(false);
  });

  it("returns false for non-ts/tsx files", () => {
    expect(isInScope("/src/x/foo.mjs", { readFile: () => "" })).toBe(false);
  });

  it("returns false when file has the SETUP FILE marker in its first ~2KB", () => {
    expect(
      isInScope("/src/x/foo.ts", {
        readFile: () => "// SETUP FILE. zero-behavior bootstrap.\n",
      }),
    ).toBe(false);
  });

  it("uses defaultReadFile when no injection is supplied", () => {
    // Create a tmp file with a SETUP marker and confirm isInScope returns false
    const tmp = mkdtempSync(join(tmpdir(), "vfc-isinscope-"));
    cleanupDirs.push(tmp);
    const p = join(tmp, "foo.ts");
    writeFileSync(p, "// SETUP FILE. test marker\n");
    expect(isInScope(p)).toBe(false);
  });
});

// --- flowDocCandidates -------------------------------------------------

describe("flowDocCandidates", () => {
  it("produces both .flow.yaml and .flow.md candidates", () => {
    const cs = flowDocCandidates("getDb");
    expect(cs).toContain("get-db.flow.yaml");
    expect(cs).toContain("get-db.flow.md");
  });

  it("handles acronym-collapsed forms (registerOpenAPI)", () => {
    const cs = flowDocCandidates("registerOpenAPI");
    expect(cs).toContain("register-open-api.flow.yaml");
    expect(cs).toContain("register-openapi.flow.yaml");
  });

  it("strips leading underscores like the kebab helper", () => {
    const cs = flowDocCandidates("__resetDbCacheForTests");
    expect(cs).toContain("reset-db-cache-for-tests.flow.yaml");
  });
});

// --- audit -------------------------------------------------------------

describe("audit", () => {
  it("returns missing entries when no candidate exists on disk", () => {
    const r = audit("/src", {
      listFiles: () => ["/src/x/client.ts"],
      listExportedBehaviors: () => [{ name: "getDb" }],
      existsSync: () => false,
      readFile: () => "// no setup marker\n",
    });
    expect(r.exportedCount).toBe(1);
    expect(r.missing).toHaveLength(1);
    expect(r.missing[0].behavior).toBe("getDb");
    expect(r.missing[0].candidates).toContain("get-db.flow.yaml");
  });

  it("counts a behavior covered when the .flow.yaml exists", () => {
    const r = audit("/src", {
      listFiles: () => ["/src/x/client.ts"],
      listExportedBehaviors: () => [{ name: "getDb" }],
      existsSync: (p) => p.endsWith("get-db.flow.yaml"),
      readFile: () => "",
    });
    expect(r.missing).toEqual([]);
  });

  it("counts a behavior covered when the legacy .flow.md exists (dual-shape policy)", () => {
    const r = audit("/src", {
      listFiles: () => ["/src/x/client.ts"],
      listExportedBehaviors: () => [{ name: "getDb" }],
      existsSync: (p) => p.endsWith("get-db.flow.md"),
      readFile: () => "",
    });
    expect(r.missing).toEqual([]);
  });

  it("counts a behavior covered when both forms exist", () => {
    const r = audit("/src", {
      listFiles: () => ["/src/x/client.ts"],
      listExportedBehaviors: () => [{ name: "getDb" }],
      existsSync: () => true,
      readFile: () => "",
    });
    expect(r.missing).toEqual([]);
  });

  it("skips files that are out of scope (e.g. index.ts)", () => {
    const r = audit("/src", {
      listFiles: () => ["/src/x/index.ts"],
      listExportedBehaviors: () => {
        throw new Error("should not be called for out-of-scope files");
      },
      existsSync: () => false,
      readFile: () => "",
    });
    expect(r.exportedCount).toBe(0);
  });

  it("skips files with zero exported behaviors", () => {
    const r = audit("/src", {
      listFiles: () => ["/src/x/empty.ts"],
      listExportedBehaviors: () => [],
      existsSync: () => false,
      readFile: () => "// no setup marker\n",
    });
    expect(r.exportedCount).toBe(0);
    expect(r.missing).toEqual([]);
  });

  it("accumulates multiple missing entries across files", () => {
    const r = audit("/src", {
      listFiles: () => ["/src/x/a.ts", "/src/x/b.ts"],
      listExportedBehaviors: (file) => {
        if (file.endsWith("a.ts")) return [{ name: "alpha" }];
        return [{ name: "beta" }];
      },
      existsSync: () => false,
      readFile: () => "// no setup marker\n",
    });
    expect(r.missing).toHaveLength(2);
    expect(r.missing.map((m) => m.behavior).sort()).toEqual(["alpha", "beta"]);
  });

  it("falls back to default IO ports when injected is omitted", () => {
    // Point at a tmp dir with no behavior files — exits cleanly.
    const tmp = mkdtempSync(join(tmpdir(), "vfc-audit-default-"));
    cleanupDirs.push(tmp);
    const r = audit(tmp);
    expect(r.exportedCount).toBe(0);
    expect(r.missing).toEqual([]);
  });
});

// --- formatReport ------------------------------------------------------

describe("formatReport", () => {
  it("returns exit 0 + OK stdout when nothing missing", () => {
    const r = formatReport({ exportedCount: 3, missing: [] }, "/root");
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("3 exported behavior(s) checked");
    expect(r.stderr).toBe("");
  });

  it("returns exit 1 + MISSING lines on stderr otherwise", () => {
    const r = formatReport(
      {
        exportedCount: 1,
        missing: [
          {
            flowsDir: "/root/src/x/__specs__/flows",
            behavior: "getDb",
            sourceFile: "/root/src/x/client.ts",
            candidates: ["get-db.flow.yaml", "get-db.flow.md"],
          },
        ],
      },
      "/root",
    );
    expect(r.exitCode).toBe(1);
    expect(r.stdout).toBe("");
    expect(r.stderr).toContain("1 missing flow doc(s)");
    expect(r.stderr).toContain("MISSING:");
    expect(r.stderr).toContain("get-db.flow.yaml | get-db.flow.md");
    expect(r.stderr).toContain("for export getDb");
  });
});

// --- main --------------------------------------------------------------

describe("main", () => {
  it("returns exit 0 when audit returns no missing", () => {
    /** @type {string[]} */
    const out = [];
    /** @type {string[]} */
    const err = [];
    const r = main({
      srcDir: "/src",
      rootDir: "/src",
      listFiles: () => [],
      listExportedBehaviors: () => [],
      existsSync: () => true,
      readFile: () => "",
      write: (s) => out.push(s),
      writeErr: (s) => err.push(s),
    });
    expect(r.exitCode).toBe(0);
    expect(out.join("")).toContain("verify-flow-coverage: OK");
    expect(err.join("")).toBe("");
  });

  it("returns exit 1 when audit reports missing", () => {
    /** @type {string[]} */
    const out = [];
    /** @type {string[]} */
    const err = [];
    const r = main({
      srcDir: "/src",
      rootDir: "/src",
      listFiles: () => ["/src/x/client.ts"],
      listExportedBehaviors: () => [{ name: "getDb" }],
      existsSync: () => false,
      readFile: () => "// no setup marker\n",
      write: (s) => out.push(s),
      writeErr: (s) => err.push(s),
    });
    expect(r.exitCode).toBe(1);
    expect(err.join("")).toContain("MISSING:");
    expect(out.join("")).toBe("");
  });

  it("falls back to default args when called with no io", () => {
    const tmp = mkdtempSync(join(tmpdir(), "vfc-main-default-"));
    cleanupDirs.push(tmp);
    const r = main({ srcDir: tmp, rootDir: tmp });
    expect(r.exitCode).toBe(0);
  });
});

// --- default IO ports --------------------------------------------------

describe("default IO ports", () => {
  it("defaultExistsSync returns true for an existing file", () => {
    const tmp = mkdtempSync(join(tmpdir(), "vfc-exists-"));
    cleanupDirs.push(tmp);
    const p = join(tmp, "x.txt");
    writeFileSync(p, "");
    expect(defaultExistsSync(p)).toBe(true);
  });

  it("defaultReadFile reads back the contents", () => {
    const tmp = mkdtempSync(join(tmpdir(), "vfc-read-"));
    cleanupDirs.push(tmp);
    const p = join(tmp, "x.txt");
    writeFileSync(p, "hello");
    expect(defaultReadFile(p)).toBe("hello");
  });

  it("defaultListFiles returns an array including written files", () => {
    const tmp = mkdtempSync(join(tmpdir(), "vfc-list-"));
    cleanupDirs.push(tmp);
    const p = join(tmp, "x.txt");
    writeFileSync(p, "");
    expect(defaultListFiles(tmp)).toContain(p);
  });

  it("defaultListExportedBehaviors returns an array", () => {
    const tmp = mkdtempSync(join(tmpdir(), "vfc-exports-"));
    cleanupDirs.push(tmp);
    const p = join(tmp, "x.ts");
    writeFileSync(p, "export function foo() {}\n");
    const out = defaultListExportedBehaviors(p);
    expect(out.find((b) => b.name === "foo")).toBeTruthy();
  });

  it("defaultStdoutWrite is callable", () => {
    expect(() => defaultStdoutWrite("")).not.toThrow();
  });

  it("defaultStderrWrite is callable", () => {
    expect(() => defaultStderrWrite("")).not.toThrow();
  });
});

// --- isCliInvocation ---------------------------------------------------

describe("isCliInvocation", () => {
  it("returns false when argv1 is undefined", () => {
    expect(isCliInvocation("file:///a.mjs", undefined)).toBe(false);
  });

  it("returns false when argv1 is empty", () => {
    expect(isCliInvocation("file:///a.mjs", "")).toBe(false);
  });

  it("returns false when argv1 does not match import.meta.url", () => {
    expect(isCliInvocation("file:///a.mjs", "/tmp/b.mjs")).toBe(false);
  });

  it("returns true when argv1 resolves to the same URL", () => {
    const argv1 = "/tmp/x.mjs";
    expect(isCliInvocation(pathToFileURL(argv1).href, argv1)).toBe(true);
  });
});

// --- cliMain -----------------------------------------------------------

describe("cliMain", () => {
  it("invokes main and forwards the exit code via injected exit", () => {
    /** @type {number[]} */
    const codes = [];
    cliMain({ exit: (c) => codes.push(c) });
    expect(codes.length).toBe(1);
    // Working tree may have missing flow docs in real folders, so the
    // exit code can legitimately be 0 OR 1.
    expect([0, 1]).toContain(codes[0]);
  });

  it("falls back to process.exit when no io is passed", () => {
    const origExit = process.exit;
    /** @type {number[]} */
    const codes = [];
    // @ts-expect-error — test-only monkey-patch
    process.exit = (c) => {
      codes.push(c ?? 0);
    };
    try {
      cliMain();
      expect(codes.length).toBe(1);
    } finally {
      process.exit = origExit;
    }
  });
});

// --- maybeRunCli -------------------------------------------------------

describe("maybeRunCli", () => {
  it("returns false and skips cliMain when the guard rejects", () => {
    const r = maybeRunCli({
      importMetaUrl: "file:///never-matches.mjs",
      argv1: "/tmp/somewhere-else.mjs",
      exit: () => undefined,
    });
    expect(r).toBe(false);
  });

  it("invokes cliMain and returns true when the guard accepts", () => {
    /** @type {number[]} */
    const codes = [];
    const argv1 = "/tmp/match.mjs";
    const url = pathToFileURL(argv1).href;
    const r = maybeRunCli({
      importMetaUrl: url,
      argv1,
      exit: (c) => codes.push(c),
    });
    expect(r).toBe(true);
    expect(codes.length).toBe(1);
  });
});

// Reference the script path so the test file does not flag the import as
// unused. Spawning is covered indirectly via cliMain / maybeRunCli.
void SCRIPT_PATH;
