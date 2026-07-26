# parse-flowchart

## Target

local — this is a published npm library (`@yantrakit/flowchart-react`), not an HTTP/CLI/UI
surface, so there is no URL to navigate. Drive it via a scratch Node.js/TS module executed in the
repo (`code/package/`) with `npx tsx <scratch-file>.ts` (or `pnpm vitest run` against a throwaway
scratch test) importing directly from source: `import { parseFlowchart, FlowchartParseError } from
'./src/parse'`. Do NOT open a browser and do NOT start a server — none exists for this surface.

## Preconditions

- Repo cloned at `code/package/`, `pnpm install` has been run (node_modules present).
- Node.js >= 18 available on PATH.
- No build required — import directly from `./src/parse/index.ts` via `tsx`.

## Steps

1. **action**: import `{ parseFlowchart }` from `./src/parse` and call it with a well-formed
   sample: `parseFlowchart('flowchart TD\n  s([Start]) --> check{OK?}\n  check -->|yes| ship[Ship]\n  check ==>|no| fail[Fail]:::error\n  ship --> done([Done])')`.
   **expected**: returns an object with `direction: 'TD'`, 5 nodes (`s`,`check`,`ship`,`fail`,`done`),
   4 edges; `s.type === 'start'`, `check.type === 'decision'`, `fail.type === 'error'`,
   `done.type === 'end'`; the `check→fail` edge has `type: 'error'` and `label: 'no'`.
2. **action** (ADVERSARIAL — malformed input, no header): call
   `parseFlowchart('a --> b')` with NO `options.direction`.
   **expected**: throws `FlowchartParseError`; `err.line === 1`; `err.reason` contains
   `expected header`. Confirm it is an `instanceof FlowchartParseError`, not a generic `Error`.
3. **action** (ADVERSARIAL — unclosed bracket abuse): call
   `parseFlowchart('flowchart TD\n  a[Unclosed --> b')`.
   **expected**: throws `FlowchartParseError` with `reason` containing `unclosed`; `err.line === 2`.
4. **action** (ADVERSARIAL — unknown node class injection): call
   `parseFlowchart('flowchart TD\n  a:::not_a_real_type --> b')`.
   **expected**: throws `FlowchartParseError` with `reason` containing `unknown node class`; does
   NOT silently fall back to a default type and return a graph.
5. **action** (ADVERSARIAL — unknown edge class injection): call
   `parseFlowchart('flowchart TD\n  a -->:::not_a_real_edge_type b')`.
   **expected**: throws `FlowchartParseError` with `reason` containing `unknown edge class`.
6. **action** (ADVERSARIAL — empty-diagram abuse): call `parseFlowchart('flowchart TD\n')`
   (header only, zero node statements).
   **expected**: throws `FlowchartParseError` with `reason` containing `no nodes` — MUST NOT
   return a graph with an empty `nodes` array silently.
7. **action** (ADVERSARIAL — cycle with no natural start/end): call
   `parseFlowchart('flowchart TD\n  a --> b\n  b --> a')`.
   **expected**: succeeds (no throw); exactly one node has `type === 'start'` (the
   first-node-fallback fired) — confirms the parser doesn't hang or silently drop nodes on a cycle.
8. **action**: assert the 1-based line/column carried by a mid-file error: call
   `parseFlowchart('flowchart TD\n  a --> b\n  c :: broken')`.
   **expected**: `err.line === 3` exactly (not 1, not 2) — proves line tracking survives multiple
   prior valid statements.

If a step fails twice, record the flow FAIL with a note and STOP — do not loop the step.

## Assertions

- MUST: every malformed-input step (2–6) throws `FlowchartParseError` (never a generic `Error`,
  never a silent partial graph, never `undefined`).
- MUST: every thrown `FlowchartParseError` carries a 1-based `line` that matches the actual
  offending line in the input text.
- MUST NOT: `parseFlowchart` ever returns a graph object when the input is malformed per steps
  2–6 (no partial/best-effort graph on error, per this folder's SETUP contract in `errors.ts`).
- MUST NOT: an unknown `:::class` (node or edge) is silently accepted and mapped to a default
  type — it MUST throw.
- MUST: a cycle with no naturally-resolvable start node still returns a complete graph (step 7),
  never throws, never infinite-loops.

## Report

POST the results to `/api/v1/manual-results/parse-flowchart` in the shape
`{ flow: "parse-flowchart", ok: true|false, steps: [...], notes: "..." }`, AND also print the full
results to the console/output. NOTE: this repo is a published npm package with no running
server — it does NOT currently expose a `/api/v1/manual-results/<flow>` route (that surface is a
web-app concept). Until/unless one is added to this repo, PRINT the results only (the `ok` boolean
per MANUAL_FLOWS#browser_agent_rules.machine_result still applies to the printed report) and note
in the report that no POST route exists for this repo.
