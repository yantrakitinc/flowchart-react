# serialize-flowchart

## Target
local — a Node.js script/REPL importing the built library (`import { serializeFlowchart, parseFlowchart } from
'@yantrakit/flowchart-react'`, or from the package's `dist/` build, or via `pnpm exec tsx` against `src/index.ts`
inside this repo). There is NO HTTP endpoint and NO browser page for this feature — `src/parse/` is a pure-TS
text-to-object compiler shipped as an npm library, not a web app. This is the sanctioned adaptation of the
MANUAL_FLOWS browser-agent channel for a pure-computation library surface (see spec.md `cross_cutting.wcag` /
`cross_cutting.mobile`, both declared "n/a — no UI surface in this folder").

## Preconditions
Node.js >= 18. Either:
- inside this repo: `pnpm install` then run each step below via a scratch script executed with
  `pnpm exec tsx <scratch-file>.ts`; or
- outside this repo: `npm install @yantrakit/flowchart-react` in a scratch project and `import` from it.

No auth, no seed data, no running server, no network access required for any step. Every step constructs its own
`iFlowGraph` object literal by hand — no fixture files are referenced.

## Steps
If a step fails twice, record the flow FAIL with a note and STOP — do not loop the step.

1. **action:** Call `serializeFlowchart({ id: 'g', name: 'G', direction: 'TD', nodes: [], edges: [] })` — the
   empty-graph boundary.
   **expected:** Returns exactly the single-line string `'flowchart TD'` — no node lines, no edge lines, no
   trailing newline.

2. **action:** Call `serializeFlowchart(...)` with one `action`-type node whose label is `'a]b'` (a label containing
   this DSL's own bracket-closing character) — an adversarial label designed to break re-parsing.
   **expected:** The emitted node line is `A[a]b]:::action` — `serializeFlowchart` does NOT escape or reject labels
   containing shape-delimiter characters.

3. **action:** Call `parseFlowchart(serializeFlowchart(graphFromStep2))` — actually observe the consequence of step
   2's adversarial label by round-tripping it.
   **expected:** The re-parsed node's label is `'a'`, NOT `'a]b'` — `parseShape`'s `indexOf(']', ...)` stops at the
   FIRST `]`, silently truncating the label. No error is thrown; the desync is silent. This is a confirmed, real
   limitation (not hypothetical): labels containing `]`, `}`, or `)` are NOT safe to round-trip through
   serialize+parse.

4. **action:** Call `serializeFlowchart(...)` with one node carrying `data: { secret: 'do-not-leak' }` in addition
   to its normal `id`/`label`/`type` fields.
   **expected:** Neither the substring `'do-not-leak'` nor the substring `'secret'` appears anywhere in the
   returned string — `node.data` is never read by `serializeFlowchart`.

5. **action:** Call `serializeFlowchart(...)` with one edge whose `from`/`to` reference node ids that do NOT appear
   anywhere in `graph.nodes` (a dangling edge reference) — an adversarial input probing for a referential-integrity
   check that does not exist.
   **expected:** No error is thrown; the edge line is emitted verbatim using the given (dangling) ids. (Re-parsing
   this output will silently create fresh bare-id `'action'`-typed nodes for the dangling ids on the next
   `parseFlowchart` call, since an id mentioned only via an edge gets an implicit draft — this is a real
   asymmetry between what `serializeFlowchart` accepts and what a subsequent `parseFlowchart` reconstructs.)

6. **action:** Call `serializeFlowchart(...)` with one node of type `'error'` and one node of type `'link'` — the
   two `iNodeType` values that have no dedicated `shapeFor` branch.
   **expected:** Both are rendered with the bracket/action shape (`[label]`), suffixed `:::error` / `:::link`
   respectively — confirming the `:::type` suffix (not the bracket shape) is what preserves their true type.

7. **action:** Call `serializeFlowchart(...)` with one edge whose `label` is the empty string `''` (not `undefined`).
   **expected:** Because the check is `edge.label !== undefined` (a strict-undefined check, not a falsy check), the
   emitted line still contains an empty `|` `|` pair with nothing between them (e.g. `A -->||:::default B`) —
   confirms an empty-string label is treated as "has a label", distinct from "no label" (`undefined`).

8. **action:** Call `serializeFlowchart(...)` with 500 nodes and 500 edges (generate them in a loop) to probe for
   pathological slowdown at scale.
   **expected:** Returns synchronously in well under a second — the implementation is two flat loops with no
   nested per-node/per-edge scan.

## Assertions
MUST hold, every step:
- Every call returns a string synchronously; `serializeFlowchart` never throws (its declared `throws` list is
  empty).
- Every node line ends with an explicit `:::<type>` suffix; every edge line's glyph segment ends with an explicit
  `:::<type>` suffix before the target node id.
- `node.data`, however large or sensitive, never appears in the output.

MUST NOT happen:
- `serializeFlowchart` must NEVER validate/reject a structurally-odd-but-typed input (dangling edge refs, unusual
  labels) — the adversarial steps above confirm it does not, and that absence-of-validation is the documented
  contract, not a bug to "fix" in this backfill.
- A round trip through `serializeFlowchart` + `parseFlowchart` must NEVER silently succeed with different structure
  for labels that do NOT contain a shape-delimiter character — the label-corruption confirmed in step 3 is scoped
  to labels containing `]`/`}`/`)` only.

## Report
This package ships no HTTP server and no `/api/v1/manual-results/<flow>` route — it is a pure npm library, not a
deployed web app, so there is no local-only results endpoint to POST to. Print the full step-by-step verdict to the
console/chat instead: for each of the 8 steps above, state pass/fail + the observed value, then state one overall
`ok: true` (every step passed) or `ok: false` (name the first failing step).
