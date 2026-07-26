# serialize-flowchart

## Target

local — published npm library, no HTTP/UI surface. Drive it via a scratch Node.js/TS module
executed in the repo (`code/package/`) with `npx tsx <scratch-file>.ts`, importing directly from
source: `import { parseFlowchart, serializeFlowchart } from './src/parse'`. Do NOT open a browser
and do NOT start a server — none exists for this surface.

## Preconditions

- Repo cloned at `code/package/`, `pnpm install` has been run (node_modules present).
- Node.js >= 18 available on PATH.
- No build required — import directly from `./src/parse/index.ts` via `tsx`.

## Steps

1. **action**: parse a sample, then serialize it back:
   ```
   const src = 'flowchart TD\n  s([Start]) --> check{OK?}\n  check -->|yes| ship[Ship]\n  check ==>|no| fail[Fail]:::error\n  ship --> done([Done])\n  fail -.-> done';
   const out = serializeFlowchart(parseFlowchart(src));
   ```
   **expected**: `out` is a string starting with `flowchart TD`; re-parsing it
   (`parseFlowchart(out)`) yields the SAME node count/types/labels and edge count/types/labels as
   `parseFlowchart(src)` (ignoring synthesized edge ids, which are not stable across
   parse/serialize/parse).
2. **action** (ADVERSARIAL — data payload injection then round-trip): parse a minimal graph, then
   directly mutate the returned graph object to add `nodes[0].data = { secret: 'should-not-survive' }`
   before serializing: `serializeFlowchart(graph)`.
   **expected**: the output DSL text contains NO trace of `secret` or `should-not-survive` anywhere
   in the string — `data` MUST be silently dropped, not partially leaked (e.g. via a comment or an
   extra token).
3. **action** (ADVERSARIAL — empty graph): construct `{ id: 'x', name: 'X', direction: 'LR', nodes: [], edges: [] }`
   by hand (bypassing `parseFlowchart` entirely) and call `serializeFlowchart(g)`.
   **expected**: returns exactly the single line `flowchart LR` (no trailing blank lines, no
   thrown error) — confirms the function tolerates a graph with zero content.
4. **action** (ADVERSARIAL — every documented node type + edge type in one graph): parse
   ```
   flowchart LR
     a([A]) -->|go| b{B}
     b --> c[C]:::warning
     c --> d([D])
   ```
   then serialize and re-parse; compare `nodes` deep-equal between the original parse and the
   round-tripped parse.
   **expected**: deep-equal `true` — every node's `id`/`label`/`type` survives exactly, including
   the explicit `:::warning` override on `c` and the position-resolved `start`/`end` on `a`/`d`.
5. **action** (ADVERSARIAL — malformed IR bypassing the type system): construct, by hand,
   `{ id:'x', name:'X', direction:'TD', nodes: [{ id:'z', label:'Z', type: 'not_a_real_type' as any }], edges: [] }`
   and call `serializeFlowchart(g)`.
   **expected** (documents a REAL, currently-unpatched gap — see
   `flows/serialize-flowchart.flow.yaml` `edge_boundary_invalid_node_type`): this throws a raw,
   untyped `TypeError` (NOT a `FlowchartParseError`) because `SHAPE['not_a_real_type']` is
   `undefined` and the destructure fails. Record this as the DOCUMENTED behavior, not a new bug to
   report — confirm it still matches this description; if `serializeFlowchart` instead throws a
   typed `FlowchartParseError` or silently succeeds, the spec is now STALE against the code and
   that mismatch (not the TypeError itself) is what to flag as a FAIL.

If a step fails twice, record the flow FAIL with a note and STOP — do not loop the step.

## Assertions

- MUST: `parseFlowchart(serializeFlowchart(parseFlowchart(text)))` is semantically stable
  (direction, node id/label/type, edge from/to/type/label) for every shape (`[]`/`{}`/`([])`) and
  every glyph (`-->`/`-.->`/`==>`) and every explicit `:::class` override.
- MUST NOT: any `iFlowNode.data` payload appears anywhere in the serialized output string.
- MUST: an empty graph (`nodes: []`, `edges: []`) serializes to just the header line, no thrown
  error.
- MUST NOT (documented gap, not to be "fixed" by this flow): a `node.type`/`edge.type` value
  outside the declared `iNodeType`/`iEdgeType` enum is silently coerced to a valid shape/glyph —
  today it throws an untyped `TypeError`; a future change that makes it succeed silently with a
  wrong/default shape would be worse and MUST be flagged.

## Report

POST the results to `/api/v1/manual-results/serialize-flowchart` in the shape
`{ flow: "serialize-flowchart", ok: true|false, steps: [...], notes: "..." }`, AND also print the
full results to the console/output. NOTE: this repo is a published npm package with no running
server — it does NOT currently expose a `/api/v1/manual-results/<flow>` route (that surface is a
web-app concept). Until/unless one is added to this repo, PRINT the results only (the `ok` boolean
per MANUAL_FLOWS#browser_agent_rules.machine_result still applies to the printed report) and note
in the report that no POST route exists for this repo.
