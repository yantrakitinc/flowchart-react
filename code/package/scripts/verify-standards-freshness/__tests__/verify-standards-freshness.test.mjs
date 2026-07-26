// Vitest suite for the verify-standards-freshness script.
//
// Builds in-memory injection via `gitLastCommit` for the fast tests; uses
// a real git repo fixture under tmpdir for the CLI end-to-end test +
// the defaultGitLastCommit adapter test.

import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { afterAll, describe, expect, it } from "vitest";

import {
  SAME_COMMIT_GRACE_MS,
  audit,
  checkFreshness,
  cliMain,
  defaultGitLastCommit,
  defaultStderrWrite,
  defaultStdoutWrite,
  formatReport,
  isCliInvocation,
  main,
  maybeRunCli,
} from "../verify-standards-freshness.mjs";

const __filename = fileURLToPath(import.meta.url);
const SCRIPT_PATH = resolve(
  dirname(__filename),
  "..",
  "verify-standards-freshness.mjs",
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

// --- SAME_COMMIT_GRACE_MS ---------------------------------------------

describe("SAME_COMMIT_GRACE_MS", () => {
  it("exports a positive grace window (30 minutes)", () => {
    expect(SAME_COMMIT_GRACE_MS).toBe(30 * 60 * 1000);
  });
});

// --- checkFreshness ---------------------------------------------------

describe("checkFreshness", () => {
  const lock = "/repo/src/feature/__specs__/standards-compliance.yaml";
  const lastValidatedMs = Date.parse("2026-05-21T00:00:00Z");

  it("returns ok=true when the folder's last commit predates last_validated", () => {
    const r = checkFreshness(lock, lastValidatedMs, {
      gitLastCommit: () => "2026-05-20T00:00:00Z",
    });
    expect(r.ok).toBe(true);
  });

  it("returns ok=true when git returns null (no commits / git unavailable)", () => {
    const r = checkFreshness(lock, lastValidatedMs, {
      gitLastCommit: () => null,
    });
    expect(r.ok).toBe(true);
  });

  it("returns ok=true when commit date equals last_validated (boundary)", () => {
    const r = checkFreshness(lock, lastValidatedMs, {
      gitLastCommit: () => "2026-05-21T00:00:00Z",
    });
    expect(r.ok).toBe(true);
  });

  it("returns ok=true within the grace window (29 minutes newer)", () => {
    const within = new Date(
      lastValidatedMs + 29 * 60 * 1000,
    ).toISOString();
    const r = checkFreshness(lock, lastValidatedMs, {
      gitLastCommit: () => within,
    });
    expect(r.ok).toBe(true);
  });

  it("flags stale when commit date is beyond the grace window", () => {
    const sixMinutesLater = new Date(
      lastValidatedMs + 31 * 60 * 1000,
    ).toISOString();
    const r = checkFreshness(lock, lastValidatedMs, {
      gitLastCommit: () => sixMinutesLater,
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.reason).toBe("folder modified after last_validated");
    expect(r.detail).toContain("last_validated=2026-05-21T00:00:00.000Z");
    expect(r.detail).toContain(sixMinutesLater);
  });

  it("flags 'git log returned unparseable date' on garbage from git", () => {
    const r = checkFreshness(lock, lastValidatedMs, {
      gitLastCommit: () => "not-an-iso-date",
    });
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.reason).toBe("git log returned unparseable date");
    expect(r.detail).toContain("not-an-iso-date");
  });

  it("uses the real git adapter when no injected hook is supplied", () => {
    // No git repo at this tmp path → defaultGitLastCommit returns null
    // → checkFreshness treats as fresh.
    const tmp = mkdtempSync(join(tmpdir(), "vsf-real-"));
    cleanupDirs.push(tmp);
    const specs = join(tmp, "feature", "__specs__");
    mkdirSync(specs, { recursive: true });
    const lockReal = join(specs, "standards-compliance.yaml");
    writeFileSync(lockReal, "status: locked\n");
    writeFileSync(join(tmp, "feature", "code.ts"), "// hi\n");
    const r = checkFreshness(lockReal, Date.now());
    expect(r.ok).toBe(true);
  });
});

// --- defaultGitLastCommit ---------------------------------------------

describe("defaultGitLastCommit", () => {
  it("returns null when the folder is not inside a git repo", () => {
    const tmp = mkdtempSync(join(tmpdir(), "vsf-no-repo-"));
    cleanupDirs.push(tmp);
    const folder = join(tmp, "feature");
    mkdirSync(folder, { recursive: true });
    const lock = join(folder, "__specs__", "standards-compliance.yaml");
    expect(defaultGitLastCommit(folder, lock)).toBeNull();
  });

  it("returns an ISO-8601 string for a real committed folder", () => {
    const tmp = mkdtempSync(join(tmpdir(), "vsf-repo-"));
    cleanupDirs.push(tmp);
    spawnSync("git", ["init", "-q"], { cwd: tmp });
    spawnSync("git", ["config", "user.email", "t@example.com"], { cwd: tmp });
    spawnSync("git", ["config", "user.name", "T"], { cwd: tmp });
    const folder = join(tmp, "feature");
    mkdirSync(folder, { recursive: true });
    writeFileSync(join(folder, "code.ts"), "// initial\n");
    spawnSync("git", ["add", "."], { cwd: tmp });
    spawnSync("git", ["commit", "-q", "-m", "init"], {
      cwd: tmp,
      env: {
        ...process.env,
        GIT_AUTHOR_DATE: "2026-05-23T00:00:00Z",
        GIT_COMMITTER_DATE: "2026-05-23T00:00:00Z",
      },
    });
    const lock = join(folder, "__specs__", "standards-compliance.yaml");
    const out = defaultGitLastCommit(folder, lock);
    expect(out).toMatch(/^2026-05-23T/);
  });

  it("returns null when git log succeeds but produces an empty result (only the lock has ever been committed)", () => {
    // Cover the `out === ""` branch of `return out === "" ? null : out;`.
    // Commit ONLY the lock file inside the folder. With the lock excluded
    // from the pathspec, git log finds no matching commits and produces
    // empty stdout — the helper must coalesce that to null.
    const tmp = mkdtempSync(join(tmpdir(), "vsf-lock-only-"));
    cleanupDirs.push(tmp);
    spawnSync("git", ["init", "-q"], { cwd: tmp });
    spawnSync("git", ["config", "user.email", "t@example.com"], { cwd: tmp });
    spawnSync("git", ["config", "user.name", "T"], { cwd: tmp });
    const folder = join(tmp, "feature");
    const specs = join(folder, "__specs__");
    mkdirSync(specs, { recursive: true });
    const lock = join(specs, "standards-compliance.yaml");
    writeFileSync(lock, "status: locked\n");
    spawnSync("git", ["add", "."], { cwd: tmp });
    spawnSync("git", ["commit", "-q", "-m", "lock-only"], {
      cwd: tmp,
      env: {
        ...process.env,
        GIT_AUTHOR_DATE: "2026-05-20T00:00:00Z",
        GIT_COMMITTER_DATE: "2026-05-20T00:00:00Z",
      },
    });
    // Only the lock has been committed in this folder; with it excluded,
    // git log emits no rows.
    expect(defaultGitLastCommit(folder, lock)).toBeNull();
  });

  it("excludes the lock file from the lookup (re-stamp doesn't register as a change)", () => {
    const tmp = mkdtempSync(join(tmpdir(), "vsf-exclude-"));
    cleanupDirs.push(tmp);
    spawnSync("git", ["init", "-q"], { cwd: tmp });
    spawnSync("git", ["config", "user.email", "t@example.com"], { cwd: tmp });
    spawnSync("git", ["config", "user.name", "T"], { cwd: tmp });
    const folder = join(tmp, "feature");
    const specs = join(folder, "__specs__");
    mkdirSync(specs, { recursive: true });
    // Commit 1: just the source file (older date)
    writeFileSync(join(folder, "code.ts"), "// initial\n");
    spawnSync("git", ["add", "."], { cwd: tmp });
    spawnSync("git", ["commit", "-q", "-m", "code"], {
      cwd: tmp,
      env: {
        ...process.env,
        GIT_AUTHOR_DATE: "2026-05-20T00:00:00Z",
        GIT_COMMITTER_DATE: "2026-05-20T00:00:00Z",
      },
    });
    // Commit 2: just the lock file (newer date)
    const lock = join(specs, "standards-compliance.yaml");
    writeFileSync(lock, "status: locked\n");
    spawnSync("git", ["add", "."], { cwd: tmp });
    spawnSync("git", ["commit", "-q", "-m", "lock"], {
      cwd: tmp,
      env: {
        ...process.env,
        GIT_AUTHOR_DATE: "2026-05-22T00:00:00Z",
        GIT_COMMITTER_DATE: "2026-05-22T00:00:00Z",
      },
    });
    // With lock excluded, the "last touch of folder" should be commit 1.
    const out = defaultGitLastCommit(folder, lock);
    expect(out).toMatch(/^2026-05-20T/);
  });
});

// --- audit ------------------------------------------------------------

describe("audit", () => {
  const lockA = "/repo/src/a/__specs__/standards-compliance.yaml";

  it("returns checked=0, failures=[] when no lock files exist", () => {
    const r = audit("/repo", {
      readFile: () => "",
      listFiles: () => ["/repo/src/a/code.ts"],
    });
    expect(r).toEqual({ checked: 0, failures: [] });
  });

  it("aggregates a multi-file happy path (all fresh)", () => {
    const r = audit("/repo", {
      readFile: () =>
        `status: locked\nverified: "100%"\nlast_validated: 2030-01-01T00:00:00Z\n`,
      listFiles: () => [lockA],
      gitLastCommit: () => "2029-12-31T00:00:00Z",
    });
    expect(r.checked).toBe(1);
    expect(r.failures).toEqual([]);
  });

  it("skips a lock that fails parse silently (presence is the other script's job)", () => {
    const r = audit("/repo", {
      readFile: () => `not-yaml-no-colon\n`,
      listFiles: () => [lockA],
      gitLastCommit: () => "2099-01-01T00:00:00Z",
    });
    expect(r.checked).toBe(1);
    expect(r.failures).toEqual([]);
  });

  it("skips a lock that fails presence silently", () => {
    const r = audit("/repo", {
      readFile: () =>
        `status: unlocked\nverified: "100%"\nlast_validated: 2026-05-21T00:00:00Z\n`,
      listFiles: () => [lockA],
      gitLastCommit: () => "2099-01-01T00:00:00Z",
    });
    expect(r.checked).toBe(1);
    expect(r.failures).toEqual([]);
  });

  it("captures a freshness failure", () => {
    const r = audit("/repo", {
      readFile: () =>
        `status: locked\nverified: "100%"\nlast_validated: 2026-05-21T00:00:00Z\n`,
      listFiles: () => [lockA],
      gitLastCommit: () => "2026-05-30T00:00:00Z",
    });
    expect(r.failures[0]?.reason).toBe("folder modified after last_validated");
  });

  it("skips a lock whose read throws (presence's job to surface)", () => {
    const r = audit("/repo", {
      readFile: () => {
        throw new Error("boom");
      },
      listFiles: () => [lockA],
      gitLastCommit: () => "2099-01-01T00:00:00Z",
    });
    expect(r.failures).toEqual([]);
  });

  it("uses default readFile + listFiles when none are injected", () => {
    const here = resolve(dirname(__filename));
    const r = audit(here);
    // The __tests__ folder has no standards-compliance.yaml — checked=0.
    expect(r.checked).toBe(0);
    expect(r.failures).toEqual([]);
  });
});

// --- formatReport -----------------------------------------------------

describe("formatReport", () => {
  it("formats the OK line on zero failures", () => {
    const r = formatReport({ checked: 5, failures: [] }, "/repo");
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toBe(
      "verify-standards-freshness: OK (5 lock file(s) fresh vs git history)\n",
    );
    expect(r.stderr).toBe("");
  });

  it("formats per-failure blocks on stderr", () => {
    const r = formatReport(
      {
        checked: 2,
        failures: [
          {
            filePath: "/repo/src/a/__specs__/standards-compliance.yaml",
            reason: "folder modified after last_validated",
            detail: "last_validated=...; commit=...",
          },
        ],
      },
      "/repo",
    );
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toContain("verify-standards-freshness: 1 lock file(s) stale");
    expect(r.stderr).toContain("src/a/__specs__/standards-compliance.yaml");
    expect(r.stderr).toContain("folder modified after last_validated");
    expect(r.stdout).toBe("");
  });
});

// --- main -------------------------------------------------------------

describe("main", () => {
  it("returns exitCode 0 when audit yields no failures + writes the OK line", () => {
    /** @type {string[]} */
    const out = [];
    /** @type {string[]} */
    const err = [];
    const r = main("/repo", {
      readFile: () =>
        `status: locked\nverified: "100%"\nlast_validated: 2030-01-01T00:00:00Z\n`,
      listFiles: () => ["/repo/src/a/__specs__/standards-compliance.yaml"],
      gitLastCommit: () => "2029-12-31T00:00:00Z",
      write: (s) => out.push(s),
      writeErr: (s) => err.push(s),
    });
    expect(r.exitCode).toBe(0);
    expect(out.join("")).toContain("OK (1 lock file(s) fresh");
    expect(err.join("")).toBe("");
  });

  it("returns exitCode 1 when audit yields a failure + writes to stderr", () => {
    /** @type {string[]} */
    const out = [];
    /** @type {string[]} */
    const err = [];
    const r = main("/repo", {
      readFile: () =>
        `status: locked\nverified: "100%"\nlast_validated: 2026-05-21T00:00:00Z\n`,
      listFiles: () => ["/repo/src/a/__specs__/standards-compliance.yaml"],
      gitLastCommit: () => "2099-01-01T00:00:00Z",
      write: (s) => out.push(s),
      writeErr: (s) => err.push(s),
    });
    expect(r.exitCode).toBe(1);
    expect(err.join("")).toContain("lock file(s) stale");
    expect(out.join("")).toBe("");
  });

  it("falls back to default rootDir, write, writeErr when none are supplied", () => {
    const stdoutBuf = /** @type {string[]} */ ([]);
    const stderrBuf = /** @type {string[]} */ ([]);
    const origOut = process.stdout.write.bind(process.stdout);
    const origErr = process.stderr.write.bind(process.stderr);
    // @ts-expect-error — test-only monkey-patch
    process.stdout.write = (s) => {
      stdoutBuf.push(String(s));
      return true;
    };
    // @ts-expect-error — test-only monkey-patch
    process.stderr.write = (s) => {
      stderrBuf.push(String(s));
      return true;
    };
    try {
      const r = main();
      // Whatever the result, the default-arg branches executed.
      expect(typeof r.exitCode).toBe("number");
      const wrote = stdoutBuf.length + stderrBuf.length;
      expect(wrote).toBeGreaterThan(0);
    } finally {
      process.stdout.write = origOut;
      process.stderr.write = origErr;
    }
  });
});

// --- default IO ports -------------------------------------------------

describe("default IO ports", () => {
  it("defaultStdoutWrite writes to stdout and returns true", () => {
    const orig = process.stdout.write.bind(process.stdout);
    let captured = "";
    // @ts-expect-error — test-only monkey-patch
    process.stdout.write = (s) => {
      captured += String(s);
      return true;
    };
    try {
      const ret = defaultStdoutWrite("x");
      expect(captured).toBe("x");
      expect(ret).toBe(true);
    } finally {
      process.stdout.write = orig;
    }
  });

  it("defaultStderrWrite writes to stderr and returns true", () => {
    const orig = process.stderr.write.bind(process.stderr);
    let captured = "";
    // @ts-expect-error — test-only monkey-patch
    process.stderr.write = (s) => {
      captured += String(s);
      return true;
    };
    try {
      const ret = defaultStderrWrite("y");
      expect(captured).toBe("y");
      expect(ret).toBe(true);
    } finally {
      process.stderr.write = orig;
    }
  });
});

// --- CLI helpers ------------------------------------------------------

describe("isCliInvocation", () => {
  it("returns false when argv1 is undefined", () => {
    expect(isCliInvocation("file:///x", undefined)).toBe(false);
  });

  it("returns false when argv1 is the empty string", () => {
    expect(isCliInvocation("file:///x", "")).toBe(false);
  });

  it("returns false when argv1 path does not match import.meta.url", () => {
    expect(isCliInvocation("file:///a.mjs", "/tmp/b.mjs")).toBe(false);
  });

  it("returns true when argv1 resolves to the same URL as import.meta.url", () => {
    const argv1 = "/tmp/x.mjs";
    const url = pathToFileURL(argv1).href;
    expect(isCliInvocation(url, argv1)).toBe(true);
  });
});

describe("cliMain", () => {
  it("invokes main with FORCE_ROOT + forwards the exit code", () => {
    /** @type {number[]} */
    const codes = [];
    const tmp = mkdtempSync(join(tmpdir(), "vsf-clim-"));
    cleanupDirs.push(tmp);
    cliMain({
      env: { FORCE_ROOT: tmp },
      exit: (c) => codes.push(c),
    });
    expect(codes).toEqual([0]);
  });

  it("falls back to DEFAULT_ROOTS when FORCE_ROOT is unset", () => {
    /** @type {number[]} */
    const codes = [];
    cliMain({
      env: {},
      exit: (c) => codes.push(c),
    });
    expect(codes.length).toBe(1);
  });

  it("aggregates a non-zero exit code from main(root)", () => {
    // Drive the `if (exitCode !== 0) aggregateExit = 1;` branch by
    // pointing FORCE_ROOT at a real (tiny) git repo that contains a
    // stale lock — folder has a commit dated strictly newer than the
    // lock's last_validated, with the lock NOT touched by that commit.
    const tmp = mkdtempSync(join(tmpdir(), "vsf-cli-fail-"));
    cleanupDirs.push(tmp);
    spawnSync("git", ["init", "-q"], { cwd: tmp });
    spawnSync("git", ["config", "user.email", "t@example.com"], { cwd: tmp });
    spawnSync("git", ["config", "user.name", "T"], { cwd: tmp });
    const feat = join(tmp, "feature");
    const specs = join(feat, "__specs__");
    mkdirSync(specs, { recursive: true });
    const lock = join(specs, "standards-compliance.yaml");
    // Commit 1: lock with an OLD last_validated date.
    writeFileSync(
      lock,
      `status: locked\nverified: "100%"\nlast_validated: 2020-01-01T00:00:00Z\n`,
    );
    spawnSync("git", ["add", "."], { cwd: tmp });
    spawnSync("git", ["commit", "-q", "-m", "lock"], {
      cwd: tmp,
      env: {
        ...process.env,
        GIT_AUTHOR_DATE: "2020-01-01T00:00:00Z",
        GIT_COMMITTER_DATE: "2020-01-01T00:00:00Z",
      },
    });
    // Commit 2: a NEW file inside the feature folder dated MUCH later.
    writeFileSync(join(feat, "code.ts"), "// fresh\n");
    spawnSync("git", ["add", "."], { cwd: tmp });
    spawnSync("git", ["commit", "-q", "-m", "newer"], {
      cwd: tmp,
      env: {
        ...process.env,
        GIT_AUTHOR_DATE: "2030-01-01T00:00:00Z",
        GIT_COMMITTER_DATE: "2030-01-01T00:00:00Z",
      },
    });
    /** @type {number[]} */
    const codes = [];
    // Silence stderr from the failure report.
    const origErr = process.stderr.write.bind(process.stderr);
    // @ts-expect-error — test-only monkey-patch
    process.stderr.write = () => true;
    try {
      cliMain({
        env: { FORCE_ROOT: tmp },
        exit: (c) => codes.push(c),
      });
    } finally {
      process.stderr.write = origErr;
    }
    expect(codes).toEqual([1]);
  });

  it("uses process.env / process.exit when no io is passed", () => {
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

describe("maybeRunCli", () => {
  it("returns false and skips cliMain when the guard rejects", () => {
    const r = maybeRunCli({
      importMetaUrl: "file:///never-matches.mjs",
      argv1: "/tmp/somewhere-else.mjs",
      env: {},
      exit: () => undefined,
    });
    expect(r).toBe(false);
  });

  it("invokes cliMain + returns true when the guard accepts", () => {
    /** @type {number[]} */
    const codes = [];
    const tmp = mkdtempSync(join(tmpdir(), "vsf-maybe-"));
    cleanupDirs.push(tmp);
    const argv1 = "/tmp/match.mjs";
    const url = pathToFileURL(argv1).href;
    const r = maybeRunCli({
      importMetaUrl: url,
      argv1,
      env: { FORCE_ROOT: tmp },
      exit: (c) => codes.push(c),
    });
    expect(r).toBe(true);
    expect(codes).toEqual([0]);
  });
});

// --- CLI invocation (real spawn) --------------------------------------

describe("CLI entry", () => {
  it("exits 0 on a clean tmp root with no lock files", () => {
    const tmp = mkdtempSync(join(tmpdir(), "vsf-cli-clean-"));
    cleanupDirs.push(tmp);
    const res = spawnSync(process.execPath, [SCRIPT_PATH], {
      env: { ...process.env, FORCE_ROOT: tmp },
      encoding: "utf8",
    });
    expect(res.status).toBe(0);
    expect(res.stdout).toContain("verify-standards-freshness: OK");
  });

  it("exits 1 when a stale lock file is found under a tmp git repo via FORCE_ROOT", () => {
    const tmp = mkdtempSync(join(tmpdir(), "vsf-cli-stale-"));
    cleanupDirs.push(tmp);
    spawnSync("git", ["init", "-q"], { cwd: tmp });
    spawnSync("git", ["config", "user.email", "t@example.com"], { cwd: tmp });
    spawnSync("git", ["config", "user.name", "T"], { cwd: tmp });
    const specs = join(tmp, "feature", "__specs__");
    mkdirSync(specs, { recursive: true });
    writeFileSync(
      join(specs, "standards-compliance.yaml"),
      'status: locked\nverified: "100%"\nlast_validated: 2000-01-01T00:00:00Z\n',
    );
    writeFileSync(
      join(tmp, "feature", "code.ts"),
      "// committed after last_validated\n",
    );
    spawnSync("git", ["add", "."], { cwd: tmp });
    spawnSync("git", ["commit", "-q", "-m", "stale"], {
      cwd: tmp,
      env: {
        ...process.env,
        GIT_AUTHOR_DATE: "2026-05-23T00:00:00Z",
        GIT_COMMITTER_DATE: "2026-05-23T00:00:00Z",
      },
    });
    const res = spawnSync(process.execPath, [SCRIPT_PATH], {
      env: { ...process.env, FORCE_ROOT: tmp },
      encoding: "utf8",
    });
    expect(res.status).toBe(1);
    expect(res.stderr).toContain("folder modified after last_validated");
  });
});
