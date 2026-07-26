// Verifier Mode A — unit suite. Drives the script via injected spawn /
// readFile / writeFile / now so the tests never touch the real workspace.

import { describe, expect, it } from "vitest";
import {
  buildBoundaryGrepChecks,
  checkLockShape,
  cliMain,
  dropCommentLines,
  formatReport,
  hasSpecsFolder,
  hasTestsFolder,
  isCliInvocation,
  main,
  maybeRunCli,
  runBoundaryGreps,
  runScopedLint,
  runScopedVitest,
  runTypecheck,
  stampLock,
  unlockLock,
} from "../verify-mode-a.mjs";

import { readFileSync } from "node:fs";

import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { afterAll } from "vitest";
import { pathToFileURL } from "node:url";

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

function freshSlice(label = "vma") {
  const tmp = mkdtempSync(join(tmpdir(), `${label}-`));
  cleanupDirs.push(tmp);
  const specs = join(tmp, "__specs__");
  mkdirSync(specs, { recursive: true });
  writeFileSync(
    join(specs, "standards-compliance.yaml"),
    `status: locked\nverified: "100%"\nlast_validated: 2026-05-23T00:00:00Z\n`,
  );
  return tmp;
}

describe("hasSpecsFolder", () => {
  it("true when __specs__/ exists", () => {
    const tmp = freshSlice("vma-specs-yes");
    expect(hasSpecsFolder(tmp)).toBe(true);
  });
  it("false when __specs__/ missing", () => {
    const tmp = mkdtempSync(join(tmpdir(), "vma-specs-no-"));
    cleanupDirs.push(tmp);
    expect(hasSpecsFolder(tmp)).toBe(false);
  });
});

describe("hasTestsFolder", () => {
  it("false when __tests__/ missing", () => {
    const tmp = freshSlice("vma-tests-no");
    expect(hasTestsFolder(tmp)).toBe(false);
  });
  it("true when __tests__/ present", () => {
    const tmp = freshSlice("vma-tests-yes");
    mkdirSync(join(tmp, "__tests__"));
    expect(hasTestsFolder(tmp)).toBe(true);
  });
});

describe("runScopedVitest", () => {
  it("SKIP when no __tests__/", () => {
    const tmp = freshSlice("vma-vt-skip");
    const r = runScopedVitest(tmp, { spawn: () => ({ status: 0 }) });
    expect(r.status).toBe("SKIP");
  });
  it("PASS when spawn returns 0", () => {
    const tmp = freshSlice("vma-vt-pass");
    mkdirSync(join(tmp, "__tests__"));
    const r = runScopedVitest(tmp, { spawn: () => ({ status: 0, stdout: "", stderr: "" }) });
    expect(r.status).toBe("PASS");
  });
  it("FAIL when spawn returns non-zero", () => {
    const tmp = freshSlice("vma-vt-fail");
    mkdirSync(join(tmp, "__tests__"));
    const r = runScopedVitest(tmp, { spawn: () => ({ status: 1, stdout: "oops", stderr: "boom" }) });
    expect(r.status).toBe("FAIL");
    expect(r.detail).toContain("oops");
  });
  it("FAIL on spawn error", () => {
    const tmp = freshSlice("vma-vt-err");
    mkdirSync(join(tmp, "__tests__"));
    const r = runScopedVitest(tmp, { spawn: () => ({ status: null, error: new Error("noexec") }) });
    expect(r.status).toBe("FAIL");
    expect(r.detail).toContain("noexec");
  });
  it("passes explicit sliceTests + callerTests through to vitest argv", () => {
    const tmp = freshSlice("vma-vt-explicit");
    /** @type {string[]} */
    const argvSeen = [];
    const r = runScopedVitest(tmp, {
      sliceTests: ["/repo/a.test.ts"],
      callerTests: ["/repo/b.test.ts"],
      spawn: (_cmd, args) => {
        argvSeen.push(...args);
        return { status: 0, stdout: "", stderr: "" };
      },
    });
    expect(r.status).toBe("PASS");
    expect(argvSeen).toContain("/repo/a.test.ts");
    expect(argvSeen).toContain("/repo/b.test.ts");
  });
  it("FAIL detail coerces undefined stdout/stderr to empty string", () => {
    const tmp = freshSlice("vma-vt-noout");
    mkdirSync(join(tmp, "__tests__"));
    const r = runScopedVitest(tmp, { spawn: () => ({ status: 1 }) });
    expect(r.status).toBe("FAIL");
    expect(r.detail).toBe("");
  });
  it("SKIP detail renders 'slice' when the slice IS the root (empty relative)", () => {
    // Drive the `relative(ROOT, sliceAbs) || "slice"` falsy branch by
    // pointing sliceAbs at ROOT (no __tests__ folder, no sliceTests).
    const sliceAbs = resolve(import.meta.dirname, "..", "..", "..");
    const r = runScopedVitest(sliceAbs, { spawn: () => ({ status: 0 }) });
    expect(r.status).toBe("SKIP");
    expect(r.detail).toContain("slice");
  });
  it("uses ROOT as default cwd when io.cwd is omitted", () => {
    // Drive `io.cwd ?? ROOT` default. The slice has no __tests__ folder
    // so SKIP fires before spawn is invoked.
    const tmp = freshSlice("vma-vt-defaults");
    const r = runScopedVitest(tmp, { spawn: () => ({ status: 0 }) });
    expect(r.status).toBe("SKIP");
  });
});

