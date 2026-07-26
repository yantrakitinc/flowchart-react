# elkEngine.run

## Purpose

The opt-in `iLayoutEngine` backed by the optional `elkjs` peer dependency.

## Paths

See the `paths:` field in the machine spec fenced block below for the full happy / edge-case enumeration.

The opt-in `iLayoutEngine`, backed by the optional peer dependency `elkjs`. Additional edge-case
coverage for this flow lives in two supplementary test files beyond the primary suite named below:
`src/layout/elkEngine.no-children.test.ts` and `src/layout/elkEngine.missing-xy.test.ts` (both mock
the `elkjs` module shape to exercise ELK response fallbacks that the real package doesn't naturally
produce in a passing run).

```yaml
flow: elkEngine.run
kind: service-method
source: src/layout/elkEngine.ts
symbol: elkEngine
inputs:
  graph: "iFlowGraph — nodes/edges to lay out"
  ctx: "iEngineContext — { direction, nodeWidth, nodeHeight, rankSpacing, nodeSpacing }, already resolved by layout()"
returns:
  - "Promise<iPositions> — Map<nodeId, {x,y}> built from elkjs's result.children, each child's x/y defaulted to 0 when elkjs's response omits them"
throws:
  - "Error — propagated unchanged from loadElk() when the optional peer dependency elkjs cannot be imported (message matches /optional peer dependency \"elkjs\"/)"
calls:
  - "loadElk() — called with no importer override, so it always performs the real dynamic import of elkjs"
  - "elk.layout(elkGraph) — the elkjs instance's layered-algorithm layout call"
called_by:
  - "layout() — used only when the caller explicitly opts in via { engine: elkEngine }"
emits_events: []
side_effects_on_success:
  - "none"
side_effects_on_failure: "none — no partial state; a rejection (from loadElk() or from elk.layout()) propagates before any position is added to the result"
transaction: "none"
test: src/layout/elkEngine.test.ts
spec: src/layout/__specs__/spec.md
ai_agent_action:
  when_to_call: "when the caller has explicitly opted into `{ engine: elkEngine }` and confirmed the optional elkjs peer dependency is installed"
  when_not_to_call: "when elkjs is not installed and cannot be installed in the target environment — use the default dagreEngine instead"
  natural_language_examples:
    - "use the ELK layout engine instead of dagre"
  agent_invocation: "internal — not independently callable over HTTP/UI/CLI; invoked by layout() via the iLayoutEngine.run contract"
  confirm_with_user_before: "none — read-only pure computation, but failure requires elkjs to be installed as a prerequisite"
  summarize_to_user_after: "\"Laid out {graph.nodes.length} nodes with elk.\""
  summarize_to_user_after_failure: "\"ELK layout failed: elkjs is not installed. Run `pnpm add elkjs`.\""
paths:
  happy:
    - "for each of ctx.direction in {TD, BT, LR, RL}, ELK_DIRECTION_BY_DIRECTION maps it to elkjs's direction vocabulary ({DOWN, UP, RIGHT, LEFT} respectively) -> elkGraph.children built from graph.nodes with {width,height} -> elk.layout(elkGraph) resolves -> positions.size === graph.nodes.length, every value has numeric x/y"
  error_missing_elkjs:
    - "loadElk() (called with the real, non-injectable importer) has its underlying dynamic import rejected (elkjs not installed) -> loadElk() throws its wrapped, actionable Error -> run() has no try/catch around the `await loadElk()` call -> the same Error propagates to run()'s caller (layout()), then to the application"
  edge_boundary_dangling_edge:
    - "an edge whose from or to id is not in graph.nodes (checked via a Set built from graph.nodes' ids) is filtered out of elkGraph.edges before elk.layout() is ever called — elkjs never sees the dangling edge"
  edge_boundary_missing_children_key:
    - "elkjs's layout() result omits the `children` key entirely (e.g. a malformed/mocked response) -> `result.children ?? []` prevents an iteration crash -> positions Map resolves empty rather than throwing (covered by src/layout/elkEngine.no-children.test.ts)"
  edge_boundary_missing_xy:
    - "elkjs's layout() result includes a child entry (matching a real node id) that carries no x and/or no y -> each missing coordinate defaults to 0 via `child.x ?? 0` / `child.y ?? 0` (covered by src/layout/elkEngine.missing-xy.test.ts)"
mermaid: |
  flowchart TD
    A[run(graph, ctx)] --> B{loadElk()}
    B -->|rejects| C[error_missing_elkjs: propagate wrapped Error]
    B -->|resolves elk instance| D[build elkGraph:<br/>direction via ELK_DIRECTION_BY_DIRECTION,<br/>children from graph.nodes,<br/>edges filtered by nodeIds.has]
    D --> E[elk.layout(elkGraph)]
    E --> F[result.children ?? [] --edge_boundary_missing_children_key-->]
    F --> G[for each child: x ?? 0, y ?? 0 --edge_boundary_missing_xy-->]
    G --> H[return iPositions Map]
```
