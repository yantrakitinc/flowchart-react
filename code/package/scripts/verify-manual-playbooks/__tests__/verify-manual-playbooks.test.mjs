// Vitest suite for verify-manual-playbooks (markdown manual flows).
//
// Drives every helper via dependency-injected IO so the suite reaches full
// per-file coverage without spawning a child process. A small CLI spawn test at
// the bottom exercises the real binary against the repo's real src/app/.

import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { afterAll, describe, expect, it } from "vitest";

import {
  REQUIRED_SECTIONS,
  audit,
  checkFlowMd,
  cliMain,
  defaultExistsSync,
  defaultListAllDirs,
  defaultReadDirSync,
  defaultReadFile,
  defaultStatSync,
  defaultStderrWrite,
  defaultStdoutWrite,
  escapeRegExp,
  formatReport,
  isCliInvocation,
  isSurfaceFolder,
  main,
  manualFiles,
  maybeRunCli,
} from "../verify-manual-playbooks.mjs";

const __filename = fileURLToPath(import.meta.url);
const SCRIPT_PATH = resolve(dirname(__filename), "..", "verify-manual-playbooks.mjs");

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

const fileStat = () => ({ isFile: () => true, isDirectory: () => false });

/** A fully-compliant manual flow markdown. */
const GOOD_MD = [
  "# post",
  "## Target",
  "local — http://localhost:3000",
  "## Preconditions",
  "- none",
  "## Steps",
  "1. POST with another principal's id → expected: 403",
  "## Assertions",
  "- MUST hold: the valid call persists one row",
  "- MUST NOT happen: a cross-principal write",
  "## Report",
  "POST results to /api/v1/manual-results/post and print them.",
].join("\n");

// --- constants ---------------------------------------------------------

describe("REQUIRED_SECTIONS", () => {
  it("is exactly the five markdown sections", () => {
    expect(REQUIRED_SECTIONS).toEqual([
      "## Target",
      "## Preconditions",
      "## Steps",
      "## Assertions",
      "## Report",
    ]);
  });
});

// --- isSurfaceFolder ---------------------------------------------------

describe("isSurfaceFolder", () => {
  it("true when route.ts is present", () => {
    expect(isSurfaceFolder("/x", { readDir: () => ["route.ts"], statFile: fileStat })).toBe(true);
  });
  it("true when only page.tsx is present", () => {
    expect(isSurfaceFolder("/x", { readDir: () => ["page.tsx"], statFile: fileStat })).toBe(true);
  });
  it("false when neither is present", () => {
    expect(isSurfaceFolder("/x", { readDir: () => ["other.ts"], statFile: fileStat })).toBe(false);
  });
  it("false when readdir throws", () => {
    expect(isSurfaceFolder("/x", { readDir: () => { throw new Error("EACCES"); }, statFile: fileStat })).toBe(false);
  });
  it("false (continue) when stat throws", () => {
    expect(isSurfaceFolder("/x", { readDir: () => ["route.ts"], statFile: () => { throw new Error("ENOENT"); } })).toBe(false);
  });
  it("false when route.ts is a directory", () => {
    expect(isSurfaceFolder("/x", { readDir: () => ["route.ts"], statFile: () => ({ isFile: () => false }) })).toBe(false);
  });
  it("default IO: tmp dir without route/page → false", () => {
    const tmp = mkdtempSync(join(tmpdir(), "mp-surface-"));
    cleanupDirs.push(tmp);
    expect(isSurfaceFolder(tmp)).toBe(false);
  });
  it("default IO: tmp dir with route.ts → true", () => {
    const tmp = mkdtempSync(join(tmpdir(), "mp-surface-hit-"));
    cleanupDirs.push(tmp);
    writeFileSync(join(tmp, "route.ts"), "");
    expect(isSurfaceFolder(tmp)).toBe(true);
  });
});

// --- manualFiles -------------------------------------------------------

describe("manualFiles", () => {
  it("splits .md and legacy .yaml/.yml", () => {
    const r = manualFiles("/f", {
      existsSync: () => true,
      readDir: () => ["a.md", "b.yaml", "c.yml", "README.txt"],
    });
    expect(r.md.map((p) => p.split("/").pop())).toEqual(["a.md"]);
    expect(r.yaml.map((p) => p.split("/").pop()).sort()).toEqual(["b.yaml", "c.yml"]);
  });
  it("empty when the manual dir is absent", () => {
    expect(manualFiles("/f", { existsSync: () => false, readDir: () => [] })).toEqual({ md: [], yaml: [] });
  });
  it("empty when readdir throws", () => {
    expect(manualFiles("/f", { existsSync: () => true, readDir: () => { throw new Error("x"); } })).toEqual({ md: [], yaml: [] });
  });
  it("default IO: tmp dir → empty", () => {
    const tmp = mkdtempSync(join(tmpdir(), "mp-manualfiles-"));
    cleanupDirs.push(tmp);
    expect(manualFiles(tmp)).toEqual({ md: [], yaml: [] });
  });
});