describe("runScopedLint", () => {
  it("PASS when spawn returns 0", () => {
    const r = runScopedLint("/tmp/anything", { spawn: () => ({ status: 0, stdout: "", stderr: "" }) });
    expect(r.status).toBe("PASS");
  });
  it("PASS detail counts undefined callers as 0", () => {
    // Drive the `io.callers?.length ?? 0` branch where callers is omitted.
    const r = runScopedLint("/tmp/anything", { spawn: () => ({ status: 0 }) });
    expect(r.status).toBe("PASS");
    expect(r.detail).toContain("0 caller(s) clean");
  });
  it("FAIL when spawn returns non-zero", () => {
    const r = runScopedLint("/tmp/anything", { spawn: () => ({ status: 1, stdout: "lint err", stderr: "" }) });
    expect(r.status).toBe("FAIL");
  });
  it("FAIL detail coerces undefined stdout/stderr to empty string", () => {
    const r = runScopedLint("/tmp/anything", { spawn: () => ({ status: 1 }) });
    expect(r.status).toBe("FAIL");
    expect(r.detail).toBe("");
  });
  it("FAIL on spawn error", () => {
    const r = runScopedLint("/tmp/anything", { spawn: () => ({ status: null, error: new Error("oops") }) });
    expect(r.status).toBe("FAIL");
    expect(r.detail).toContain("oops");
  });
});

describe("runTypecheck", () => {
  it("PASS when spawn returns 0", () => {
    const r = runTypecheck({ spawn: () => ({ status: 0 }) });
    expect(r.status).toBe("PASS");
  });
  it("FAIL when spawn returns non-zero", () => {
    const r = runTypecheck({ spawn: () => ({ status: 1, stdout: "ts err", stderr: "" }) });
    expect(r.status).toBe("FAIL");
  });
  it("FAIL on spawn error", () => {
    const r = runTypecheck({ spawn: () => ({ status: null, error: new Error("noexec") }) });
    expect(r.status).toBe("FAIL");
  });
  it("FAIL detail coerces undefined stdout/stderr to empty string", () => {
    // Drive the `res.stdout ?? ""` + `res.stderr ?? ""` defaults by
    // returning only `status: 1`.
    const r = runTypecheck({ spawn: () => ({ status: 1 }) });
    expect(r.status).toBe("FAIL");
    expect(r.detail).toBe("");
  });
});

describe("dropCommentLines", () => {
  it("returns empty string for empty input", () => {
    expect(dropCommentLines("")).toBe("");
  });
  it("drops a JSDoc-star line", () => {
    const input = "/path/foo.ts:15: * drizzle-orm, no @/db client";
    expect(dropCommentLines(input)).toBe("");
  });
  it("drops a JSDoc opener line", () => {
    const input = "/path/foo.ts:14:/** drizzle */";
    expect(dropCommentLines(input)).toBe("");
  });
  it("drops a JSDoc closer line", () => {
    const input = "/path/foo.ts:16: */ // drizzle";
    expect(dropCommentLines(input)).toBe("");
  });
  it("drops a // single-line comment", () => {
    const input = "/path/foo.ts:20:  // forbid as AuthorizedPrincipal anywhere";
    expect(dropCommentLines(input)).toBe("");
  });
  it("keeps a runtime code line containing the forbidden pattern", () => {
    const input = "/path/foo.ts:90:  return x as AuthorizedPrincipal<S>;";
    expect(dropCommentLines(input)).toBe(input);
  });
  it("keeps real code, drops comments, in a mixed block", () => {
    const input = [
      "/a/b.ts:1: * drizzle in JSDoc",
      "/a/b.ts:2:  // also drizzle in comment",
      "/a/b.ts:3:  const db = drizzle(client);",
    ].join("\n");
    expect(dropCommentLines(input)).toBe("/a/b.ts:3:  const db = drizzle(client);");
  });
  it("keeps lines that lack the path:line: shape (safe default)", () => {
    expect(dropCommentLines("no-colon-line")).toBe("no-colon-line");
  });
  it("keeps lines that have only a single colon (one-colon safe default)", () => {
    // `firstColon` succeeds but `secondColon` returns -1 — drive the
    // second `kept.push(line); continue;` branch.
    expect(dropCommentLines("one:colon-only")).toBe("one:colon-only");
  });
});

