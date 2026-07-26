# `code/package/src/layout` — the IR-to-geometry layout port

## Concept

This folder maps an `iFlowGraph` (the renderer-neutral intermediate representation
produced by `src/ir` / `src/parse`) to an `iPositionedGraph` — every node given a
top-left `{x,y}` position and a measured width/height, every edge normalized to a
renderer-neutral shape. It is deliberately **renderer-agnostic**: no `@xyflow`
import anywhere in this folder, so the layout math stays pure and unit-testable in
isolation from React Flow. The `src/react` layer is the only place that adapts an
`iPositionedGraph` into React Flow's node/edge props.

Positioning itself is delegated to a **pluggable engine** (the `iLayoutEngine`
strategy interface: `{ name, run(graph, ctx) => Promise<iPositions> }`). Two engines
ship: `dagreEngine` (the default, backed by the `dagre` dependency, always
available) and `elkEngine` (opt-in, backed by the `elkjs` **optional peer
dependency**, dynamically imported so a consumer who never asks for ELK never pays
its bundle cost). Callers may also supply any object shaped like `iLayoutEngine` —
neither `layout()` nor its types care which engine produced the positions.

Both shipped engines honor all four `iDirection` values (`TD`/`BT`/`LR`/`RL`),
translated to each engine's own direction vocabulary (dagre's `rankdir`, ELK's
`elk.direction`), and both silently skip any edge whose `from`/`to` references a
node id absent from `graph.nodes` before handing the graph to the underlying
layout library (neither dagre nor elkjs tolerates a dangling edge reference).
`layout()` itself does NOT filter dangling edges out of its own returned `edges`
array — it passes every `graph.edge` straight through to `iRenderEdge`, dangling or
not; only the two engines' internal graph-building step filters them, and only to
keep the underlying layout library from erroring.

## Files

1. `types.ts` — SETUP file. Every type this folder owns: `iPositionedNode`,
   `iRenderEdge`, `iPositionedGraph`, `iLayoutOptions`, `iEngineContext`,
   `iPositions`, `iLayoutEngine`. No runtime code (excluded from coverage as
   type-only).
2. `layout.ts` — the composition root. Resolves the engine (default `dagreEngine`)
   and the tuning defaults (`nodeWidth: 180, nodeHeight: 64, rankSpacing: 80,
   nodeSpacing: 48`), awaits `engine.run(graph, ctx)`, and maps the IR's nodes/edges
   into the positioned shapes the caller gets back.
3. `dagreEngine.ts` — the default `iLayoutEngine`, backed by the `dagre` npm
   package. dagre is synchronous under the hood; `run()` wraps it in a resolved
   promise. dagre reports node **centers**; this engine converts to **top-left**
   coordinates before returning.
4. `elkEngine.ts` — the opt-in `iLayoutEngine`, backed by `elkjs`. Exports
   `loadElk()` (a small helper that dynamically imports `elkjs/lib/elk.bundled.js`,
   accepting an injectable `importer` for testing, and throwing a clear
   actionable error when the optional peer dependency isn't installed) separately
   from `elkEngine` itself so the import-failure behavior is independently testable.
5. `index.ts` — SETUP file. Public barrel: re-exports `layout`, `dagreEngine`,
   `elkEngine`, and every type from `types.ts`.

## Out of scope

- Parsing/authoring the IR graph itself (node/edge validation, direction parsing)
  — that is `src/ir` + `src/parse`.
- Adapting an `iPositionedGraph` into actual React Flow nodes/edges/components —
  that is `src/react`.
- Semantic path detection (happy/warning/error path coloring) — that is
  `src/paths`.
- Choosing which engine to use by default for a given consumer, or exposing engine
  choice as a UI control — this folder only supplies the strategy interface + the
  two built-in implementations; any such UI decision lives in a consuming app.
- Bundling or vendoring `elkjs` — it stays an optional peer dependency; a consumer
  who never passes `engine: elkEngine` never needs it installed.
