import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";

import { afterAll, describe, expect, it } from "vitest";

import {
  cliMain,
  findSliceRoot,
  isCliInvocation,
  main,
  maybeRunCli,
  slicesFromChangedPaths,
} from "../verify-mode-c.mjs";

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

function repoWith(slicePaths) {
  const tmp = mkdtempSync(join(tmpdir(), "vmc-"));
  cleanupDirs.push(tmp);
  for (const sp of slicePaths) {
    const sliceDir = join(tmp, sp);
    mkdirSync(join(sliceDir, "__specs__"), { recursive: true });
    writeFileSync(
      join(sliceDir, "__specs__", "standards-compliance.yaml"),
      `status: locked\nverified: "100%"\nlast_validated: 2026-05-24T00:00:00Z\n`,
    );
    writeFileSync(join(sliceDir, "code.ts"), "// hi\n");
  }
  return tmp;
}

describe("findSliceRoot", () => {
  it("returns the nearest ancestor with a lock", () => {
    const root = repoWith(["src/a"]);
    const startAbs = join(root, "src/a/code.ts");
    expect(findSliceRoot(startAbs, root)).toBe(join(root, "src/a"));
  });
  it("returns null when no ancestor has a lock", () => {
    const root = mkdtempSync(join(tmpdir(), "vmc-nolock-"));
    cleanupDirs.push(root);
    const startAbs = join(root, "src/a/code.ts");
    mkdirSync(join(root, "src/a"), { recursive: true });
    expect(findSliceRoot(startAbs, root)).toBeNull();
  });
  it("returns null when the walk hits the filesystem root (parent === cur)", () => {
    // Drive the `if (parent === cur) break;` branch by passing a rootAbs
    // shorter than startAbs that bottoms out at "/".
    expect(findSliceRoot("/", "")).toBeNull();
  });
});

describe("slicesFromChangedPaths", () => {
  it("dedupes + sorts", () => {
    const root = repoWith(["src/a", "src/b"]);
    const changed = [
      join(root, "src/a/code.ts"),
      join(root, "src/a/code2.ts"),
      join(root, "src/b/code.ts"),
    ];
    const slices = slicesFromChangedPaths(changed, root);
    expect(slices).toEqual([join(root, "src/a"), join(root, "src/b")]);
  });
  it("drops paths that don't resolve to any slice", () => {
    const root = repoWith(["src/a"]);
    const changed = [
      join(root, "src/a/code.ts"),
      join(root, "outside.ts"),
    ];
    const slices = slicesFromChangedPaths(changed, root);
    expect(slices).toEqual([join(root, "src/a")]);
  });
});

