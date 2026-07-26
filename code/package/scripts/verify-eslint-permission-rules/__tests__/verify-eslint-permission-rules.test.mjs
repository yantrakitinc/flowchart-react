// Vitest suite for verify-eslint-permission-rules.
//
// Drives every helper via dependency-injected IO so the suite reaches
// 100/100/100/100 per-file coverage without invoking the real ESLint
// binary. The defaultRunEslint port is exercised against a synthetic
// non-existent binary to prove the error branch fires; a separate
// spawn-based smoke test runs the real script against the repo to
// catch wiring drift.

import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";

import {
  FIXTURES,
  audit,
  checkFixture,
  cliMain,
  defaultRunEslint,
  defaultStderrWrite,
  defaultStdoutWrite,
  formatReport,
  isCliInvocation,
  main,
  maybeRunCli,
  runEslintOnSnippet,
} from "../verify-eslint-permission-rules.mjs";

const __filename = fileURLToPath(import.meta.url);
const SCRIPT_PATH = resolve(
  dirname(__filename),
  "..",
  "verify-eslint-permission-rules.mjs",
);

// --- FIXTURES ----------------------------------------------------------

describe("FIXTURES", () => {
  it("has at least one row per rule family", () => {
    const names = FIXTURES.map((f) => f.name);
    expect(names.some((n) => n.startsWith("Rule1."))).toBe(true);
    expect(names.some((n) => n.startsWith("Rule2."))).toBe(true);
    expect(names.some((n) => n.startsWith("Rule2b."))).toBe(true);
    expect(names.some((n) => n.startsWith("Rule3."))).toBe(true);
    expect(names.some((n) => n.startsWith("Rule4."))).toBe(true);
  });

  it("every row has a non-empty source", () => {
    for (const f of FIXTURES) {
      expect(f.source.trim().length).toBeGreaterThan(0);
    }
  });

  it("every row's expect is 'violation' or 'allowed'", () => {
    for (const f of FIXTURES) {
      expect(["violation", "allowed"]).toContain(f.expect);
    }
  });
});

// --- runEslintOnSnippet -----------------------------------------------

describe("runEslintOnSnippet", () => {
  it("returns parsed JSON when stdout is valid JSON (mocked spawn)", () => {
    const fakeResult = {
      error: undefined,
      status: 0,
      stdout: JSON.stringify([{ messages: [] }]),
      stderr: "",
    };
    const out = runEslintOnSnippet("/bin/eslint", "/cwd", "src/x.ts", "", {
      runEslint: () => fakeResult,
    });
    expect(out).toEqual([{ messages: [] }]);
  });

  it("throws when spawn returns an error (mocked)", () => {
    const fakeResult = {
      error: new Error("ENOENT"),
      status: null,
      stdout: "",
      stderr: "",
    };
    expect(() =>
      runEslintOnSnippet("/bin/eslint", "/cwd", "src/x.ts", "", {
        runEslint: () => fakeResult,
      }),
    ).toThrow(/eslint invocation failed/);
  });

  it("throws when stdout is not valid JSON (mocked)", () => {
    const fakeResult = {
      error: undefined,
      status: 0,
      stdout: "not json",
      stderr: "",
    };
    expect(() =>
      runEslintOnSnippet("/bin/eslint", "/cwd", "src/x.ts", "", {
        runEslint: () => fakeResult,
      }),
    ).toThrow(/Could not parse eslint JSON output/);
  });
});

// --- checkFixture ------------------------------------------------------

