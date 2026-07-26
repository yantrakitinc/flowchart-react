# detect-paths

## Target

local — this is a pure-TS library function with no HTTP server and no rendered UI of its own. "Drive"
here means: run a small Node script that imports the built (or source, via ts-node/tsx) package and
calls `detectPaths` directly, then inspect the returned object. There is no browser surface and no
`manual-results` POST route to report to (no app runs here) — see `## Report` below for how this
flow's adaptation of that requirement works.

## Preconditions

- The package is installed/buildable in the current workspace (`pnpm install` at the package root).
- A way to run TypeScript directly is available (`npx tsx <script>.ts` or equivalent); no seed data,
  auth, or running peer service is required.

## Steps

1. **action:** Create a script `probe.ts` that imports `detectPaths` and `parseFlowchart` from the
   package source (`import { detectPaths } from './src/paths/detectPaths'; import { parseFlowchart }
   from './src/parse/parseFlowchart';` when run from the package root), then run:
   `detectPaths(parseFlowchart('flowchart TD\n  a --> b --> c'))`.
   **expected:** `result.paths` has length 1; `result.paths[0].nodeIds` is `['a', 'b', 'c']`;
   `result.paths[0].type` is `'neutral'` (all-default edges).

2. **action:** Feed a branching decision graph:
   `parseFlowchart('flowchart TD\n  s --> d{OK?}\n  d -->|yes| ok\n  d ==>|no| bad\n  ok --> e([End])\n  bad --> e')`,
   then call `detectPaths`.
   **expected:** `result.paths.length === 2` (both the yes-branch and the no-branch are enumerated
   as distinct routes, both reaching the same end node `e`).

3. **action — adversarial (pathological branch-explosion input):** Hand-build (do not parse) a graph
   object with 6 chained "diamonds" (a start node, then 6 rounds of split-into-2/rejoin-into-1,
   ending at a `type:'end'` node on the final join) — this yields 2^6 = 64 true distinct routes,
   above the library's stated MAX_PATHS=50 cap. Call `detectPaths(graph)` directly on the object
   (bypassing the text parser entirely, to rule out the parser silently deduplicating anything).
   **expected:** `result.paths.length === 50` exactly — never 64, never more than 50, and the call
   returns promptly (no hang, no stack overflow) despite the true path count being above the cap.

4. **action — adversarial (cyclic / malformed graph, no resolvable start or end):** Hand-build a
   2-node graph with only `a → b → a` (both nodes plain `type:'action'`, no `type:'start'` /
   `type:'end'` anywhere, and every node has both an incoming and an outgoing edge so no node
   qualifies as an inferred start or end). Call `detectPaths(graph)`.
   **expected:** `result.endNodeIds` is empty (`[]`); `result.paths` still has exactly length 1 (the
   neutral all-nodes fallback) — NOT an empty array, NOT a thrown error, NOT a hang.

5. **action — adversarial (dangling edge reference):** Hand-build a graph with two real nodes
   `s` (`type:'start'`) and `e` (`type:'end'`), and TWO edges: one from `s` to a node id `ghost` that
   does NOT exist anywhere in `nodes`, and a second, separate real edge from `s` to `e`. Call
   `detectPaths(graph)`.
   **expected:** the call does not throw and does not crash; `result.paths` contains a route whose
   `nodeIds` joins to exactly `'s,e'` (the real edge is still found and classified); the dangling
   `ghost` reference contributes no path and causes no error.

6. **action — adversarial (deep/pathological depth):** Hand-build a graph with a single long chain
   of 150+ sequential nodes (each pointing only to the next, ending at a `type:'end'` node past node
   100) and call `detectPaths(graph)`.
   **expected:** the call returns (does not hang or stack-overflow); because the chain's true depth
   exceeds MAX_DEPTH=100, the DFS's `depth > MAX_DEPTH` guard trips before reaching the end node, so
   `result.paths` is EITHER empty from the enumeration loop and then filled by the single neutral
   all-nodes fallback (if `nodes.length > 0`), OR — record exactly which of these two shapes was
   observed, since this is the flow's sharpest edge case.

## Assertions

- `detectPaths` MUST NOT throw for any of the inputs above, including the malformed/dangling/cyclic
  ones.
- `detectPaths` MUST NOT return more than 50 entries in `result.paths` under any input (step 3).
- `detectPaths` MUST return at least 1 path for any non-empty `graph.nodes`, even when no true
  start→end route exists (steps 4 and 6).
- `detectPaths` MUST return `{ paths: [], startNodeIds: [], endNodeIds: [] }` (all empty) ONLY when
  `graph.nodes` is itself empty — never for a non-empty graph.
- Path classification MUST follow the documented priority exactly: error (if any error edge AND
  error-count ≥ happy-count) beats warning (if warning-count strictly beats both happy and error)
  beats happy (if any happy edge) beats neutral (default) — re-verify this ordering on the step-1/2
  outputs' `.type` fields, not just their `.length`.

## Report

This module ships no HTTP server and no `manual-results` route to POST to (MANUAL_FLOWS' HTTP
reporting machinery is NOT REQUIRED for this pure-TS library — see
`__specs__/standards-compliance.yaml`). Instead: record PASS/FAIL for each of the 6 steps above as a
line appended under a `## Result Log` heading in this same file (`- step N: PASS|FAIL — <one-line
observed output>`), and paste the same 6 lines back to the requesting session/chat as the report.
If a step fails twice on retry, record it FAIL with a note and STOP — do not loop the step.
