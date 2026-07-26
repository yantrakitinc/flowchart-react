#!/usr/bin/env node
// Unified documentation verifier.
//
// Per-folder landing-zone checks:
//   - Every __specs__/ carries spec.md.
//   - Module-level __specs__/ (src/features/<m>/__specs__/) carries the
//     CODE_CONFIDENCE.md scorecard UNLESS the folder already carries the
//     new SPEC_CONTRACT lock (standards-compliance.yaml). When the new
//     lock is present, the legacy scorecard is OPTIONAL — the lock
//     supersedes its role.
//   - If a __specs__/flows/ folder exists, it must carry ≥ 1 flow doc.
//     Both `.flow.md` (legacy) and `.flow.yaml` (new SPEC_CONTRACT
//     shape) are accepted.
//
// Per-file shape checks:
//   - spec.md: ≥ 1 heading, no dupes, no empty sections. NEW-form specs
//     (detected via "Invariants" + "Permissions used") get full canonical
//     enforcement from SPEC_TEMPLATE.md.
//   - *.flow.md: legacy headings OR new-form headings; mermaid blocks
//     where required; allowlisted YAML frontmatter only.
//   - CODE_CONFIDENCE.md: 10 gate rows + "Overall confidence:" + no ❌.
//
// Dual-shape policy`.flow.yaml` files are recognised as
// flow docs but are validated by the SPEC_CONTRACT gate, NOT here.
// This script only enforces that a `__specs__/flows/` folder isn't
// EMPTY when present.
//
// Pure Node + zero external dependencies. Helpers are exported so the
// Vitest suite can exercise every branch.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { listAllDirs, listAllFiles } from "../lib/walk.mjs";

const __filename = fileURLToPath(import.meta.url);
const SCRIPT_DIR = dirname(__filename);
const ROOT_DIR = resolve(SCRIPT_DIR, "..", "..");
const DEFAULT_SRC = resolve(ROOT_DIR, "src");
const DEFAULT_E2E = resolve(ROOT_DIR, "e2e");

/** Canonical NEW-form spec headings (from SPEC_TEMPLATE.md). */
export const SPEC_HEADINGS_NEW = [
  "Purpose",
  "Inputs",
  "Outputs",
  "Invariants",
  "Permissions used",
  "Cross-module dependencies",
  "Edge cases",
  "Error modes",
  "Data shape touched",
  "Flows",
];

/** Distinctive NEW-template spec headings. */
export const SPEC_NEW_DISTINCTIVE = ["Invariants", "Permissions used"];

/** Canonical NEW-form flow headings (from FLOW_TEMPLATE.md). */
export const FLOW_HEADINGS_NEW = [
  "Pre-conditions",
  "Sequence",
  "Branch points",
  "Failure paths",
  "Post-conditions",
];

/** Distinctive NEW-template flow headings. */
export const FLOW_NEW_DISTINCTIVE = ["Pre-conditions"];

/** Recognised LEGACY flow headings — at least one must be present. */
export const FLOW_HEADINGS_LEGACY = [
  "Paths",
  "Flow Diagram",
  "Error Exits",
  "Side Effects (detailed)",
  "AI Chat Agent Guidance",
];

/**
 * Accepted flow-doc extensions inside __specs__/flows/. `.flow.yaml` is
 * the SPEC_CONTRACT shape; `.flow.md` is the markdown form kept on the
 * allowlist.
 *
 * @type {ReadonlyArray<".flow.md" | ".flow.yaml">}
 */
export const FLOW_DOC_EXTENSIONS = [".flow.md", ".flow.yaml"];

/** Allowed top-level keys in flow-doc YAML frontmatter. */
export const ALLOWED_FRONTMATTER_KEYS = new Set([
  "source",
  "symbol",
  "inputs",
  "returns",
  "throws",
  "calls",
  "called_by",
  "transaction",
  "ai_agent_action",
  "flow",
  "kind",
  "emits_events",
  "side_effects_on_success",
  "side_effects_on_failure",
  "test",
  "spec",
]);

