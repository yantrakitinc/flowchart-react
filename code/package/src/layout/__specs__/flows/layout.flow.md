# layout

## Purpose

The layout composition root: resolves `iLayoutOptions` defaults and delegates to the chosen `iLayoutEngine`.

## Paths

See the `paths:` field in the machine spec fenced block below for the full happy / edge-case enumeration.

The composition-root entry point of the layout port: resolves defaults, delegates to the chosen
`iLayoutEngine`, and assembles the final `iPositionedGraph`.

```yaml
flow: layout
kind: composition-root
source: src/layout/layout.ts
symbol: layout
inputs:
  graph: "iFlowGraph — the renderer-agnostic flow graph to lay out"
  options: "iLayoutOptions (optional, default {}) — { engine?, nodeWidth?, nodeHeight?, rankSpacing?, nodeSpacing? }; every field defaults when omitted (engine: dagreEngine, nodeWidth: 180, nodeHeight: 64, rankSpacing: 80, nodeSpacing: 48)"
returns:
  - "Promise<iPositionedGraph> — { nodes: iPositionedNode[] (each source iFlowNode plus x/y/width/height), edges: iRenderEdge[] (graph.edges, unchanged), direction: graph.direction, width: max(node.x+node.width) across nodes (0 if none), height: max(node.y+node.height) across nodes (0 if none) }"
throws: []
calls:
  - "options.engine.run(graph, ctx) — defaults to dagreEngine.run when options.engine is omitted"
called_by:
  - "consuming application/component code that imports the public package export (e.g. a React component would call this before rendering with @xyflow/react)"
emits_events: []
side_effects_on_success:
  - "none"
side_effects_on_failure: "none — layout() does not catch or wrap an engine rejection; whatever options.engine.run() rejects with propagates to the caller unchanged"
transaction: "none"
test: src/layout/layout.test.ts
spec: src/layout/__specs__/spec.md
ai_agent_action:
  when_to_call: "when the caller has an iFlowGraph and needs node positions before rendering"
  when_not_to_call: "when the graph already carries the positions the caller wants preserved"
  natural_language_examples:
    - "lay out this flow graph"
    - "compute positions for my flowchart"
  agent_invocation: "internal — not callable over HTTP/UI/CLI; imported and awaited directly: `await layout(graph, options)`"
  confirm_with_user_before: "none — read-only pure computation"
  summarize_to_user_after: "\"Computed positions for {graph.nodes.length} nodes using the {engine.name} engine.\""
paths:
  happy:
    - "call layout(graph) with no options -> engine defaults to dagreEngine, sizing defaults to 180x64/80/48 -> resolves an iPositionedGraph where every node has a numeric x/y and width=180/height=64"
    - "call layout(graph, { nodeWidth, nodeHeight, rankSpacing, nodeSpacing }) -> the overrides flow into the iEngineContext handed to the engine AND into every returned node's width/height"
    - "call layout(graph, { engine: customEngine }) -> the injected engine's resolved Map is used verbatim to place each node (no dagre/elk involved)"
  error_engine_rejects:
    - "caller passes { engine: elkEngine } in an environment where the optional peer dependency elkjs cannot be imported -> elkEngine.run() rejects (via loadElk()'s thrown Error) -> layout() has no try/catch around the engine.run() call -> the promise layout() returns rejects with that same Error (message matches /optional peer dependency \"elkjs\"/) — terminal: the caller's own catch/await surfaces this actionable message; no partial iPositionedGraph is ever returned"
  edge_boundary_missing_engine_position:
    - "engine.run() resolves a Map that omits a position for one or more of graph.nodes' ids (e.g. a custom or buggy engine) -> layout() defaults that node's position to { x: 0, y: 0 } via `positions.get(node.id) ?? { x: 0, y: 0 }` — every node is still present in the output, never dropped"
  edge_boundary_empty_graph:
    - "graph.nodes = [] -> engine.run() resolves with an empty (or irrelevant) Map -> layout() returns nodes: [], and the width/height reduce starts from accumulator 0 with zero iterations, yielding width: 0, height: 0 — no throw on an empty graph"
mermaid: |
  flowchart TD
    A[layout(graph, options)] --> B[resolve engine + nodeWidth/nodeHeight/rankSpacing/nodeSpacing defaults]
    B --> C[ctx = iEngineContext]
    C --> D{engine.run(graph, ctx)}
    D -->|resolves Map| E[map graph.nodes -> iPositionedNode<br/>pos = positions.get(id) ?? {x:0,y:0}]
    E --> F[compute width = max(x+width)<br/>height = max(y+height)]
    F --> G[return iPositionedGraph]
    D -->|rejects| H[error_engine_rejects: promise rejects unchanged]
```
