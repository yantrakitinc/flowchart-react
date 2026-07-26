---
id: J-017
slug: build-decision-tree-editor-drag-connect
persona: >
  Developer building a no-code chatbot/decision-tree builder product, where end users
  (non-developers) create the flowchart themselves by dragging nodes and drawing connections.
intent: >
  Let end users interactively add nodes, drag them to reposition, and draw new connecting edges
  between nodes via direct manipulation on the canvas.
trigger: >
  The product spec requires the diagram to be user-editable in the browser, not just a
  read-only rendering of developer-supplied data, mirroring tools like draw.io.
steps:
  - Find the interaction mode/prop that enables drag-to-reposition and drag-from-handle-to-connect
    behavior (vs a read-only rendering mode).
  - Enable node dragging and confirm moving a node updates its stored position.
  - Enable connection handles on nodes and confirm dragging from one node's handle to another
    creates a new edge.
  - Add validation so a user can't connect a node to itself or create a disallowed connection
    (e.g. no incoming edges into a "Start" node).
  - Wire up node/edge deletion (select + delete key) so users can remove pieces added by mistake.
  - Persist the user's edits (feeds into J-012).
success: >
  End users can add, move, connect, and delete nodes/edges purely through direct manipulation
  on the canvas, with invalid connections rejected rather than silently created.
failure_outcomes:
  - when: A user drags a connection to empty canvas space, not onto a valid target handle.
    explanation: The drag is cancelled/snapped back rather than creating a dangling edge, visibly obvious.
    alternative: User retries the drag onto a valid handle.
  - when: A user attempts a connection the app's business rules disallow (e.g. two "Start" nodes).
    explanation: >
      The connection is rejected with a visible reason rather than silently created and later
      breaking downstream logic.
    alternative: User connects to a different, valid node instead.
  - when: A user drags a node off the visible canvas area entirely.
    explanation: The canvas auto-scrolls or the position is clamped rather than the node becoming permanently unreachable.
    alternative: User uses fit-to-view to relocate it.
  - when: Rapid successive drag operations happen faster than state updates commit.
    explanation: Edits queue/debounce predictably rather than dropping intermediate positions silently.
    alternative: User waits a beat between rapid edits if visual lag is noticed.
provenance:
  domain: "diagram-as-code / flowchart component for web apps (developer-facing React library)"
  inspired_by:
    - "React Flow's connection-handle drag-to-connect interaction model"
    - "draw.io / no-code workflow-builder direct-manipulation editing conventions (drag node, drag connection, delete key)"
  not_derived_from_our_flows: true
maps_to_flows: []
status: retired
retired_reason: >-
  FlowChart.tsx renders React Flow with `nodesDraggable={false}` and `nodesConnectable={false}` (src/react/__specs__/spec.md: 'click and the expand button are the only node interactions') — drag-to-move and drag-to-connect editing are a deliberate, permanent product-scope exclusion, not a gap.
---

# J-017: Build a drag-and-connect decision-tree editor for end users