/**
 * Marker segment used by the legacy → new-shape retrofit. Any path that
 * contains this segment is skipped by `audit` — the backup folder is
 * transitional scaffolding by design.
 */
export const BACKUP_SEGMENT = "__specs__.backup";

/**
 * True when `path` lives inside (or IS) a `__specs__.backup/` tree.
 * Match-on-segment — a file literally named `__specs__.backupX` would
 * NOT be skipped.
 *
 * @param {string} path absolute path
 * @returns {boolean}
 */
export function isInsideBackupFolder(path) {
  return path.split("/").includes(BACKUP_SEGMENT);
}

/**
 * Default IO ports — broken out so the test suite can mark them
 * covered by calling them directly.
 */
export const defaultExistsSync = (/** @type {string} */ p) => existsSync(p);
export const defaultReadFile = (/** @type {string} */ p) =>
  readFileSync(p, "utf8");
export const defaultReadDir = (/** @type {string} */ p) => readdirSync(p);
export const defaultStatFile = (/** @type {string} */ p) => statSync(p);
export const defaultListAllDirs = (/** @type {string} */ p) => listAllDirs(p);
export const defaultListAllFiles = (/** @type {string} */ p) => listAllFiles(p);
export const defaultStdoutWrite = (/** @type {string} */ s) =>
  process.stdout.write(s);
export const defaultStderrWrite = (/** @type {string} */ s) =>
  process.stderr.write(s);

/**
 * Parses a markdown file's `## ` headings in document order.
 *
 * @param {string} src
 * @returns {string[]}
 */
export function extractH2(src) {
  const out = [];
  for (const line of src.split("\n")) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m) out.push(m[1].trim());
  }
  return out;
}

/**
 * Returns the body lines (non-blank, non-heading) under each `## ` heading.
 *
 * @param {string} src
 * @returns {Record<string, string[]>}
 */