describe("main", () => {
  it("exits 0 with 'nothing to verify' on empty diff", () => {
    /** @type {string[]} */
    const out = [];
    const r = main({
      getChanged: () => [],
      write: (s) => out.push(s),
      writeErr: () => {},
    });
    expect(r.exitCode).toBe(0);
    expect(out.join("")).toContain("nothing to verify");
  });
  it("exits 0 when changed paths don't resolve to any spec'd slice", () => {
    const root = mkdtempSync(join(tmpdir(), "vmc-noslice-"));
    cleanupDirs.push(root);
    /** @type {string[]} */
    const out = [];
    const r = main({
      rootDir: root,
      getChanged: () => [join(root, "top.ts")],
      write: (s) => out.push(s),
      writeErr: () => {},
    });
    expect(r.exitCode).toBe(0);
    expect(out.join("")).toContain("nothing to verify");
  });
  it("invokes Mode A per slice + aggregates PASS", () => {
    const root = repoWith(["src/a", "src/b"]);
    /** @type {string[]} */
    const out = [];
    const calls = [];
    const r = main({
      rootDir: root,
      getChanged: () => [join(root, "src/a/code.ts"), join(root, "src/b/code.ts")],
      spawn: (_exec, args) => {
        calls.push(args);
        return { status: 0, stdout: "Mode A: SHIPPABLE\n", stderr: "" };
      },
      modeAPath: "/fake/verify-mode-a",
      write: (s) => out.push(s),
      writeErr: () => {},
    });
    expect(r.exitCode).toBe(0);
    expect(r.slices.length).toBe(2);
    expect(calls.length).toBe(2);
    expect(out.join("")).toContain("2/2 slices PASS");
  });
  it("treats a null spawn status as 1 (status ?? 1)", () => {
    // Drive the `res.status ?? 1` nullish-coalescing branch by returning
    // status:null (typical of a spawn error).
    const root = repoWith(["src/a"]);
    const r = main({
      rootDir: root,
      getChanged: () => [join(root, "src/a/code.ts")],
      spawn: () => ({ status: null, stdout: "", stderr: "" }),
      modeAPath: "/fake/verify-mode-a",
      write: () => {},
      writeErr: () => {},
    });
    expect(r.exitCode).toBe(1);
    expect(r.perSliceStatus[0].status).toBe(1);
  });
  it("uses process.stderr.write when writeErr is omitted (covers default lambda)", () => {
    // The slice's spawn returns stderr non-empty, so writeErr is actually
    // invoked. Redirect process.stderr so the test output stays clean.
    const root = repoWith(["src/a"]);
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
        spawn: () => ({ status: 1, stdout: "", stderr: "real-stderr\n" }),
        modeAPath: "/fake/verify-mode-a",
        write: () => {},
        // omit writeErr → defaults to process.stderr.write
      });
      expect(r.exitCode).toBe(1);
    } finally {
      process.stderr.write = orig;
    }
    expect(buf.join("")).toContain("real-stderr");
  });
  it("uses real getChangedPaths + process.stdout defaults when io omits them", () => {
    // Drive the `io.getChanged ??` and `io.write ??` defaults by
    // omitting both. We point rootDir at a clean tmp (no git repo) so
    // getChangedPaths returns [] silently, and we redirect
    // process.stdout to capture the write call without polluting test
    // output.
    const tmp = mkdtempSync(join(tmpdir(), "vmc-defaults-"));
    cleanupDirs.push(tmp);
    const origStdout = process.stdout.write.bind(process.stdout);
    const origStderr = process.stderr.write.bind(process.stderr);
    /** @type {string[]} */
    const outBuf = [];
    // @ts-expect-error — test-only monkey-patch
    process.stdout.write = (s) => {
      outBuf.push(String(s));
      return true;
    };
    // @ts-expect-error — test-only monkey-patch
    process.stderr.write = () => true;
    try {
      const r = main({ rootDir: tmp });
      expect(r.exitCode).toBe(0);
    } finally {
      process.stdout.write = origStdout;
      process.stderr.write = origStderr;
    }
    expect(outBuf.join("")).toContain("nothing to verify");
  });
  it("aggregates exit 1 when any slice fails", () => {
    const root = repoWith(["src/a", "src/b"]);
    /** @type {string[]} */
    const out = [];
    /** @type {string[]} */
    const err = [];
    const r = main({
      rootDir: root,
      getChanged: () => [join(root, "src/a/code.ts"), join(root, "src/b/code.ts")],
      spawn: (_exec, args) => {
        if (String(args?.[1] ?? "").endsWith("/src/a")) {
          return { status: 1, stdout: "", stderr: "boom\n" };
        }
        return { status: 0, stdout: "ok\n", stderr: "" };
      },
      modeAPath: "/fake/verify-mode-a",
      write: (s) => out.push(s),
      writeErr: (s) => err.push(s),
    });
    expect(r.exitCode).toBe(1);
    expect(out.join("")).toContain("1/2 slices PASS");
    expect(err.join("")).toContain("boom");
  });
});

describe("cliMain", () => {
  it("forwards exit code via injected exit, forwarding io to main", () => {
    /** @type {number[]} */
    const codes = [];
    cliMain({
      exit: (c) => codes.push(c),
      getChanged: () => [],
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
    const fake = "/tmp/vmc-maybeRunCli.mjs";
    const r = maybeRunCli({
      importMetaUrl: pathToFileURL(fake).href,
      argv1: fake,
      exit: (c) => codes.push(c),
      getChanged: () => [],
      write: () => {},
      writeErr: () => {},
    });
    expect(r).toBe(true);
    expect(codes).toEqual([0]);
  });
});
