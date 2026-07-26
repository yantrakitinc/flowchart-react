#!/usr/bin/env node
/**
 * verify-ui-screenshots-match-designs.mjs
 *
 * Path 2 of the autonomy-mode UI validation. Split into two pieces:
 *
 *   1. Deterministic side (this script). For every (flow, state) that
 *      needs review: drive Puppeteer through the manual playbook to the
 *      state, capture the screenshot to disk, write/refresh a review
 *      manifest at __specs__/ui/.review-queue.json listing each pending
 *      (screenshot, design, expected-result-path) triple. Then read any
 *      existing match-<state>.json result files written by the agent.
 *
 *   2. Agent-in-session side (verifier.md Mode A step 10). Reads the
 *      manifest, opens each (screenshot, design) pair via Read+vision
 *      under the user's Max subscription (NEVER the Anthropic API),
 *      scores 0-100 + names discrepancies, writes the result file.
 *      Re-runs this script; results are now picked up.
 *
 * Path 1 (verify-ui-design-locked) covers "design approved" via user-
 * signed marker. Path 2 covers "implementation matches the approved
 * design". Both required to ship.
 *
 * --------------------------------------------------------------------
 * Inputs per flow / state:
 *   - <feature>/__specs__/spec.yaml                          (declares invocation + ui_design)
 *   - <feature>/__specs__/ui/<flow>.md                       (wireframe + state list)
 *   - <feature>/__specs__/manual/<flow>.yaml                 (Puppeteer steps per state)
 *   - <feature>/__specs__/ui/<flow>.design-<state>.png       (user-supplied design mockup)
 *
 * Outputs:
 *   - <feature>/__specs__/ui/<flow>.screenshot-<state>.png   (captured by this script)
 *   - <feature>/__specs__/ui/.review-queue.json              (manifest of pending reviews)
 *   - <feature>/__specs__/ui/<flow>.match-<state>.json       (written by verifier agent;
 *                                                            shape: { score, discrepancies, reviewed_at, reviewer })
 *   - <feature>/__specs__/ui/<flow>.diff-<state>.md          (written by this script on failing scores)
 *
 * --------------------------------------------------------------------
 * Per-repo config (README.yaml):
 *   - ui_screenshot_match_threshold: int  (default 85)
 *   - ui_screenshot_dev_server_url: string  (default "http://localhost:3000")
 *
 * --------------------------------------------------------------------
 * Exit codes:
 *   0  all flows match (or no UI surfaces / no specs in repo)
 *   1  any (flow, state) match-result file exists with score < threshold
 *   2  BLOCKED — review queue has pending items (agent needs to score them) OR
 *      required inputs missing (design PNG, manual.yaml, devDeps, dev server unreachable)
 */

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve, basename } from "node:path";
import { createRequire } from "node:module";

import { resolveDesign } from "../lib/design-source.mjs";

const REPO_ROOT = resolve(process.argv[2] ?? process.cwd());
const SRC_ROOT = resolve(REPO_ROOT, "src");

const SKIP_DIRS = new Set([
  "node_modules", ".next", ".turbo", "dist", "build", "out", ".git", "coverage",
]);

const require = createRequire(import.meta.url);

// ---------- dep checks (fail-soft so the gate degrades to BLOCKED, not FAIL) ----------

let YAML, puppeteer;
const missingDeps = [];
try { YAML = require("yaml"); } catch { missingDeps.push("yaml"); }
try { puppeteer = require("puppeteer"); } catch { missingDeps.push("puppeteer"); }

if (missingDeps.length > 0) {
  process.stderr.write(
    `🚧 verify-ui-screenshots-match-designs: BLOCKED — missing devDependencies: ${missingDeps.join(", ")}\n` +
    `   Install them:  pnpm add -D ${missingDeps.join(" ")}\n`,
  );
  process.exit(2);
}

if (!existsSync(SRC_ROOT)) {
  process.stdout.write(
    `✅ verify-ui-screenshots-match-designs — no src/ in this repo; nothing to check.\n`,
  );
  process.exit(0);
}

// ---------- per-repo config ----------

function readRepoConfig() {
  const readmePath = join(REPO_ROOT, "README.yaml");
  if (!existsSync(readmePath)) return {};
  try { return YAML.parse(readFileSync(readmePath, "utf8")) ?? {}; }
  catch { return {}; }
}

const repoConfig = readRepoConfig();
const THRESHOLD = Number(repoConfig.ui_screenshot_match_threshold ?? 85);
const DEV_SERVER_URL = String(repoConfig.ui_screenshot_dev_server_url ?? "http://localhost:3000");

// ---------- spec discovery ----------

const specPaths = [];

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      walk(join(dir, entry.name));
      continue;
    }
    if (entry.name === "spec.yaml" && dirname(join(dir, entry.name)).endsWith("__specs__")) {
      specPaths.push(join(dir, entry.name));
    }
  }
}
walk(SRC_ROOT);

