import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { afterAll, describe, expect, it } from "vitest";

import {
  checkLockShape,
  cliMain,
  findSliceLock,
  isCliInvocation,
  locksFromChangedPaths,
  main,
  maybeRunCli,
  parseScalarFields,
} from "../verify-mode-d.mjs";

/** @type {string[]} */
const cleanup = [];
afterAll(() => {
  for (const d of cleanup) {
    try {
      rmSync(d, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
});

function repoWith(slicePaths, lockBody) {
  const tmp = mkdtempSync(join(tmpdir(), "vmb-"));
  cleanup.push(tmp);
  const body =
    lockBody ?? `status: locked\nverified: "100%"\nlast_validated: 2026-05-24T00:00:00Z\n`;
  for (const sp of slicePaths) {
    const sliceDir = join(tmp, sp);
    mkdirSync(join(sliceDir, "__specs__"), { recursive: true });
    writeFileSync(join(sliceDir, "__specs__", "standards-compliance.yaml"), body);
    writeFileSync(join(sliceDir, "code.ts"), "// hi\n");
  }
  return tmp;
}

describe("findSliceLock", () => {
  it("returns the nearest ancestor lock", () => {
    const root = repoWith(["src/a"]);
    const lock = findSliceLock(join(root, "src/a/code.ts"), root);
    expect(lock).toBe(join(root, "src/a/__specs__/standards-compliance.yaml"));
  });
  it("returns null when no ancestor has a lock", () => {
    const root = mkdtempSync(join(tmpdir(), "vmb-none-"));
    cleanup.push(root);
    expect(findSliceLock(join(root, "src/x/y.ts"), root)).toBeNull();
  });
  it("returns null when startAbs is the filesystem root (dirname is itself)", () => {
    // Drive the `if (parent === cur) break;` branch by passing a startAbs
    // longer than rootAbs that bottoms out at "/" — `dirname("/") === "/"`.
    expect(findSliceLock("/", "")).toBeNull();
  });
});

describe("locksFromChangedPaths", () => {
  it("dedupes + sorts", () => {
    const root = repoWith(["src/a", "src/b"]);
    const changed = [
      join(root, "src/a/code.ts"),
      join(root, "src/a/other.ts"),
      join(root, "src/b/code.ts"),
    ];
    const locks = locksFromChangedPaths(changed, root);
    expect(locks).toEqual([
      join(root, "src/a/__specs__/standards-compliance.yaml"),
      join(root, "src/b/__specs__/standards-compliance.yaml"),
    ]);
  });
  it("drops paths not under any spec'd slice", () => {
    const root = repoWith(["src/a"]);
    const changed = [
      join(root, "src/a/code.ts"),
      join(root, "outside.ts"),
    ];
    expect(locksFromChangedPaths(changed, root)).toEqual([
      join(root, "src/a/__specs__/standards-compliance.yaml"),
    ]);
  });
});

describe("parseScalarFields", () => {
  it("extracts flat key:value pairs", () => {
    const f = parseScalarFields(`status: locked\nverified: "100%"\nlast_validated: 2030-01-01T00:00:00Z\n`);
    expect(f).toEqual({
      status: "locked",
      verified: "100%",
      last_validated: "2030-01-01T00:00:00Z",
    });
  });
  it("skips lines without key:value", () => {
    const f = parseScalarFields(`# comment\nstatus: locked\n`);
    expect(f).toEqual({ status: "locked" });
  });
  it("strips surrounding double-quotes from values", () => {
    const f = parseScalarFields(`status: "locked"\n`);
    expect(f).toEqual({ status: "locked" });
  });
  it("treats a value of only whitespace as empty string (trim() strip)", () => {
    // The regex backtracks so `\s*(.+)` captures one whitespace char.
    // The subsequent `.trim()` strips it, leaving the empty string.
    const f = parseScalarFields(`verified: \n`);
    expect(f).toEqual({ verified: "" });
  });
});

describe("checkLockShape", () => {
  it("ok=true + returns lastValidatedMs for a well-formed lock", () => {
    const root = repoWith(["src/a"]);
    const r = checkLockShape(join(root, "src/a/__specs__/standards-compliance.yaml"));
    expect(r.ok).toBe(true);
    if (!r.ok) throw new Error("unreachable");
    expect(r.lastValidatedMs).toBe(Date.parse("2026-05-24T00:00:00Z"));
  });
  it("ok=false when status != locked", () => {
    const root = repoWith(
      ["src/a"],
      `status: unlocked\nverified: "100%"\nlast_validated: 2030-01-01T00:00:00Z\n`,
    );
    const r = checkLockShape(join(root, "src/a/__specs__/standards-compliance.yaml"));
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.reason).toContain("unlocked");
  });
  it("ok=false when verified != 100%", () => {
    const root = repoWith(
      ["src/a"],
      `status: locked\nverified: "99%"\nlast_validated: 2030-01-01T00:00:00Z\n`,
    );
    const r = checkLockShape(join(root, "src/a/__specs__/standards-compliance.yaml"));
    expect(r.ok).toBe(false);
  });
  it("ok=false when last_validated isn't ISO-8601 UTC", () => {
    const root = repoWith(
      ["src/a"],
      `status: locked\nverified: "100%"\nlast_validated: 21/05/2026\n`,
    );
    const r = checkLockShape(join(root, "src/a/__specs__/standards-compliance.yaml"));
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.reason).toContain("ISO-8601");
  });
  it("ok=false when readFile throws", () => {
    const r = checkLockShape("/nope", {
      readFile: () => {
        throw new Error("ENOENT");
      },
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.reason).toContain("ENOENT");
  });
  it("ok=false when ISO regex passes but Date.parse fails", () => {
    const root = repoWith(
      ["src/a"],
      `status: locked\nverified: "100%"\nlast_validated: 2026-13-99T00:00:00Z\n`,
    );
    const r = checkLockShape(join(root, "src/a/__specs__/standards-compliance.yaml"));
    expect(r.ok).toBe(false);
  });
  it("ok=false with empty-string status when the field is missing entirely", () => {
    // Drive the `fields["status"] ?? ""` nullish-coalescing branch when
    // the field is undefined.
    const root = repoWith(["src/a"], `verified: "100%"\nlast_validated: 2030-01-01T00:00:00Z\n`);
    const r = checkLockShape(join(root, "src/a/__specs__/standards-compliance.yaml"));
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.reason).toContain("status=''");
  });
  it("ok=false with empty-string verified when the field is missing entirely", () => {
    const root = repoWith(["src/a"], `status: locked\nlast_validated: 2030-01-01T00:00:00Z\n`);
    const r = checkLockShape(join(root, "src/a/__specs__/standards-compliance.yaml"));
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.reason).toContain("verified=''");
  });
  it("ok=false with empty-string last_validated when the field is missing entirely", () => {
    const root = repoWith(["src/a"], `status: locked\nverified: "100%"\n`);
    const r = checkLockShape(join(root, "src/a/__specs__/standards-compliance.yaml"));
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.reason).toContain("last_validated=''");
  });
  it("ok=false when readFile throws a non-Error value (String(err) branch)", () => {
    const r = checkLockShape("/nope", {
      readFile: () => {
        // eslint-disable-next-line no-throw-literal
        throw "string-not-error";
      },
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.reason).toContain("string-not-error");
  });
});