describe("runBoundaryGreps", () => {
  it("PASS when no offenders (grep returns status 1)", () => {
    const r = runBoundaryGreps("/tmp/x", { spawn: () => ({ status: 1, stdout: "", stderr: "" }) });
    expect(r.status).toBe("PASS");
  });
  it("treats undefined stdout as empty (covers `res.stdout ?? \"\"` default)", () => {
    // grep returns status 0 (matches) but provides no stdout field.
    const r = runBoundaryGreps("/tmp/src/features/foo", {
      spawn: () => ({ status: 0 }),
    });
    // Empty filtered output → not flagged as an offender → PASS.
    expect(r.status).toBe("PASS");
  });
  it("FAIL when grep finds a direct DB-driver import outside src/db/", () => {
    const r = runBoundaryGreps("/tmp/src/features/foo", {
      spawn: (_cmd, args) => {
        if (args && args.some((a) => String(a).includes("drizzle-orm|postgres-js"))) {
          return {
            status: 0,
            stdout: "/tmp/src/features/foo/foo.ts:1:import { sql } from \"drizzle-orm\";",
          };
        }
        return { status: 1, stdout: "", stderr: "" };
      },
    });
    expect(r.status).toBe("FAIL");
    expect(r.detail).toContain("direct DB-driver imports outside src/db/");
  });
  it("PASS when grep finds a DB-driver import but slice is under src/db/", () => {
    const r = runBoundaryGreps("/tmp/src/db/repo", {
      spawn: (_cmd, args) => {
        if (args && args.some((a) => String(a).includes("drizzle-orm|postgres-js"))) {
          return {
            status: 0,
            stdout: "/tmp/src/db/repo/repo.ts:1:import { sql } from \"drizzle-orm\";",
          };
        }
        return { status: 1, stdout: "", stderr: "" };
      },
    });
    expect(r.status).toBe("PASS");
  });
  it("skips a check whose spawn errored", () => {
    const r = runBoundaryGreps("/tmp/src/features/foo", {
      spawn: () => ({ status: null, error: new Error("oops") }),
    });
    expect(r.status).toBe("PASS");
  });

  // --- exclude-dir consistency across all three greps -----------------------

  it("passes --exclude-dir=__tests__ to the direct DB-driver import grep", () => {
    /** @type {string[][]} */
    const calls = [];
    runBoundaryGreps("/tmp/src/features/foo", {
      spawn: (_cmd, args) => {
        calls.push(args ?? []);
        return { status: 1, stdout: "", stderr: "" };
      },
    });
    const driverCall = calls.find((a) => a.some((s) => String(s).includes("drizzle-orm|postgres-js")));
    expect(driverCall).toBeDefined();
    expect(driverCall).toContain("--exclude-dir=__tests__");
  });
  it("passes --exclude-dir=__tests__ to the ts-ignore grep", () => {
    /** @type {string[][]} */
    const calls = [];
    runBoundaryGreps("/tmp/src/features/foo", {
      spawn: (_cmd, args) => {
        calls.push(args ?? []);
        return { status: 1, stdout: "", stderr: "" };
      },
    });
    const tsCall = calls.find((a) => a.some((s) => String(s).includes("@ts-ignore")));
    expect(tsCall).toBeDefined();
    expect(tsCall).toContain("--exclude-dir=__tests__");
  });
  it("passes --exclude-dir=__tests__ to the AuthorizedPrincipal-cast grep", () => {
    /** @type {string[][]} */
    const calls = [];
    runBoundaryGreps("/tmp/src/features/foo", {
      spawn: (_cmd, args) => {
        calls.push(args ?? []);
        return { status: 1, stdout: "", stderr: "" };
      },
    });
    const castCall = calls.find((a) => a.some((s) => String(s).includes("as AuthorizedPrincipal")));
    expect(castCall).toBeDefined();
    expect(castCall).toContain("--exclude-dir=__tests__");
  });

  // --- ts-ignore branch: test files vs comments vs runtime -----------------

  it("FAIL when grep finds @ts-expect-error as runtime code outside __tests__/", () => {
    const r = runBoundaryGreps("/tmp/src/features/foo", {
      spawn: (_cmd, args) => {
        if (args && args.some((a) => String(a).includes("@ts-ignore"))) {
          return { status: 0, stdout: "/tmp/src/features/foo/foo.ts:42:  // @ts-expect-error keeps the cast" };
        }
        return { status: 1, stdout: "", stderr: "" };
      },
    });
    // The directive is, by language design, always written as `//
    // @ts-(ignore|expect-error)`. The ts-ignore grep MUST NOT drop comment
    // lines or the gate is silently neutralized — every match would be skipped.
    expect(r.status).toBe("FAIL");
    expect(r.detail).toContain("@ts-ignore / @ts-expect-error outside __tests__/");
  });
  it("PASS when only test files hold @ts-expect-error (grep excludes __tests__/ → no matches)", () => {
    const r = runBoundaryGreps("/tmp/src/features/foo", {
      spawn: (_cmd, args) => {
        const list = args ?? [];
        if (list.some((a) => String(a).includes("@ts-ignore"))) {
          if (!list.includes("--exclude-dir=__tests__")) {
            return { status: 0, stdout: "should-have-excluded-tests" };
          }
        }
        return { status: 1, stdout: "", stderr: "" };
      },
    });
    expect(r.status).toBe("PASS");
  });

  // --- direct DB-driver import branch: test files vs comments vs runtime ---

  it("PASS when drizzle-orm mention lives in a JSDoc comment", () => {
    const r = runBoundaryGreps("/tmp/src/features/foo", {
      spawn: (_cmd, args) => {
        const list = args ?? [];
        if (list.some((a) => String(a).includes("drizzle-orm|postgres-js"))) {
          return {
            status: 0,
            stdout: "/tmp/src/features/foo/foo.ts:15: * drizzle-orm, no @/db client",
          };
        }
        return { status: 1, stdout: "", stderr: "" };
      },
    });
    expect(r.status).toBe("PASS");
  });
  it("PASS when DB-driver import hits live only under __tests__/ (real grep would exclude them)", () => {
    const r = runBoundaryGreps("/tmp/src/features/foo", {
      spawn: (_cmd, args) => {
        const list = args ?? [];
        if (list.some((a) => String(a).includes("drizzle-orm|postgres-js"))) {
          if (!list.includes("--exclude-dir=__tests__")) {
            return {
              status: 0,
              stdout: "/tmp/src/features/foo/__tests__/x.test.ts:2:import { drizzle } from 'drizzle-orm/pglite';",
            };
          }
        }
        return { status: 1, stdout: "", stderr: "" };
      },
    });
    expect(r.status).toBe("PASS");
  });
  it("FAIL when `import { sql } from \"drizzle-orm\"` appears in a non-test, non-db file", () => {
    const r = runBoundaryGreps("/tmp/src/features/foo", {
      spawn: (_cmd, args) => {
        const list = args ?? [];
        if (list.some((a) => String(a).includes("drizzle-orm|postgres-js"))) {
          return {
            status: 0,
            stdout: "/tmp/src/features/foo/foo.ts:1:import { sql } from \"drizzle-orm\";",
          };
        }
        return { status: 1, stdout: "", stderr: "" };
      },
    });
    expect(r.status).toBe("FAIL");
    expect(r.detail).toContain("direct DB-driver imports outside src/db/");
  });
  it("FAIL when a drizzle-orm subpath import appears in a non-test, non-db file", () => {
    const r = runBoundaryGreps("/tmp/src/features/foo", {
      spawn: (_cmd, args) => {
        const list = args ?? [];
        if (list.some((a) => String(a).includes("drizzle-orm|postgres-js"))) {
          return {
            status: 0,
            stdout: "/tmp/src/features/foo/foo.ts:1:import { migrate } from \"drizzle-orm/postgres-js/migrator\";",
          };
        }
        return { status: 1, stdout: "", stderr: "" };
      },
    });
    expect(r.status).toBe("FAIL");
    expect(r.detail).toContain("direct DB-driver imports outside src/db/");
  });

  // --- AuthorizedPrincipal cast branch: tests vs comments vs runtime --------

  it("PASS when cast hit lives in a JSDoc comment", () => {
    const r = runBoundaryGreps("/tmp/src/features/foo", {
      spawn: (_cmd, args) => {
        const list = args ?? [];
        if (list.some((a) => String(a).includes("as AuthorizedPrincipal"))) {
          return {
            status: 0,
            stdout: "/tmp/src/features/foo/foo.ts:19: * forbid `as AuthorizedPrincipal<...>` casts",
          };
        }
        return { status: 1, stdout: "", stderr: "" };
      },
    });
    expect(r.status).toBe("PASS");
  });
  it("PASS when cast hit lives in a // single-line comment", () => {
    const r = runBoundaryGreps("/tmp/src/features/foo", {
      spawn: (_cmd, args) => {
        const list = args ?? [];
        if (list.some((a) => String(a).includes("as AuthorizedPrincipal"))) {
          return {
            status: 0,
            stdout: "/tmp/src/features/foo/foo.ts:86:  // forbid `as AuthorizedPrincipal<...>` anywhere",
          };
        }
        return { status: 1, stdout: "", stderr: "" };
      },
    });
    expect(r.status).toBe("PASS");
  });
  it("PASS when cast hits live only under __tests__/ (real grep would exclude them)", () => {
    const r = runBoundaryGreps("/tmp/src/features/foo", {
      spawn: (_cmd, args) => {
        const list = args ?? [];
        if (list.some((a) => String(a).includes("as AuthorizedPrincipal"))) {
          if (!list.includes("--exclude-dir=__tests__")) {
            return {
              status: 0,
              stdout: "/tmp/src/features/foo/__tests__/x.test.ts:5:  raw as AuthorizedPrincipal<'foo'>;",
            };
          }
        }
        return { status: 1, stdout: "", stderr: "" };
      },
    });
    expect(r.status).toBe("PASS");
  });
  it("FAIL when cast appears as runtime code in a non-test, non-mint file", () => {
    const r = runBoundaryGreps("/tmp/src/features/foo", {
      spawn: (_cmd, args) => {
        const list = args ?? [];
        if (list.some((a) => String(a).includes("as AuthorizedPrincipal"))) {
          return {
            status: 0,
            stdout: "/tmp/src/features/foo/foo.ts:90:  return p as unknown as AuthorizedPrincipal<'x'>;",
          };
        }
        return { status: 1, stdout: "", stderr: "" };
      },
    });
    expect(r.status).toBe("FAIL");
    expect(r.detail).toContain("AuthorizedPrincipal cast bypass");
  });
  it("PASS when cast appears as runtime code in the sanctioned mint slice", () => {
    const r = runBoundaryGreps("/tmp/src/lib/authz/mint", {
      spawn: (_cmd, args) => {
        const list = args ?? [];
        if (list.some((a) => String(a).includes("as AuthorizedPrincipal"))) {
          return {
            status: 0,
            stdout: "/tmp/src/lib/authz/mint/mint-authorized-principal.ts:90:  return p as unknown as AuthorizedPrincipal<'x'>;",
          };
        }
        return { status: 1, stdout: "", stderr: "" };
      },
    });
    expect(r.status).toBe("PASS");
  });

  // --- end-to-end via real grep: ts-ignore in a non-test fixture is caught --

  it("end-to-end: real grep catches `// @ts-ignore` in a non-test fixture file", () => {
    // The fixture file lives next to this test, but `runBoundaryGreps` is
    // invoked against a tmp slice with `--exclude-dir=__tests__` baked in, so
    // we copy the fixture content into a tmp slice OUTSIDE __tests__/ before
    // running the real grep. This proves the per-grep `filterComments: false`
    // setting actually catches a directive a coder might smuggle in.
    const slice = mkdtempSync(join(tmpdir(), "vma-e2e-tsignore-"));
    cleanupDirs.push(slice);
    writeFileSync(
      join(slice, "offender.ts"),
      [
        "export function bad() {",
        "  // @ts-ignore intentional escape hatch",
        "  return (window as any).x;",
        "}",
        "",
      ].join("\n"),
    );
    const r = runBoundaryGreps(slice, { spawn: spawnSync });
    expect(r.status).toBe("FAIL");
    expect(r.detail).toContain("@ts-ignore / @ts-expect-error outside __tests__/");
    expect(r.detail).toContain("offender.ts");
  });

  // --- end-to-end via real grep: DB-driver pattern semantics ---------------

  it("end-to-end: real grep catches `import { sql } from \"drizzle-orm\"` in non-test code", () => {
    const slice = mkdtempSync(join(tmpdir(), "vma-e2e-drizzle-import-"));
    cleanupDirs.push(slice);
    writeFileSync(
      join(slice, "offender.ts"),
      [
        "import { sql } from \"drizzle-orm\";",
        "export const q = sql`select 1`;",
        "",
      ].join("\n"),
    );
    const r = runBoundaryGreps(slice, { spawn: spawnSync });
    expect(r.status).toBe("FAIL");
    expect(r.detail).toContain("direct DB-driver imports outside src/db/");
    expect(r.detail).toContain("offender.ts");
  });
  it("end-to-end: real grep catches a drizzle-orm subpath import (postgres-js/migrator) in non-test code", () => {
    const slice = mkdtempSync(join(tmpdir(), "vma-e2e-drizzle-subpath-"));
    cleanupDirs.push(slice);
    writeFileSync(
      join(slice, "offender.ts"),
      [
        "import { migrate } from \"drizzle-orm/postgres-js/migrator\";",
        "export const m = migrate;",
        "",
      ].join("\n"),
    );
    const r = runBoundaryGreps(slice, { spawn: spawnSync });
    expect(r.status).toBe("FAIL");
    expect(r.detail).toContain("direct DB-driver imports outside src/db/");
  });
  it("end-to-end: real grep does NOT flag `import { getDb } from \"@/db/client/client\"` (typed boundary)", () => {
    const slice = mkdtempSync(join(tmpdir(), "vma-e2e-typed-boundary-"));
    cleanupDirs.push(slice);
    writeFileSync(
      join(slice, "composition-root.ts"),
      [
        "import { getDbSuperuser } from \"@/db/client/client\";",
        "export function wire() {",
        "  const db = getDbSuperuser();",
        "  return db;",
        "}",
        "",
      ].join("\n"),
    );
    const r = runBoundaryGreps(slice, { spawn: spawnSync });
    // No DB-driver import anywhere; the typed boundary call MUST not trip
    // the gate (it's exactly the API composition roots are supposed to use).
    expect(r.status).toBe("PASS");
  });
  it("end-to-end: real grep does NOT flag a JSDoc comment that names drizzle-orm", () => {
    const slice = mkdtempSync(join(tmpdir(), "vma-e2e-jsdoc-drizzle-"));
    cleanupDirs.push(slice);
    writeFileSync(
      join(slice, "service.ts"),
      [
        "/**",
        " * Hexagonal service.",
        " * Depends on repository interfaces only — no `drizzle-orm`, no `@/db` client.",
        " */",
        "export function svc() { return 1; }",
        "",
      ].join("\n"),
    );
    const r = runBoundaryGreps(slice, { spawn: spawnSync });
    expect(r.status).toBe("PASS");
  });
  it("end-to-end: DB-driver import IS allowed when the slice is under src/db/", () => {
    // Build a tmp dir structure that LOOKS like a path containing /db/ so
    // the `isDbSlice` allowance triggers (the check uses sliceRel.includes("/db/")).
    const outer = mkdtempSync(join(tmpdir(), "vma-e2e-db-slice-"));
    cleanupDirs.push(outer);
    const slice = join(outer, "db", "client");
    mkdirSync(slice, { recursive: true });
    writeFileSync(
      join(slice, "client.ts"),
      [
        "import postgres from \"postgres\";",
        "export const pg = postgres;",
        "",
      ].join("\n"),
    );
    const r = runBoundaryGreps(slice, { spawn: spawnSync });
    expect(r.status).toBe("PASS");
  });
});

