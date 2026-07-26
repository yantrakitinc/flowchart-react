---
id: J-015
slug: pan-zoom-minimap-large-diagram-navigation
persona: >
  Developer visualizing a large microservices dependency graph (100+ nodes) inside an internal
  ops dashboard, needing the diagram to stay navigable at scale.
intent: >
  Give end users pan, zoom, fit-to-view, and a minimap/overview so they can navigate a diagram
  far larger than the viewport.
trigger: >
  The default render places the whole large graph off-screen/unreadable at 100% zoom; the
  developer expects built-in navigation chrome rather than building pan/zoom from scratch.
steps:
  - Find the built-in navigation controls (zoom in/out, fit-view, minimap) the library documents.
  - Enable them alongside the main diagram render.
  - Confirm mouse/trackpad pan and zoom gestures work smoothly at the target node count.
  - Confirm a "fit to view" action correctly frames the entire graph regardless of its current size.
  - Confirm the minimap accurately reflects node positions and clicking/dragging it navigates
    the main viewport.
success: >
  Users can pan, zoom, fit-to-view, and use a minimap to navigate a diagram much larger than
  the viewport, with no dropped frames at the target scale.
failure_outcomes:
  - when: Node count grows large enough that pan/zoom becomes visibly laggy.
    explanation: Docs name a known performance ceiling and point to a virtualization/culling option.
    alternative: Developer enables the documented performance mode or paginates the graph.
  - when: "Fit to view" is called before the diagram has computed node dimensions (first paint).
    explanation: A timing note explains the call should run after the ready/measured signal.
    alternative: Developer defers the fit-view call until the diagram reports ready.
  - when: A minimap is enabled on a diagram with zero nodes.
    explanation: An empty-minimap state is distinguished from a broken minimap.
    alternative: Developer conditionally hides the minimap until data exists.
provenance:
  domain: "diagram-as-code / flowchart component for web apps (developer-facing React library)"
  inspired_by:
    - "React Flow's Controls / MiniMap / Background built-in chrome (reactflow.dev/examples/overview)"
    - "Canvas-tool pan/zoom/minimap navigation conventions common to large graph visualizers"
  not_derived_from_our_flows: true
maps_to_flows: []
---

# J-015: Pan, zoom, and use a minimap to navigate a large diagram