// --- escapeRegExp ------------------------------------------------------

describe("escapeRegExp", () => {
  it("escapes regex metacharacters", () => {
    expect(escapeRegExp("## a.b*c")).toBe("## a\\.b\\*c");
  });
});

// --- checkFlowMd -------------------------------------------------------

describe("checkFlowMd", () => {
  it("returns [] for a compliant flow", () => {
    expect(checkFlowMd(GOOD_MD)).toEqual([]);
  });
  it("flags every missing section", () => {
    const problems = checkFlowMd("# post\nnothing else\n");
    expect(problems.filter((p) => p.startsWith("missing section")).length).toBe(5);
  });
  it("flags a missing MUST NOT", () => {
    const md = GOOD_MD.replace("- MUST NOT happen: a cross-principal write", "- nothing negative");
    expect(checkFlowMd(md).some((p) => p.includes("MUST NOT"))).toBe(true);
  });
  it("flags a missing manual-results route in Report", () => {
    const md = GOOD_MD.replace("/api/v1/manual-results/post", "/somewhere/else");
    expect(checkFlowMd(md).some((p) => p.includes("manual-results"))).toBe(true);
  });
});

// --- audit -------------------------------------------------------------

describe("audit", () => {
  const surfaceIO = (manualNames, fileText) => ({
    listDirs: () => ["/app/api/v1/x"],
    readDir: (p) => {
      if (p === "/app/api/v1/x") return ["route.ts"];
      if (p.endsWith("/__specs__/manual")) return manualNames;
      return [];
    },
    statFile: fileStat,
    existsSync: (p) => p.endsWith("/__specs__/manual"),
    readFile: () => fileText,
  });

  it("0 surfaces when listDirs is empty", () => {
    const r = audit("/app", { listDirs: () => [], readDir: () => [], statFile: fileStat, existsSync: () => false, readFile: () => "" });
    expect(r).toEqual({ errors: [], surfaces: 0, flows: 0 });
  });
  it("skips non-surface folders", () => {
    const r = audit("/app", { listDirs: () => ["/app/x"], readDir: () => ["x.ts"], statFile: fileStat, existsSync: () => false, readFile: () => "" });
    expect(r.surfaces).toBe(0);
  });
  it("MISSING when a surface has no .md flow", () => {
    const r = audit("/app", surfaceIO([], ""));
    expect(r.surfaces).toBe(1);
    expect(r.errors.some((e) => e.includes("MISSING __specs__/manual"))).toBe(true);
  });
  it("LEGACY_YAML when a surface still has a .yaml manual", () => {
    const r = audit("/app", surfaceIO(["post.yaml"], ""));
    expect(r.errors.some((e) => e.includes("LEGACY_YAML"))).toBe(true);
  });
  it("passes a compliant .md flow", () => {
    const r = audit("/app", surfaceIO(["post.md"], GOOD_MD));
    expect(r.errors).toEqual([]);
    expect(r.flows).toBe(1);
  });
  it("reports section problems in a bad .md flow", () => {
    const r = audit("/app", surfaceIO(["post.md"], "# post\n"));
    expect(r.errors.length).toBeGreaterThan(0);
  });
  it("default IO against a tmp dir → 0 surfaces", () => {
    const tmp = mkdtempSync(join(tmpdir(), "mp-audit-"));
    cleanupDirs.push(tmp);
    expect(audit(tmp)).toEqual({ errors: [], surfaces: 0, flows: 0 });
  });
});

// --- formatReport ------------------------------------------------------

describe("formatReport", () => {
  it("exit 0 + OK when clean", () => {
    const r = formatReport({ errors: [], surfaces: 3, flows: 4 });
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("verify-manual-playbooks: OK (3 surface(s) checked, 4 runnable .md flow(s))");
  });
  it("exit 1 + issues on stderr", () => {
    const r = formatReport({ errors: ["MISSING a", "b: missing section \"## Steps\""], surfaces: 1, flows: 0 });
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toContain("2 issue(s)");
    expect(r.stderr).toContain("MISSING a");
  });
});

// --- main --------------------------------------------------------------