describe("buildBoundaryGrepChecks per-grep filterComments config", () => {
  it("direct DB-driver imports check has filterComments: true", () => {
    const checks = buildBoundaryGrepChecks("/tmp/x");
    const c = checks.find((x) => x.desc.includes("DB-driver imports"));
    expect(c).toBeDefined();
    expect(c.filterComments).toBe(true);
  });
  it("@ts-ignore / @ts-expect-error check has filterComments: false (the directive IS a comment)", () => {
    const checks = buildBoundaryGrepChecks("/tmp/x");
    const c = checks.find((x) => x.desc.includes("@ts-ignore"));
    expect(c).toBeDefined();
    expect(c.filterComments).toBe(false);
  });
  it("AuthorizedPrincipal cast check has filterComments: true", () => {
    const checks = buildBoundaryGrepChecks("/tmp/x");
    const c = checks.find((x) => x.desc.includes("AuthorizedPrincipal cast"));
    expect(c).toBeDefined();
    expect(c.filterComments).toBe(true);
  });
});

describe("checkLockShape", () => {
  it("PASS on a well-formed lock", () => {
    const tmp = freshSlice("vma-lock-ok");
    const r = checkLockShape(tmp);
    expect(r.status).toBe("PASS");
    expect(r.lastValidatedMs).toBeTypeOf("number");
  });
  it("FAIL when lock file missing", () => {
    const tmp = mkdtempSync(join(tmpdir(), "vma-lock-miss-"));
    cleanupDirs.push(tmp);
    mkdirSync(join(tmp, "__specs__"));
    const r = checkLockShape(tmp);
    expect(r.status).toBe("FAIL");
    expect(r.detail).toContain("no lock file");
  });
  it("FAIL on bad status", () => {
    const tmp = freshSlice("vma-lock-bad-status");
    writeFileSync(
      join(tmp, "__specs__", "standards-compliance.yaml"),
      `status: unlocked\nverified: "100%"\nlast_validated: 2026-05-23T00:00:00Z\n`,
    );
    const r = checkLockShape(tmp);
    expect(r.status).toBe("FAIL");
    expect(r.detail).toContain("status='unlocked'");
  });
  it("FAIL on non-100% verified", () => {
    const tmp = freshSlice("vma-lock-verified");
    writeFileSync(
      join(tmp, "__specs__", "standards-compliance.yaml"),
      `status: locked\nverified: "99%"\nlast_validated: 2026-05-23T00:00:00Z\n`,
    );
    const r = checkLockShape(tmp);
    expect(r.status).toBe("FAIL");
    expect(r.detail).toContain("99%");
  });
  it("FAIL on bad last_validated", () => {
    const tmp = freshSlice("vma-lock-time");
    writeFileSync(
      join(tmp, "__specs__", "standards-compliance.yaml"),
      `status: locked\nverified: "100%"\nlast_validated: not-a-date\n`,
    );
    const r = checkLockShape(tmp);
    expect(r.status).toBe("FAIL");
    expect(r.detail).toContain("not-a-date");
  });
  it("FAIL when readFile throws", () => {
    const tmp = freshSlice("vma-lock-read");
    const r = checkLockShape(tmp, {
      readFile: () => {
        throw new Error("EACCES");
      },
    });
    expect(r.status).toBe("FAIL");
    expect(r.detail).toContain("EACCES");
  });
  it("FAIL on a fictitious ISO that doesn't parse as a Date", () => {
    const tmp = freshSlice("vma-lock-nan");
    writeFileSync(
      join(tmp, "__specs__", "standards-compliance.yaml"),
      `status: locked\nverified: "100%"\nlast_validated: 2026-13-99T00:00:00Z\n`,
    );
    const r = checkLockShape(tmp);
    expect(r.status).toBe("FAIL");
  });
  it("FAIL with empty-string status when status field is missing entirely", () => {
    const tmp = freshSlice("vma-lock-no-status");
    writeFileSync(
      join(tmp, "__specs__", "standards-compliance.yaml"),
      `verified: "100%"\nlast_validated: 2030-01-01T00:00:00Z\n`,
    );
    const r = checkLockShape(tmp);
    expect(r.status).toBe("FAIL");
    expect(r.detail).toContain("status=''");
  });
  it("FAIL with empty-string verified when verified field is missing entirely", () => {
    const tmp = freshSlice("vma-lock-no-verified");
    writeFileSync(
      join(tmp, "__specs__", "standards-compliance.yaml"),
      `status: locked\nlast_validated: 2030-01-01T00:00:00Z\n`,
    );
    const r = checkLockShape(tmp);
    expect(r.status).toBe("FAIL");
    expect(r.detail).toContain("verified=''");
  });
  it("FAIL with empty-string last_validated when the field is missing", () => {
    const tmp = freshSlice("vma-lock-no-lv");
    writeFileSync(
      join(tmp, "__specs__", "standards-compliance.yaml"),
      `status: locked\nverified: "100%"\n`,
    );
    const r = checkLockShape(tmp);
    expect(r.status).toBe("FAIL");
    expect(r.detail).toContain("last_validated=''");
  });
  it("FAIL when readFile throws a non-Error value (String(err) branch)", () => {
    const tmp = freshSlice("vma-lock-non-err");
    const r = checkLockShape(tmp, {
      readFile: () => {
        // eslint-disable-next-line no-throw-literal
        throw "weird-string-error";
      },
    });
    expect(r.status).toBe("FAIL");
    expect(r.detail).toContain("weird-string-error");
  });
});

