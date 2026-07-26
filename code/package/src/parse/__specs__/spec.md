# src/parse — the Mermaid-like DSL text ⇄ IR compiler

## Concept

`src/parse/` is the boundary between human-authored (or AI-authored) flowchart text and the
library's typed intermediate representation (`iFlowGraph`, defined in `src/ir/types.ts` — owned
by `src/ir/`, not restated here). It exists so a diagram can be authored as a small,
Mermaid-familiar DSL string instead of hand-building the IR object graph, and so an IR graph can
be rendered back to that same text (for display, editing, saving, or round-tripping through an
external tool). Everything downstream of parsing — layout, path/semantics detection, React Flow
rendering — consumes only the IR; this folder's whole job is the two directions of that
conversion:

- `parseFlowchart(text, options?) → iFlowGraph` — compiles DSL text into the IR. Never returns a
  partial graph on malformed input; it throws a typed `FlowchartParseError` carrying the 1-based
  line/column and a human-readable reason instead.
- `serializeFlowchart(graph) → string` — renders an IR graph back into DSL text. Every node and
  edge is emitted with an explicit `:::type` class so that `parseFlowchart(serializeFlowchart(g))`
  is semantically stable across every documented shape/glyph combination. The one exception:
  `iFlowNode.data` (the arbitrary consumer payload) is not expressible in the DSL and is dropped —
  the DSL has no syntax for it.

### Grammar (reverse-engineered from `parseFlowchart.ts`)

```
header     : ('flowchart' | 'graph') DIR              DIR ∈ TD | TB | BT | LR | RL   (TB → TD)
             — required as the first non-blank/non-comment line UNLESS options.direction is set
nodeToken  : id shape? class?
id         : /^[A-Za-z0-9_]+/                          (dashes excluded so "A-->B" tokenizes)
shape      : '[' text ']'      → action
           | '{' text '}'      → decision
           | '([' text '])'    → stadium (resolved to start/end/action by graph position)
class      : ':::' (start|end|action|decision|error|warning|link)   — explicit iNodeType
link       : ('-->' | '-.->' | '==>')  ('|' text '|')?  (':::' edgeClass)?
             glyph → type:  '-.->' → warning, '==>' → error, '-->' → default
             edgeClass ∈ (happy|warning|error|default)  — overrides the glyph-derived type
edgeStmt   : nodeToken (link nodeToken)+                (chains: "A --> B --> C" = 2 edges)
comment    : '%%' to end of line (stripped before parsing; full-line or trailing)
```

Node-type resolution order (highest wins): **explicit `:::class`** → **shape** (`{}`→decision,
`[]`→action, `([])`→undetermined pending position) → **graph position** (a `([])` stadium with no
incoming edge is `start`; with no outgoing edge is `end`; with both is `action`). If nothing in
the whole diagram resolves to `start`, the first non-explicit `action` node with no incoming edge
is promoted to `start` (or, failing that, the very first node, e.g. a same-node cycle with no
edgeless node) — same shape for `end` via no-outgoing-edge action nodes. A later mention of an
already-seen `id` merges in (label/shape always win-latest; an explicit `:::class` on any mention
locks the type permanently, per `upsertNode`).

Edge-type resolution: **explicit `:::edgeClass`** → **glyph**. Every edge gets a synthesized id
(`e0`, `e1`, …) — the DSL has no edge-id syntax.

## Files

1. `parseFlowchart.ts` — `parseFlowchart(text, options?)`; the tokenizer/parser + the two-pass
   node-type resolver (`resolveNodeTypes`). SETUP-adjacent helpers (`stripComment`,
   `tryParseHeader`, `normalizeDirection`, `parseStatement`, `consumeNodeToken`, `consumeLink`,
   `upsertNode`) are private to this file.
2. `serializeFlowchart.ts` — `serializeFlowchart(graph)`; the inverse renderer. Fully table-driven
   (`SHAPE` keyed by `iNodeType`, `GLYPH` keyed by `iEdgeType`) — every enum member of both IR
   types is exhaustively mapped, so no node/edge type is unrenderable BY CONSTRUCTION at the
   TypeScript level.
3. `errors.ts` — `FlowchartParseError`, the single typed failure port both directions can surface
   (serialize never throws it — see "Out of scope").
4. `index.ts` — SETUP: the barrel re-exporting `parseFlowchart`, `iParseOptions`,
   `serializeFlowchart`, `FlowchartParseError` as this folder's public surface.

## Out of scope

- Layout / positioning — this folder emits/consumes only `id`/`label`/`type`/`from`/`to`; no x/y,
  no auto-layout (owned by the layout folder, not this one).
- Rendering — no React, no React Flow nodes/edges (owned by the render folder).
- `iFlowNode.data` round-tripping — the DSL has no syntax for arbitrary node data; `serializeFlowchart`
  silently drops it (documented in its own file header, not re-explained per call site).
- Runtime validation of an `iFlowGraph` handed to `serializeFlowchart` — `SHAPE`/`GLYPH` are
  TypeScript `Record<iNodeType, …>` / `Record<iEdgeType, …>`, exhaustive at the type level ONLY.
  A caller who bypasses the type system (an `as iFlowGraph` cast, or a graph deserialized from
  untrusted JSON against `schema/flow-graph.schema.json` without runtime validation) and supplies
  a `node.type` / `edge.type` outside the declared enum gets a raw, untyped `TypeError` from the
  `SHAPE[node.type]` / `GLYPH[edge.type]` destructure — NOT a `FlowchartParseError`. This is
  documented as real, current behavior (see `flows/serialize-flowchart.flow.yaml`
  `edge_boundary_invalid_node_type` / `edge_boundary_invalid_edge_type`), not fixed here — this
  spec-writer pass does not modify source; the gap is surfaced to the human/verifier to decide
  whether `serializeFlowchart` should defensively validate before rendering.
- `ui_design: not-applicable` — this feature has no UI/route surface; it is a plain library export
  consumed via import, not rendered or navigated to.
