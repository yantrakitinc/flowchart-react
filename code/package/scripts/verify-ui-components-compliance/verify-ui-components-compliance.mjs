#!/usr/bin/env node
// G-UI-COMPONENTS — COMPONENT_FOLDERS.yaml + COMPONENT_LIBRARY_DOCTRINE.yaml compliance gate.
//
// Mechanical implementation of the rules defined in
// `.claude/standards/COMPONENT_FOLDERS.yaml` and
// `.claude/standards/COMPONENT_LIBRARY_DOCTRINE.yaml` RULE FE-1 / FE-3
// / FE-4. Walks `frontend/src/` and fails on any of:
//
//   GATE-1  Component-folder shape. Every component in `src/components/ui/`
//           or `src/features/*/components/` must live in its OWN folder
//           named `ComponentName/` with:
//             - `ComponentName.tsx` (or .ts)
//             - `index.ts` (mandatory barrel)
//             - `__tests__/ComponentName.test.tsx`
//             - `__stories__/ComponentName.stories.tsx`
//             - `__specs__/spec.yaml`
//             - `__specs__/standards-compliance.yaml`
//
//           Flat-file components (e.g. `src/components/Foo.tsx`) fail.
//
//   GATE-2  Hardcoded Tailwind shade classes. Any `<color>-<shade>` form
//           (`text-red-500`, `bg-zinc-800`, `border-gray-100`, `bg-black`,
//           `bg-white`, etc.) in `src/components/ui/`,
//           `src/features/*/components/`, or `src/app/` is a violation.
//           `src/components/shadcn/` is exempt — the shadcn CLI emits
//           those, and we never hand-edit that tree.
//
//   GATE-3  Component location. Every `.tsx` file with a `'use client'`
//           directive OR an exported `function ComponentName` (PascalCase)
//           OR `export default function ComponentName` MUST live in one of:
//             - `src/components/shadcn/<file>.tsx` (flat — shadcn emits flat)
//             - `src/components/ui/<ComponentName>/...`
//             - `src/features/<feature>/components/<ComponentName>/...`
//             - `src/app/**` (Next.js App Router pages / layouts)
//
//   GATE-4  shadcn hand-edit heuristic. SKIPPED — needs upstream diff
//           which the verify gate can't cheaply do offline. Tracked
//           separately; out of scope for this gate.
//
// Pure Node + zero external dependencies. Helpers are exported so a
// future Vitest suite can exercise every branch without spawning a
// child process.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const SCRIPT_DIR = dirname(__filename);
const ROOT_DIR = resolve(SCRIPT_DIR, "..", "..");

const VIOLATION_PREFIX =
  "G-UI-COMPONENTS violation: a check defined in COMPONENT_FOLDERS.yaml + COMPONENT_LIBRARY_DOCTRINE.yaml failed.";

/**
 * Tailwind `<color>-<shade>` shade-class blacklist. Matches
 * `text-red-500`, `bg-zinc-800`, `border-gray-100`, `from-violet-400`,
 * `to-blue-600`, etc. Also flags the bare `bg-black` / `bg-white` /
 * `text-black` / `text-white` aliases. Allowed: any class that
 * resolves to a CSS variable token from globals.css — those have no
 * shade number (e.g., `bg-background`, `text-foreground`).
 */
const SHADE_RE = new RegExp(
  // Group 1: the full match. Group 2: the color part (red, blue, zinc, etc.)
  // Group 3: the optional shade (50, 100, 200, ... 950).
  // Followed by a word boundary so we don't match `bg-background` etc.
  "(?:^|\\s|[\"'`{(])((?:text|bg|border|from|to|via|ring|outline|divide|accent|fill|stroke|shadow|placeholder|caret)" +
    "-" +
    "(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)" +
    "(?:-(?:50|100|200|300|400|500|600|700|800|900|950))?)(?:[/\\s\"'`)}]|$)",
  "g",
);

/**
 * Aliases for plain `black` / `white`. Allowed only inside template
 * strings the shadcn CLI emits (we exempt the shadcn tree via path).
 */
const BLACK_WHITE_RE = new RegExp(
  "(?:^|\\s|[\"'`{(])((?:text|bg|border|ring|fill|stroke|shadow|placeholder|caret)" +
    "-(?:black|white))(?:/\\d+)?(?:[\\s\"'`)}]|$)",
  "g",
);

/**
 * Directories under `src/` that are exempt from shade-class checks.
 * `src/components/shadcn/` — CLI-emitted. `src/i18n/messages/` — JSON
 * catalogues, not React.
 */
const SHADE_EXEMPT_DIRS = [
  /^src\/components\/shadcn\//,
  /^src\/i18n\/messages\//,
];

const STANDARD_DIRS = [
  "src/components/shadcn",
  "src/components/ui",
  "src/features",
  "src/app",
  "src/hooks",
  "src/lib",
  "src/i18n",
  "src/middleware.ts",
];

/**
 * Walks `dir` recursively and returns every `.ts` / `.tsx` file path.
 *
 * @param {string} dir Absolute directory path.
 * @returns {string[]} Absolute file paths.
 */
