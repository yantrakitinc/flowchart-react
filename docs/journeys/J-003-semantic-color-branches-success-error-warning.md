---
id: J-003
slug: semantic-color-branches-success-error-warning
persona: >
  Developer building an incident-response runbook viewer; wants the success path green, the
  error path red, and a warning path amber, the way CI/CD pipeline graphs already look.
intent: >
  Apply semantic colors to specific nodes/edges based on branch outcome (success/error/warning)
  without hand-styling every node individually.
trigger: >
  Stakeholders want to glance at the runbook and instantly see the failure path, mirroring
  pipeline visualizers (GitHub Actions graph, GitLab pipeline graph) they already use daily.
steps:
  - Look for a styling mechanism that targets a class/type/status of node or edge, rather than
    only per-node inline styles (Mermaid classDef-like, or a status/className convention).
  - Tag specific nodes/edges with a semantic status (success/error/warning) in the source data.
  - Map a color per status via the library's styling hook (className, style prop, or theme token).
  - Render and confirm the tagged branch visually distinguishes itself from the neutral path.
  - Add a new node to the error branch and confirm it inherits the semantic color automatically.
success: >
  Nodes/edges tagged with a status render with the expected semantic color, and new nodes added
  to a tagged branch inherit the styling without additional per-node styling code.
failure_outcomes:
  - when: Conflicting styles are applied (inline node style plus a semantic class).
    explanation: Docs/behavior state the precedence rule (which one wins) explicitly.
    alternative: Developer resolves precedence per the documented rule and retries.
  - when: An unknown/unsupported status value is used.
    explanation: Falls back to a neutral/default style and names the recognized status values.
    alternative: Developer corrects the status value and retries.
  - when: The chosen semantic color fails contrast against the diagram background.
    explanation: >
      No runtime error occurs, but docs/lint should flag the low-contrast pairing rather than
      leaving it silently unreadable.
    alternative: Developer selects a token-based palette instead of an arbitrary hex value.
provenance:
  domain: "diagram-as-code / flowchart component for web apps (developer-facing React library)"
  inspired_by:
    - "CI/CD pipeline graph conventions (GitHub Actions, GitLab CI) using green/red/amber per stage status"
    - "Mermaid classDef/style semantic-class convention for coloring node groups"
  not_derived_from_our_flows: true
maps_to_flows:
  - "src/react/edges/__specs__/flows/to-react-flow-edge.flow.md"
  - "src/ir/__specs__/flows/isEdgeType.flow.md"
---

# J-003: Semantically color success / error / warning branches
