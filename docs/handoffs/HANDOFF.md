# HANDOFF — v2 rebuild (issue #4, branch feat/0004-v2-mermaid-flowchart)

## State: ONE gate from green
`cd code/package && node scripts/verify-all.mjs` → `verify-all: 1 gate(s) failed` — the ONLY
failure is `verify-standards-compliance` on `src/react` (+ `nodes`/`edges` satellites): missing
`browser_validated` stamp (a UI feature can't lock without a real-browser walk).

Green + verified: typecheck clean · lint clean · `pnpm test:coverage` = 20 files / 160 tests /
100% all metrics · `pnpm build` succeeds (React Flow CSS inlined). All other gates green
(source-coverage, no-undeclared-deps, verify-authz eslint 32/32, accessibility-wiring, journeys
reconciled with 4 journeys retired, ir/parse/paths/layout standards-compliance.md locked).

## What v2 is
Mermaid-like DSL + object → React Flow render; pluggable dagre/ELK layout; semantic path
detection; rich node registry; **movie mode** (autoPlay + usePlayback + PlaybackControls +
onPlaybackStep). Design ratified in docs/decisions/DECISIONS.yaml. Code under
code/package/src/{ir,parse,paths,layout,react}, specs in each __specs__/ (.md format).

## Remaining steps (in order)
1. **Browser walk** (react): start Storybook (`cd code/package && pnpm storybook`, :6006), run
   the ui-walker over `src/react/__specs__/manual/*.md` (render-flowchart, select-path,
   click-node, play-path-movie) → walker-signed receipts at `code/package/manual-results/<flow>.<iso>.json`
   (per BROWSER_VALIDATION.md; walker = ~/.claude/agents/ui-walker-core.md).
2. **Stamp** `src/react/__specs__/standards-compliance.md` (+ nodes/edges satellites) with
   `status: locked`, `verified: 100%`, `browser_validated: <ISO-UTC>`, `last_validated: <ISO-UTC>`
   (verifier Mode A, only after the walk is green).
3. `node scripts/verify-all.mjs` → green; then `pnpm verify` full chain green.
4. **PR** (Closes #4) with the verbatim `## Standards gates` output; merge on green (NO bypass).
5. Docs already done (root README/AGENTS/MIGRATION for v2 incl. movie mode; Storybook stories
   incl. MovieMode demo).

## Tech-debt surfaced (file as type:tech-debt, user's call)
- serializeFlowchart truncates node labels containing ] } ) at first occurrence (round-trip gap).
- serializeFlowchart doesn't validate edge from/to reference declared nodes.
- elkEngine.run() has no injectable ELK importer → its 2 branch tests use module-level vi.mock.
- INDEX.yaml count says 66; actual registered standards = 67 (cosmetic).
- Two elk branch tests rely on vi.mock (MOCKING_DOCTRINE last-resort).

## Do NOT
- Do NOT --no-verify, do NOT merge past a red chain, do NOT publish without user say-so.