describe("main", () => {
  it("exit 0 + OK stdout when clean", () => {
    const out = [];
    const err = [];
    const r = main({ app: "/app", listDirs: () => [], readDir: () => [], statFile: fileStat, existsSync: () => false, readFile: () => "", write: (s) => out.push(s), writeErr: (s) => err.push(s) });
    expect(r.exitCode).toBe(0);
    expect(out.join("")).toContain("verify-manual-playbooks: OK");
    expect(err.join("")).toBe("");
  });
  it("exit 1 + failure block when a surface lacks a flow", () => {
    const out = [];
    const err = [];
    const r = main({
      app: "/app",
      listDirs: () => ["/app/api/v1/x"],
      readDir: (p) => (p === "/app/api/v1/x" ? ["route.ts"] : []),
      statFile: fileStat,
      existsSync: () => false,
      readFile: () => "",
      write: (s) => out.push(s),
      writeErr: (s) => err.push(s),
    });
    expect(r.exitCode).toBe(1);
    expect(err.join("")).toContain("MISSING __specs__/manual");
    expect(out.join("")).toBe("");
  });
  it("default IO branches when called with just app", () => {
    const tmp = mkdtempSync(join(tmpdir(), "mp-main-"));
    cleanupDirs.push(tmp);
    expect(main({ app: tmp }).exitCode).toBe(0);
  });
});

// --- default IO ports --------------------------------------------------

describe("default IO ports", () => {
  it("defaultListAllDirs includes the root", () => {
    const tmp = mkdtempSync(join(tmpdir(), "mp-listdirs-"));
    cleanupDirs.push(tmp);
    expect(defaultListAllDirs(tmp)).toContain(tmp);
  });
  it("defaultExistsSync true/false", () => {
    const tmp = mkdtempSync(join(tmpdir(), "mp-exists-"));
    cleanupDirs.push(tmp);
    expect(defaultExistsSync(tmp)).toBe(true);
    expect(defaultExistsSync(join(tmp, "no"))).toBe(false);
  });
  it("defaultReadDirSync lists entries", () => {
    const tmp = mkdtempSync(join(tmpdir(), "mp-readdir-"));
    cleanupDirs.push(tmp);
    writeFileSync(join(tmp, "a"), "");
    expect(defaultReadDirSync(tmp)).toContain("a");
  });
  it("defaultStatSync returns a Stats-like object", () => {
    const tmp = mkdtempSync(join(tmpdir(), "mp-stat-"));
    cleanupDirs.push(tmp);
    expect(defaultStatSync(tmp).isDirectory()).toBe(true);
  });
  it("defaultReadFile reads contents", () => {
    const tmp = mkdtempSync(join(tmpdir(), "mp-readfile-"));
    cleanupDirs.push(tmp);
    const f = join(tmp, "x.md");
    writeFileSync(f, "hello");
    expect(defaultReadFile(f)).toBe("hello");
  });
  it("write ports are callable", () => {
    expect(() => defaultStdoutWrite("")).not.toThrow();
    expect(() => defaultStderrWrite("")).not.toThrow();
  });
});

// --- CLI plumbing ------------------------------------------------------

describe("isCliInvocation", () => {
  it("false when argv1 undefined", () => expect(isCliInvocation("file:///a.mjs", undefined)).toBe(false));
  it("false when argv1 empty", () => expect(isCliInvocation("file:///a.mjs", "")).toBe(false));
  it("false when argv1 mismatches", () => expect(isCliInvocation("file:///a.mjs", "/tmp/b.mjs")).toBe(false));
  it("true when argv1 resolves to the url", () => {
    const argv1 = "/tmp/x.mjs";
    expect(isCliInvocation(pathToFileURL(argv1).href, argv1)).toBe(true);
  });
});

describe("cliMain", () => {
  it("forwards the exit code via injected exit", () => {
    const codes = [];
    cliMain({ exit: (c) => codes.push(c) });
    expect(codes.length).toBe(1);
    expect([0, 1]).toContain(codes[0]);
  });
  it("falls back to process.exit (default-arg branch)", () => {
    const orig = process.exit;
    const codes = [];
    // @ts-expect-error test-only
    process.exit = (c) => { codes.push(c ?? 0); };
    try {
      cliMain();
      expect(codes.length).toBe(1);
    } finally {
      process.exit = orig;
    }
  });
});

describe("maybeRunCli", () => {
  it("false when the guard rejects", () => {
    expect(maybeRunCli({ importMetaUrl: "file:///never.mjs", argv1: "/tmp/else.mjs", exit: () => undefined })).toBe(false);
  });
  it("true + runs cliMain when the guard accepts", () => {
    const codes = [];
    const argv1 = "/tmp/match.mjs";
    expect(maybeRunCli({ importMetaUrl: pathToFileURL(argv1).href, argv1, exit: (c) => codes.push(c) })).toBe(true);
    expect(codes.length).toBe(1);
  });
});

describe("CLI entry (real spawn)", () => {
  it("runs against the repo and emits a recognised line", () => {
    const res = spawnSync(process.execPath, [SCRIPT_PATH], { env: { ...process.env }, encoding: "utf8" });
    expect([0, 1]).toContain(res.status);
    if (res.status === 0) expect(res.stdout).toContain("verify-manual-playbooks: OK");
    else expect(res.stderr).toContain("verify-manual-playbooks:");
  });
});