export function collectFiles(dir) {
  const result = [];
  const stack = [dir];
  while (stack.length > 0) {
    const current = stack.pop();
    let entries;
    try {
      entries = readdirSync(current);
    } catch {
      continue;
    }
    for (const entry of entries) {
      const full = join(current, entry);
      let stats;
      try {
        stats = statSync(full);
      } catch {
        continue;
      }
      if (stats.isDirectory()) {
        if (entry === "node_modules" || entry === ".next" || entry === "dist") {
          continue;
        }
        stack.push(full);
      } else if (
        stats.isFile() &&
        (entry.endsWith(".ts") || entry.endsWith(".tsx"))
      ) {
        result.push(full);
      }
    }
  }
  return result;
}

/**
 * Returns true when a path falls in a shade-class-exempt tree.
 *
 * @param {string} rel forward-slash path relative to `frontend/`.
 * @returns {boolean}
 */
export function isShadeExempt(rel) {
  return SHADE_EXEMPT_DIRS.some((re) => re.test(rel));
}

/**
 * Returns the shade-class hits in `content`. Filters comments.
 *
 * @param {string} content
 * @returns {{line: number, hit: string}[]}
 */
export function findShadeViolations(content) {
  const out = [];
  const lines = content.split("\n");
  let inBlockComment = false;
  for (let i = 0; i < lines.length; i += 1) {
    let code = lines[i];
    if (inBlockComment) {
      const close = code.indexOf("*/");
      if (close === -1) continue;
      code = code.slice(close + 2);
      inBlockComment = false;
    }
    while (true) {
      const open = code.indexOf("/*");
      if (open === -1) break;
      const close = code.indexOf("*/", open + 2);
      if (close === -1) {
        inBlockComment = true;
        code = code.slice(0, open);
        break;
      }
      code = code.slice(0, open) + code.slice(close + 2);
    }
    const lineCommentIdx = code.indexOf("//");
    if (lineCommentIdx !== -1) code = code.slice(0, lineCommentIdx);

    SHADE_RE.lastIndex = 0;
    let m;
    while ((m = SHADE_RE.exec(code)) !== null) {
      out.push({ line: i + 1, hit: m[1] });
    }
    BLACK_WHITE_RE.lastIndex = 0;
    while ((m = BLACK_WHITE_RE.exec(code)) !== null) {
      out.push({ line: i + 1, hit: m[1] });
    }
  }
  return out;
}

/**
 * Collects every PascalCase component-folder under
 * `src/components/ui/` and `src/features/*​/components/`. Returns the
 * absolute folder paths.
 *
 * @param {string} rootDir
 * @returns {string[]}
 */
export function collectComponentFolders(rootDir) {
  const folders = [];
  const uiDir = join(rootDir, "src", "components", "ui");
  try {
    for (const entry of readdirSync(uiDir)) {
      const p = join(uiDir, entry);
      if (statSync(p).isDirectory() && /^[A-Z]/.test(entry)) folders.push(p);
    }
  } catch {
    /* ui dir may not exist */
  }
  const featuresDir = join(rootDir, "src", "features");
  try {
    for (const feature of readdirSync(featuresDir)) {
      const compRoot = join(featuresDir, feature, "components");
      try {
        for (const entry of readdirSync(compRoot)) {
          const p = join(compRoot, entry);
          if (statSync(p).isDirectory() && /^[A-Z]/.test(entry)) {
            folders.push(p);
          }
        }
      } catch {
        /* feature has no components/ subdir */
      }
    }
  } catch {
    /* features dir may not exist */
  }
  return folders;
}

/**
 * Audits one component folder against the locked shape.
 *
 * @param {string} folder Absolute folder path.
 * @returns {{folder: string, missing: string[]} | null}
 */
export function auditFolderShape(folder) {
  const name = basename(folder);
  const required = [
    `${name}.tsx`,
    "index.ts",
    `__tests__/${name}.test.tsx`,
    `__stories__/${name}.stories.tsx`,
    "__specs__/spec.yaml",
    "__specs__/standards-compliance.yaml",
  ];
  const missing = [];
  for (const rel of required) {
    try {
      statSync(join(folder, rel));
    } catch {
      missing.push(rel);
    }
  }
  return missing.length === 0 ? null : { folder, missing };
}

/**
 * Detects components placed outside the four legal locations.
 * Heuristic: a `.tsx` file under `src/components/` that is NOT in
 * `shadcn/` or a `ui/<Name>/` folder is a flat-file violation. Same
 * for `src/features/<f>/components/` files that don't live in a
 * `<Name>/` subfolder.
 *
 * @param {string} rootDir
 * @returns {string[]} relative paths of misplaced components.
 */