if (specPaths.length === 0) {
  process.stdout.write(
    `✅ verify-ui-screenshots-match-designs — no __specs__/spec.yaml files; nothing to check.\n`,
  );
  process.exit(0);
}

// ---------- flow + state extraction ----------

const UI_TYPES = new Set(["ui", "server-action"]);

function listChecksForSpec(specPath) {
  const specsDir = dirname(specPath);
  let spec;
  try { spec = YAML.parse(readFileSync(specPath, "utf8")); }
  catch (e) { return { kind: "error", reason: `YAML parse: ${e.message}` }; }

  const inv = spec?.invocation;
  const autoRequired = inv && UI_TYPES.has(inv.type);
  const optOut = spec?.ui_design === "not-applicable";
  const explicitRequired = spec?.ui_design === "required";
  const required = explicitRequired || (autoRequired && !optOut);
  if (!required) return { kind: "skip" };

  const flows = (spec?.links?.flows ?? []).filter((f) => typeof f === "string");
  if (flows.length === 0) return { kind: "error", reason: "ui_design required but spec.yaml.links.flows is empty" };

  const checks = [];
  for (const flowEntry of flows) {
    const flowBase = basename(flowEntry).replace(/\.flow\.ya?ml$/, "");
    const manualPath = join(specsDir, "manual", `${flowBase}.yaml`);
    if (!existsSync(manualPath)) {
      checks.push({ flow: flowBase, state: null, error: `manual playbook missing at ${manualPath}` });
      continue;
    }
    let manual;
    try { manual = YAML.parse(readFileSync(manualPath, "utf8")); }
    catch (e) { checks.push({ flow: flowBase, state: null, error: `manual.yaml parse: ${e.message}` }); continue; }

    const stateNames = manual?.states && typeof manual.states === "object"
      ? Object.keys(manual.states)
      : ["entry"];

    for (const state of stateNames) {
      checks.push({ flow: flowBase, state, manual, manualPath, specsDir });
    }
  }
  return { kind: "checks", checks };
}

// ---------- puppeteer driver ----------

async function screenshotState(browserPage, manualYaml, state) {
  const url = manualYaml?.start
    ? new URL(manualYaml.start, DEV_SERVER_URL).toString()
    : DEV_SERVER_URL;
  await browserPage.goto(url, { waitUntil: "networkidle0" });
  const stateSteps = manualYaml?.states?.[state]?.steps ?? [];
  for (const step of stateSteps) {
    if (typeof step !== "object") continue;
    if (step.click) await browserPage.click(step.click);
    if (step.type)  await browserPage.type(step.selector, step.type);
    if (step.wait)  await new Promise((r) => setTimeout(r, Number(step.wait)));
    if (step.waitForSelector) await browserPage.waitForSelector(step.waitForSelector);
  }
  return browserPage.screenshot({ type: "png", fullPage: true });
}

// ---------- result-file shape + diff writer ----------

function readMatchResult(specsDir, flow, state) {
  const path = join(specsDir, "ui", `${flow}.match-${state}.json`);
  if (!existsSync(path)) return null;
  try { return JSON.parse(readFileSync(path, "utf8")); }
  catch (e) { return { __invalid__: true, error: e.message }; }
}

function writeDiffMd(specsDir, flow, state, screenshotPath, designPath, matchResult) {
  const path = join(specsDir, "ui", `${flow}.diff-${state}.md`);
  const body = [
    `# UI diff — ${flow} / ${state}`,
    ``,
    `**Score:** ${matchResult.score} / 100 (threshold ${THRESHOLD})  `,
    `**Reviewed at:** ${matchResult.reviewed_at}  `,
    `**Reviewer:** ${matchResult.reviewer}`,
    ``,
    `## Discrepancies`,
    ``,
    ...matchResult.discrepancies.map((d) => `- ${d}`),
    ``,
    `## Design (target)`,
    ``,
    `![design](${relative(dirname(path), designPath)})`,
    ``,
    `## Screenshot (implementation)`,
    ``,
    `![screenshot](${relative(dirname(path), screenshotPath)})`,
    ``,
  ].join("\n");
  writeFileSync(path, body);
  return path;
}

// ---------- main run ----------