describe("stampLock", () => {
  it("rewrites last_validated to the supplied clock time", () => {
    const tmp = freshSlice("vma-stamp");
    const lockPath = join(tmp, "__specs__", "standards-compliance.yaml");
    const iso = stampLock(lockPath, { now: () => new Date("2030-01-01T00:00:00Z") });
    expect(iso).toBe("2030-01-01T00:00:00Z");
    const r = checkLockShape(tmp);
    expect(r.status).toBe("PASS");
    expect(r.lastValidatedMs).toBe(Date.parse("2030-01-01T00:00:00Z"));
  });
  it("uses real now() when none injected", () => {
    const tmp = freshSlice("vma-stamp-now");
    const lockPath = join(tmp, "__specs__", "standards-compliance.yaml");
    const before = Date.now();
    const iso = stampLock(lockPath);
    const stampMs = Date.parse(iso);
    expect(stampMs).toBeGreaterThanOrEqual(before - 1000);
  });
  it("re-locks status and normalizes verified=100% on the stamp write", () => {
    const tmp = freshSlice("vma-stamp-relocks");
    const lockPath = join(tmp, "__specs__", "standards-compliance.yaml");
    // First flip to unlocked so we can prove stampLock flips it back.
    unlockLock(lockPath);
    expect(readFileSync(lockPath, "utf8")).toContain("status: unlocked");
    stampLock(lockPath, { now: () => new Date("2031-01-01T00:00:00Z") });
    const after = readFileSync(lockPath, "utf8");
    expect(after).toContain("status: locked");
    expect(after).toContain('verified: "100%"');
    expect(after).toContain("last_validated: 2031-01-01T00:00:00Z");
  });
});

