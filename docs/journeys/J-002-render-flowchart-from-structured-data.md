---
id: J-002
slug: render-flowchart-from-structured-data
persona: >
  Frontend engineer on an internal-tools team whose backend already returns a workflow
  definition as JSON (steps + transitions) from a database.
intent: >
  Render a flowchart directly from an in-memory array/object of nodes and edges rather than
  authoring text.
trigger: >
  An existing API returns workflow steps as structured JSON; the engineer wants to visualize
  it directly, expecting the nodes/edges-array convention popularized by React Flow.
steps:
  - Inspect the library's expected data shape for nodes (id, label, position or no-position)
    and edges (id, source, target).
  - Map existing backend JSON fields onto that shape (step -> node, transition -> edge).
  - Pass the nodes/edges arrays as props/state into the diagram component.
  - Render and confirm every backend step appears as a node and every transition as an edge.
  - Update the backend JSON and re-render to confirm added/removed steps propagate.
success: >
  The diagram accurately reflects the full node/edge set from the structured object, and
  additions/removals in the source data propagate on the next render.
failure_outcomes:
  - when: An edge references a source/target id with no matching node.
    explanation: The error names the dangling edge id and the missing node id.
    alternative: Developer fixes the mapping and retries.
  - when: The nodes array is empty.
    explanation: An empty-state signal distinguishes "no data yet" from a rendering bug.
    alternative: Developer supplies data, or the app renders its own empty state.
  - when: Duplicate node ids exist in the array.
    explanation: The message names the duplicate id and which node was dropped/kept.
    alternative: Developer deduplicates ids upstream and retries.
  - when: The data is malformed (e.g. a node missing its required id field).
    explanation: A validation error names the missing field and the offending array index.
    alternative: Developer fixes the shape and retries.
provenance:
  domain: "diagram-as-code / flowchart component for web apps (developer-facing React library)"
  inspired_by:
    - "React Flow's nodes/edges array data model (reactflow.dev/learn/concepts/building-a-flow)"
    - "@xyflow/react npm package convention of id/source/target as the minimal edge contract"
  not_derived_from_our_flows: true
maps_to_flows: []
---

# J-002: Render a flowchart from a structured data object