async function main() {
  const reviewQueue = [];     // pending agent review
  const blocks = [];          // BLOCKED-class issues
  const failures = [];        // score < threshold

  let browser, browserPage;

  try {
    for (const specPath of specPaths) {
      const rel = relative(REPO_ROOT, specPath);
      const planResult = listChecksForSpec(specPath);
      if (planResult.kind === "skip") continue;
      if (planResult.kind === "error") { blocks.push(`${rel}: ${planResult.reason}`); continue; }

      for (const check of planResult.checks) {
        if (check.error) { blocks.push(`${rel}: flow ${check.flow}: ${check.error}`); continue; }

        const { flow, state, manual, specsDir } = check;

        // 1. Resolve design PNG (manual backend only).
        const designRes = resolveDesign(specsDir, flow, state);
        if (designRes.kind !== "png-bytes") {
          blocks.push(`${rel}: flow ${flow} state ${state}: ${designRes.reason}`);
          continue;
        }

        // 2. Read existing match-result file (if the agent already scored this pair).
        const existing = readMatchResult(specsDir, flow, state);
        if (existing && !existing.__invalid__) {
          if (existing.score < THRESHOLD) {
            const screenshotPath = join(specsDir, "ui", `${flow}.screenshot-${state}.png`);
            const diffPath = writeDiffMd(specsDir, flow, state, screenshotPath, designRes.location, existing);
            failures.push({ spec: rel, flow, state, score: existing.score, diff: relative(REPO_ROOT, diffPath), discrepancies: existing.discrepancies });
          }
          continue;
        }
        if (existing && existing.__invalid__) {
          blocks.push(`${rel}: flow ${flow} state ${state}: match-result file invalid JSON — ${existing.error}`);
          continue;
        }

        // 3. No result yet → screenshot + queue for agent review.
        if (!browser) {
          browser = await puppeteer.launch({ headless: "new" });
          browserPage = await browser.newPage();
          await browserPage.setViewport({ width: 1440, height: 900 });
        }

        let screenshotPng;
        try { screenshotPng = await screenshotState(browserPage, manual, state); }
        catch (e) {
          blocks.push(`${rel}: flow ${flow} state ${state}: screenshot failed — ${e.message}`);
          continue;
        }

        const screenshotPath = join(specsDir, "ui", `${flow}.screenshot-${state}.png`);
        mkdirSync(dirname(screenshotPath), { recursive: true });
        writeFileSync(screenshotPath, screenshotPng);

        reviewQueue.push({
          spec: rel,
          flow,
          state,
          screenshot: relative(REPO_ROOT, screenshotPath),
          design: relative(REPO_ROOT, designRes.location),
          result_path: relative(REPO_ROOT, join(specsDir, "ui", `${flow}.match-${state}.json`)),
        });
      }
    }
  } finally {
    if (browser) await browser.close();
  }

  // ---------- write review manifests (one per spec dir; merge with any existing) ----------

  if (reviewQueue.length > 0) {
    const bySpecDir = new Map();
    for (const item of reviewQueue) {
      const dir = dirname(join(REPO_ROOT, item.spec));      // <feature>/__specs__
      const queue = bySpecDir.get(dir) ?? [];
      queue.push(item);
      bySpecDir.set(dir, queue);
    }
    for (const [dir, items] of bySpecDir) {
      const manifestPath = join(dir, "ui", ".review-queue.json");
      mkdirSync(dirname(manifestPath), { recursive: true });
      writeFileSync(manifestPath, JSON.stringify({ pending: items }, null, 2) + "\n");
    }
  }

  // ---------- report ----------

  if (blocks.length > 0) {
    process.stderr.write(`🚧 verify-ui-screenshots-match-designs: BLOCKED (${blocks.length} input(s) missing)\n\n`);
    for (const b of blocks) process.stderr.write(`  ${b}\n`);
    process.exit(2);
  }
  if (reviewQueue.length > 0) {
    process.stderr.write(
      `🚧 verify-ui-screenshots-match-designs: ${reviewQueue.length} (flow,state) pair(s) need agent review\n\n` +
      `   Verifier agent: read the manifest, score each pair, write the result file. Then re-run this gate.\n\n` +
      `   Per spec, the review queue is at __specs__/ui/.review-queue.json.\n\n`,
    );
    for (const item of reviewQueue) {
      process.stderr.write(`  ${item.spec} / ${item.flow} / ${item.state}\n`);
      process.stderr.write(`     screenshot: ${item.screenshot}\n`);
      process.stderr.write(`     design:     ${item.design}\n`);
      process.stderr.write(`     write to:   ${item.result_path}\n`);
    }
    process.exit(2);
  }
  if (failures.length === 0) {
    process.stdout.write(`✅ verify-ui-screenshots-match-designs — every reviewed UI state scores ≥ ${THRESHOLD}.\n`);
    process.exit(0);
  }
  process.stderr.write(`❌ verify-ui-screenshots-match-designs: ${failures.length} state(s) below threshold (${THRESHOLD})\n\n`);
  for (const f of failures) {
    process.stderr.write(`  ${f.spec} / ${f.flow} / ${f.state}: score ${f.score} → ${f.diff}\n`);
    for (const d of f.discrepancies) process.stderr.write(`     - ${d}\n`);
  }
  process.exit(1);
}

main().catch((e) => {
  process.stderr.write(`💥 verify-ui-screenshots-match-designs: unexpected error — ${e.message}\n${e.stack ?? ""}\n`);
  process.exit(2);
});
