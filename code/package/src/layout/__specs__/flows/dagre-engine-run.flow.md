# dagreEngine.run

## Purpose

The default `iLayoutEngine`, backed by `dagre`, converting its center-anchored coordinates to this package's top-left-anchored convention.

## Paths

See the `paths:` field in the machine spec fenced block below for the full happy / edge-case enumeration.

The default `iLayoutEngine`, backed by the `dagre` dependency. Converts `dagre`'s center-anchored
coordinates into this package's top-left-anchored convention.

```yaml
flow: dagreEngine.run
kind: service-method
source: src/layout/dagreEngine.ts
symbol: dagreEngine
inputs:
  graph: "iFlowGraph — nodes/edges to lay out"
  ctx: "iEngineContext — { direction, nodeWidth, nodeHeight, rankSpacing, nodeSpacing }, already resolved by layout() (defaults applied upstream)"
returns:
  - "Promise<iPositions> — Map<nodeId, {x,y}>; every position is dagre's center-anchored (x,y) shifted to top-left via (x - nodeWidth/2, y - nodeHeight/2)"
throws: []
calls:
  - "new dagre.graphlib.Graph() / g.setGraph({rankdir, nodesep, ranksep}) / g.setDefaultEdgeLabel / g.setNode / g.hasNode / g.setEdge / dagre.layout(g) / g.node(id) — the `dagre` npm dependency"
called_by:
  - "layout() — used whenever options.engine is omitted (the default)"
emits_events: []
side_effects_on_success:
  - "none externally observable — dagre.layout() mutates its own local graphlib.Graph instance `g`, which is created fresh inside run() and never escapes it"
side_effects_on_failure: "none"
transaction: "none"
test: src/layout/dagreEngine.test.ts
spec: src/layout/__specs__/spec.md
ai_agent_action:
  when_to_call: "internal — selected automatically as layout()'s default engine; not called directly by application code"
  when_not_to_call: "when the caller has explicitly opted into a different iLayoutEngine (e.g. elkEngine or a custom one)"
  natural_language_examples:
    - "use the default dagre layout"
  agent_invocation: "internal — not independently callable over HTTP/UI/CLI; invoked by layout() via the iLayoutEngine.run contract"
  confirm_with_user_before: "none — read-only pure computation"
  summarize_to_user_after: "\"Laid out {graph.nodes.length} nodes with dagre.\""
paths:
  happy:
    - "for each of ctx.direction in {TD, BT, LR, RL}, RANKDIR_BY_DIRECTION maps it to dagre's rankdir vocabulary ({TB, BT, LR, RL} respectively) -> every graph node is g.setNode'd with {width, height} -> dagre.layout(g) computes a position for every node -> positions.size === graph.nodes.length, every value has numeric x/y"
  edge_boundary_dangling_edge:
    - "an edge whose from or to id is not a real node in graph.nodes (checked via `!g.hasNode(edge.from) || !g.hasNode(edge.to)`) is skipped with `continue` — it is never passed to g.setEdge — run() still resolves normally, with a position for every real node (the dangling edge does not appear anywhere in dagre's internal graph)"
mermaid: |
  flowchart TD
    A[run(graph, ctx)] --> B[new dagre.graphlib.Graph<br/>setGraph rankdir/nodesep/ranksep]
    B --> C[for each graph.nodes: g.setNode(id, {width,height})]
    C --> D{for each graph.edges}
    D -->|both endpoints exist| E[g.setEdge(from, to)]
    D -->|dangling edge| F[edge_boundary_dangling_edge: skip via continue]
    E --> G[dagre.layout(g)]
    F --> G
    G --> H[for each node: read g.node(id),<br/>shift center-anchored -> top-left]
    H --> I[return iPositions Map]
```