describe("unlockLock", () => {
  it("flips status from locked to unlocked, leaving other fields untouched", () => {
    const tmp = freshSlice("vma-unlock");
    const lockPath = join(tmp, "__specs__", "standards-compliance.yaml");
    unlockLock(lockPath);
    const after = readFileSync(lockPath, "utf8");
    expect(after).toContain("status: unlocked");
    expect(after).toContain('verified: "100%"');
    expect(after).toContain("last_validated: 2026-05-23T00:00:00Z");
  });
  it("uses injected readFile / writeFile when provided", () => {
    /** @type {{ path: string, contents: string } | null} */
    let written = null;
    unlockLock("/fake/lock.yaml", {
      readFile: () => "status: locked\nverified: \"100%\"\nlast_validated: 2026-05-23T00:00:00Z\n",
      writeFile: (p, c) => {
        written = { path: p, contents: c };
      },
    });
    expect(written).not.toBeNull();
    expect(/** @type {{ path: string, contents: string }} */ (written).path).toBe("/fake/lock.yaml");
    expect(/** @type {{ path: string, contents: string }} */ (written).contents).toContain("status: unlocked");
  });
});

describe("formatReport", () => {
  it("formats SHIPPABLE with stamp line", () => {
    const text = formatReport(
      [{ name: "x", status: "PASS", detail: "ok" }],
      "src/foo",
      "2030-01-01T00:00:00Z",
    );
    expect(text).toContain("SHIPPABLE");
    expect(text).toContain("Lock stamped");
  });
  it("formats NOT SHIPPABLE with detail", () => {
    const text = formatReport(
      [{ name: "x", status: "FAIL", detail: "boom" }],
      "src/foo",
      null,
    );
    expect(text).toContain("NOT SHIPPABLE");
    expect(text).toContain("boom");
  });
});