describe("main", () => {
  it("exits 0 with 'nothing to stamp-check' on empty diff", () => {
    /** @type {string[]} */
    const out = [];
    const r = main({
      rootDir: "/anywhere",
      getChanged: () => [],
      write: (s) => out.push(s),
      writeErr: () => {},
    });
    expect(r.exitCode).toBe(0);
    expect(out.join("")).toContain("nothing to stamp-check");
  });
  it("exits 0 when changed paths don't resolve to any slice", () => {
    const root = mkdtempSync(join(tmpdir(), "vmb-noslice-"));
    cleanup.push(root);
    /** @type {string[]} */
    const out = [];
    const r = main({
      rootDir: root,
      getChanged: () => [join(root, "top.ts")],
      write: (s) => out.push(s),
      writeErr: () => {},
    });
    expect(r.exitCode).toBe(0);
    expect(out.join("")).toContain("nothing to stamp-check");
  });
  it("exits 0 when all locks are shape-clean + fresh vs git history", () => {
    const root = repoWith(["src/a", "src/b"]);
    /** @type {string[]} */
    const out = [];
    const r = main({
      rootDir: root,
      getChanged: () => [join(root, "src/a/code.ts"), join(root, "src/b/code.ts")],
      gitLastCommit: () => null, // no git history → treated as fresh
      write: (s) => out.push(s),
      writeErr: () => {},
    });
    expect(r.exitCode).toBe(0);
    expect(r.locksChecked.length).toBe(2);
    expect(out.join("")).toContain("OK (2 lock(s) locked + verified=100% + fresh vs git history)");
  });
  it("exits 1 with gate=shape when any lock is malformed", () => {
    const root = repoWith(
      ["src/a"],
      `status: unlocked\nverified: "100%"\nlast_validated: 2030-01-01T00:00:00Z\n`,
    );
    /** @type {string[]} */
    const err = [];
    const r = main({
      rootDir: root,
      getChanged: () => [join(root, "src/a/code.ts")],
      gitLastCommit: () => null,
      write: () => {},
      writeErr: (s) => err.push(s),
    });
    expect(r.exitCode).toBe(1);
    expect(r.failures[0]?.gate).toBe("shape");
    expect(err.join("")).toContain("[shape]");
    expect(err.join("")).toContain("unlocked");
  });
  it("exits 1 with gate=freshness when git history is newer than last_validated", () => {
    const root = repoWith(
      ["src/a"],
      `status: locked\nverified: "100%"\nlast_validated: 2026-01-01T00:00:00Z\n`,
    );
    /** @type {string[]} */
    const err = [];
    const r = main({
      rootDir: root,
      getChanged: () => [join(root, "src/a/code.ts")],
      // commit two days later → far outside the 30-min grace window
      gitLastCommit: () => "2026-01-03T00:00:00Z",
      write: () => {},
      writeErr: (s) => err.push(s),
    });
    expect(r.exitCode).toBe(1);
    expect(r.failures[0]?.gate).toBe("freshness");
    expect(err.join("")).toContain("[freshness]");
    expect(err.join("")).toContain("folder modified after last_validated");
  });
  it("uses default ports when none are injected", () => {
    // The default getChanged shells out to git; in our (non-repo) tmp it returns []
    const r = main();
    // Either nothing-to-check (0) or actual check result; just confirm it didn't throw
    expect(typeof r.exitCode).toBe("number");
  });
});

