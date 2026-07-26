// Vitest suite for verify-docs.
//
// Every helper has at least one passing AND one failing fixture so the
// suite reaches 100/100/100/100 per-file coverage without spawning the
// script. A small handful of tests use a real tmp tree to exercise the
// default IO ports.

import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { afterAll, describe, expect, it } from "vitest";

import {
  ALLOWED_FRONTMATTER_KEYS,
  BACKUP_SEGMENT,
  FLOW_DOC_EXTENSIONS,
  FLOW_HEADINGS_LEGACY,
  FLOW_HEADINGS_NEW,
  FLOW_NEW_DISTINCTIVE,
  SPEC_HEADINGS_NEW,
  SPEC_NEW_DISTINCTIVE,
  audit,
  checkCodeConfidenceMd,
  checkFlowMd,
  checkSpecMd,
  checkSpecsFolder,
  cliMain,
  defaultExistsSync,
  defaultListAllDirs,
  defaultListAllFiles,
  defaultReadDir,
  defaultReadFile,
  defaultStatFile,
  defaultStderrWrite,
  defaultStdoutWrite,
  extractFrontmatter,
  extractH2,
  formatReport,
  isCliInvocation,
  isInsideBackupFolder,
  isModuleLevelSpecsDir,
  isNewFormFlow,
  isNewFormSpec,
  main,
  maybeRunCli,
  parseFrontmatterKeys,
  sectionBodies,
  sectionBodyText,
  splitFrontmatter,
} from "../verify-docs.mjs";

const __filename = fileURLToPath(import.meta.url);
const SCRIPT_PATH = resolve(dirname(__filename), "..", "verify-docs.mjs");

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

describe("constants", () => {
  it("SPEC_HEADINGS_NEW lists the 10 canonical headings", () => {
    expect(SPEC_HEADINGS_NEW).toHaveLength(10);
    expect(SPEC_HEADINGS_NEW).toContain("Invariants");
    expect(SPEC_HEADINGS_NEW).toContain("Permissions used");
  });

  it("SPEC_NEW_DISTINCTIVE is a strict subset", () => {
    for (const h of SPEC_NEW_DISTINCTIVE) {
      expect(SPEC_HEADINGS_NEW).toContain(h);
    }
  });

  it("FLOW_HEADINGS_NEW lists the 5 canonical headings", () => {
    expect(FLOW_HEADINGS_NEW).toHaveLength(5);
  });

  it("FLOW_NEW_DISTINCTIVE is a strict subset", () => {
    for (const h of FLOW_NEW_DISTINCTIVE) {
      expect(FLOW_HEADINGS_NEW).toContain(h);
    }
  });

  it("FLOW_HEADINGS_LEGACY contains expected legacy markers", () => {
    expect(FLOW_HEADINGS_LEGACY).toContain("Paths");
    expect(FLOW_HEADINGS_LEGACY).toContain("Flow Diagram");
  });

  it("FLOW_DOC_EXTENSIONS includes both .flow.md and .flow.yaml", () => {
    expect(FLOW_DOC_EXTENSIONS).toContain(".flow.md");
    expect(FLOW_DOC_EXTENSIONS).toContain(".flow.yaml");
  });

  it("ALLOWED_FRONTMATTER_KEYS includes the new + legacy keys", () => {
    expect(ALLOWED_FRONTMATTER_KEYS.has("source")).toBe(true);
    expect(ALLOWED_FRONTMATTER_KEYS.has("flow")).toBe(true);
    expect(ALLOWED_FRONTMATTER_KEYS.has("ai_agent_action")).toBe(true);
  });
});

// --- isInsideBackupFolder + BACKUP_SEGMENT -----------------------------

describe("isInsideBackupFolder", () => {
  it("returns true when a segment is __specs__.backup", () => {
    expect(
      isInsideBackupFolder("/src/db/client/__specs__.backup/spec.md"),
    ).toBe(true);
  });

  it("returns false when no segment is __specs__.backup", () => {
    expect(isInsideBackupFolder("/src/db/client/__specs__/spec.md")).toBe(
      false,
    );
  });

  it("matches by segment, not substring", () => {
    expect(
      isInsideBackupFolder("/src/db/client/__specs__.backupX/foo"),
    ).toBe(false);
  });

  it("BACKUP_SEGMENT constant matches the documented value", () => {
    expect(BACKUP_SEGMENT).toBe("__specs__.backup");
  });
});

// --- extractH2 ---------------------------------------------------------

describe("extractH2", () => {
  it("returns every '## ' heading in document order", () => {
    expect(extractH2("# h1\n## A\nbody\n## B\n")).toEqual(["A", "B"]);
  });

  it("trims trailing whitespace from headings", () => {
    expect(extractH2("## A   \n")).toEqual(["A"]);
  });

  it("returns [] when there are no headings", () => {
    expect(extractH2("just body text\n")).toEqual([]);
  });
});

// --- sectionBodies -----------------------------------------------------