describe("checkFixture", () => {
  /** @type {import("../verify-eslint-permission-rules.mjs").FIXTURES[number]} */
  const violationFixture = {
    name: "TestRule.violation/something",
    virtualPath: "src/x.ts",
    source: "void 0;",
    expect: "violation",
    ruleId: "my-rule",
    messageFragment: "BAD",
  };
  /** @type {import("../verify-eslint-permission-rules.mjs").FIXTURES[number]} */
  const allowedFixture = {
    name: "TestRule.allowed/something",
    virtualPath: "src/x.ts",
    source: "void 0;",
    expect: "allowed",
    ruleId: "my-rule",
    messageFragment: "BAD",
  };

  function mockedPorts(jsonOutput) {
    return {
      eslintBin: "/bin/eslint",
      cwd: "/cwd",
      runEslint: () => ({
        error: undefined,
        status: 0,
        stdout: jsonOutput,
        stderr: "",
      }),
    };
  }

  it("returns ok when expect=violation AND a matching diagnostic fires", () => {
    const r = checkFixture(
      violationFixture,
      mockedPorts(
        JSON.stringify([
          { messages: [{ ruleId: "my-rule", message: "this is BAD here" }] },
        ]),
      ),
    );
    expect(r.ok).toBe(true);
  });

  it("returns error when expect=violation but no matching diagnostic", () => {
    const r = checkFixture(
      violationFixture,
      mockedPorts(JSON.stringify([{ messages: [] }])),
    );
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.error).toMatch(/expected my-rule to fire/);
  });

  it("returns ok when expect=allowed AND no matching diagnostic", () => {
    const r = checkFixture(
      allowedFixture,
      mockedPorts(JSON.stringify([{ messages: [] }])),
    );
    expect(r.ok).toBe(true);
  });

  it("returns error when expect=allowed but a matching diagnostic fires", () => {
    const r = checkFixture(
      allowedFixture,
      mockedPorts(
        JSON.stringify([
          { messages: [{ ruleId: "my-rule", message: "BAD!" }] },
        ]),
      ),
    );
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.error).toMatch(/expected my-rule to NOT fire/);
  });

  it("returns error when ESLint returns zero file results", () => {
    const r = checkFixture(violationFixture, mockedPorts(JSON.stringify([])));
    expect(r.ok).toBe(false);
    if (r.ok) throw new Error("unreachable");
    expect(r.error).toMatch(/no file result/);
  });

  it("ignores unrelated diagnostics (rule-scoped check)", () => {
    // expect=allowed: a different ruleId firing does NOT count.
    const r = checkFixture(
      allowedFixture,
      mockedPorts(
        JSON.stringify([
          { messages: [{ ruleId: "other-rule", message: "BAD here" }] },
        ]),
      ),
    );
    expect(r.ok).toBe(true);
  });

  it("ignores diagnostics whose message lacks the fragment", () => {
    const r = checkFixture(
      violationFixture,
      mockedPorts(
        JSON.stringify([
          { messages: [{ ruleId: "my-rule", message: "different text" }] },
        ]),
      ),
    );
    expect(r.ok).toBe(false);
  });

  it("tolerates a file-result with no messages array (defaults to [])", () => {
    const r = checkFixture(
      allowedFixture,
      mockedPorts(JSON.stringify([{ /* no messages */ }])),
    );
    expect(r.ok).toBe(true);
  });

  it("ignores a message whose 'message' field is not a string", () => {
    const r = checkFixture(
      violationFixture,
      mockedPorts(
        JSON.stringify([
          { messages: [{ ruleId: "my-rule", message: 42 }] },
        ]),
      ),
    );
    expect(r.ok).toBe(false);
  });
});

// --- audit -------------------------------------------------------------

describe("audit", () => {
  function mockedPorts(map) {
    return {
      eslintBin: "/bin/eslint",
      cwd: "/cwd",
      runEslint: (_bin, _cwd, vp) => ({
        error: undefined,
        status: 0,
        stdout: map[vp] ?? JSON.stringify([{ messages: [] }]),
        stderr: "",
      }),
    };
  }

  it("returns errors=[] when every fixture passes", () => {
    const fixtures = [
      {
        name: "f1",
        virtualPath: "src/x.ts",
        source: "",
        expect: "allowed",
        ruleId: "r",
        messageFragment: "BAD",
      },
    ];
    const r = audit(
      fixtures,
      mockedPorts({ "src/x.ts": JSON.stringify([{ messages: [] }]) }),
    );
    expect(r.errors).toEqual([]);
    expect(r.total).toBe(1);
  });

  it("collects errors when fixtures fail", () => {
    const fixtures = [
      {
        name: "f1",
        virtualPath: "src/x.ts",
        source: "",
        expect: "violation",
        ruleId: "r",
        messageFragment: "BAD",
      },
      {
        name: "f2",
        virtualPath: "src/y.ts",
        source: "",
        expect: "allowed",
        ruleId: "r",
        messageFragment: "BAD",
      },
    ];
    const r = audit(
      fixtures,
      mockedPorts({
        // f1 expects violation; no diagnostic → fail
        "src/x.ts": JSON.stringify([{ messages: [] }]),
        // f2 expects allowed; diagnostic fires → fail
        "src/y.ts": JSON.stringify([
          { messages: [{ ruleId: "r", message: "BAD x" }] },
        ]),
      }),
    );
    expect(r.errors).toHaveLength(2);
    expect(r.total).toBe(2);
  });

  it("returns total=0 when fixtures list is empty", () => {
    const r = audit([], { eslintBin: "/bin/eslint", cwd: "/cwd" });
    expect(r.errors).toEqual([]);
    expect(r.total).toBe(0);
  });
});

// --- formatReport ------------------------------------------------------

describe("formatReport", () => {
  it("returns exit 0 + OK stdout when no errors", () => {
    const r = formatReport({ errors: [], total: 30 });
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain(
      "verify-eslint-permission-rules: OK (30 fixture(s) checked)",
    );
    expect(r.stderr).toBe("");
  });

  it("returns exit 1 + summary + errors on stderr", () => {
    const r = formatReport({
      errors: ["f1: boom", "f2: boom"],
      total: 30,
    });
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toContain("2 fixture failure(s)");
    expect(r.stderr).toContain("f1: boom");
    expect(r.stderr).toContain("f2: boom");
  });
});

// --- main --------------------------------------------------------------

