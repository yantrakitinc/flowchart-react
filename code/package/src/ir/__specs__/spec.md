# `src/ir/` — the renderer-agnostic flow graph intermediate representation

The fenced ```yaml block at the bottom is the machine source of truth — the
loader reads it, and the prose sections above it are for the human/agent reader.

## Concept

`src/ir/` is the port every other layer of `@yantrakit/flowchart-react` depends
on. It defines the single canonical shape of a flow graph (`iFlowGraph`, its
nodes and edges, the closed enumerations of node type / edge type / layout
direction), the runtime type guards that narrow `unknown` input into that
shape, and a byte-identical JSON Schema (draft 2020-12) publishing the same
contract for non-TypeScript / agent tooling. `src/parse/`, `src/paths/`,
`src/layout/`, and `src/react/` all consume this shape and nothing else — it
is pure data-shape + validation, with zero HTTP, zero DB, zero UI of its own.

## Files

1. `types.ts` — SETUP file. Declares the `iNodeType` / `iEdgeType` /
   `iDirection` union types, the `iFlowNode` / `iFlowEdge` / `iFlowGraph`
   interfaces, the `NODE_TYPES` / `EDGE_TYPES` / `DIRECTIONS` stable
   enumeration constants, and the `isNodeType` / `isEdgeType` / `isDirection`
   runtime type guards.
2. `schema.ts` — publishes `FLOW_GRAPH_SCHEMA`, a JSON Schema (draft 2020-12)
   `as const` object describing the `iFlowGraph` wire shape, re-exported from
   the package at `./schema` (`schema/flow-graph.schema.json`) so non-TS
   tooling can validate a graph payload without importing TypeScript.
3. `index.ts` — SETUP file. Barrel re-exporting every public symbol from
   `types.ts` and `schema.ts`; the sole entry point consumed by
   `src/index.ts` and every other `src/` layer.

## Out of scope

- Parsing textual/mermaid-like flowchart syntax into an `iFlowGraph` — see
  `src/parse/`.
- Detecting semantic paths (happy/warning/error) through a graph — see
  `src/paths/`.
- Computing node positions / auto-layout — see `src/layout/`.
- Rendering an `iFlowGraph` to React / React Flow — see `src/react/`.
- Runtime JSON Schema *validation* against `FLOW_GRAPH_SCHEMA` — this module
  only defines and publishes the schema constant; running a validator (ajv or
  similar) against it is a consumer concern, not this folder's.
- Any HTTP route, database access, or UI surface — this is a pure in-memory
  TypeScript type/schema module with no side effects (`sideEffects: false`).

## Machine spec

```yaml
# spec — machine-readable contract for the feature.
# See SPEC_CONTRACT.md for the schema.

feature_name: ir

owns:
  - src/ir/types.ts
  - src/ir/schema.ts
  - src/ir/index.ts

operation:
  name: "Flow graph intermediate representation"
  slug: "(public)"
  description: "Renderer-agnostic flow graph types, enumerations, guards, and JSON Schema consumed by every other layer of the package and re-exported as public package API."

invocation:
  type: internal

chat_agent:
  when_to_call: "never invoked directly — this module has no standalone action; it is the shared type/enum/guard/schema layer other operations (parse, layout, render) import at build/run time"
  when_not_to_call: "always, as a direct chat-agent action — there is no network or UI entry point here; consult the flow docs of the actual operation (e.g. src/parse/__specs__/) instead"
  natural_language_examples:
    - "n/a — not independently agent-invocable"
  confirm_before: "none — read-only, in-memory, pure functions"
  summarize_after_success: "n/a — has no independent success outcome to summarize"
  summarize_after_failure: "n/a — has no independent failure outcome to summarize"

cross_cutting:
  wcag: "n/a — no UI surface; pure type/schema module"
  auth: "n/a — no database access; pure in-memory type definitions"
  mobile: "n/a — no UI surface"
  i18n: "n/a — no user-facing strings; type/enum/schema definitions only"

links:
  flows:
    - ./flows/isNodeType.flow.md
    - ./flows/isEdgeType.flow.md
    - ./flows/isDirection.flow.md
  tests:
    - ../types.test.ts
    - ../schema.test.ts
  manual:
    - ./manual/ir.md
```