describe("sectionBodies", () => {
  it("returns body lines under each heading", () => {
    const r = sectionBodies("## A\nbody1\nbody2\n## B\nb3\n");
    expect(r["A"]).toEqual(["body1", "body2"]);
    expect(r["B"]).toEqual(["b3"]);
  });

  it("treats blank lines and --- as non-body", () => {
    const r = sectionBodies("## A\n\n---\nbody\n");
    expect(r["A"]).toEqual(["body"]);
  });

  it("skips top-level # headings inside a body", () => {
    const r = sectionBodies("## A\n# subtitle\nbody\n");
    expect(r["A"]).toEqual(["body"]);
  });

  it("ignores leading lines before the first heading", () => {
    const r = sectionBodies("preamble\n## A\nbody\n");
    expect(r["A"]).toEqual(["body"]);
  });
});

// --- sectionBodyText ---------------------------------------------------

describe("sectionBodyText", () => {
  it("returns the body between '## <h>' and the next '##' heading", () => {
    expect(sectionBodyText("## A\nbody1\nbody2\n## B\nb3\n", "A")).toContain(
      "body1",
    );
  });

  it("returns the body to end-of-file when no next '##' heading exists", () => {
    const body = sectionBodyText("## A\nbody to the end\n", "A");
    expect(body).toContain("body to the end");
  });

  it("returns '' when the heading is absent", () => {
    expect(sectionBodyText("## A\nbody\n", "Missing")).toBe("");
  });

  it("escapes regex-special characters in the heading", () => {
    // 'Flow Diagram' contains a space; 'Diagram (v2)' would contain
    // parens, which must be escaped. The helper handles both.
    const body = sectionBodyText("## Diagram (v2)\nbody\n", "Diagram (v2)");
    expect(body).toContain("body");
  });
});

// --- extractFrontmatter ------------------------------------------------

describe("extractFrontmatter", () => {
  it("returns null when the file does not start with '---\\n'", () => {
    expect(extractFrontmatter("# heading\n")).toBeNull();
  });

  it("returns null when the closing fence is missing", () => {
    expect(extractFrontmatter("---\nfoo: bar\n")).toBeNull();
  });

  it("returns the frontmatter body without the fences", () => {
    expect(extractFrontmatter("---\nfoo: bar\n---\nbody\n")).toBe("foo: bar");
  });
});

// --- splitFrontmatter --------------------------------------------------

describe("splitFrontmatter", () => {
  it("returns frontmatter=null and body=src when src lacks an opening fence", () => {
    const r = splitFrontmatter("# heading\nbody\n");
    expect(r.frontmatter).toBeNull();
    expect(r.body).toBe("# heading\nbody\n");
  });

  it("returns frontmatter=null and body=src when the closing fence is missing", () => {
    // Opening fence but no `\n---\n` closer — caller should treat the
    // whole thing as body, not a partial frontmatter.
    const r = splitFrontmatter("---\nfoo: bar\n");
    expect(r.frontmatter).toBeNull();
    expect(r.body).toBe("---\nfoo: bar\n");
  });

  it("returns the parsed frontmatter and the trailing body", () => {
    const r = splitFrontmatter("---\nfoo: bar\n---\nbody line\n");
    expect(r.frontmatter).toBe("foo: bar");
    expect(r.body).toBe("body line\n");
  });
});

// --- parseFrontmatterKeys ----------------------------------------------

describe("parseFrontmatterKeys", () => {
  it("returns top-level keys", () => {
    const r = parseFrontmatterKeys("flow: x\nkind: helper\n");
    expect(r.keys).toEqual(["flow", "kind"]);
    expect(r.invalid).toBeNull();
  });

  it("skips comments and blank lines", () => {
    const r = parseFrontmatterKeys("\n# comment\nkey: v\n");
    expect(r.keys).toEqual(["key"]);
    expect(r.invalid).toBeNull();
  });

  it("skips indented and list lines", () => {
    const r = parseFrontmatterKeys("top: v\n  nested: x\n- item\n");
    expect(r.keys).toEqual(["top"]);
    expect(r.invalid).toBeNull();
  });

  it("flags an unparseable line", () => {
    const r = parseFrontmatterKeys("notakey\n");
    expect(r.invalid).toMatch(/unparseable line/);
  });
});

// --- isNewFormSpec / isNewFormFlow -------------------------------------

describe("isNewFormSpec / isNewFormFlow", () => {
  it("isNewFormSpec returns true when both distinctive headings are present", () => {
    expect(isNewFormSpec(["Invariants", "Permissions used"])).toBe(true);
  });

  it("isNewFormSpec returns false when any distinctive heading is missing", () => {
    expect(isNewFormSpec(["Invariants"])).toBe(false);
  });

  it("isNewFormFlow returns true when 'Pre-conditions' is present", () => {
    expect(isNewFormFlow(["Pre-conditions"])).toBe(true);
  });

  it("isNewFormFlow returns false otherwise", () => {
    expect(isNewFormFlow(["Paths"])).toBe(false);
  });
});