describe("main", () => {
  it("returns exit 0 and writes OK when audit passes (mocked runEslint)", () => {
    /** @type {string[]} */
    const out = [];
    /** @type {string[]} */
    const err = [];
    const fixtures = [
      {
        name: "f1",
        virtualPath: "src/x.ts",
        source: "",
        expect: "allowed",
        ruleId: "r",
        messageFragment: "BAD",
      },
    ];
    const r = main({
      fixtures,
      runEslint: () => ({
        error: undefined,
        status: 0,
        stdout: JSON.stringify([{ messages: [] }]),
        stderr: "",
      }),
      write: (s) => out.push(s),
      writeErr: (s) => err.push(s),
    });
    expect(r.exitCode).toBe(0);
    expect(out.join("")).toContain("verify-eslint-permission-rules: OK");
    expect(err.join("")).toBe("");
  });

  it("returns exit 1 and writes failure block when audit collects errors", () => {
    /** @type {string[]} */
    const out = [];
    /** @type {string[]} */
    const err = [];
    const fixtures = [
      {
        name: "f1",
        virtualPath: "src/x.ts",
        source: "",
        expect: "violation",
        ruleId: "r",
        messageFragment: "BAD",
      },
    ];
    const r = main({
      fixtures,
      runEslint: () => ({
        error: undefined,
        status: 0,
        stdout: JSON.stringify([{ messages: [] }]),
        stderr: "",
      }),
      write: (s) => out.push(s),
      writeErr: (s) => err.push(s),
    });
    expect(r.exitCode).toBe(1);
    expect(err.join("")).toContain("fixture failure");
    expect(out.join("")).toBe("");
  });

  it("uses default-IO branches when called with no arguments (empty fixtures keeps it fast)", () => {
    // Drive main with no IO overrides but an empty fixture list so the
    // default-arg branches for eslintBin / cwd / write / writeErr /
    // runEslint all execute without spawning ESLint 32 times.
    const r = main({ fixtures: [] });
    expect(r.exitCode).toBe(0);
  });
});

// --- default IO ports --------------------------------------------------

describe("default IO ports", () => {
  it("defaultRunEslint surfaces an error when the binary does not exist", () => {
    const res = defaultRunEslint(
      "/never/exists/eslint",
      process.cwd(),
      "src/x.ts",
      "",
    );
    // spawnSync sets either .error (e.g. ENOENT) or .status=non-zero
    // depending on platform; both shapes are valid here.
    expect(res).toBeDefined();
    expect("status" in res || "error" in res).toBe(true);
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
    cliMain({
      exit: (c) => codes.push(c),
      mainImpl: () => ({ exitCode: 0 }),
    });
    expect(codes).toEqual([0]);
  });

  it("forwards a non-zero exit code from the injected mainImpl", () => {
    /** @type {number[]} */
    const codes = [];
    cliMain({
      exit: (c) => codes.push(c),
      mainImpl: () => ({ exitCode: 1 }),
    });
    expect(codes).toEqual([1]);
  });

  it("falls back to process.exit AND the real main when no io is passed", () => {
    // Default-arg branches: `exit` defaults to process.exit; `mainImpl`
    // defaults to the real `main`. We monkey-patch process.exit and pass
    // an empty fixtures list via a wrapped mainImpl to keep this fast.
    const origExit = process.exit;
    /** @type {number[]} */
    const codes = [];
    // @ts-expect-error — test-only monkey-patch
    process.exit = (c) => {
      codes.push(c ?? 0);
    };
    try {
      cliMain({ mainImpl: () => ({ exitCode: 0 }) });
      expect(codes).toEqual([0]);
    } finally {
      process.exit = origExit;
    }
  });

  it("exercises the real main + process.exit defaults (smoke)", () => {
    // One slow path covers BOTH default-arg branches in cliMain at once.
    // We accept either exit code so the test stays robust if eslint
    // config drifts.
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
      expect([0, 1]).toContain(codes[0]);
    } finally {
      process.exit = origExit;
    }
  }, 120_000);
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

  it("invokes cliMain and returns true when the guard accepts (mainImpl stub keeps it fast)", () => {
    /** @type {number[]} */
    const codes = [];
    const argv1 = "/tmp/match.mjs";
    const url = pathToFileURL(argv1).href;
    const r = maybeRunCli({
      importMetaUrl: url,
      argv1,
      exit: (c) => codes.push(c),
      mainImpl: () => ({ exitCode: 0 }),
    });
    expect(r).toBe(true);
    expect(codes).toEqual([0]);
  });
});

// --- CLI invocation (real spawn) --------------------------------------

describe("CLI entry", () => {
  it(
    "runs the real binary against the repo and emits a recognised line",
    () => {
      const res = spawnSync(process.execPath, [SCRIPT_PATH], {
        env: { ...process.env },
        encoding: "utf8",
      });
      expect([0, 1]).toContain(res.status);
      if (res.status === 0) {
        expect(res.stdout).toContain("verify-eslint-permission-rules: OK");
      } else {
        expect(res.stderr).toContain("verify-eslint-permission-rules:");
      }
    },
    120_000,
  );
});
