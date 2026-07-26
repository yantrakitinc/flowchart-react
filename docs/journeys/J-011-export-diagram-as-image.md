---
id: J-011
slug: export-diagram-as-image
persona: >
  Developer building a "share this workflow as an image" feature for a documentation/reporting
  tool; needs the rendered diagram exportable as PNG/SVG for a PDF report or a Slack message.
intent: >
  Convert the currently-rendered diagram into a downloadable image file (PNG/SVG) matching
  what's on screen.
trigger: >
  A stakeholder asks for a static image of the current process diagram for a slide deck; the
  developer expects a documented export utility rather than manually screenshotting.
steps:
  - Find the export/download-image utility or example pattern the library documents.
  - Trigger export on the currently-rendered diagram (e.g. via a button click).
  - Optionally exclude UI chrome (zoom controls, minimap) from the exported image.
  - Confirm the exported file visually matches the on-screen diagram, including custom node
    styling/branch colors.
  - Wire the export into the app's own "Download" button/flow.
success: >
  An image file downloads that visually matches the rendered diagram (nodes, edges, colors,
  custom node content), with UI chrome excluded as configured.
failure_outcomes:
  - when: A custom node uses external resources (web fonts, remote images) that fail to inline
      during export.
    explanation: >
      The exported image is missing/blank at that spot; a known-limitation doc names the
      CORS/inlining requirement.
    alternative: Developer self-hosts/inlines the asset and retries.
  - when: The diagram is larger than the current viewport (parts off-screen).
    explanation: The export utility clarifies whether it captures the full diagram or only the visible viewport.
    alternative: Developer fits the whole diagram into view before exporting, or uses a full-canvas export mode.
  - when: Export is attempted before the diagram has finished its initial layout/measurement pass.
    explanation: A timing note explains export should run after the diagram reports "ready".
    alternative: Developer waits for the ready signal and retries export.
  - when: SVG export is requested for a diagram using DOM-based custom nodes.
    explanation: A known-limitation message clarifies DOM node content may not fully vectorize into SVG.
    alternative: Developer uses PNG export instead, or accepts an SVG with embedded raster fallback.
provenance:
  domain: "diagram-as-code / flowchart component for web apps (developer-facing React library)"
  inspired_by:
    - "React Flow's html-to-image-based Download Image example (reactflow.dev/examples/misc/download-image)"
    - "Community discussion of html-to-image version-pinning quirks for reliable PNG export (xyflow/xyflow discussion #1061)"
  not_derived_from_our_flows: true
maps_to_flows: []
---

# J-011: Export the diagram as an image (PNG/SVG)
