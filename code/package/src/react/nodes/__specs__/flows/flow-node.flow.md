# FlowNode

## Purpose

Default renderer used for all 7 `iNodeType` values. Shape and color are driven entirely by the
`fc-node--<type>` CSS class; this component only supplies structure, connection handles, and the
expand-for-description affordance.

## Paths

See the `paths:` field in the machine spec fenced block below for the full happy / edge-case enumeration.
See also `../../__specs__/flows/click-node.flow.md` for the click/expand interaction sequence in the
context of the whole `FlowChart` composition.

```yaml
flow: FlowNode
kind: composition-root
source: src/react/nodes/FlowNode.tsx
symbol: FlowNode
inputs:
  id: "string — the React Flow node id"
  data: "iFlowNodeData — label, type, description?, direction, onSelectedPath, dimmed, active"
returns:
  - "JSX.Element — fc-node-<id> container: icon + label + optional expand button/description, with target/source Handles positioned per direction"
throws: []
calls: []
called_by:
  - "src/react/nodes/registry.ts (defaultNodeTypes maps every iNodeType to FlowNode)"
  - "@xyflow/react (invoked as the React Flow node renderer)"
emits_events: []
side_effects_on_success:
  - "none externally — the expand/collapse toggle is local component state only"
side_effects_on_failure: none
transaction: none
test: src/react/nodes/FlowNode.test.tsx
spec: src/react/__specs__/spec.md
ai_agent_action:
  when_to_call: "never invoked directly by an agent — rendered internally by React Flow via the node-type registry"
  when_not_to_call: "always, as a direct agent action — see ../../__specs__/flows/click-node.flow.md for the actual clickable surface"
  natural_language_examples:
    - "n/a — not independently agent-invocable"
  agent_invocation: "internal — rendered by @xyflow/react, not callable directly"
  confirm_with_user_before: "none — read-only render plus local expand/collapse state"
  summarize_to_user_after: "n/a — has no independent user-facing outcome; see click-node.flow.md"
paths:
  happy:
    - "data.type resolves ICON_BY_TYPE[data.type] and the fc-node--<type> class; data.direction resolves target/source Handle positions via HANDLE_POSITIONS_BY_DIRECTION"
    - "renders data-testid=\"fc-node-<id>\", data-node-id, data-node-type, aria-label=\"<type> node: <label>\""
  happy_with_description:
    - "data.description is set -> an expand button renders (data-testid=\"fc-node-<id>-expand\", aria-expanded=false initially)"
    - "clicking it calls event.stopPropagation() (prevents the click bubbling into React Flow's node-click handler) then toggles local `expanded` state; the description div and aria-expanded/aria-label flip in sync"
  edge_boundary_no_description:
    - "data.description is undefined -> the expand button and description div both render nothing (short-circuited by `{data.description && (...)}`)"
  edge_boundary_active_dimmed_onpath_flags:
    - "data.active / data.onSelectedPath / data.dimmed each independently append fc-node--active / fc-node--on-path / fc-node--dimmed to the className string; any combination of the three can be simultaneously present"
  edge_boundary_direction_variants:
    - "each of the 4 iDirection values (TD/BT/LR/RL) resolves a distinct { target, source } Handle Position pair via HANDLE_POSITIONS_BY_DIRECTION, with target/source swapped or rotated appropriately (e.g. TD: target=Top/source=Bottom; BT: target=Bottom/source=Top)"
mermaid: |
  flowchart TD
    A[FlowNode id, data] --> B[resolve icon + fc-node--type class]
    B --> C[resolve Handle positions from direction]
    C --> D{data.description set?}
    D -->|no| E[render node body, no expand button]
    D -->|yes| F[render expand button]
    F --> G{expand clicked?}
    G -->|yes| H[stopPropagation; toggle expanded; description shown/hidden]
```
