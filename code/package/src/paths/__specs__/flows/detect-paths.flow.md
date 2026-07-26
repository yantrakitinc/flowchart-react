# detectPaths

## Purpose

Enumerates every distinct start->end route through an in-memory `iFlowGraph` via depth-first search and
classifies each route's overall mood (happy / warning / error / neutral) from the semantic type of the
edges it traverses.

## Paths

See the `paths:` field in the machine spec fenced block below for the full happy / edge-case enumeration.

```yaml
flow: detectPaths
kind: helper
source: src/paths/detectPaths.ts
symbol: detectPaths
inputs:
  graph: "iFlowGraph — nodes + edges (+ id/name/direction, unused by this function)"
returns:
  - "{ paths: [], startNodeIds: [], endNodeIds: [] } — when graph.nodes is empty"
  - "{ paths: iFlowPath[] (1..MAX_PATHS), startNodeIds: string[], endNodeIds: string[] } — one entry per DFS route that reached an end node"
  - "{ paths: [oneNeutralPathOverAllNodes], startNodeIds, endNodeIds } — fallback when no DFS route reaches any end node but the graph has nodes"
throws: []
calls:
  - "classifyPath (internal helper, same file — classifies a route's edge type ids)"
called_by:
  - "src/react/usePaths.ts (usePaths hook, via useMemo)"
emits_events: []
side_effects_on_success:
  - "none"
side_effects_on_failure: "none — detectPaths has no failure return shape and never throws"
transaction: "none"
test: src/paths/detectPaths.test.ts
spec: src/paths/__specs__/spec.md
ai_agent_action:
  when_to_call: >-
    when a caller needs the set of semantic start->end routes through an in-memory flow graph before rendering,
    summarizing, or driving playback over it
  when_not_to_call: >-
    when the graph has not been parsed/validated yet (detectPaths trusts its input shape as-is), or when the
    caller needs to mutate/persist the graph
  natural_language_examples:
    - "show me the happy path through this flowchart"
    - "which routes in this diagram end in an error"
    - "how many distinct paths does this flow have"
  agent_invocation: "internal — not callable over HTTP/CLI/UI; a library function imported by consumers (e.g. src/react/usePaths.ts)"
  confirm_with_user_before: "none — read-only, pure, synchronous computation"
  summarize_to_user_after: "\"detected N path(s): H happy, W warning, E error, R neutral\""
paths:
  happy:
    - "graph has an explicit `type: 'start'` node and an explicit `type: 'end'` node, joined by one `happy`-typed edge"
    - "startNodeIds resolves to the start node; endNodeIds resolves to the end node"
    - "DFS walks start -> end, recording nodeIds [start, end] and edgeIds [the one edge]"
    - "classifyPath counts 1 happy edge, 0 warning, 0 error -> type: 'happy'"
    - "returns { paths: [onePathOfTypeHappy], startNodeIds: [start], endNodeIds: [end] }"
  edge_boundary_empty_graph:
    - "graph.nodes is [] (edges irrelevant)"
    - "detectPaths short-circuits before building any lookup maps"
    - "returns { paths: [], startNodeIds: [], endNodeIds: [] } — no fallback path is fabricated for a truly empty graph"
  edge_boundary_no_explicit_start_end:
    - "no node carries `type: 'start'` or `type: 'end'` — start/end resolution falls back through two tiers"
    - "tier 1: nodes with no incoming edge become startNodeIds; nodes with no outgoing edge become endNodeIds (covers a simple A->B chain of `type: 'action'` nodes)"
    - "tier 2: when every node has both an incoming AND an outgoing edge (e.g. a 2-node cycle A<->B), tier 1 yields no candidates, so both startNodeIds and endNodeIds fall back to `[nodes[0].id]`"
    - "DFS then runs from that first node and immediately satisfies endSet, producing one path whose nodeIds is just that single node"
  edge_boundary_no_route:
    - "graph has an explicit start node and an explicit end node but zero edges connecting them (or any edges at all)"
    - "DFS from every start node explores zero outgoing edges and never reaches endSet; paths stays []"
    - "after the start-node loop, paths.length === 0 triggers the neutral fallback: one path with type 'neutral', nodeIds = every node in the graph in original order, edgeIds = every edge in the graph (here, [])"
  edge_boundary_dangling_edge:
    - "graph has a single `type: 'start'` node 'a' and one edge from 'a' to a node id ('ghost') that does not appear in graph.nodes"
    - "hasOutgoing includes 'a' (it has an outgoing edge), so the no-outgoing-node end-fallback finds no candidate among the real nodes; endNodeIds falls back to `[nodes[0].id]` = ['a']"
    - "DFS starts at 'a', immediately finds 'a' in endSet, and records a path with nodeIds: ['a'], edgeIds: [] — the dangling edge is never traversed (dfs only follows outgoingByNode, and 'a' already satisfied endSet before any edge is walked) and the search never crashes looking up a node that does not exist"
    - "classifyPath over an empty edgeIds list -> type: 'neutral'"
  edge_boundary_branch_cap:
    - "a 'diamond stack' graph where each of 8 layers doubles the outgoing branch count (2^8 = 256 possible start->end routes)"
    - "the DFS records routes as it finds them; once paths.length reaches MAX_PATHS (50) the recursion returns immediately (checked both at DFS entry and before iterating each outgoing edge)"
    - "result.paths.length is exactly 50, never 256 and never more than 50"
    - "when a graph has MULTIPLE start nodes and the first start node alone already explodes past MAX_PATHS, the start-node loop's own `if (paths.length >= MAX_PATHS) break;` guard stops before ever calling dfs() on the second start node — nodes reachable ONLY from that second start node never appear in any recorded path"
  edge_boundary_depth_cap:
    - "a single linear chain of 105 nodes (start -> ... -> end, one edge between each consecutive pair)"
    - "DFS recurses one level per node; the guard `if (paths.length >= MAX_PATHS || nodeIds.length > MAX_DEPTH) return;` (MAX_DEPTH = 100) aborts the recursion once the in-progress route already holds more than 100 node ids, before it can ever reach the 105th node's end type"
    - "no route is ever recorded via DFS, so paths.length === 0 after the start-node loop triggers the neutral fallback: one path over all 105 nodes"
  edge_boundary_classification_thresholds:
    - "classifyPath tallies happy/warning/error counts across a route's edgeIds, then applies four ordered rules:"
    - "1) error >= 1 AND error >= happy -> 'error' (error count ties or beats happy count; an error-heavy or error-tied route is never reported as anything softer)"
    - "2) else warning > happy AND warning > error -> 'warning' (warning must strictly exceed BOTH other counts, not just one)"
    - "3) else happy >= 1 -> 'happy'"
    - "4) else -> 'neutral' (covers routes with zero happy/warning/error edges, e.g. only `type: 'default'` edges, or zero edges at all)"
    - "verified against: 1 happy edge only -> happy; 1 default edge only -> neutral; 1 happy + 1 error (error >= happy tie) -> error; 2 warning + 1 happy (warning > both) -> warning"
mermaid: |
  flowchart TD
    A[detectPaths called] --> B{nodes.length === 0?}
    B -- yes --> C[return empty result]
    B -- no --> D[build edgeById / outgoingByNode / hasIncoming / hasOutgoing]
    D --> E[resolve startNodeIds: type start -> no-incoming -> first node]
    E --> F[resolve endNodeIds: type end -> no-outgoing -> first node]
    F --> G[DFS from every start node, guarded by MAX_PATHS + MAX_DEPTH]
    G --> H{node in endSet?}
    H -- yes --> I[record path; classifyPath over traversed edges]
    H -- no --> J[recurse into unvisited outgoing edges]
    J --> H
    I --> K{any paths recorded?}
    G --> K
    K -- no --> L[fallback: one neutral path over all nodes]
    K -- yes --> M[return paths + startNodeIds + endNodeIds]
    L --> M
```

## Notes

`detectPaths` never throws and has no error/authority/concurrency surface (no I/O, no shared state, no writes),
so `error_*`, `edge_concurrent_*`, `edge_partial_state_*`, and `edge_authority_*` paths do not apply — every
applicable risk class for a pure, synchronous, read-only function is covered by `happy` + the seven
`edge_boundary_*` scenarios above, each exercised by an existing test in `detectPaths.test.ts`.
