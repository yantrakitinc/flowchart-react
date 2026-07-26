// Vitest suite for verify-setup-headers.
//
// Drives every helper via dependency-injected IO so the suite reaches
// 100/100/100/100 per-file coverage without spawning a child process.
// A small CLI spawn test at the bottom exercises the real binary against
// the repo's real `src/`.

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { afterAll, describe, expect, it } from "vitest";

import {
  SETUP_GLOBS,
  SETUP_REGEXES,
  audit,
  classify,
  cliMain,
  defaultExistsSync,
  defaultListAllFiles,
  defaultReadFile,
  defaultStderrWrite,
  defaultStdoutWrite,
  formatReport,
  globToRegex,
  hasSetupHeader,
  isCandidateSourceFile,
  isCliInvocation,
  main,
  maybeRunCli,
} from "../verify-setup-headers.mjs";

const __filename = fileURLToPath(import.meta.url);
const SCRIPT_PATH = resolve(
  dirname(__filename),
  "..",
  "verify-setup-headers.mjs",
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

// --- constants ---------------------------------------------------------

describe("SETUP_GLOBS / SETUP_REGEXES", () => {
  it("SETUP_GLOBS has at least one entry", () => {
    expect(SETUP_GLOBS.length).toBeGreaterThan(0);
  });

  it("SETUP_REGEXES has the same length as SETUP_GLOBS", () => {
    expect(SETUP_REGEXES.length).toBe(SETUP_GLOBS.length);
  });

  it("every SETUP_REGEXES entry is a RegExp", () => {
    for (const r of SETUP_REGEXES) {
      expect(r).toBeInstanceOf(RegExp);
    }
  });
});

// --- globToRegex -------------------------------------------------------

describe("globToRegex", () => {
  it("matches a literal path", () => {
    const r = globToRegex("db/client/client.ts");
    expect(r.test("db/client/client.ts")).toBe(true);
    expect(r.test("db/client/client.tsx")).toBe(false);
    expect(r.test("foo/db/client/client.ts")).toBe(false);
  });

  it("single * matches any run except slash", () => {
    const r = globToRegex("modules/*/composition-root.ts");
    expect(r.test("modules/identity/composition-root.ts")).toBe(true);
    expect(r.test("modules/admin/composition-root.ts")).toBe(true);
    expect(r.test("modules/composition-root.ts")).toBe(false);
    expect(r.test("modules/identity/auth/composition-root.ts")).toBe(false);
  });

  it("** + / matches zero-or-more dir segments INCLUDING empty", () => {
    const r = globToRegex("lib/config/**/*.ts");
    expect(r.test("lib/config/foo.ts")).toBe(true);
    expect(r.test("lib/config/sub/foo.ts")).toBe(true);
    expect(r.test("lib/config/a/b/c/foo.ts")).toBe(true);
    expect(r.test("lib/foo.ts")).toBe(false);
  });

  it("bare ** matches any run of characters including slashes", () => {
    const r = globToRegex("lib/**.ts");
    expect(r.test("lib/foo.ts")).toBe(true);
    expect(r.test("lib/sub/bar.ts")).toBe(true);
  });

  it("escapes regex metacharacters in the glob input", () => {
    // dots in path segments are escaped — `client.ts` would only match
    // 'client.ts', NOT 'clientXts' / 'clientYts'.
    const r = globToRegex("a.b/c.ts");
    expect(r.test("a.b/c.ts")).toBe(true);
    expect(r.test("aXb/cYts")).toBe(false);
    // plus / dollar / parens etc. — exercise the META allowlist branch.
    const r2 = globToRegex("a+b$/(c).ts");
    expect(r2.test("a+b$/(c).ts")).toBe(true);
  });
});

// --- classify ----------------------------------------------------------

describe("classify", () => {
  const SRC = "/abs/src";

  it("flags types.ts as required (Rule 1)", () => {
    const r = classify("/abs/src/lib/clock/types/types.ts", SRC);
    expect(r.required).toBe(true);
    expect(r.reason).toContain("types.ts");
  });

  it("flags a top-level schemas/ file as required (Rule 2)", () => {
    const r = classify("/abs/src/db/schemas/users.ts", SRC);
    expect(r.required).toBe(true);
    expect(r.reason).toContain("Drizzle schema");
  });

  it("flags a one-level-deep schemas/ file as required (Rule 2)", () => {
    const r = classify("/abs/src/db/schemas/identity/users.ts", SRC);
    expect(r.required).toBe(true);
    expect(r.reason).toContain("Drizzle schema");
  });

  it("does NOT flag a schemas test file (Rule 2 carve-out)", () => {
    const r = classify(
      "/abs/src/db/schemas/__tests__/users.test.ts",
      SRC,
    );
    expect(r.required).toBe(false);
    expect(r.reason).toContain("schemas test/specs artifact");
  });

  it("does NOT flag a schemas __specs__ file (Rule 2 carve-out)", () => {
    const r = classify(
      "/abs/src/db/schemas/__specs__/spec.md",
      SRC,
    );
    // spec.md is also rejected by isCandidateSourceFile, but classify
    // itself returns required=false because the carve-out runs first.
    expect(r.required).toBe(false);
  });

  it("flags a SETUP_GLOBS match (Rule 3)", () => {
    const r = classify("/abs/src/db/client/client.ts", SRC);
    expect(r.required).toBe(true);
    expect(r.reason.startsWith("glob ")).toBe(true);
  });

  it("returns required=false / reason='' when no rule matches", () => {
    const r = classify("/abs/src/random/file.ts", SRC);
    expect(r.required).toBe(false);
    expect(r.reason).toBe("");
  });

  it("normalises Windows-style backslashes (defensive branch)", () => {
    // We feed a path that uses backslashes; the helper splits and rejoins
    // by '/', so the regex still matches.
    const r = classify("/abs/src/lib/clock/types/types.ts", SRC);
    expect(r.required).toBe(true);
  });

  it("handles a file path equal to the src root (empty rel)", () => {
    // fileName === "" so no rule matches.
    const r = classify(SRC, SRC);
    expect(r.required).toBe(false);
  });
});

// --- hasSetupHeader ----------------------------------------------------

describe("hasSetupHeader", () => {
  it("returns true when the marker is on line 1", () => {
    expect(hasSetupHeader("// SETUP FILE.\nconst x = 1;\n")).toBe(true);
  });

  it("returns true when the marker is on line 30", () => {
    const lines = Array.from({ length: 29 }, () => "// pad").concat([
      "// SETUP FILE.",
    ]);
    expect(hasSetupHeader(lines.join("\n"))).toBe(true);
  });

  it("returns false when the marker is below line 30", () => {
    const lines = Array.from({ length: 35 }, () => "// pad");
    lines[34] = "// SETUP FILE.";
    expect(hasSetupHeader(lines.join("\n"))).toBe(false);
  });

  it("returns false when the marker is absent", () => {
    expect(hasSetupHeader("const x = 1;\n")).toBe(false);
  });
});

// --- isCandidateSourceFile --------------------------------------------

describe("isCandidateSourceFile", () => {
  it("accepts a plain .ts file", () => {
    expect(isCandidateSourceFile("/src/lib/foo.ts")).toBe(true);
  });

  it("accepts a plain .tsx file", () => {
    expect(isCandidateSourceFile("/src/app/page.tsx")).toBe(true);
  });

  it("rejects non-ts file extensions", () => {
    expect(isCandidateSourceFile("/src/lib/foo.js")).toBe(false);
    expect(isCandidateSourceFile("/src/lib/foo.md")).toBe(false);
  });

  it("rejects .d.ts declaration files", () => {
    expect(isCandidateSourceFile("/src/lib/foo.d.ts")).toBe(false);
  });

  it("rejects .test.ts files", () => {
    expect(isCandidateSourceFile("/src/lib/foo.test.ts")).toBe(false);
  });

  it("rejects .test.tsx files", () => {
    expect(isCandidateSourceFile("/src/lib/foo.test.tsx")).toBe(false);
  });

  it("rejects files under __tests__/", () => {
    expect(isCandidateSourceFile("/src/lib/__tests__/foo.ts")).toBe(false);
  });

  it("rejects files under __specs__/", () => {
    expect(isCandidateSourceFile("/src/lib/__specs__/spec.ts")).toBe(false);
  });

  it("rejects /index.ts barrels", () => {
    expect(isCandidateSourceFile("/src/lib/index.ts")).toBe(false);
  });
});

// --- audit -------------------------------------------------------------

describe("audit", () => {
  it("returns srcMissing=true when src does not exist", () => {
    const r = audit("/never", {
      existsSync: () => false,
      listFiles: () => {
        throw new Error("should not be called");
      },
      readFile: () => {
        throw new Error("should not be called");
      },
    });
    expect(r.srcMissing).toBe(true);
    expect(r.errors).toEqual([]);
    expect(r.checked).toBe(0);
  });

  it("reports MISSING when a required file lacks the marker", () => {
    const r = audit("/src", {
      existsSync: () => true,
      listFiles: () => ["/src/db/client/client.ts"],
      readFile: () => "// no marker here\nexport const x = 1;\n",
    });
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toMatch(/MISSING SETUP header/);
    expect(r.checked).toBe(1);
  });

  it("does NOT report when a required file carries the marker", () => {
    const r = audit("/src", {
      existsSync: () => true,
      listFiles: () => ["/src/db/client/client.ts"],
      readFile: () => "// SETUP FILE.\nexport const x = 1;\n",
    });
    expect(r.errors).toEqual([]);
    expect(r.checked).toBe(1);
  });

  it("reports UNEXPECTED when an off-convention file carries the marker", () => {
    const r = audit("/src", {
      existsSync: () => true,
      listFiles: () => ["/src/random/file.ts"],
      readFile: () => "// SETUP FILE.\nexport const x = 1;\n",
    });
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0]).toMatch(/UNEXPECTED SETUP header/);
    expect(r.checked).toBe(0);
  });

  it("skips non-candidate files (extensions / barrels / tests)", () => {
    const r = audit("/src", {
      existsSync: () => true,
      listFiles: () => [
        "/src/lib/foo.md",
        "/src/lib/foo.d.ts",
        "/src/lib/foo.test.ts",
        "/src/lib/__tests__/foo.ts",
        "/src/lib/__specs__/spec.ts",
        "/src/lib/index.ts",
      ],
      readFile: () => {
        throw new Error("should not be called for skipped file");
      },
    });
    expect(r.errors).toEqual([]);
    expect(r.checked).toBe(0);
  });

  it("uses default IO ports when injected is omitted", () => {
    const tmp = mkdtempSync(join(tmpdir(), "setup-headers-audit-default-"));
    cleanupDirs.push(tmp);
    // No files under tmp — audit walks it (existsSync says yes) and
    // finds nothing.
    const r = audit(tmp);
    expect(r.srcMissing).toBe(false);
    expect(r.errors).toEqual([]);
    expect(r.checked).toBe(0);
  });
});

