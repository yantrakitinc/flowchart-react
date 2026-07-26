---
id: J-020
slug: switch-from-mermaid-after-hitting-limits
persona: >
  Developer who started a project using Mermaid.js for a documentation-style flowchart, but hit
  a wall trying to add clickable/interactive custom nodes and drag-to-reposition.
intent: >
  Arrive at this library specifically because a peer tool (Mermaid) proved too limited for an
  interactive/custom-UI requirement, and port the existing Mermaid-authored diagram content over.
trigger: >
  A PM asks for clickable nodes that open a detail panel; the developer discovers Mermaid's
  rendering is static SVG with limited interactivity hooks and searches for a more customizable
  React-native alternative.
steps:
  - Confirm (from docs/examples) that this library supports the specific gap that blocked
    Mermaid - custom interactive per-node React components and drag/connect editing.
  - Find whether there's a converter/import path from Mermaid's text syntax into this library's
    data shape, or whether the content must be manually re-expressed.
  - Re-author (or convert) the existing flowchart content into this library's expected
    node/edge shape.
  - Re-implement the specific interactive requirement (clickable node opening a detail panel)
    using the custom-node extension point.
  - Confirm the ported diagram is visually/structurally equivalent to the original Mermaid
    version, plus the new interactivity.
success: >
  The diagram is fully ported with equivalent content, and the specific interactivity gap that
  blocked Mermaid is resolved.
failure_outcomes:
  - when: No direct Mermaid-syntax import/converter exists.
    explanation: >
      Docs state clearly that content must be re-authored via the structured-data path (J-002)
      rather than the developer assuming an importer exists and searching for it in vain.
    alternative: Developer manually re-expresses the Mermaid source as structured node/edge data.
  - when: A Mermaid-specific diagram type (e.g. Gantt or sequence diagram) has no equivalent here.
    explanation: A feature matrix names which diagram types are/aren't supported, so the gap is discoverable before deep porting effort.
    alternative: Developer keeps that specific diagram type in Mermaid and uses this library only for the interactive flowchart cases.
  - when: Subgraph/grouping syntax used in the original Mermaid diagram has no direct equivalent.
    explanation: Docs name the closest supported construct (e.g. a "group node" concept) rather than the developer discovering the gap by trial and error.
    alternative: Developer remodels grouping using the closest supported construct.
provenance:
  domain: "diagram-as-code / flowchart component for web apps (developer-facing React library)"
  inspired_by:
    - "Mermaid's known limitation of static-SVG output with minimal per-node interactivity, a documented reason teams migrate to React-native diagram libraries"
    - "Migration-path conventions expected when switching between peer diagram libraries (Mermaid -> React Flow-family tools)"
  not_derived_from_our_flows: true
maps_to_flows: []
---

# J-020: Switch from Mermaid after hitting its interactivity limits
