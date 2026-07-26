# render-flowchart

## Purpose

Parses/uses a flow IR, lays it out asynchronously, and renders it on React Flow with path selection and movie-mode playback.

## Paths

See the `paths:` field in the machine spec fenced block below for the full happy / edge-case enumeration.

```yaml
flow: FlowChart
kind: composition-root
source: src/react/FlowChart.tsx
symbol: FlowChart
inputs:
  chart: "string? — Mermaid-like flowchart DSL text; parsed first when present"
  graph: "iFlowGraph? — pre-built renderer-agnostic flow graph; used only when `chart` is absent"
  nodeTypes: "iNodeRegistry? — per-type renderer overrides merged over defaultNodeTypes"
  layoutEngine: "iLayoutEngine? — override for the default dagre layout engine"
  direction: "iDirection? — used when parsing `chart` text with no header line"
  activeNodeId: "string? — node id to render as the current active node (ignored while playback is engaged)"
  selectedPathId: "string? — controlled selected-path id; undefined = uncontrolled"
  onPathChange: "((pathId: string | null) => void)? — fired when the highlighted path changes"
  onNodeClick: "((id: string, data: iFlowNodeData) => void)? — fired when a node is clicked"
  showPathDrawer: "boolean — default true"
  pathDrawerPosition: "iDrawerPosition — default 'right'"
  showMiniMap: "boolean — default false"
  showControls: "boolean — default true"
  className: "string — default ''"
  height: "number | string — default 480"
  autoPlay: "boolean — default false"
  playbackSpeedMs: "number — default 1200"
  loop: "boolean — default false"
  showPlaybackControls: "boolean — default true"
  onPlaybackStep: "((nodeId: string, index: number, data: iFlowNodeData) => void)?"
  onPlaybackEnd: "(() => void)?"
returns:
  - "JSX.Element — fc-flowchart error box (role=alert) when parsing failed"
  - "JSX.Element — fc-flowchart container: fc-canvas (loading placeholder | React Flow canvas) + optional PathDrawer + optional PlaybackControls"
throws: []
calls:
  - parseFlowchart (../parse/parseFlowchart)
  - layout (../layout/layout)
  - usePaths (detectPaths internally)
  - usePlayback
  - resolveNodeTypes
  - toReactFlowEdge
called_by:
  - consuming application code (top-level `import { FlowChart } from '@yantrakit/flowchart-react'`)
emits_events: []
side_effects_on_success:
  - "mounts the React Flow canvas"
  - "schedules an async layout effect (re-run whenever `graph` identity changes)"
side_effects_on_failure: "renders the fc-parse-error box in place of the canvas; no layout/render side effects run"
transaction: none
test: src/react/FlowChart.test.tsx
spec: src/react/__specs__/spec.md
ai_agent_action:
  when_to_call: "Caller wants to render a Mermaid-like flowchart or a pre-built flow-graph IR as an interactive diagram."
  when_not_to_call: "Neither `chart` text nor a `graph` IR object is available, or the target graph has no start/end route semantics the caller cares about."
  natural_language_examples:
    - "Show this flowchart"
    - "Render the onboarding flow diagram"
    - "Draw this flow graph object"
  agent_invocation: "React component render: <FlowChart chart={...} /> or <FlowChart graph={...} />"
  confirm_with_user_before: "none — read-only render"
  summarize_to_user_after: "Rendered the flowchart with N nodes across M detected path(s)."
paths:
  happy:
    - "props supply a valid `chart` string -> parseFlowchart succeeds -> graph is set"
    - "layout() resolves asynchronously -> positioned graph set -> canvas replaces the loading placeholder"
    - "usePaths(graph) detects N paths -> PathDrawer renders (when showPathDrawer)"
    - "React Flow renders rfNodes/rfEdges using resolvedNodeTypes (defaults merged with any nodeTypes override)"
    - "user sees the fc-flowchart container (data-testid=\"fc-flowchart\") with a working canvas"
  error_parse_failure:
    - "props supply invalid `chart` text, OR neither `chart` nor `graph` is given"
    - "parseFlowchart throws FlowchartParseError (or FlowChart's own explicit throw for the missing-input case)"
    - "parsed.error is set; `graph` stays null; no layout effect runs"
    - "component renders the fc-flowchart--error box: role=\"alert\", data-testid=\"fc-parse-error\", showing the parser's own message text"
    - "terminal — explanation suffices: the parser's message describes exactly what is wrong with the input; the caller fixes `chart`/`graph` and re-renders (no separate recovery flow exists inside this component)"
  edge_layout_engine_rejects:
    - "graph parses fine; the active layoutEngine's returned promise rejects"
    - "the rejection handler is a deliberate no-op (leaves the canvas in its loading state rather than throwing)"
    - "`positioned` stays null indefinitely -> the fc-loading (\"Laying out…\") placeholder persists"
    - "KNOWN-NOT-VALIDATED: a custom layoutEngine rejecting is a caller-integration bug (the bundled default dagre engine never rejects); leaving the loading state rather than surfacing a second error UI is an accepted tradeoff, not exercised by an automated test"
  edge_boundary_empty_graph:
    - "graph has zero nodes (an empty `chart`, or `graph` prop with `nodes: []`)"
    - "layout resolves with `positioned.nodes = []`"
    - "usePaths/detectPaths returns `paths: []` for a zero-node graph"
    - "rfNodes/rfEdges are both `[]`; React Flow renders an empty canvas; PathDrawer renders nothing (paths.length === 0 short-circuit); no playback controls (playingPath is null)"
  edge_boundary_chart_and_graph_both_supplied:
    - "both `chart` and `graph` props are given simultaneously"
    - "`chart` wins — the `parsed` useMemo checks `typeof chart === 'string'` FIRST; `graph` is only consulted when `chart` is absent"
    - "per the prop's own JSDoc contract: \"parsed first if both given, `graph` used when `chart` is absent\""
  edge_direction_override:
    - "a `direction` prop is supplied alongside `chart` text that has no header/direction line"
    - "parseFlowchart receives `{ direction }` and uses it in place of any DSL-inferred default"
  edge_custom_node_types:
    - "`nodeTypes` supplies an override for one or more `iNodeType` keys"
    - "resolveNodeTypes spreads `defaultNodeTypes` first, then the override, so only the overridden type(s) change renderer — every other type keeps the bundled FlowNode"
mermaid: |
  flowchart TD
    A[chart or graph prop] -->|chart present| B[parseFlowchart]
    A -->|only graph present| C[use graph as-is]
    A -->|neither present| E1[throw FlowchartParseError]
    B -->|throws| E1
    B -->|ok| D[graph set]
    C --> D
    E1 --> ERR[render fc-parse-error, role=alert]
    D --> L[layout effect: engine.layout]
    L -->|resolves| P[positioned set -> render canvas]
    L -->|rejects| LOAD[stays on fc-loading placeholder]
    P --> PATHS[usePaths: detectPaths]
    PATHS --> RENDER[render nodes/edges via resolveNodeTypes + toReactFlowEdge]
```