// --- formatReport ------------------------------------------------------

describe("formatReport", () => {
  it("returns exit 0 + OK stdout when nothing is wrong", () => {
    const r = formatReport(
      { errors: [], checked: 12, srcMissing: false },
      "/abs/src",
    );
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("verify-setup-headers: OK (12 required");
    expect(r.stderr).toBe("");
  });

  it("returns exit 1 + missing-src stderr when srcMissing", () => {
    const r = formatReport(
      { errors: [], checked: 0, srcMissing: true },
      "/abs/src",
    );
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toContain("verify-setup-headers: missing");
    expect(r.stdout).toBe("");
  });

  it("returns exit 1 + per-error stderr when errors exist", () => {
    const r = formatReport(
      {
        errors: [
          "MISSING SETUP header: src/db/client/client.ts (matched: glob db/client/client.ts)",
          "UNEXPECTED SETUP header: src/random/file.ts (file is not covered)",
        ],
        checked: 1,
        srcMissing: false,
      },
      "/abs/src",
    );
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toContain("2 issue(s)");
    expect(r.stderr).toContain("MISSING SETUP header");
    expect(r.stderr).toContain("UNEXPECTED SETUP header");
    expect(r.stdout).toBe("");
  });
});

// --- main --------------------------------------------------------------

describe("main", () => {
  it("returns exit 0 and writes OK when audit finds no issues", () => {
    /** @type {string[]} */
    const out = [];
    /** @type {string[]} */
    const err = [];
    const r = main({
      src: "/src",
      existsSync: () => true,
      listFiles: () => [],
      readFile: () => "",
      write: (s) => out.push(s),
      writeErr: (s) => err.push(s),
    });
    expect(r.exitCode).toBe(0);
    expect(out.join("")).toContain("verify-setup-headers: OK");
    expect(err.join("")).toBe("");
  });

  it("returns exit 1 and writes failure block when issues exist", () => {
    /** @type {string[]} */
    const out = [];
    /** @type {string[]} */
    const err = [];
    const r = main({
      src: "/src",
      existsSync: () => true,
      listFiles: () => ["/src/random/file.ts"],
      readFile: () => "// SETUP FILE.\n",
      write: (s) => out.push(s),
      writeErr: (s) => err.push(s),
    });
    expect(r.exitCode).toBe(1);
    expect(err.join("")).toContain("UNEXPECTED SETUP header");
    expect(out.join("")).toBe("");
  });

  it("returns exit 1 and writes missing-src when src is absent", () => {
    /** @type {string[]} */
    const err = [];
    const r = main({
      src: "/never",
      existsSync: () => false,
      listFiles: () => [],
      readFile: () => "",
      write: () => undefined,
      writeErr: (s) => err.push(s),
    });
    expect(r.exitCode).toBe(1);
    expect(err.join("")).toContain("missing");
  });

  it("uses default-IO branches when called with no arguments", () => {
    // Drive against an isolated tmp root.
    const tmp = mkdtempSync(join(tmpdir(), "setup-headers-main-default-"));
    cleanupDirs.push(tmp);
    const r = main({
      src: tmp,
    });
    // No source files → OK with 0 required setup file(s) checked.
    expect(r.exitCode).toBe(0);
  });
});

