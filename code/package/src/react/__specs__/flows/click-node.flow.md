# click-node

## Purpose

Handles a click on a rendered flow node, invoking the caller's `onNodeClick` callback and optionally toggling the node's description-expand affordance.

## Paths

See the `paths:` field in the machine spec fenced block below for the full happy / edge-case enumeration.

```yaml
flow: handleNodeClick
kind: composition-root
source: src/react/FlowChart.tsx
symbol: FlowChart
inputs:
  event: "React Flow's internal NodeMouseHandler event argument (unused by this handler)"
  node: "Node — the clicked React Flow node, carrying `id` and `data: iFlowNodeData`"
returns:
  - "void — the only observable effect is invoking the caller-supplied `onNodeClick(id, data)` prop"
throws: []
calls:
  - "onNodeClick (caller-supplied prop, optional)"
called_by:
  - "React Flow's internal node-click dispatch (wired via the `onNodeClick` prop passed to <ReactFlow>)"
emits_events: []
side_effects_on_success:
  - "invokes the caller's onNodeClick(id, data) callback with the clicked node's id and its current iFlowNodeData"
side_effects_on_failure: none
transaction: none
test:
  - src/react/FlowChart.test.tsx
  - src/react/nodes/FlowNode.test.tsx
spec: src/react/__specs__/spec.md
ai_agent_action:
  when_to_call: "The user clicks a node body to select/inspect it, or clicks a node's expand affordance to reveal its longer description."
  when_not_to_call: "Attempting to drag or reconnect a node — both are disabled (nodesDraggable=false, nodesConnectable=false); this is a click-only, read-only interaction."
  natural_language_examples:
    - "Click on the 'Validate input' node"
    - "Expand the description on this node"
    - "Show details for node <id>"
  agent_invocation: "UI click on [data-testid=\"fc-node-<id>\"] (data-agent-action=\"select-node\"), or its child [data-testid=\"fc-node-<id>-expand\"] (data-agent-action=\"toggle-description\")"
  confirm_with_user_before: "none — read-only click"
  summarize_to_user_after: "Selected node \"<label>\" (<type>)."
paths:
  happy:
    - "user clicks a node body (data-testid=\"fc-node-<id>\", data-agent-action=\"select-node\", aria-label=\"<type> node: <label>\")"
    - "React Flow fires its NodeMouseHandler -> FlowChart.handleNodeClick(_event, node)"
    - "onNodeClick?.(node.id, node.data as iFlowNodeData) invokes the caller's callback with the node's id and its current data (label/type/description/direction/onSelectedPath/dimmed/active)"
    - "no internal FlowChart state changes from a plain node click — nodesDraggable/nodesConnectable are both false, so click + the expand button are the ONLY node interactions"
  happy_expand_description:
    - "the node's `data.description` is set -> FlowNode renders its expand button (data-testid=\"fc-node-<id>-expand\", data-agent-action=\"toggle-description\", aria-expanded, aria-label=\"Expand description for <label>\")"
    - "user clicks the expand button -> `event.stopPropagation()` runs first, preventing the click from also bubbling up into React Flow's node-click handler (onNodeClick does NOT also fire for this click)"
    - "local `expanded` state toggles -> the description text renders/hides; aria-expanded flips true/false; aria-label toggles between \"Expand description for <label>\" and \"Collapse description for <label>\""
  edge_no_callback_supplied:
    - "`onNodeClick` prop is omitted by the caller"
    - "handleNodeClick still runs on every click, but `onNodeClick?.(...)` is a no-op (optional chaining) — nothing throws, nothing else happens"
  edge_boundary_node_with_no_description:
    - "the node's `data.description` is undefined"
    - "FlowNode renders NO expand button at all (`{data.description && (...)}` short-circuits) — clicking the node body still fires onNodeClick exactly as in the happy path"
  edge_boundary_active_and_dimmed_combination:
    - "a node is simultaneously `active` (the current playback/activeNodeId cursor) AND `dimmed` (off the currently highlighted path)"
    - "FlowNode applies BOTH `fc-node--active` and `fc-node--dimmed` classes; CSS resolves the combined visual (box-shadow ring plus reduced opacity) — click behavior is unaffected by either flag"
  edge_authority: "n/a — no permission/ownership boundary; clicking a node is a public, non-destructive, purely observational action with no DB or auth surface"
mermaid: |
  flowchart TD
    A[user clicks node] --> B{clicked the expand button?}
    B -->|yes| C[event.stopPropagation]
    C --> D[toggle local expanded state]
    D --> E[description shown/hidden; aria-expanded flips]
    B -->|no, clicked node body| F[React Flow NodeMouseHandler fires]
    F --> G[FlowChart.handleNodeClick]
    G --> H{onNodeClick prop supplied?}
    H -->|yes| I[onNodeClick(id, data) invoked]
    H -->|no| J[no-op — optional chaining]
```
