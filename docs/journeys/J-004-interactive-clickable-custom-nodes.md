---
id: J-004
slug: interactive-clickable-custom-nodes
persona: >
  Developer building a decision-tree quiz app; needs each node to be a clickable card with an
  avatar, title, and button, not a plain box.
intent: >
  Replace default box-node rendering with a fully custom, interactive React component per node
  (click handlers, buttons, conditional UI inside the node).
trigger: >
  The default node shape is too plain for the product's UI; the developer has seen React Flow's
  "Custom Nodes" examples and expects the same override capability here.
steps:
  - Find the extension point for supplying a custom node renderer (a node "type" -> component mapping).
  - Build a React component that receives node data as props and renders custom markup.
  - Register that component against a node type and assign the type to specific data nodes.
  - Wire an onClick/interaction handler inside the custom component that reads/updates node data.
  - Render and confirm clicking the custom element triggers the intended app behavior without
    disrupting the library's own drag/select/connect handling.
success: >
  Fully custom interactive React markup renders per node, internal click handlers fire correctly,
  and diagram-level interactions (pan, drag, connect) still work alongside them.
failure_outcomes:
  - when: The inner click handler doesn't stop propagation and the library's own node-drag/select
      behavior intercepts the click.
    explanation: >
      Docs state explicitly that interactive children need propagation handling (e.g. a documented
      "nodrag"/"nopan" escape class), rather than the click silently doing nothing.
    alternative: Developer adds the documented propagation-stopping mechanism and retries.
  - when: The custom component throws during render (bad prop shape).
    explanation: >
      The error identifies which node id's custom renderer failed, rather than crashing the
      whole diagram.
    alternative: Developer fixes the component; diagram shows a fallback/error node meanwhile.
  - when: A node is assigned a type with no matching registered custom component.
    explanation: The message names the unregistered type and falls back to a default node.
    alternative: Developer registers the component or corrects the type name.
provenance:
  domain: "diagram-as-code / flowchart component for web apps (developer-facing React library)"
  inspired_by:
    - "React Flow Custom Nodes examples (reactflow.dev/examples/nodes/custom-node)"
    - "React Flow's documented nodrag/nopan class convention for interactive children inside a node"
  not_derived_from_our_flows: true
maps_to_flows: []
---

# J-004: Make each node an interactive, clickable, customizable UI element
