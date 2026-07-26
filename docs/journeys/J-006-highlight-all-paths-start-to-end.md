---
id: J-006
slug: highlight-all-paths-start-to-end
persona: >
  Developer building a compliance/audit tool that must show every possible path from an
  "Application Submitted" start node to an "Approved"/"Rejected" end node.
intent: >
  Given a start node and an end node, find and visually highlight every route through the
  diagram that connects them.
trigger: >
  An auditor wants visual proof that no unreviewed transition bypasses an approval gate; the
  developer expects a traversal utility rather than hand-writing graph search.
steps:
  - Identify a start node id and an end node id in the diagram's data.
  - Look for a graph-traversal utility (find-all-paths / reachability helper) over the node/edge data.
  - Run the utility to get the set of paths (ordered node/edge id lists) between start and end.
  - Apply a highlight style (color/glow/dash) to every node/edge belonging to any returned path.
  - Render and visually confirm every valid route is highlighted and non-participating
    nodes/edges remain neutral.
success: >
  All paths between the given start and end are correctly identified and visually distinguished;
  nodes/edges not on any path stay unhighlighted.
failure_outcomes:
  - when: No path exists between the given start and end nodes.
    explanation: The message states clearly "no path found" rather than silently highlighting nothing.
    alternative: Developer verifies the start/end ids or checks for a broken edge.
  - when: The graph contains a cycle between start and end.
    explanation: A warning names the unbounded-path risk and states traversal is capped/deduplicated.
    alternative: Developer accepts the capped result or requests acyclic-only paths.
  - when: The start or end id doesn't exist in the current diagram.
    explanation: The message names the missing id.
    alternative: Developer corrects the id and retries.
  - when: The graph is large enough that exhaustive path enumeration is combinatorially expensive.
    explanation: The message states a path-count/depth limit was applied and results may be partial.
    alternative: Developer narrows the search scope or knowingly raises the limit.
provenance:
  domain: "diagram-as-code / flowchart component for web apps (developer-facing React library)"
  inspired_by:
    - "BPMN path-tracing / reachability-analysis conventions in process tools (Camunda Modeler, draw.io)"
    - "Graph reachability/all-simple-paths algorithms as exposed by general graph libraries consumed alongside React Flow"
  not_derived_from_our_flows: true
maps_to_flows: []
---

# J-006: Detect and highlight all paths from a start to an end node