describe("cliMain", () => {
  it("forwards exit code via injected exit, forwarding io to main", () => {
    /** @type {number[]} */
    const codes = [];
    cliMain({
      exit: (c) => codes.push(c),
      getChanged: () => [],
      gitLastCommit: () => null,
      write: () => {},
      writeErr: () => {},
    });
    expect(codes).toEqual([0]);
  });
  it("uses process.exit when no exit hook is supplied (covers doExit default)", () => {
    const origExit = process.exit;
    /** @type {number[]} */
    const codes = [];
    // @ts-expect-error — test-only monkey-patch
    process.exit = (c) => {
      codes.push(c ?? 0);
    };
    try {
      cliMain({
        getChanged: () => [],
        write: () => {},
        writeErr: () => {},
      });
      expect(codes).toEqual([0]);
    } finally {
      process.exit = origExit;
    }
  });
  it("uses process.stderr.write when no writeErr hook is supplied (covers default lambda)", () => {
    // Drive the failure path so writeErr is actually invoked; redirect
    // process.stderr so the test output stays clean.
    const root = repoWith(
      ["src/a"],
      `status: unlocked\nverified: "100%"\nlast_validated: 2030-01-01T00:00:00Z\n`,
    );
    const orig = process.stderr.write.bind(process.stderr);
    /** @type {string[]} */
    const buf = [];
    // @ts-expect-error — test-only monkey-patch
    process.stderr.write = (s) => {
      buf.push(String(s));
      return true;
    };
    try {
      const r = main({
        rootDir: root,
        getChanged: () => [join(root, "src/a/code.ts")],
        gitLastCommit: () => null,
        write: () => {},
        // omit writeErr → defaults to process.stderr.write
      });
      expect(r.exitCode).toBe(1);
    } finally {
      process.stderr.write = orig;
    }
    expect(buf.join("")).toMatch(/lock\(s\) failed/);
  });
});

describe("isCliInvocation", () => {
  it("false when argv1 undefined", () => {
    expect(isCliInvocation("file:///x", undefined)).toBe(false);
  });
  it("false when argv1 empty", () => {
    expect(isCliInvocation("file:///x", "")).toBe(false);
  });
  it("false when paths differ", () => {
    expect(isCliInvocation("file:///a", "/tmp/b")).toBe(false);
  });
  it("true when argv1 resolves to import.meta.url", () => {
    const a = "/tmp/x";
    expect(isCliInvocation(pathToFileURL(a).href, a)).toBe(true);
  });
});

describe("maybeRunCli", () => {
  it("returns false when guard rejects", () => {
    const r = maybeRunCli({
      importMetaUrl: "file:///never",
      argv1: "/tmp/elsewhere",
      exit: () => undefined,
    });
    expect(r).toBe(false);
  });
  it("returns true and forwards io to cliMain when the guard accepts", () => {
    /** @type {number[]} */
    const codes = [];
    const fake = "/tmp/vmb-maybeRunCli.mjs";
    const r = maybeRunCli({
      importMetaUrl: pathToFileURL(fake).href,
      argv1: fake,
      exit: (c) => codes.push(c),
      getChanged: () => [],
      gitLastCommit: () => null,
      write: () => {},
      writeErr: () => {},
    });
    expect(r).toBe(true);
    expect(codes).toEqual([0]);
  });
});