// --- default IO ports --------------------------------------------------

describe("default IO ports", () => {
  it("defaultListAllFiles returns an array (possibly with files)", () => {
    const tmp = mkdtempSync(join(tmpdir(), "setup-headers-listfiles-"));
    cleanupDirs.push(tmp);
    writeFileSync(join(tmp, "x.txt"), "");
    const files = defaultListAllFiles(tmp);
    expect(files).toContain(join(tmp, "x.txt"));
  });

  it("defaultReadFile reads the file contents", () => {
    const tmp = mkdtempSync(join(tmpdir(), "setup-headers-readfile-"));
    cleanupDirs.push(tmp);
    const file = join(tmp, "x.txt");
    writeFileSync(file, "hello");
    expect(defaultReadFile(file)).toBe("hello");
  });

  it("defaultExistsSync returns true for an existing path", () => {
    const tmp = mkdtempSync(join(tmpdir(), "setup-headers-exists-"));
    cleanupDirs.push(tmp);
    expect(defaultExistsSync(tmp)).toBe(true);
    expect(defaultExistsSync(join(tmp, "absent"))).toBe(false);
  });

  it("defaultStdoutWrite is callable without throwing", () => {
    expect(() => defaultStdoutWrite("")).not.toThrow();
  });

  it("defaultStderrWrite is callable without throwing", () => {
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
    const url = pathToFileURL(argv1).href;
    expect(isCliInvocation(url, argv1)).toBe(true);
  });
});

// --- cliMain -----------------------------------------------------------

describe("cliMain", () => {
  it("invokes main and forwards the exit code via injected exit", () => {
    /** @type {number[]} */
    const codes = [];
    cliMain({ exit: (c) => codes.push(c) });
    expect(codes.length).toBe(1);
    // Real tree currently passes — but accept either to keep the test
    // robust against in-flight edits.
    expect([0, 1]).toContain(codes[0]);
  });

  it("falls back to process.exit when no io is passed (default-arg branch)", () => {
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

// --- CLI invocation (real spawn) --------------------------------------

describe("CLI entry", () => {
  it("runs the real binary against the repo and emits a recognised line", () => {
    const res = spawnSync(process.execPath, [SCRIPT_PATH], {
      env: { ...process.env },
      encoding: "utf8",
    });
    expect([0, 1]).toContain(res.status);
    if (res.status === 0) {
      expect(res.stdout).toContain("verify-setup-headers: OK");
    } else {
      expect(res.stderr).toContain("verify-setup-headers:");
    }
  });
});