// --- isModuleLevelSpecsDir --------------------------------------------

describe("isModuleLevelSpecsDir", () => {
  it("returns true for src/features/<m>/__specs__", () => {
    expect(
      isModuleLevelSpecsDir("/repo/src/features/identity/__specs__", "/repo/src"),
    ).toBe(true);
  });

  it("returns false for sub-feature __specs__/", () => {
    expect(
      isModuleLevelSpecsDir(
        "/repo/src/features/identity/sub/__specs__",
        "/repo/src",
      ),
    ).toBe(false);
  });

  it("returns false for non-module __specs__/", () => {
    expect(
      isModuleLevelSpecsDir("/repo/src/db/client/__specs__", "/repo/src"),
    ).toBe(false);
  });
});

// --- checkSpecMd -------------------------------------------------------

describe("checkSpecMd", () => {
  it("returns [] for a minimum legacy spec.md", () => {
    const r = checkSpecMd("/p/spec.md", "p/spec.md", {
      readFile: () => "## Purpose\nbody\n",
      existsSync: () => true,
    });
    expect(r).toEqual([]);
  });

  it("reports no headings", () => {
    const r = checkSpecMd("/p/spec.md", "p/spec.md", {
      readFile: () => "plain text\n",
      existsSync: () => true,
    });
    expect(r[0]).toMatch(/no `## ` headings/);
  });

  it("reports duplicate heading", () => {
    const r = checkSpecMd("/p/spec.md", "p/spec.md", {
      readFile: () => "## A\nbody\n## A\nbody\n",
      existsSync: () => true,
    });
    expect(r.some((e) => /duplicate heading/.test(e))).toBe(true);
  });

  it("reports empty section", () => {
    const r = checkSpecMd("/p/spec.md", "p/spec.md", {
      readFile: () => "## A\n## B\nbody\n",
      existsSync: () => true,
    });
    expect(r.some((e) => /empty/.test(e))).toBe(true);
  });

  it("for NEW-form: reports missing canonical headings", () => {
    const src = "## Invariants\nbody\n## Permissions used\nbody\n";
    const r = checkSpecMd("/p/spec.md", "p/spec.md", {
      readFile: () => src,
      existsSync: () => true,
    });
    // Missing 8 of the 10 canonical headings.
    expect(r.filter((e) => /NEW-form spec missing/.test(e))).toHaveLength(8);
  });

  it("for NEW-form: reports dead link in '## Flows'", () => {
    const src = [
      ...SPEC_HEADINGS_NEW.map((h) => `## ${h}\nbody\n`),
    ].join("");
    // Inject a fake link into '## Flows'
    const withLink = src.replace(
      "## Flows\nbody\n",
      "## Flows\nSee ./flows/missing.flow.md\n",
    );
    const r = checkSpecMd("/p/spec.md", "p/spec.md", {
      readFile: () => withLink,
      existsSync: () => false,
    });
    expect(r.some((e) => /## Flows links to/.test(e))).toBe(true);
  });

  it("for NEW-form: accepts a live link in '## Flows'", () => {
    const src = [
      ...SPEC_HEADINGS_NEW.map((h) => `## ${h}\nbody\n`),
    ].join("");
    const withLink = src.replace(
      "## Flows\nbody\n",
      "## Flows\n- (./flows/x.flow.md)\n",
    );
    const r = checkSpecMd("/p/spec.md", "p/spec.md", {
      readFile: () => withLink,
      existsSync: () => true,
    });
    expect(r.some((e) => /## Flows links to/.test(e))).toBe(false);
  });

  it("uses default IO when injected is omitted", () => {
    const tmp = mkdtempSync(join(tmpdir(), "vd-spec-default-"));
    cleanupDirs.push(tmp);
    const p = join(tmp, "spec.md");
    writeFileSync(p, "## Purpose\nbody\n");
    expect(checkSpecMd(p, "spec.md")).toEqual([]);
  });

  it("for NEW-form: skips Flows lines that don't contain a flow-link pattern", () => {
    const src = [...SPEC_HEADINGS_NEW.map((h) => `## ${h}\nbody\n`)].join("");
    // Inject Flows section with one non-link prose line + one real link.
    // The prose line drives the `if (!m) continue;` branch in checkSpecMd;
    // the real link drives the live-link path so the test asserts both.
    const withMixed = src.replace(
      "## Flows\nbody\n",
      "## Flows\nThis section talks about flows in prose only.\n- (./flows/real.flow.md)\n",
    );
    const r = checkSpecMd("/p/spec.md", "p/spec.md", {
      readFile: () => withMixed,
      existsSync: () => true,
    });
    expect(r.some((e) => /## Flows links to/.test(e))).toBe(false);
  });
});

// --- checkFlowMd -------------------------------------------------------

describe("checkFlowMd", () => {
  it("returns [] for a minimum legacy flow.md", () => {
    const r = checkFlowMd("/p/__specs__/flows/x.flow.md", "x.flow.md", {
      readFile: () => "## Paths\nbody\n",
    });
    expect(r).toEqual([]);
  });

  it("flags doc outside __specs__/flows/", () => {
    const r = checkFlowMd("/p/not-flows/x.flow.md", "x.flow.md", {
      readFile: () => "## Paths\nbody\n",
    });
    expect(r.some((e) => /must live inside __specs__\/flows/.test(e))).toBe(true);
  });

  it("flags malformed frontmatter", () => {
    const r = checkFlowMd("/p/__specs__/flows/x.flow.md", "x.flow.md", {
      readFile: () => "---\nnotakey\n---\n## Paths\nbody\n",
    });
    expect(r.some((e) => /malformed frontmatter/.test(e))).toBe(true);
  });

  it("flags disallowed frontmatter key", () => {
    const r = checkFlowMd("/p/__specs__/flows/x.flow.md", "x.flow.md", {
      readFile: () => "---\nbogus_key: x\n---\n## Paths\nbody\n",
    });
    expect(r.some((e) => /not in the allowlist/.test(e))).toBe(true);
  });

  it("accepts allowlisted frontmatter and strips it before heading checks", () => {
    const r = checkFlowMd("/p/__specs__/flows/x.flow.md", "x.flow.md", {
      readFile: () => "---\nsource: x\n---\n## Paths\nbody\n",
    });
    expect(r).toEqual([]);
  });

  it("flags no headings", () => {
    const r = checkFlowMd("/p/__specs__/flows/x.flow.md", "x.flow.md", {
      readFile: () => "no headings\n",
    });
    expect(r.some((e) => /no `## ` headings/.test(e))).toBe(true);
  });

  it("flags duplicate heading", () => {
    const r = checkFlowMd("/p/__specs__/flows/x.flow.md", "x.flow.md", {
      readFile: () => "## Paths\nbody\n## Paths\nbody\n",
    });
    expect(r.some((e) => /duplicate heading/.test(e))).toBe(true);
  });

  it("flags empty section", () => {
    const r = checkFlowMd("/p/__specs__/flows/x.flow.md", "x.flow.md", {
      readFile: () => "## Paths\n## Other\nbody\n",
    });
    expect(r.some((e) => /empty/.test(e))).toBe(true);
  });

  it("flags doc with neither NEW nor LEGACY recognised headings", () => {
    const r = checkFlowMd("/p/__specs__/flows/x.flow.md", "x.flow.md", {
      readFile: () => "## Random\nbody\n",
    });
    expect(r.some((e) => /neither NEW-form headings/.test(e))).toBe(true);
  });

  it("for NEW-form: reports missing canonical headings", () => {
    const r = checkFlowMd("/p/__specs__/flows/x.flow.md", "x.flow.md", {
      readFile: () => "## Pre-conditions\nbody\n",
    });
    expect(r.filter((e) => /NEW-form flow missing/.test(e))).toHaveLength(4);
  });

  it("for NEW-form: accepts all 5 canonical headings", () => {
    const src = FLOW_HEADINGS_NEW.map((h) => `## ${h}\nbody\n`).join("");
    const r = checkFlowMd("/p/__specs__/flows/x.flow.md", "x.flow.md", {
      readFile: () => src,
    });
    expect(r).toEqual([]);
  });

  it("for NEW-form: flags '## Diagram' that follows '## Pre-conditions'", () => {
    const src =
      FLOW_HEADINGS_NEW.map((h) => `## ${h}\nbody\n`).join("") +
      "## Diagram\n```mermaid\nflowchart\n```\n";
    const r = checkFlowMd("/p/__specs__/flows/x.flow.md", "x.flow.md", {
      readFile: () => src,
    });
    expect(r.some((e) => /must precede/.test(e))).toBe(true);
  });

  it("for NEW-form: flags '## Diagram' without a mermaid fence", () => {
    const src =
      "## Diagram\nno fence\n" +
      FLOW_HEADINGS_NEW.map((h) => `## ${h}\nbody\n`).join("");
    const r = checkFlowMd("/p/__specs__/flows/x.flow.md", "x.flow.md", {
      readFile: () => src,
    });
    expect(r.some((e) => /"## Diagram" must contain a/.test(e))).toBe(true);
  });

  it("for NEW-form: accepts '## Diagram' before '## Pre-conditions' with mermaid", () => {
    const src =
      "## Diagram\n```mermaid\nflowchart\n```\n" +
      FLOW_HEADINGS_NEW.map((h) => `## ${h}\nbody\n`).join("");
    const r = checkFlowMd("/p/__specs__/flows/x.flow.md", "x.flow.md", {
      readFile: () => src,
    });
    expect(r).toEqual([]);
  });

  it("flags legacy '## Flow Diagram' without a mermaid fence", () => {
    const r = checkFlowMd("/p/__specs__/flows/x.flow.md", "x.flow.md", {
      readFile: () => "## Paths\nbody\n## Flow Diagram\nno fence\n",
    });
    expect(r.some((e) => /Flow Diagram.*mermaid/.test(e))).toBe(true);
  });

  it("accepts legacy '## Flow Diagram' WITH a mermaid fence", () => {
    const r = checkFlowMd("/p/__specs__/flows/x.flow.md", "x.flow.md", {
      readFile: () =>
        "## Paths\nbody\n## Flow Diagram\n```mermaid\ngraph LR; A-->B\n```\n",
    });
    expect(r).toEqual([]);
  });

  it("uses default IO when injected is omitted", () => {
    const tmp = mkdtempSync(join(tmpdir(), "vd-flow-default-"));
    cleanupDirs.push(tmp);
    const dir = join(tmp, "__specs__", "flows");
    mkdirSync(dir, { recursive: true });
    const p = join(dir, "x.flow.md");
    writeFileSync(p, "## Paths\nbody\n");
    expect(checkFlowMd(p, "x.flow.md")).toEqual([]);
  });

  it("for NEW-form: handles '## Diagram' as the LAST heading (no following ## block)", () => {
    // Diagram appears AFTER Pre-conditions which is an error path on the
    // ordering check; but having no nextH2 match exercises the
    // `diagSection.slice/diagSection` fallback branch in the Diagram body
    // extractor.
    const src =
      FLOW_HEADINGS_NEW.map((h) => `## ${h}\nbody\n`).join("") +
      "## Diagram\n```mermaid\nflowchart\n```\n";
    const r = checkFlowMd("/p/__specs__/flows/x.flow.md", "x.flow.md", {
      readFile: () => src,
    });
    // The misordered-Diagram error will fire; the body extraction's
    // no-nextH2 branch is exercised regardless.
    expect(r.some((e) => /must precede/.test(e))).toBe(true);
  });

  it("legacy: handles '## Flow Diagram' as the LAST heading (no following ## block)", () => {
    const src = "## Paths\nbody\n## Flow Diagram\n```mermaid\nA-->B\n```\n";
    const r = checkFlowMd("/p/__specs__/flows/x.flow.md", "x.flow.md", {
      readFile: () => src,
    });
    expect(r).toEqual([]);
  });
});

// --- checkCodeConfidenceMd --------------------------------------------

describe("checkCodeConfidenceMd", () => {
  it("returns [] when file has 10 gate rows + Overall confidence + no ❌", () => {
    const rows = Array.from({ length: 10 }, (_, i) => `| ${i + 1} | ok |`).join(
      "\n",
    );
    const src = `${rows}\nOverall confidence: 100%\n`;
    expect(
      checkCodeConfidenceMd("/p/CODE_CONFIDENCE.md", "CODE_CONFIDENCE.md", {
        readFile: () => src,
      }),
    ).toEqual([]);
  });

  it("flags wrong gate count", () => {
    const r = checkCodeConfidenceMd(
      "/p/CODE_CONFIDENCE.md",
      "CODE_CONFIDENCE.md",
      {
        readFile: () => "| 1 | ok |\nOverall confidence: 100%\n",
      },
    );
    expect(r.some((e) => /expected 10 gate rows, found 1/.test(e))).toBe(true);
  });

  it("flags zero gate rows (regex match returns null → `?? []` fallback)", () => {
    const r = checkCodeConfidenceMd(
      "/p/CODE_CONFIDENCE.md",
      "CODE_CONFIDENCE.md",
      { readFile: () => "no rows at all\nOverall confidence: 100%\n" },
    );
    expect(r.some((e) => /expected 10 gate rows, found 0/.test(e))).toBe(true);
  });

  it("flags missing Overall confidence line", () => {
    const rows = Array.from({ length: 10 }, (_, i) => `| ${i + 1} | ok |`).join(
      "\n",
    );
    const r = checkCodeConfidenceMd(
      "/p/CODE_CONFIDENCE.md",
      "CODE_CONFIDENCE.md",
      { readFile: () => `${rows}\n` },
    );
    expect(r.some((e) => /missing "Overall confidence:"/.test(e))).toBe(true);
  });

  it("flags presence of ❌", () => {
    const rows = Array.from({ length: 10 }, (_, i) => `| ${i + 1} | ok |`).join(
      "\n",
    );
    const r = checkCodeConfidenceMd(
      "/p/CODE_CONFIDENCE.md",
      "CODE_CONFIDENCE.md",
      {
        readFile: () => `${rows}\nOverall confidence: 100%\n❌ something\n`,
      },
    );
    expect(r.some((e) => /contains ❌/.test(e))).toBe(true);
  });

  it("uses default IO when injected is omitted", () => {
    const tmp = mkdtempSync(join(tmpdir(), "vd-cc-default-"));
    cleanupDirs.push(tmp);
    const p = join(tmp, "CODE_CONFIDENCE.md");
    const rows = Array.from({ length: 10 }, (_, i) => `| ${i + 1} | ok |`).join(
      "\n",
    );
    writeFileSync(p, `${rows}\nOverall confidence: 100%\n`);
    expect(checkCodeConfidenceMd(p, "CODE_CONFIDENCE.md")).toEqual([]);
  });
});

// --- checkSpecsFolder -------------------------------------------------

describe("checkSpecsFolder", () => {
  it("returns [] for a sub-feature folder with spec.md only", () => {
    const errs = checkSpecsFolder(
      "/src/db/client/__specs__",
      "src/db/client/__specs__",
      "/src",
      {
        existsSync: (p) => p.endsWith("/spec.md"),
        readDir: () => [],
        statFile: () => ({ isDirectory: () => false }),
      },
    );
    expect(errs).toEqual([]);
  });

  it("flags missing spec.md", () => {
    const errs = checkSpecsFolder(
      "/src/db/client/__specs__",
      "src/db/client/__specs__",
      "/src",
      {
        existsSync: () => false,
        readDir: () => [],
        statFile: () => ({ isDirectory: () => false }),
      },
    );
    expect(errs.some((e) => /MISSING spec.md/.test(e))).toBe(true);
  });

  it("module-level: accepts CODE_CONFIDENCE.md presence (legacy path)", () => {
    const errs = checkSpecsFolder(
      "/src/features/identity/__specs__",
      "src/features/identity/__specs__",
      "/src",
      {
        existsSync: (p) =>
          p.endsWith("/spec.md") || p.endsWith("/CODE_CONFIDENCE.md"),
        readDir: () => [],
        statFile: () => ({ isDirectory: () => false }),
      },
    );
    expect(errs).toEqual([]);
  });

  it("module-level: accepts standards-compliance.yaml presence (new lock supersedes scorecard)", () => {
    const errs = checkSpecsFolder(
      "/src/features/identity/__specs__",
      "src/features/identity/__specs__",
      "/src",
      {
        existsSync: (p) =>
          p.endsWith("/spec.md") || p.endsWith("/standards-compliance.yaml"),
        readDir: () => [],
        statFile: () => ({ isDirectory: () => false }),
      },
    );
    expect(errs).toEqual([]);
  });

  it("module-level: flags absence of BOTH the scorecard and the new lock", () => {
    const errs = checkSpecsFolder(
      "/src/features/identity/__specs__",
      "src/features/identity/__specs__",
      "/src",
      {
        existsSync: (p) => p.endsWith("/spec.md"),
        readDir: () => [],
        statFile: () => ({ isDirectory: () => false }),
      },
    );
    expect(
      errs.some((e) =>
        /MISSING CODE_CONFIDENCE.md OR standards-compliance.yaml/.test(e),
      ),
    ).toBe(true);
  });

  it("flags empty flows/ directory", () => {
    const errs = checkSpecsFolder(
      "/src/db/client/__specs__",
      "src/db/client/__specs__",
      "/src",
      {
        existsSync: (p) =>
          p.endsWith("/spec.md") || p.endsWith("/__specs__/flows"),
        readDir: () => [],
        statFile: () => ({ isDirectory: () => true }),
      },
    );
    expect(errs.some((e) => /MISSING at least one/.test(e))).toBe(true);
  });

  it("accepts a flows/ directory containing only *.flow.yaml (dual-shape policy)", () => {
    const errs = checkSpecsFolder(
      "/src/db/client/__specs__",
      "src/db/client/__specs__",
      "/src",
      {
        existsSync: (p) =>
          p.endsWith("/spec.md") || p.endsWith("/__specs__/flows"),
        readDir: () => ["get-db.flow.yaml"],
        statFile: () => ({ isDirectory: () => true }),
      },
    );
    expect(errs).toEqual([]);
  });

  it("accepts a flows/ directory containing only *.flow.md (legacy)", () => {
    const errs = checkSpecsFolder(
      "/src/db/client/__specs__",
      "src/db/client/__specs__",
      "/src",
      {
        existsSync: (p) =>
          p.endsWith("/spec.md") || p.endsWith("/__specs__/flows"),
        readDir: () => ["get-db.flow.md"],
        statFile: () => ({ isDirectory: () => true }),
      },
    );
    expect(errs).toEqual([]);
  });

  it("uses default IO when injected is omitted", () => {
    const tmp = mkdtempSync(join(tmpdir(), "vd-csf-default-"));
    cleanupDirs.push(tmp);
    const dir = join(tmp, "__specs__");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "spec.md"), "## Purpose\nx\n");
    const errs = checkSpecsFolder(dir, dir, tmp);
    expect(errs).toEqual([]);
  });
});

// --- audit -------------------------------------------------------------

describe("audit", () => {
  it("returns no errors against an empty tree", () => {
    const r = audit(
      { src: "/src", e2e: "/e2e" },
      {
        existsSync: () => true,
        listAllDirs: () => [],
        listAllFiles: () => [],
      },
    );
    expect(r.errors).toEqual([]);
  });

  it("skips a root that does not exist", () => {
    const r = audit(
      { src: "/src", e2e: "/no-such-e2e" },
      {
        existsSync: (p) => p === "/src",
        listAllDirs: () => [],
        listAllFiles: () => [],
      },
    );
    expect(r.errors).toEqual([]);
  });

  it("runs the spec.md checker on files ending in /__specs__/spec.md", () => {
    const r = audit(
      { src: "/src", e2e: "/e2e" },
      {
        existsSync: () => true,
        listAllDirs: () => [],
        listAllFiles: (root) =>
          root === "/src" ? ["/src/db/client/__specs__/spec.md"] : [],
        readFile: () => "no headings\n",
      },
    );
    expect(r.specsChecked).toBe(1);
    expect(r.errors.some((e) => /no `## ` headings/.test(e))).toBe(true);
  });

  it("runs the flow.md checker on *.flow.md files", () => {
    const r = audit(
      { src: "/src", e2e: "/e2e" },
      {
        existsSync: () => true,
        listAllDirs: () => [],
        listAllFiles: (root) =>
          root === "/src" ? ["/src/x/__specs__/flows/x.flow.md"] : [],
        readFile: () => "## Paths\nbody\n",
      },
    );
    expect(r.flowsChecked).toBe(1);
    expect(r.errors).toEqual([]);
  });

  it("runs the code-confidence checker on CODE_CONFIDENCE.md files", () => {
    const rows = Array.from({ length: 10 }, (_, i) => `| ${i + 1} | ok |`).join(
      "\n",
    );
    const r = audit(
      { src: "/src", e2e: "/e2e" },
      {
        existsSync: () => true,
        listAllDirs: () => [],
        listAllFiles: (root) =>
          root === "/src" ? ["/src/CODE_CONFIDENCE.md"] : [],
        readFile: () => `${rows}\nOverall confidence: 100%\n`,
      },
    );
    expect(r.ccChecked).toBe(1);
    expect(r.errors).toEqual([]);
  });

  it("runs the per-folder check on /__specs__ directories", () => {
    const r = audit(
      { src: "/src", e2e: "/e2e" },
      {
        existsSync: (p) => p === "/src" || p === "/e2e" || p.endsWith("/spec.md"),
        listAllDirs: (root) =>
          root === "/src" ? ["/src/db/client/__specs__"] : [],
        listAllFiles: () => [],
        readDir: () => [],
        statFile: () => ({ isDirectory: () => false }),
      },
    );
    expect(r.specsFoldersChecked).toBe(1);
    expect(r.errors).toEqual([]);
  });

  it("uses default IO when injected is omitted (real tmp tree)", () => {
    const tmp = mkdtempSync(join(tmpdir(), "vd-audit-default-"));
    cleanupDirs.push(tmp);
    const e2e = join(tmp, "absent-e2e");
    const r = audit({ src: tmp, e2e });
    expect(r.errors).toEqual([]);
  });

  it("skips __specs__/ directories inside __specs__.backup/ (carve-out)", () => {
    const r = audit(
      { src: "/src", e2e: "/e2e" },
      {
        existsSync: () => true,
        listAllDirs: (root) =>
          root === "/src"
            ? ["/src/db/client/__specs__.backup/__specs__"]
            : [],
        listAllFiles: () => [],
        readDir: () => [],
        statFile: () => ({ isDirectory: () => false }),
      },
    );
    expect(r.specsFoldersChecked).toBe(0);
    expect(r.errors).toEqual([]);
  });

  it("skips *.flow.md files inside __specs__.backup/ (carve-out)", () => {
    const r = audit(
      { src: "/src", e2e: "/e2e" },
      {
        existsSync: () => true,
        listAllDirs: () => [],
        listAllFiles: (root) =>
          root === "/src"
            ? ["/src/db/client/__specs__.backup/flows/get-db.flow.md"]
            : [],
        readFile: () => "// will never be read since the file is skipped\n",
      },
    );
    expect(r.flowsChecked).toBe(0);
    expect(r.errors).toEqual([]);
  });
});

// --- formatReport ------------------------------------------------------

describe("formatReport", () => {
  it("returns exit 0 + OK stdout when no errors", () => {
    const r = formatReport({
      errors: [],
      specsFoldersChecked: 2,
      specsChecked: 1,
      flowsChecked: 3,
      ccChecked: 0,
    });
    expect(r.exitCode).toBe(0);
    expect(r.stdout).toContain("verify-docs: OK");
    expect(r.stderr).toBe("");
  });

  it("returns exit 1 + per-issue lines on stderr otherwise", () => {
    const r = formatReport({
      errors: ["foo", "bar"],
      specsFoldersChecked: 0,
      specsChecked: 0,
      flowsChecked: 0,
      ccChecked: 0,
    });
    expect(r.exitCode).toBe(1);
    expect(r.stderr).toContain("2 issue(s)");
    expect(r.stderr).toContain("foo");
    expect(r.stderr).toContain("bar");
  });
});

// --- main --------------------------------------------------------------

describe("main", () => {
  it("returns exit 0 when audit returns no errors", () => {
    /** @type {string[]} */
    const out = [];
    const r = main({
      src: "/src",
      e2e: "/e2e",
      existsSync: () => false,
      listAllDirs: () => [],
      listAllFiles: () => [],
      readFile: () => "",
      readDir: () => [],
      statFile: () => ({ isDirectory: () => false }),
      write: (s) => out.push(s),
      writeErr: () => undefined,
    });
    expect(r.exitCode).toBe(0);
    expect(out.join("")).toContain("verify-docs: OK");
  });

  it("returns exit 1 when audit reports issues", () => {
    /** @type {string[]} */
    const err = [];
    const r = main({
      src: "/src",
      e2e: "/e2e",
      existsSync: () => true,
      listAllDirs: () => [],
      listAllFiles: () => ["/src/db/client/__specs__/spec.md"],
      readFile: () => "no headings\n",
      readDir: () => [],
      statFile: () => ({ isDirectory: () => false }),
      write: () => undefined,
      writeErr: (s) => err.push(s),
    });
    expect(r.exitCode).toBe(1);
    expect(err.join("")).toContain("verify-docs:");
  });

  it("falls back to default args when called with no io", () => {
    const tmp = mkdtempSync(join(tmpdir(), "vd-main-default-"));
    cleanupDirs.push(tmp);
    const e2e = join(tmp, "absent");
    const r = main({ src: tmp, e2e });
    expect(r.exitCode).toBe(0);
  });
});

// --- default IO ports --------------------------------------------------

describe("default IO ports", () => {
  it("defaultExistsSync returns true for an existing file", () => {
    const tmp = mkdtempSync(join(tmpdir(), "vd-port-exists-"));
    cleanupDirs.push(tmp);
    const p = join(tmp, "x.txt");
    writeFileSync(p, "");
    expect(defaultExistsSync(p)).toBe(true);
  });

  it("defaultReadFile reads the contents back", () => {
    const tmp = mkdtempSync(join(tmpdir(), "vd-port-read-"));
    cleanupDirs.push(tmp);
    const p = join(tmp, "x.txt");
    writeFileSync(p, "hello");
    expect(defaultReadFile(p)).toBe("hello");
  });

  it("defaultReadDir lists entries", () => {
    const tmp = mkdtempSync(join(tmpdir(), "vd-port-readdir-"));
    cleanupDirs.push(tmp);
    writeFileSync(join(tmp, "x.txt"), "");
    expect(defaultReadDir(tmp)).toContain("x.txt");
  });

  it("defaultStatFile returns a Stats object", () => {
    const tmp = mkdtempSync(join(tmpdir(), "vd-port-stat-"));
    cleanupDirs.push(tmp);
    const s = defaultStatFile(tmp);
    expect(s.isDirectory()).toBe(true);
  });

  it("defaultListAllDirs returns an array", () => {
    const tmp = mkdtempSync(join(tmpdir(), "vd-port-listdirs-"));
    cleanupDirs.push(tmp);
    expect(defaultListAllDirs(tmp)).toContain(tmp);
  });

  it("defaultListAllFiles returns an array", () => {
    const tmp = mkdtempSync(join(tmpdir(), "vd-port-listfiles-"));
    cleanupDirs.push(tmp);
    writeFileSync(join(tmp, "x.txt"), "");
    expect(defaultListAllFiles(tmp)).toContain(join(tmp, "x.txt"));
  });

  it("defaultStdoutWrite / defaultStderrWrite are callable", () => {
    expect(() => defaultStdoutWrite("")).not.toThrow();
    expect(() => defaultStderrWrite("")).not.toThrow();
  });
});

// --- isCliInvocation / cliMain / maybeRunCli ---------------------------

describe("isCliInvocation", () => {
  it("returns false for undefined argv1", () => {
    expect(isCliInvocation("file:///a.mjs", undefined)).toBe(false);
  });

  it("returns false for empty argv1", () => {
    expect(isCliInvocation("file:///a.mjs", "")).toBe(false);
  });

  it("returns false when argv1 does not match import.meta.url", () => {
    expect(isCliInvocation("file:///a.mjs", "/tmp/b.mjs")).toBe(false);
  });

  it("returns true when argv1 resolves to the same URL", () => {
    const argv1 = "/tmp/x.mjs";
    expect(isCliInvocation(pathToFileURL(argv1).href, argv1)).toBe(true);
  });
});

describe("cliMain", () => {
  it("invokes main and forwards the exit code via injected exit", () => {
    /** @type {number[]} */
    const codes = [];
    cliMain({ exit: (c) => codes.push(c) });
    expect(codes.length).toBe(1);
    expect([0, 1]).toContain(codes[0]);
  });

  it("falls back to process.exit when no io is passed", () => {
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

void SCRIPT_PATH;
