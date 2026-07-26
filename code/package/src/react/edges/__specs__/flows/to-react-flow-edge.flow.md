# toReactFlowEdge

## Purpose

Converts a renderer-agnostic `iRenderEdge` into an `@xyflow/react` `Edge`, applying semantic
edge-type styling (color via CSS var, dashed for `warning`, thick for `error`) and fading it when
`dimmed` (off the currently highlighted path).

## Paths

See the `paths:` field in the machine spec fenced block below for the full happy / edge-case enumeration.

```yaml
flow: toReactFlowEdge
kind: helper
source: src/react/edges/edgeStyle.ts
symbol: toReactFlowEdge
inputs:
  edge: "iRenderEdge — { id, from, to, type, label? } from the layout layer"
  dimmed: "boolean — true when the edge is off the currently highlighted path"
returns:
  - "Edge — { id, source, target, type: 'smoothstep', label, style: { stroke, strokeWidth, strokeDasharray?, opacity }, markerEnd }"
throws: []
calls: []
called_by:
  - "src/react/FlowChart.tsx (maps every iRenderEdge to an @xyflow/react Edge before passing to <ReactFlow>)"
emits_events: []
side_effects_on_success:
  - "none — pure object construction"
side_effects_on_failure: "n/a — never throws"
transaction: none
test: src/react/edges/edgeStyle.test.ts
spec: src/react/__specs__/spec.md
ai_agent_action:
  when_to_call: "n/a — internal rendering helper, not independently agent-invocable"
  when_not_to_call: "n/a — not independently agent-invocable"
  natural_language_examples:
    - "n/a — not independently agent-invocable"
  agent_invocation: "internal — plain function call, not callable over HTTP/CLI/UI"
  confirm_with_user_before: "none — read-only, pure computation"
  summarize_to_user_after: "n/a — has no independent user-facing outcome"
paths:
  happy_default:
    - "edge.type is 'default' -> stroke uses var(--fc-edge-default); strokeWidth 2; strokeDasharray undefined; markerEnd colored the same"
  happy_error:
    - "edge.type is 'error' -> strokeWidth is 3 (thicker); stroke/markerEnd colored var(--fc-edge-error)"
  happy_warning:
    - "edge.type is 'warning' -> strokeDasharray is '6 4' (dashed); stroke/markerEnd colored var(--fc-edge-warning)"
  edge_boundary_dimmed:
    - "dimmed is true -> style.opacity is 0.2 regardless of edge.type"
    - "dimmed is false -> style.opacity is 1"
  edge_boundary_no_label:
    - "edge.label is undefined -> the returned Edge's label is undefined (passed through verbatim, not defaulted to an empty string)"
mermaid: |
  flowchart TD
    A[toReactFlowEdge edge, dimmed] --> B[resolve stroke/marker color from edge.type via CSS var]
    B --> C{edge.type}
    C -->|error| D[strokeWidth 3]
    C -->|warning| E[strokeDasharray 6 4]
    C -->|default/other| F[strokeWidth 2, no dash]
    D --> G[apply opacity: dimmed ? 0.2 : 1]
    E --> G
    F --> G
    G --> H[return Edge]
```