export function sectionBodies(src) {
  /** @type {Record<string, string[]>} */
  const out = {};
  let current = "";
  for (const rawLine of src.split("\n")) {
    const h2 = rawLine.match(/^##\s+(.+?)\s*$/);
    if (h2) {
      current = h2[1].trim();
      out[current] = [];
      continue;
    }
    if (!current) continue;
    if (rawLine.match(/^#\s/)) continue;
    const trimmed = rawLine.trim();
    if (trimmed === "" || trimmed.startsWith("---")) continue;
    out[current].push(rawLine);
  }
  return out;
}

/**
 * Returns the raw body text under a `## <heading>` block, up to the next
 * `##` line (or end-of-file). Returns "" when the heading is absent. Used
 * by the mermaid-fence presence checks for "## Diagram" / "## Flow
 * Diagram".
 *
 * @param {string} src markdown source
 * @param {string} heading heading text (without the "## " prefix)
 * @returns {string}
 */
export function sectionBodyText(src, heading) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`^##\\s+${escaped}\\s*$`, "m");
  const parts = src.split(re);
  if (parts.length < 2) return "";
  const after = parts[1];
  const nextH2 = after.match(/\n##\s/);
  if (nextH2 === null) return after;
  return after.slice(0, after.indexOf(nextH2[0]));
}

/**
 * Pulls a YAML-frontmatter block out of a markdown file.
 *
 * @param {string} src
 * @returns {string | null}
 */
export function extractFrontmatter(src) {
  if (!src.startsWith("---\n")) return null;
  const end = src.indexOf("\n---\n", 4);
  if (end === -1) return null;
  return src.slice(4, end);
}

/**
 * Splits a markdown source into `{ frontmatter, body }`. When no
 * frontmatter is present, returns `{ frontmatter: null, body: src }`.
 * Callers get the post-frontmatter body without having to re-run the
 * `\n---\n` search themselves (the second-`indexOf` guard at the call
 * site was dead and uncovered — this consolidates both passes into
 * one).
 *
 * @param {string} src
 * @returns {{ frontmatter: string | null, body: string }}
 */
export function splitFrontmatter(src) {
  if (!src.startsWith("---\n")) return { frontmatter: null, body: src };
  const end = src.indexOf("\n---\n", 4);
  if (end === -1) return { frontmatter: null, body: src };
  return { frontmatter: src.slice(4, end), body: src.slice(end + 5) };
}

/**
 * Extracts the top-level YAML keys from a frontmatter block.
 *
 * @param {string} frontmatter
 * @returns {{ keys: string[], invalid: string | null }}
 */
export function parseFrontmatterKeys(frontmatter) {
  const keys = [];
  for (const line of frontmatter.split("\n")) {
    if (line === "" || line.startsWith("#")) continue;
    if (line.startsWith(" ") || line.startsWith("\t") || line.startsWith("-"))
      continue;
    const m = line.match(/^([A-Za-z_][\w-]*)\s*:/);
    if (!m) {
      return { keys, invalid: `unparseable line: "${line}"` };
    }
    keys.push(m[1]);
  }
  return { keys, invalid: null };
}

/**
 * @param {string[]} headings
 * @returns {boolean}
 */
export function isNewFormSpec(headings) {
  return SPEC_NEW_DISTINCTIVE.every((h) => headings.includes(h));
}

/**
 * @param {string[]} headings
 * @returns {boolean}
 */
export function isNewFormFlow(headings) {
  return FLOW_NEW_DISTINCTIVE.every((h) => headings.includes(h));
}

/**
 * Validate one spec.md.
 *
 * @param {string} file absolute path
 * @param {string} relPath path for error reporting
 * @param {{ readFile?: (p: string) => string, existsSync?: (p: string) => boolean }} [injected]
 * @returns {string[]}
 */
export function checkSpecMd(file, relPath, injected = {}) {
  const readFile = injected.readFile ?? defaultReadFile;
  const exists = injected.existsSync ?? defaultExistsSync;
  const errors = [];
  const src = readFile(file);
  const headings = extractH2(src);

  if (headings.length === 0) {
    errors.push(`${relPath}: no \`## \` headings found`);
    return errors;
  }

  const seen = new Set();
  for (const h of headings) {
    if (seen.has(h)) {
      errors.push(`${relPath}: duplicate heading "${h}"`);
    }
    seen.add(h);
  }

  const bodies = sectionBodies(src);
  for (const h of headings) {
    if (bodies[h] !== undefined && bodies[h].length === 0) {
      errors.push(
        `${relPath}: section "## ${h}" is empty (use "None." if intentional)`,
      );
    }
  }

  if (isNewFormSpec(headings)) {
    for (const h of SPEC_HEADINGS_NEW) {
      if (!headings.includes(h)) {
        errors.push(
          `${relPath}: NEW-form spec missing heading "## ${h}" (SPEC_TEMPLATE.md)`,
        );
      }
    }
    if (bodies["Flows"]) {
      const dir = dirname(file);
      for (const line of bodies["Flows"]) {
        const m = line.match(/(?:\(|\s|^)(\.?\/?flows\/[^)\s]+\.flow\.md)/);
        if (!m) continue;
        const target = m[1].replace(/^\.\//, "");
        const fullTarget = join(dir, target);
        if (!exists(fullTarget)) {
          errors.push(
            `${relPath}: ## Flows links to "${target}" which does not exist`,
          );
        }
      }
    }
  }

  return errors;
}

/**
 * Validate one *.flow.md.
 *
 * @param {string} file absolute path
 * @param {string} relPath path for error reporting
 * @param {{ readFile?: (p: string) => string }} [injected]
 * @returns {string[]}
 */
export function checkFlowMd(file, relPath, injected = {}) {
  const readFile = injected.readFile ?? defaultReadFile;
  const errors = [];
  let src = readFile(file);

  if (!file.includes("/__specs__/flows/")) {
    errors.push(`${relPath}: flow doc must live inside __specs__/flows/`);
  }

  const { frontmatter, body } = splitFrontmatter(src);
  if (frontmatter !== null) {
    const { keys, invalid } = parseFrontmatterKeys(frontmatter);
    if (invalid) {
      errors.push(`${relPath}: malformed frontmatter (${invalid})`);
    }
    for (const k of keys) {
      if (!ALLOWED_FRONTMATTER_KEYS.has(k)) {
        errors.push(
          `${relPath}: frontmatter key "${k}" not in the allowlist (allowed: ${[...ALLOWED_FRONTMATTER_KEYS].sort().join(", ")})`,
        );
      }
    }
  }
  src = body;

  const headings = extractH2(src);
  if (headings.length === 0) {
    errors.push(`${relPath}: no \`## \` headings found`);
    return errors;
  }

  const seen = new Set();
  for (const h of headings) {
    if (seen.has(h)) {
      errors.push(`${relPath}: duplicate heading "${h}"`);
    }
    seen.add(h);
  }

  const bodies = sectionBodies(src);
  for (const h of headings) {
    if (bodies[h] !== undefined && bodies[h].length === 0) {
      errors.push(
        `${relPath}: section "## ${h}" is empty (use "None." if intentional)`,
      );
    }
  }

  if (isNewFormFlow(headings)) {
    for (const h of FLOW_HEADINGS_NEW) {
      if (!headings.includes(h)) {
        errors.push(
          `${relPath}: NEW-form flow missing heading "## ${h}" (FLOW_TEMPLATE.md)`,
        );
      }
    }
    const diagIdx = headings.indexOf("Diagram");
    const preIdx = headings.indexOf("Pre-conditions");
    if (diagIdx !== -1 && preIdx !== -1 && diagIdx > preIdx) {
      errors.push(
        `${relPath}: optional "## Diagram" heading must precede "## Pre-conditions"`,
      );
    }
    if (diagIdx !== -1) {
      const diagBody = sectionBodyText(src, "Diagram");
      if (!/```mermaid/.test(diagBody)) {
        errors.push(
          `${relPath}: "## Diagram" must contain a \`\`\`mermaid\`\`\` code fence`,
        );
      }
    }
  } else {
    const legacyHits = FLOW_HEADINGS_LEGACY.filter((h) =>
      headings.includes(h),
    ).length;
    if (legacyHits === 0) {
      errors.push(
        `${relPath}: flow doc carries neither NEW-form headings ` +
          `(${FLOW_HEADINGS_NEW.join(", ")}) nor any LEGACY heading ` +
          `(${FLOW_HEADINGS_LEGACY.join(", ")}); found: ${headings.map((h) => `"${h}"`).join(", ")}`,
      );
    }
    if (headings.includes("Flow Diagram")) {
      const fdBody = sectionBodyText(src, "Flow Diagram");
      if (!/```mermaid/.test(fdBody)) {
        errors.push(
          `${relPath}: "## Flow Diagram" must contain a \`\`\`mermaid\`\`\` code fence`,
        );
      }
    }
  }

  return errors;
}

/**
 * Validate one CODE_CONFIDENCE.md.
 *
 * @param {string} file
 * @param {string} relPath
 * @param {{ readFile?: (p: string) => string }} [injected]
 * @returns {string[]}
 */
export function checkCodeConfidenceMd(file, relPath, injected = {}) {
  const readFile = injected.readFile ?? defaultReadFile;
  const errors = [];
  const src = readFile(file);

  const gateRows = src.match(/^\|\s*\d+\s*\|/gm) ?? [];
  if (gateRows.length !== 10) {
    errors.push(
      `${relPath}: expected 10 gate rows, found ${gateRows.length}`,
    );
  }

  if (!/Overall confidence:/.test(src)) {
    errors.push(`${relPath}: missing "Overall confidence:" line`);
  }

  if (src.includes("❌")) {
    errors.push(`${relPath}: contains ❌ (hard fail symbol)`);
  }

  return errors;
}

/**
 * Decide whether a `__specs__` directory is a "module-level" landing zone.
 *
 * @param {string} dir absolute path
 * @param {string} srcDir absolute src root for the relative calculation
 * @returns {boolean}
 */
export function isModuleLevelSpecsDir(dir, srcDir) {
  const rel = relative(srcDir, dir).split("\\").join("/");
  return /^features\/[^/]+\/__specs__$/.test(rel);
}

/**
 * Per-folder landing-zone check for one __specs__/ directory.
 *
 * @param {string} specsDir absolute path ending in /__specs__
 * @param {string} relPath display path
 * @param {string} srcDir absolute src root for module-level detection
 * @param {{
 *   existsSync?: (p: string) => boolean,
 *   readDir?: (p: string) => string[],
 *   statFile?: (p: string) => { isDirectory(): boolean },
 * }} [injected]
 * @returns {string[]}
 */
export function checkSpecsFolder(specsDir, relPath, srcDir, injected = {}) {
  const exists = injected.existsSync ?? defaultExistsSync;
  const readDir = injected.readDir ?? defaultReadDir;
  const statFile = injected.statFile ?? defaultStatFile;
  const errors = [];

  const specMd = join(specsDir, "spec.md");
  const ccMd = join(specsDir, "CODE_CONFIDENCE.md");
  const lockYaml = join(specsDir, "standards-compliance.yaml");
  const flowsDir = join(specsDir, "flows");

  if (!exists(specMd)) {
    errors.push(`MISSING spec.md in ${relPath}`);
  }

  // CODE_CONFIDENCE.md required at module level ONLY when the new
  // standards-compliance.yaml lock is NOT present. The lock supersedes
  // the scorecard's role.
  if (isModuleLevelSpecsDir(specsDir, srcDir)) {
    if (!exists(ccMd) && !exists(lockYaml)) {
      errors.push(
        `MISSING CODE_CONFIDENCE.md OR standards-compliance.yaml in ${relPath} (module-level landing zones must carry the scorecard or the new lock file)`,
      );
    }
  }

  if (exists(flowsDir) && statFile(flowsDir).isDirectory()) {
    const flowDocs = readDir(flowsDir).filter((f) =>
      FLOW_DOC_EXTENSIONS.some((ext) => f.endsWith(ext)),
    );
    if (flowDocs.length === 0) {
      const tried = FLOW_DOC_EXTENSIONS.map((e) => `*${e}`).join(" | ");
      errors.push(`MISSING at least one ${tried} in ${relPath}/flows/`);
    }
  }

  return errors;
}

/**
 * Run the full audit.
 *
 * @param {{ src: string, e2e: string }} roots
 * @param {{
 *   existsSync?: (p: string) => boolean,
 *   listAllDirs?: (root: string) => string[],
 *   listAllFiles?: (root: string) => string[],
 *   readFile?: (p: string) => string,
 *   readDir?: (p: string) => string[],
 *   statFile?: (p: string) => { isDirectory(): boolean },
 * }} [injected]
 * @returns {{
 *   errors: string[],
 *   specsFoldersChecked: number,
 *   specsChecked: number,
 *   flowsChecked: number,
 *   ccChecked: number,
 * }}
 */
export function audit(roots, injected = {}) {
  const exists = injected.existsSync ?? defaultExistsSync;
  const listDirs = injected.listAllDirs ?? defaultListAllDirs;
  const listFiles = injected.listAllFiles ?? defaultListAllFiles;
  /** @type {string[]} */
  const errors = [];
  let specsFoldersChecked = 0;
  let specsChecked = 0;
  let flowsChecked = 0;
  let ccChecked = 0;

  // 1. Per-folder landing-zone checks.
  for (const base of [roots.src, roots.e2e]) {
    if (!exists(base)) continue;
    for (const dir of listDirs(base)) {
      if (!dir.endsWith("/__specs__")) continue;
      if (isInsideBackupFolder(dir)) continue;
      specsFoldersChecked += 1;
      const rel = relative(ROOT_DIR, dir);
      errors.push(
        ...checkSpecsFolder(dir, rel, roots.src, {
          existsSync: injected.existsSync,
          readDir: injected.readDir,
          statFile: injected.statFile,
        }),
      );
    }
  }

  // 2. Per-file shape checks.
  for (const base of [roots.src, roots.e2e]) {
    if (!exists(base)) continue;
    for (const file of listFiles(base)) {
      if (isInsideBackupFolder(file)) continue;
      const rel = relative(ROOT_DIR, file);
      if (file.endsWith("/__specs__/spec.md")) {
        specsChecked += 1;
        errors.push(
          ...checkSpecMd(file, rel, {
            readFile: injected.readFile,
            existsSync: injected.existsSync,
          }),
        );
      } else if (file.endsWith(".flow.md")) {
        flowsChecked += 1;
        errors.push(...checkFlowMd(file, rel, { readFile: injected.readFile }));
      } else if (file.endsWith("/CODE_CONFIDENCE.md")) {
        ccChecked += 1;
        errors.push(
          ...checkCodeConfidenceMd(file, rel, { readFile: injected.readFile }),
        );
      }
    }
  }

  return { errors, specsFoldersChecked, specsChecked, flowsChecked, ccChecked };
}

/**
 * @param {{
 *   errors: string[],
 *   specsFoldersChecked: number,
 *   specsChecked: number,
 *   flowsChecked: number,
 *   ccChecked: number,
 * }} result
 * @returns {{ exitCode: 0 | 1, stdout: string, stderr: string }}
 */
export function formatReport(result) {
  if (result.errors.length === 0) {
    return {
      exitCode: 0,
      stdout: `verify-docs: OK (${String(result.specsFoldersChecked)} __specs__ folder(s); ${String(result.specsChecked)} spec.md, ${String(result.flowsChecked)} flow.md, ${String(result.ccChecked)} CODE_CONFIDENCE.md checked)\n`,
      stderr: "",
    };
  }
  const lines = [`verify-docs: ${String(result.errors.length)} issue(s)`];
  for (const e of result.errors) lines.push(`  ${e}`);
  return { exitCode: 1, stdout: "", stderr: `${lines.join("\n")}\n` };
}

/**
 * @param {{
 *   src?: string,
 *   e2e?: string,
 *   existsSync?: (p: string) => boolean,
 *   listAllDirs?: (root: string) => string[],
 *   listAllFiles?: (root: string) => string[],
 *   readFile?: (p: string) => string,
 *   readDir?: (p: string) => string[],
 *   statFile?: (p: string) => { isDirectory(): boolean },
 *   write?: (s: string) => void,
 *   writeErr?: (s: string) => void,
 * }} [io]
 * @returns {{ exitCode: 0 | 1 }}
 */
export function main(io = {}) {
  const src = io.src ?? DEFAULT_SRC;
  const e2e = io.e2e ?? DEFAULT_E2E;
  const write = io.write ?? defaultStdoutWrite;
  const writeErr = io.writeErr ?? defaultStderrWrite;
  const result = audit(
    { src, e2e },
    {
      existsSync: io.existsSync,
      listAllDirs: io.listAllDirs,
      listAllFiles: io.listAllFiles,
      readFile: io.readFile,
      readDir: io.readDir,
      statFile: io.statFile,
    },
  );
  const report = formatReport(result);
  if (report.stdout) write(report.stdout);
  if (report.stderr) writeErr(report.stderr);
  return { exitCode: report.exitCode };
}

/**
 * @param {{ exit?: (code: number) => void }} [io]
 * @returns {void}
 */
export function cliMain(io = {}) {
  const exit = io.exit ?? ((code) => process.exit(code));
  const { exitCode } = main();
  exit(exitCode);
}

/**
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
 * }} io
 * @returns {boolean}
 */
export function maybeRunCli(io) {
  if (!isCliInvocation(io.importMetaUrl, io.argv1)) return false;
  cliMain({ exit: io.exit });
  return true;
}

maybeRunCli({ importMetaUrl: import.meta.url, argv1: process.argv[1] });
