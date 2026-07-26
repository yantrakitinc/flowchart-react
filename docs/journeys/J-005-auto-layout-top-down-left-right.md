---
id: J-005
slug: auto-layout-top-down-left-right
persona: >
  Developer visualizing an org chart / approval-chain generated dynamically from a database,
  with an unknown and growing number of nodes.
intent: >
  Get nodes automatically arranged in a clean top-down or left-right layout without manually
  computing x/y coordinates.
trigger: >
  Hand-positioning breaks every time the underlying data changes size; the developer has seen
  the "Dagre Tree"/"Elkjs Tree" auto-layout examples in peer library docs and expects the same.
steps:
  - Look for a layout utility/hook/prop that computes positions from node/edge data (rather than
    requiring position to already exist in the source data).
  - Choose a layout direction (top-down vs left-right) matching the diagram's semantic flow.
  - Run auto-layout over the current nodes/edges (one-time, or re-run on data change).
  - Render the diagram using the computed positions.
  - Add/remove a node in the source data and re-run layout to confirm clean re-arrangement
    (no overlaps).
success: >
  Nodes are positioned without manual coordinates, respect the chosen direction, avoid
  overlapping nodes/edges, and stay clean after a re-layout following a data change.
failure_outcomes:
  - when: The graph contains a cycle and the layout algorithm expects a DAG.
    explanation: The message names the cyclic edge and states the layout may be approximate.
    alternative: Developer breaks/marks the cycle, or accepts the best-effort layout.
  - when: A node has no declared width/height and the layout engine can't estimate size.
    explanation: The message names the node and requests explicit dimensions or a measurement pass.
    alternative: Developer supplies dimensions, or lets the library measure post-mount then reruns layout.
  - when: Layout computation on a very large graph takes long enough to visibly block the UI.
    explanation: A loading/computing state distinguishes "still working" from "stuck".
    alternative: Developer moves layout to an async/worker path, or paginates the diagram.
  - when: Two disconnected subgraphs exist with no shared path.
    explanation: The message clarifies both are laid out independently and may appear far apart.
    alternative: Developer accepts the result or explicitly groups the subgraphs.
provenance:
  domain: "diagram-as-code / flowchart component for web apps (developer-facing React library)"
  inspired_by:
    - "React Flow's Dagre Tree and Elkjs Tree auto-layout examples (reactflow.dev/examples/layout/dagre, /elkjs)"
    - "dagre's rankdir (TB/LR) direction convention for directed-graph layout"
  not_derived_from_our_flows: true
maps_to_flows: []
---

# J-005: Auto-layout a diagram top-down / left-right without hand-positioning
