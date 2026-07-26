# FlowChart

## Purpose

`FlowChart` is the package's single exported top-level component — the composition root wiring
parse → layout → path-detection → playback → React Flow render. This is the export-keyed flow doc
(kebab of the `FlowChart` symbol, required by the flow-coverage gate); the full behavioral enumeration
(happy path, parse-error, layout-engine-rejects, empty-graph, `chart`/`graph` precedence, direction
override, custom node types) lives in the sibling `render-flowchart.flow.md`, which this doc cites in
full rather than restating (thin-spec doctrine).

## Paths

See `./render-flowchart.flow.md` for the complete `paths:` enumeration over this same `FlowChart`
symbol — `happy`, `error_parse_failure`, `edge_layout_engine_rejects`, `edge_boundary_empty_graph`,
`edge_boundary_chart_and_graph_both_supplied`, `edge_direction_override`, and `edge_custom_node_types`.

```yaml
flow: FlowChart
kind: composition-root
source: src/react/FlowChart.tsx
symbol: FlowChart
inputs:
  props: "iFlowChartProps — see ./render-flowchart.flow.md for the full field-by-field enumeration"
returns:
  - "JSX.Element — see ./render-flowchart.flow.md"
throws: []
calls:
  - parseFlowchart (../parse/parseFlowchart)
  - layout (../layout/layout)
  - usePaths
  - usePlayback
  - resolveNodeTypes
  - toReactFlowEdge
called_by:
  - consuming application code (top-level `import { FlowChart } from '@yantrakit/flowchart-react'`)
emits_events: []
side_effects_on_success:
  - "see ./render-flowchart.flow.md"
side_effects_on_failure: "see ./render-flowchart.flow.md"
transaction: none
test: src/react/FlowChart.test.tsx
spec: src/react/__specs__/spec.md
ai_agent_action:
  when_to_call: "Caller wants to render a Mermaid-like flowchart or a pre-built flow-graph IR as an interactive diagram."
  when_not_to_call: "Neither `chart` text nor a `graph` IR object is available."
  natural_language_examples:
    - "Show this flowchart"
    - "Render the onboarding flow diagram"
  agent_invocation: "React component render: <FlowChart chart={...} /> or <FlowChart graph={...} />"
  confirm_with_user_before: "none — read-only render"
  summarize_to_user_after: "Rendered the flowchart with N nodes across M detected path(s)."
paths:
  happy:
    - "see ./render-flowchart.flow.md#happy for the full step-by-step enumeration"
```