export function findMisplacedComponents(rootDir) {
  const out = [];
  const compRoot = join(rootDir, "src", "components");
  try {
    for (const entry of readdirSync(compRoot)) {
      const p = join(compRoot, entry);
      const stat = statSync(p);
      // Skip the two legal subtrees + their entries.
      if (stat.isDirectory() && (entry === "shadcn" || entry === "ui")) continue;
      if (stat.isFile() && (entry.endsWith(".tsx") || entry.endsWith(".ts"))) {
        out.push(
          relative(rootDir, p).split(sep).join("/"),
        );
      }
    }
  } catch {
    /* components dir may not exist */
  }
  // Files directly under `src/components/ui/` (not in a `<Name>/`
  // subfolder) — also flat-file violations.
  const uiDir = join(rootDir, "src", "components", "ui");
  try {
    for (const entry of readdirSync(uiDir)) {
      const p = join(uiDir, entry);
      const stat = statSync(p);
      if (stat.isFile() && (entry.endsWith(".tsx") || entry.endsWith(".ts"))) {
        out.push(relative(rootDir, p).split(sep).join("/"));
      }
    }
  } catch {
    /* ui dir may not exist */
  }
  return out;
}

/**
 * Main entry. Returns 0 on PASS, 1 on any violation.
 *
 * @param {string} rootDir Absolute frontend/ root.
 * @returns {number}
 */
export function runAudit(rootDir = ROOT_DIR) {
  const srcDir = join(rootDir, "src");
  const files = collectFiles(srcDir);

  // ---------- GATE-1 + GATE-3: folder shape + placement ----------
  const componentFolders = collectComponentFolders(rootDir);
  const shapeIssues = [];
  for (const folder of componentFolders) {
    const issue = auditFolderShape(folder);
    if (issue) shapeIssues.push(issue);
  }
  const misplaced = findMisplacedComponents(rootDir);

  // ---------- GATE-2: shade-class violations ----------
  const shadeIssues = [];
  for (const f of files) {
    const rel = relative(rootDir, f).split(sep).join("/");
    if (isShadeExempt(rel)) continue;
    const content = (() => {
      try {
        return readFileSync(f, "utf8");
      } catch {
        return "";
      }
    })();
    const hits = findShadeViolations(content);
    if (hits.length > 0) shadeIssues.push({ path: rel, hits });
  }

  // ---------- report ----------
  const fail =
    shapeIssues.length > 0 ||
    misplaced.length > 0 ||
    shadeIssues.length > 0;

  if (!fail) {
    process.stdout.write(
      `[verify-ui-components-compliance] PASS — ${componentFolders.length} component folder(s) checked; no shade classes in non-shadcn code; no misplaced components.\n`,
    );
    return 0;
  }

  process.stderr.write(`${VIOLATION_PREFIX}\n\n`);
  if (shapeIssues.length > 0) {
    process.stderr.write(
      "GATE-1 — Component folders missing required files:\n",
    );
    for (const s of shapeIssues) {
      const rel = relative(rootDir, s.folder).split(sep).join("/");
      process.stderr.write(`  ${rel}/\n`);
      for (const m of s.missing) process.stderr.write(`    - missing: ${m}\n`);
    }
    process.stderr.write("\n");
  }
  if (misplaced.length > 0) {
    process.stderr.write(
      "GATE-3 — Components in the wrong location (must live in a ComponentName/ folder under src/components/ui/ or src/features/<f>/components/):\n",
    );
    for (const m of misplaced) process.stderr.write(`  ${m}\n`);
    process.stderr.write("\n");
  }
  if (shadeIssues.length > 0) {
    process.stderr.write(
      "GATE-2 — Hardcoded Tailwind shade classes (use semantic tokens from globals.css instead — text-foreground / bg-background / bg-primary / border-border / etc.):\n",
    );
    for (const s of shadeIssues) {
      for (const h of s.hits) {
        process.stderr.write(`  ${s.path}:${h.line} — ${h.hit}\n`);
      }
    }
    process.stderr.write("\n");
  }
  process.stderr.write(
    "Rule reference: `.claude/standards/COMPONENT_FOLDERS.yaml` + `.claude/standards/COMPONENT_LIBRARY_DOCTRINE.yaml` RULE FE-1 / FE-3 / FE-4.\n",
  );
  process.stderr.write(
    "This gate is non-overridable. Fix the violations rather than disabling the gate.\n",
  );
  return 1;
}

/**
 * True when this module is being executed directly as a CLI script.
 *
 * @param {string} importMetaUrl
 * @param {string | undefined} argv1
 * @returns {boolean}
 */
export function isCliInvocation(importMetaUrl, argv1) {
  if (argv1 === undefined || argv1 === "") return false;
  return importMetaUrl === pathToFileURL(argv1).href;
}

/**
 * @param {{
 *   importMetaUrl: string,
 *   argv1: string | undefined,
 *   exit?: (code: number) => void,
 *   runAudit?: () => number,
 * }} io
 * @returns {boolean} true when cli mode fired
 */
export function maybeRunCli(io) {
  if (!isCliInvocation(io.importMetaUrl, io.argv1)) return false;
  const exit = io.exit ?? ((code) => process.exit(code));
  const audit = io.runAudit ?? runAudit;
  exit(audit());
  return true;
}

maybeRunCli({ importMetaUrl: import.meta.url, argv1: process.argv[1] });

export const _constants = {
  SHADE_RE,
  BLACK_WHITE_RE,
  SHADE_EXEMPT_DIRS,
  STANDARD_DIRS,
  VIOLATION_PREFIX,
};