describe("main", () => {
  it("exit 1 when slice path missing", () => {
    /** @type {string[]} */
    const out = [];
    const r = main("/definitely-nonexistent-path", {
      rootDir: "/",
      write: (s) => out.push(s),
      skipTypecheck: true,
      skipStamp: true,
    });
    expect(r.exitCode).toBe(1);
    expect(out.join("")).toContain("does not exist");
  });
  it("exit 1 when __specs__/ missing", () => {
    const tmp = mkdtempSync(join(tmpdir(), "vma-main-nospecs-"));
    cleanupDirs.push(tmp);
    /** @type {string[]} */
    const out = [];
    const r = main(tmp, {
      rootDir: "/",
      write: (s) => out.push(s),
      skipTypecheck: true,
      skipStamp: true,
    });
    expect(r.exitCode).toBe(1);
    expect(out.join("")).toContain("missing __specs__");
  });
  it("exit 0 and stamps on all-green", () => {
    const tmp = freshSlice("vma-main-ok");
    mkdirSync(join(tmp, "__tests__"));
    /** @type {string[]} */
    const out = [];
    // Spawn returns 0 for vitest + lint + typecheck; grep returns 1 (no matches → PASS)
    const spawn = (_cmd, args) => {
      const a = (args ?? []).join(" ");
      if (a.includes("grep") || (_cmd === "grep")) return { status: 1, stdout: "", stderr: "" };
      return { status: 0, stdout: "", stderr: "" };
    };
    const r = main(tmp, {
      rootDir: "/",
      write: (s) => out.push(s),
      spawn,
      now: () => new Date("2031-01-01T00:00:00Z"),
    });
    expect(r.exitCode).toBe(0);
    expect(r.stampedIso).toBe("2031-01-01T00:00:00Z");
    expect(out.join("")).toContain("SHIPPABLE");
    expect(out.join("")).toContain("Lock stamped");
  });
  it("exit 1 when a gate fails — no stamping", () => {
    const tmp = freshSlice("vma-main-fail");
    mkdirSync(join(tmp, "__tests__"));
    const spawn = (_cmd, args) => {
      const a = (args ?? []).join(" ");
      if (a.includes("vitest")) return { status: 1, stdout: "TESTS FAILED", stderr: "" };
      if (_cmd === "grep") return { status: 1, stdout: "", stderr: "" };
      return { status: 0 };
    };
    /** @type {string[]} */
    const out = [];
    const r = main(tmp, {
      rootDir: "/",
      write: (s) => out.push(s),
      spawn,
      skipTypecheck: false,
    });
    expect(r.exitCode).toBe(1);
    expect(r.stampedIso).toBeNull();
    expect(out.join("")).toContain("NOT SHIPPABLE");
  });
  it("uses process.stdout.write default when write is omitted (early-return short-circuit)", () => {
    // Drive the `io.write ?? ((s) => process.stdout.write(s))` default
    // by omitting `write`. The non-existent slice path triggers an
    // immediate FAIL before any spawn work, so the test runs fast.
    const origOut = process.stdout.write.bind(process.stdout);
    /** @type {string[]} */
    const buf = [];
    // @ts-expect-error — test-only monkey-patch
    process.stdout.write = (s) => {
      buf.push(String(s));
      return true;
    };
    try {
      const r = main("/definitely/not/a/slice/main-default-write");
      expect(r.exitCode).toBe(1);
    } finally {
      process.stdout.write = origOut;
    }
    expect(buf.join("")).toContain("FAIL");
  });
  it("renders sliceRel='.' when slicePath resolves to rootDir itself", () => {
    // Drive the `relative(rootDir, sliceAbs) || "."` falsy branch by
    // passing slicePath="." against rootDir=tmp. main short-circuits to
    // exit 1 ("missing __specs__") so we don't run any spawn work.
    const tmp = mkdtempSync(join(tmpdir(), "vma-relroot-"));
    cleanupDirs.push(tmp);
    /** @type {string[]} */
    const out = [];
    const r = main(".", {
      rootDir: tmp,
      write: (s) => out.push(s),
    });
    expect(r.exitCode).toBe(1);
    expect(out.join("")).toContain("slice: .");
  });
  it("skips the unlock step when the lock is missing (lockResult.status FAIL branch)", () => {
    // Build a slice with __specs__/ but NO standards-compliance.yaml lock.
    // checkLockShape returns FAIL (no lock file), so the new state-machine
    // unlock step must be skipped. main() should still complete and report.
    const tmp = mkdtempSync(join(tmpdir(), "vma-no-lock-"));
    cleanupDirs.push(tmp);
    mkdirSync(join(tmp, "__specs__"));
    /** @type {string[]} */
    const out = [];
    const r = main(tmp, {
      rootDir: "/",
      write: (s) => out.push(s),
      spawn: (_cmd) => (_cmd === "grep" ? { status: 1 } : { status: 0 }),
      skipTypecheck: true,
    });
    expect(r.exitCode).toBe(1);
    expect(out.join("")).toContain("no lock file");
    expect(out.join("")).toContain("NOT SHIPPABLE");
  });
  it("supports skipTypecheck for fast unit-test runs", () => {
    const tmp = freshSlice("vma-main-skip");
    /** @type {string[]} */
    const out = [];
    const r = main(tmp, {
      rootDir: "/",
      write: (s) => out.push(s),
      spawn: (_cmd) => (_cmd === "grep" ? { status: 1 } : { status: 0 }),
      skipTypecheck: true,
    });
    expect(r.results.every((res) => res.name !== "typecheck (project-wide)")).toBe(true);
    expect(r.exitCode).toBe(0);
  });
});

