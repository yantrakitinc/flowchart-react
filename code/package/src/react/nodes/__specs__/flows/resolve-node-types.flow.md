# resolveNodeTypes

## Purpose

Merges caller-supplied node-type renderer overrides over `defaultNodeTypes` (every `iNodeType` mapped
to `FlowNode`), so a caller can replace the renderer for one or more node types while every other type
keeps the bundled default.

## Paths

See the `paths:` field in the machine spec fenced block below for the full happy / edge-case enumeration.

```yaml
flow: resolveNodeTypes
kind: helper
source: src/react/nodes/registry.ts
symbol: resolveNodeTypes
inputs:
  overrides: "iNodeRegistry? — a partial NodeTypes map keyed by one or more iNodeType values"
returns:
  - "NodeTypes — defaultNodeTypes verbatim when overrides is undefined"
  - "NodeTypes — { ...defaultNodeTypes, ...overrides } when overrides is supplied, so only the overridden type(s) change renderer"
throws: []
calls: []
called_by:
  - "src/react/FlowChart.tsx (resolves the `nodeTypes` prop into the map passed to <ReactFlow>)"
emits_events: []
side_effects_on_success:
  - "none — pure object composition"
side_effects_on_failure: "n/a — never throws"
transaction: none
test: src/react/nodes/registry.test.ts
spec: src/react/__specs__/spec.md
ai_agent_action:
  when_to_call: "n/a — internal composition helper, not independently agent-invocable"
  when_not_to_call: "n/a — not independently agent-invocable"
  natural_language_examples:
    - "n/a — not independently agent-invocable"
  agent_invocation: "internal — plain function call, not callable over HTTP/CLI/UI"
  confirm_with_user_before: "none — read-only, pure computation"
  summarize_to_user_after: "n/a — has no independent user-facing outcome"
paths:
  happy_no_overrides:
    - "overrides is undefined -> returns defaultNodeTypes by reference (no new object allocated)"
  happy_partial_override:
    - "overrides supplies a renderer for one iNodeType (e.g. `{ decision: CustomDecisionNode }`) -> the returned map uses CustomDecisionNode for 'decision' and FlowNode for every other one of the 7 iNodeType values"
  edge_boundary_full_override:
    - "overrides supplies a renderer for every iNodeType value -> the returned map matches overrides exactly (spread order places overrides last, winning every key)"
mermaid: |
  flowchart TD
    A[resolveNodeTypes overrides] --> B{overrides supplied?}
    B -->|no| C[return defaultNodeTypes]
    B -->|yes| D[return spread: defaultNodeTypes then overrides]
```
