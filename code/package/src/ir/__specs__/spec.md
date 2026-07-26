# src/ir — the flowchart intermediate representation

## Concept

`src/ir` is the single source of truth every other layer of `@yantrakit/flowchart-react`
depends on: pure data types, no React, no positions, no rendering concerns. `types.ts` declares
the three closed-set literal unions the whole package classifies things by — `iNodeType`
(`start | end | action | decision | error | warning | link`), `iEdgeType` (`happy | warning |
error | default`), `iDirection` (`TD | BT | LR | RL`) — each backed by a runtime `readonly [...]
as const` array (`NODE_TYPES`, `EDGE_TYPES`, `DIRECTIONS`) and a matching type-narrowing guard
(`isNodeType`, `isEdgeType`, `isDirection`). It also declares the three shapes that compose a
diagram — `iFlowNode`, `iFlowEdge`, `iFlowGraph` — the object every parser output, layout engine
input/output, path-detection input, and React renderer prop ultimately is or carries.

`schema.ts` publishes the same `iFlowGraph` contract as a JSON Schema (draft 2020-12,
`FLOW_GRAPH_SCHEMA`), mirrored byte-for-byte to `schema/flow-graph.schema.json` at the package
root, so a non-TypeScript agent or tool can validate a graph payload without importing this
package's types at all. `schema.test.ts` is the drift guard: it asserts the exported constant and
the published JSON file are identical, and that the schema's five required top-level fields match
`iFlowGraph`'s own required shape.

`ui_design: not-applicable` — `invocation.type: internal`; this module renders no UI and exposes
no HTTP/CLI/UI surface of its own. It is a pure-TS module consumed in-process by `src/parse/`
(narrows parsed Mermaid class tokens via `isNodeType`/`isEdgeType`), `src/layout/`, `src/paths/`,
and `src/react/` (all of which type their own inputs/outputs against `iFlowGraph` and friends).

## Files

1. `types.ts` — the module. Exports the three literal unions (`iNodeType`, `iEdgeType`,
   `iDirection`), their runtime constant arrays (`NODE_TYPES`, `EDGE_TYPES`, `DIRECTIONS`), the
   three graph-shape interfaces (`iFlowNode`, `iFlowEdge`, `iFlowGraph`), and the three narrowing
   guards (`isNodeType`, `isEdgeType`, `isDirection`).
2. `schema.ts` — publishes `FLOW_GRAPH_SCHEMA`, the JSON Schema (draft 2020-12) mirror of
   `iFlowGraph`, kept in lock-step with `types.ts` and with `schema/flow-graph.schema.json`.
3. `index.ts` — barrel: re-exports every type, constant, guard, and `FLOW_GRAPH_SCHEMA` from
   `types.ts` / `schema.ts`. No behavior of its own.
4. `types.test.ts` (SETUP/behavior test file) — Vitest coverage of all three guards: every legal
   member returns `true`; an unrecognized string, a non-string, and (for `isDirection`) an empty
   string all return `false`.
5. `schema.test.ts` (SETUP/behavior test file) — asserts `FLOW_GRAPH_SCHEMA` matches
   `schema/flow-graph.schema.json` exactly (no drift) and that its five required fields
   (`id, name, direction, nodes, edges`) match `iFlowGraph`.

## Out of scope

- Does not parse Mermaid text into an `iFlowGraph` — that is `src/parse/parseFlowchart.ts`, which
  consumes `isNodeType` / `isEdgeType` from this module to narrow parsed class tokens.
- Does not lay out or position nodes — that is `src/layout/`.
- Does not enumerate or classify start→end routes — that is `src/paths/`.
- Does not render anything — `src/react/` owns presentation.
- Does not validate a whole graph's cross-field structural well-formedness beyond the JSON Schema
  itself (e.g. a dangling edge whose `from`/`to` references a missing node id is not flagged by
  `FLOW_GRAPH_SCHEMA`, which only shapes-checks each node/edge in isolation) — any such semantic
  validation belongs to the consuming layer, not to this schema.
- The two test files live flat at `src/ir/types.test.ts` / `src/ir/schema.test.ts`, not under a
  `__tests__/` subfolder — documented as-is (legacy backfill mode; this spec reproduces the
  shipped source, it does not restructure it).
- `manual/<flow>.md` is adapted for a pure-TS library with no running HTTP/UI app: there is no
  `manual-results` POST route to report to (MANUAL_FLOWS' HTTP-surface machinery is
  `NOT REQUIRED` here — see `standards-compliance.yaml`); each playbook instead has the agent run
  a short Node/tsx script against the built package and record PASS/FAIL inline.
- `schema/flow-graph.schema.json` (the mirrored JSON file at the package root) is not owned by
  this feature — it is a generated artifact this feature's `schema.test.ts` drift-guards, not a
  file this spec's coder phase would edit.