describe("cliMain", () => {
  it("exits 1 when no slice path supplied", () => {
    /** @type {number[]} */
    const codes = [];
    cliMain({ argv: [], exit: (c) => codes.push(c) });
    expect(codes).toEqual([1]);
  });
  it("uses process.exit + process.argv when nothing is injected (defaults branch)", () => {
    // Drive the `io.argv ?? process.argv.slice(2)` AND `io.exit ??
    // ((code) => process.exit(code))` defaults. `process.argv` during a
    // vitest run starts with vitest's own args — when we slice(2) we get
    // a non-empty list and the function falls through into main(),
    // which spawns sub-processes. That's expensive AND non-deterministic,
    // so we monkey-patch process.argv to be empty + intercept
    // process.exit.
    const origExit = process.exit;
    const origArgv = process.argv;
    const origErr = process.stderr.write.bind(process.stderr);
    /** @type {number[]} */
    const codes = [];
    // @ts-expect-error — test-only monkey-patch
    process.exit = (c) => {
      codes.push(c ?? 0);
    };
    // @ts-expect-error — test-only monkey-patch
    process.argv = [origArgv[0], origArgv[1]];
    // @ts-expect-error — test-only monkey-patch
    process.stderr.write = () => true;
    try {
      cliMain();
      expect(codes).toEqual([1]);
    } finally {
      process.exit = origExit;
      process.argv = origArgv;
      process.stderr.write = origErr;
    }
  });
  it("forwards the resolved slice path to main + propagates main's exit code", () => {
    /** @type {number[]} */
    const codes = [];
    // Pointing at a path that does not exist makes `main` short-circuit to
    // exit code 1 immediately (the "slice path does not exist" gate fires
    // before any spawn / blastRadius work). That gives us a deterministic
    // way to exercise `cliMain`'s non-empty-argv branch without touching
    // the real workspace.
    const origStdout = process.stdout.write.bind(process.stdout);
    // @ts-expect-error — test-only monkey-patch
    process.stdout.write = () => true;
    try {
      cliMain({
        argv: ["/definitely/not/a/slice/cliMain-test"],
        exit: (c) => codes.push(c),
      });
    } finally {
      process.stdout.write = origStdout;
    }
    expect(codes).toEqual([1]);
  });
});

describe("isCliInvocation", () => {
  it("false when argv1 undefined", () => {
    expect(isCliInvocation("file:///x", undefined)).toBe(false);
  });
  it("false when argv1 empty", () => {
    expect(isCliInvocation("file:///x", "")).toBe(false);
  });
  it("false when argv1 path does not match import.meta.url", () => {
    expect(isCliInvocation("file:///a", "/tmp/b")).toBe(false);
  });
  it("true when argv1 resolves to import.meta.url", () => {
    const argv1 = "/tmp/x.mjs";
    expect(isCliInvocation(pathToFileURL(argv1).href, argv1)).toBe(true);
  });
});

describe("maybeRunCli", () => {
  it("returns false when guard rejects", () => {
    const r = maybeRunCli({
      importMetaUrl: "file:///never",
      argv1: "/tmp/somewhere-else",
      argv: ["some-slice"],
      exit: () => undefined,
    });
    expect(r).toBe(false);
  });
  it("returns true and invokes cliMain when the guard accepts", () => {
    // Pair `importMetaUrl` and `argv1` so the guard accepts. We pass an
    // empty argv so cliMain takes the "missing slice path" early-exit
    // branch — no real workspace I/O.
    /** @type {number[]} */
    const codes = [];
    const fake = "/tmp/vma-maybeRunCli.mjs";
    const origErr = process.stderr.write.bind(process.stderr);
    // @ts-expect-error — test-only monkey-patch
    process.stderr.write = () => true;
    try {
      const r = maybeRunCli({
        importMetaUrl: pathToFileURL(fake).href,
        argv1: fake,
        argv: [],
        exit: (c) => codes.push(c),
      });
      expect(r).toBe(true);
    } finally {
      process.stderr.write = origErr;
    }
    expect(codes).toEqual([1]);
  });
});
