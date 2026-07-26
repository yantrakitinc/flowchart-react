# src/layout — the layout port: maps an IR flow graph to positioned geometry

## Concept

`src/layout/` is the renderer-agnostic layout port of `@yantrakit/flowchart-react`. It takes an
`iFlowGraph` (the IR shape owned by `src/ir/`) and turns it into an `iPositionedGraph` — every node
carrying a computed top-left `x`/`y` and a box `width`/`height`, ready for a renderer to consume. The
port is pluggable: a small `iLayoutEngine` interface (`run(graph, ctx) => Promise<iPositions>`) lets
the caller swap the algorithm without touching `layout()` itself. Two engines ship today — `dagreEngine`
(the default, backed by the `dagre` dependency) and `elkEngine` (opt-in, backed by the optional peer
dependency `elkjs`) — both honoring the same four `iDirection` values (`TD`/`BT`/`LR`/`RL`). This folder
knows nothing about React, `@xyflow/react`, the DOM, HTTP, or a database; it is pure, deterministic
(given a deterministic engine) TypeScript.

## Files

1. `types.ts` (SETUP) — the layout port's vocabulary: `iPositionedNode`, `iRenderEdge`,
   `iPositionedGraph`, `iLayoutOptions`, `iEngineContext`, `iPositions`, `iLayoutEngine`.
2. `layout.ts` — `layout()`, the composition root: resolves `iLayoutOptions` defaults into an
   `iEngineContext`, delegates to the chosen `iLayoutEngine.run()`, then assembles the `iPositionedGraph`
   (applying the `{x:0,y:0}` fallback for any node the engine didn't position, and computing overall
   `width`/`height`).
3. `dagreEngine.ts` — `dagreEngine`, the default `iLayoutEngine`, backed by `dagre`. Converts `dagre`'s
   center-anchored coordinates to this package's top-left-anchored convention.
4. `elkEngine.ts` — `elkEngine` (opt-in `iLayoutEngine`, backed by `elkjs`) and `loadElk()` (the
   dependency-injectable loader that turns a missing `elkjs` install into a clear, actionable error
   instead of a bare module-resolution failure).
5. `index.ts` — the folder's public barrel: re-exports `layout`, `dagreEngine`, `elkEngine`, `loadElk`,
   and every type in `types.ts`.

## Out of scope

- No import of / dependency on `@xyflow/react` or any other renderer — this layer is renderer-agnostic
  by design; rendering (and its accessibility/mobile/i18n obligations) lives in `src/react/`.
- No validation of graph shape. A dangling edge (an `id` in `from`/`to` that isn't a real node) is
  silently skipped by both engines; layout never throws on a malformed graph shape — that is the
  parser/IR layer's concern, not this one's.
- No edge geometry. `iRenderEdge` is a straight passthrough of `iFlowEdge` — this layer computes node
  positions only; edge routing/curve computation is the renderer's job.
- No bundling of `elkjs`. It is declared an optional peer dependency; a caller who never requests
  `{ engine: elkEngine }` never pays its bundle or install cost, and `loadElk()` throws a clear,
  actionable error (naming the exact install command) rather than a bare "module not found" when it's
  missing.
- No caching/memoization of layout results across calls — every `layout()` call recomputes from scratch.
- No HTTP, no database, no UI, no authentication/authorization — pure in-memory graph transform.

## Machine spec

```yaml
feature_name: layout
scope_authority: user
ui_design: not-applicable # invocation.type=internal (default); no UI surface owned by this folder — rendering lives in src/react/

owns:
  - src/layout/types.ts
  - src/layout/layout.ts
  - src/layout/dagreEngine.ts
  - src/layout/elkEngine.ts
  - src/layout/index.ts

operation:
  name: Compute node positions for a flow graph
  slug: "(public)"
  description: Maps an iFlowGraph (+ optional layout options) to positioned geometry via a pluggable layout engine (dagre default, ELK opt-in).
invocation:
  type: internal
  # method/path omitted — not required for type=internal; this is a plain async function
  # consumed as a JS/TS import: `import { layout } from '@yantrakit/flowchart-react'`
chat_agent:
  when_to_call: "when code needs to convert an iFlowGraph into on-screen node coordinates before handing it to a renderer (e.g. the package's own FlowChart component calls this internally before rendering with @xyflow/react)"
  when_not_to_call: "when the graph already carries positions the caller wants to preserve verbatim, or when the ELK engine is being requested in an environment where the optional `elkjs` peer dependency is not, and cannot be, installed"
  natural_language_examples:
    - "lay out this flowchart"
    - "auto-arrange these nodes"
    - "compute x/y positions for my flow graph"
    - "switch the flowchart layout engine to ELK"
  confirm_before: "none — read-only, pure computation, no network/DB access, no side effects"
  summarize_after_success: "\"Computed positions for {graph.nodes.length} nodes using the {engine.name} engine ({width}x{height}).\""
  summarize_after_failure: "\"Layout failed: {error.message}\" (most commonly: the ELK engine was requested but the optional `elkjs` peer dependency isn't installed)"
cross_cutting:
  wcag: "n/a — pure computation layer; produces coordinates only, renders no DOM. Rendering (and its WCAG obligations) lives in src/react/."
  auth: "n/a — no DB access, no principal, no permission check; pure in-memory graph transform, not DB-touching (RULE 0 authorization block does not apply)."
  mobile: "n/a — no UI surface; the consuming renderer owns viewport/responsive concerns."
  i18n: "n/a — no user-facing strings produced by this layer. The one thrown Error message (missing `elkjs`) is a developer-facing library/API error, not end-user UI copy."
links:
  flows:
    - src/layout/__specs__/flows/layout.flow.md
    - src/layout/__specs__/flows/dagre-engine-run.flow.md
    - src/layout/__specs__/flows/elk-engine-run.flow.md
    - src/layout/__specs__/flows/load-elk.flow.md
  tests:
    - src/layout/layout.test.ts
    - src/layout/dagreEngine.test.ts
    - src/layout/elkEngine.test.ts
    - src/layout/elkEngine.no-children.test.ts
    - src/layout/elkEngine.missing-xy.test.ts
  manual:
    - src/layout/__specs__/manual/layout.md
```
