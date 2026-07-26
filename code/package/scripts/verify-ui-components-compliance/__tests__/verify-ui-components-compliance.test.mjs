// Vitest suite for the verify-ui-components-compliance gate. Every
// exported helper has at least one PASS + one FAIL fixture so the
// suite reaches 100/100/100/100 per-file coverage.

import { chmodSync, mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterAll, describe, expect, it } from "vitest";

import { pathToFileURL } from "node:url";

import {
  _constants,
  auditFolderShape,
  collectComponentFolders,
  collectFiles,
  findMisplacedComponents,
  findShadeViolations,
  isCliInvocation,
  isShadeExempt,
  maybeRunCli,
  runAudit,
} from "../verify-ui-components-compliance.mjs";

/** @type {string[]} */
const cleanup = [];
afterAll(() => {
  for (const d of cleanup) {
    try {
      rmSync(d, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
});

function mkRoot(label) {
  const d = mkdtempSync(join(tmpdir(), `${label}-`));
  cleanup.push(d);
  return d;
}

function write(p, body = "") {
  mkdirSync(join(p, ".."), { recursive: true });
  writeFileSync(p, body);
}

function silencingStdio(fn) {
  const origOut = process.stdout.write.bind(process.stdout);
  const origErr = process.stderr.write.bind(process.stderr);
  /** @type {string[]} */
  const outBuf = [];
  /** @type {string[]} */
  const errBuf = [];
  // @ts-expect-error — test-only monkey-patch
  process.stdout.write = (s) => {
    outBuf.push(String(s));
    return true;
  };
  // @ts-expect-error — test-only monkey-patch
  process.stderr.write = (s) => {
    errBuf.push(String(s));
    return true;
  };
  try {
    const code = fn();
    return { code, out: outBuf.join(""), err: errBuf.join("") };
  } finally {
    process.stdout.write = origOut;
    process.stderr.write = origErr;
  }
}

function mkComponent(root, parent, name, opts = {}) {
  const folder = join(root, parent, name);
  mkdirSync(folder, { recursive: true });
  if (opts.shape !== "missing") {
    write(join(folder, `${name}.tsx`), `export const ${name} = () => null;\n`);
    write(join(folder, "index.ts"), `export { ${name} } from "./${name}";\n`);
    mkdirSync(join(folder, "__tests__"), { recursive: true });
    write(join(folder, "__tests__", `${name}.test.tsx`), "");
    mkdirSync(join(folder, "__stories__"), { recursive: true });
    write(join(folder, "__stories__", `${name}.stories.tsx`), "");
    mkdirSync(join(folder, "__specs__"), { recursive: true });
    write(join(folder, "__specs__", "spec.yaml"), "purpose: x\n");
    write(join(folder, "__specs__", "standards-compliance.yaml"), "status: locked\n");
  }
  return folder;
}

describe("_constants", () => {
  it("exports the SHADE_RE / BLACK_WHITE_RE / SHADE_EXEMPT_DIRS / VIOLATION_PREFIX", () => {
    expect(_constants.SHADE_RE).toBeInstanceOf(RegExp);
    expect(_constants.BLACK_WHITE_RE).toBeInstanceOf(RegExp);
    expect(_constants.SHADE_EXEMPT_DIRS.length).toBeGreaterThan(0);
    expect(_constants.STANDARD_DIRS).toContain("src/components/ui");
    expect(_constants.VIOLATION_PREFIX).toMatch(/G-UI-COMPONENTS/);
  });
});

describe("collectFiles", () => {
  it("walks .ts and .tsx, skipping node_modules / .next / dist", () => {
    const r = mkRoot("vuic-collect");
    mkdirSync(join(r, "node_modules"), { recursive: true });
    mkdirSync(join(r, ".next"), { recursive: true });
    mkdirSync(join(r, "dist"), { recursive: true });
    mkdirSync(join(r, "nested"), { recursive: true });
    write(join(r, "a.ts"), "");
    write(join(r, "nested/b.tsx"), "");
    write(join(r, "node_modules/skip.ts"), "");
    write(join(r, ".next/skip.ts"), "");
    write(join(r, "dist/skip.ts"), "");
    write(join(r, "ignored.md"), "");
    const files = collectFiles(r).sort();
    expect(files).toEqual([join(r, "a.ts"), join(r, "nested/b.tsx")].sort());
  });
  it("returns [] when readdir throws on the root", () => {
    expect(collectFiles("/no/such/path/vuic")).toEqual([]);
  });
  it("silently skips entries whose statSync throws (broken symlinks)", () => {
    const r = mkRoot("vuic-broken");
    write(join(r, "real.ts"), "");
    symlinkSync(join(r, "__nope__"), join(r, "broken.ts"));
    const files = collectFiles(r);
    expect(files).toContain(join(r, "real.ts"));
    expect(files).not.toContain(join(r, "broken.ts"));
  });
});

describe("isShadeExempt", () => {
  it("true for shadcn tree", () => {
    expect(isShadeExempt("src/components/shadcn/button.tsx")).toBe(true);
  });
  it("true for i18n messages tree", () => {
    expect(isShadeExempt("src/i18n/messages/en.json")).toBe(true);
  });
  it("false for app pages", () => {
    expect(isShadeExempt("src/app/page.tsx")).toBe(false);
  });
});

describe("findShadeViolations", () => {
  it("flags Tailwind shade classes in code", () => {
    const hits = findShadeViolations(`<div className="text-red-500" />\n`);
    expect(hits).toEqual([{ line: 1, hit: "text-red-500" }]);
  });
  it("flags bare bg-black / bg-white aliases", () => {
    const hits = findShadeViolations(`<div className="bg-white" />\n`);
    expect(hits).toEqual([{ line: 1, hit: "bg-white" }]);
  });
  it("ignores semantic tokens (text-foreground, bg-background)", () => {
    const hits = findShadeViolations(`<div className="text-foreground bg-background" />\n`);
    expect(hits).toEqual([]);
  });
  it("strips line comments (text-red-500 inside //) — no false positives", () => {
    const hits = findShadeViolations(`const x = 1; // example: text-red-500\n`);
    expect(hits).toEqual([]);
  });
  it("strips single-line block comments", () => {
    const hits = findShadeViolations(`const x = 1; /* text-red-500 */ \n`);
    expect(hits).toEqual([]);
  });
  it("strips multi-line block comments straddling several lines", () => {
    const src = "/*\ntext-red-500\nstill in comment\n*/\nlive: text-red-500\n";
    const hits = findShadeViolations(src);
    expect(hits).toEqual([{ line: 5, hit: "text-red-500" }]);
  });
  it("handles a block comment that NEVER closes (eats to end of file)", () => {
    // Open `/*` with no closing `*/` — the parser flips `inBlockComment`
    // and consumes everything past it. Subsequent lines contribute no hits.
    const src = `/* never closed\ntext-red-500\nbg-zinc-800\n`;
    const hits = findShadeViolations(src);
    expect(hits).toEqual([]);
  });
});

describe("collectComponentFolders", () => {
  it("collects PascalCase folders under src/components/ui and src/features/*/components", () => {
    const r = mkRoot("vuic-folders");
    mkdirSync(join(r, "src/components/ui/Foo"), { recursive: true });
    mkdirSync(join(r, "src/components/ui/lowercase"), { recursive: true });
    mkdirSync(join(r, "src/features/auth/components/Bar"), { recursive: true });
    mkdirSync(join(r, "src/features/auth/components/notPascal"), { recursive: true });
    const folders = collectComponentFolders(r);
    expect(folders).toContain(join(r, "src/components/ui/Foo"));
    expect(folders).toContain(join(r, "src/features/auth/components/Bar"));
    expect(folders).not.toContain(join(r, "src/components/ui/lowercase"));
    expect(folders).not.toContain(join(r, "src/features/auth/components/notPascal"));
  });
  it("handles a missing ui/ tree gracefully", () => {
    const r = mkRoot("vuic-no-ui");
    expect(collectComponentFolders(r)).toEqual([]);
  });
  it("handles a feature without a components/ subdir", () => {
    const r = mkRoot("vuic-no-comp");
    mkdirSync(join(r, "src/features/auth"), { recursive: true });
    expect(collectComponentFolders(r)).toEqual([]);
  });
});

describe("auditFolderShape", () => {
  it("returns null when every required file is present", () => {
    const r = mkRoot("vuic-shape-ok");
    const f = mkComponent(r, "src/components/ui", "Foo");
    expect(auditFolderShape(f)).toBeNull();
  });
  it("returns a missing list when files are absent", () => {
    const r = mkRoot("vuic-shape-bad");
    const folder = join(r, "src/components/ui/Bad");
    mkdirSync(folder, { recursive: true });
    // Only one file present — every other required artifact missing.
    write(join(folder, "Bad.tsx"), "");
    const res = auditFolderShape(folder);
    expect(res).not.toBeNull();
    expect(res?.missing).toContain("index.ts");
    expect(res?.missing).toContain("__tests__/Bad.test.tsx");
    expect(res?.missing).toContain("__specs__/spec.yaml");
  });
});

describe("findMisplacedComponents", () => {
  it("returns [] for a clean layout", () => {
    const r = mkRoot("vuic-place-ok");
    mkdirSync(join(r, "src/components/ui/Foo"), { recursive: true });
    mkdirSync(join(r, "src/components/shadcn"), { recursive: true });
    write(join(r, "src/components/shadcn/button.tsx"), "");
    expect(findMisplacedComponents(r)).toEqual([]);
  });
  it("flags flat .tsx files directly under src/components/ and ignores non-TS files", () => {
    const r = mkRoot("vuic-place-flat");
    mkdirSync(join(r, "src/components"), { recursive: true });
    write(join(r, "src/components/Foo.tsx"), "");
    write(join(r, "src/components/notes.md"), "");
    const out = findMisplacedComponents(r);
    expect(out).toContain("src/components/Foo.tsx");
    expect(out).not.toContain("src/components/notes.md");
  });
  it("flags flat files directly under src/components/ui/ and ignores non-TS files", () => {
    const r = mkRoot("vuic-place-ui-flat");
    mkdirSync(join(r, "src/components/ui"), { recursive: true });
    write(join(r, "src/components/ui/Foo.tsx"), "");
    write(join(r, "src/components/ui/README.md"), "");
    const out = findMisplacedComponents(r);
    expect(out).toContain("src/components/ui/Foo.tsx");
    expect(out).not.toContain("src/components/ui/README.md");
  });
  it("returns [] when neither components/ nor ui/ exists", () => {
    const r = mkRoot("vuic-place-missing");
    expect(findMisplacedComponents(r)).toEqual([]);
  });
});

describe("runAudit", () => {
  it("returns 0 + PASS when every gate is satisfied", () => {
    const r = mkRoot("vuic-pass");
    mkdirSync(join(r, "src/components/ui"), { recursive: true });
    mkComponent(r, "src/components/ui", "Foo");
    const { code, out } = silencingStdio(() => runAudit(r));
    expect(code).toBe(0);
    expect(out).toMatch(/\[verify-ui-components-compliance\] PASS/);
  });

  it("reports GATE-1 / GATE-2 / GATE-3 failures all together", () => {
    const r = mkRoot("vuic-fail-all");
    // GATE-1: component folder missing required files.
    const broken = join(r, "src/components/ui/Broken");
    mkdirSync(broken, { recursive: true });
    write(join(broken, "Broken.tsx"), "");
    // GATE-3: flat file directly under src/components/
    mkdirSync(join(r, "src/components"), { recursive: true });
    write(join(r, "src/components/Stray.tsx"), "");
    // GATE-2: hardcoded shade class outside the shadcn tree.
    mkdirSync(join(r, "src/app"), { recursive: true });
    write(
      join(r, "src/app/page.tsx"),
      `export default function P(){return <div className="text-red-500" />}\n`,
    );
    const { code, err } = silencingStdio(() => runAudit(r));
    expect(code).toBe(1);
    expect(err).toMatch(/G-UI-COMPONENTS violation/);
    expect(err).toMatch(/GATE-1/);
    expect(err).toMatch(/GATE-2/);
    expect(err).toMatch(/GATE-3/);
    expect(err).toMatch(/non-overridable/);
  });

  it("reports ONLY GATE-1 when shape is broken but placement + shades are clean", () => {
    const r = mkRoot("vuic-only-gate1");
    const broken = join(r, "src/components/ui/Broken");
    mkdirSync(broken, { recursive: true });
    write(join(broken, "Broken.tsx"), "");
    const { code, err } = silencingStdio(() => runAudit(r));
    expect(code).toBe(1);
    expect(err).toMatch(/GATE-1/);
    expect(err).not.toMatch(/GATE-2 —/);
    expect(err).not.toMatch(/GATE-3 —/);
  });
  it("reports ONLY GATE-2 when shade classes exist but shape + placement are clean", () => {
    const r = mkRoot("vuic-only-gate2");
    mkdirSync(join(r, "src/app"), { recursive: true });
    write(
      join(r, "src/app/page.tsx"),
      `export default function P(){return <div className="text-red-500" />}\n`,
    );
    const { code, err } = silencingStdio(() => runAudit(r));
    expect(code).toBe(1);
    expect(err).toMatch(/GATE-2 —/);
    expect(err).not.toMatch(/GATE-1 —/);
    expect(err).not.toMatch(/GATE-3 —/);
  });
  it("reports ONLY GATE-3 when components are misplaced but shape + shades are clean", () => {
    const r = mkRoot("vuic-only-gate3");
    mkdirSync(join(r, "src/components"), { recursive: true });
    write(join(r, "src/components/Stray.tsx"), "");
    const { code, err } = silencingStdio(() => runAudit(r));
    expect(code).toBe(1);
    expect(err).toMatch(/GATE-3 —/);
    expect(err).not.toMatch(/GATE-1 —/);
    expect(err).not.toMatch(/GATE-2 —/);
  });

  it("skips shade-class scanning inside the shadcn tree", () => {
    const r = mkRoot("vuic-shadcn-exempt");
    mkdirSync(join(r, "src/components/shadcn"), { recursive: true });
    // shadcn-emitted file with a shade class — must NOT be flagged.
    write(
      join(r, "src/components/shadcn/button.tsx"),
      `export const B = () => <button className="text-red-500" />;\n`,
    );
    const { code } = silencingStdio(() => runAudit(r));
    expect(code).toBe(0);
  });

  it("returns 0 even when readFileSync throws inside the shade-check inner block", () => {
    // We can't easily force readFileSync to throw, but we can drive the
    // path where `content` ends up empty by writing a literal empty
    // .tsx file. The file is read OK but produces no shade hits.
    const r = mkRoot("vuic-empty");
    mkdirSync(join(r, "src/app"), { recursive: true });
    write(join(r, "src/app/empty.tsx"), "");
    const { code } = silencingStdio(() => runAudit(r));
    expect(code).toBe(0);
  });

  it("defaults rootDir to ROOT_DIR when omitted", () => {
    // The real frontend/src tree under this repo passes the gate. Drive
    // the default-arg branch so its initialiser is covered.
    const { code } = silencingStdio(() => runAudit());
    expect(code).toBe(0);
  });

  it("treats unreadable files as empty (readFileSync catch returns '')", () => {
    // Create a real .tsx file then chmod 000 so collectFiles passes it
    // through (statSync still works) but readFileSync throws EACCES.
    // The IIFE in runAudit must catch and treat the content as empty.
    if (process.getuid && process.getuid() === 0) {
      // Running as root bypasses chmod restrictions; skip in that case.
      return;
    }
    const r = mkRoot("vuic-perm");
    mkdirSync(join(r, "src/app"), { recursive: true });
    const f = join(r, "src/app/locked.tsx");
    write(f, "export default function L(){return null}\n");
    chmodSync(f, 0o000);
    try {
      const { code } = silencingStdio(() => runAudit(r));
      expect(code).toBe(0);
    } finally {
      // Restore so the temp dir is removable.
      chmodSync(f, 0o600);
    }
  });
});

describe("isCliInvocation", () => {
  it("false when argv1 is undefined or empty", () => {
    expect(isCliInvocation("file:///x", undefined)).toBe(false);
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
      runAudit: () => 0,
    });
    expect(r).toBe(false);
  });
  it("returns true + invokes injected runAudit + exit when guard accepts", () => {
    /** @type {number[]} */
    const codes = [];
    let auditCalled = 0;
    const fake = "/tmp/vuic-maybeRunCli.mjs";
    const r = maybeRunCli({
      importMetaUrl: pathToFileURL(fake).href,
      argv1: fake,
      exit: (c) => codes.push(c),
      runAudit: () => {
        auditCalled += 1;
        return 0;
      },
    });
    expect(r).toBe(true);
    expect(auditCalled).toBe(1);
    expect(codes).toEqual([0]);
  });
  it("falls back to process.exit + the real runAudit when omitted", () => {
    const origExit = process.exit;
    /** @type {number[]} */
    const codes = [];
    // @ts-expect-error — test-only monkey-patch
    process.exit = (c) => {
      codes.push(c ?? 0);
    };
    const fake = "/tmp/vuic-defaults.mjs";
    silencingStdio(() =>
      maybeRunCli({
        importMetaUrl: pathToFileURL(fake).href,
        argv1: fake,
      }),
    );
    process.exit = origExit;
    expect(codes).toEqual([0]);
  });
});
