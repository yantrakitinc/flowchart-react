---
id: J-018
slug: accessible-screen-reader-keyboard-diagram
persona: >
  Accessibility engineer at a company subject to WCAG/Section 508 compliance, auditing the
  diagram component before it ships in a public-facing product.
intent: >
  Confirm the diagram (and its nodes/edges) can be navigated and understood via keyboard alone
  and via a screen reader, not just mouse/visual interaction.
trigger: >
  An accessibility audit flags the diagram as a canvas-heavy component needing verification,
  mirroring the scrutiny applied to any canvas/SVG-heavy UI (charts, drag-and-drop boards).
steps:
  - Check whether nodes/edges expose semantic roles/labels (aria-label, role) discoverable by a
    screen reader, rather than being purely visual SVG/canvas shapes.
  - Tab through the diagram using keyboard only and confirm every interactive node is reachable
    and its selected state is announced.
  - Confirm keyboard equivalents exist for mouse-only interactions the diagram supports
    (e.g. arrow keys to move a focused node, delete key to remove it) if the diagram is editable.
  - Run a screen reader over the diagram and confirm it announces node labels and connections
    in a comprehensible order rather than reading raw coordinates or silently skipping content.
  - Document any gap found against WCAG success criteria for the audit report.
success: >
  Every interactive diagram element is keyboard-reachable and screen-reader-announced with
  meaningful labels; the audit finds no critical (blocking) accessibility gaps.
failure_outcomes:
  - when: Nodes render as unlabeled generic SVG/div elements with no accessible name.
    explanation: The audit finding names the exact missing aria-label/role per node type.
    alternative: Developer adds accessible names via the library's label/aria prop, or wraps custom nodes with proper semantics, then re-audits.
  - when: Keyboard focus order doesn't match the diagram's logical flow (jumps randomly
      between disconnected nodes).
    explanation: The finding names the expected vs actual tab order.
    alternative: Developer sets explicit focus order per the library's mechanism, or the limitation is documented.
  - when: An edit action (delete, connect) has no keyboard equivalent, only a drag gesture.
    explanation: The finding names the mouse-only interaction as a WCAG 2.1.1 (keyboard) gap.
    alternative: Developer adds the documented keyboard shortcut equivalent or a menu-based alternative.
provenance:
  domain: "diagram-as-code / flowchart component for web apps (developer-facing React library)"
  inspired_by:
    - "WCAG 2.1.1 (Keyboard) and 4.1.2 (Name, Role, Value) success criteria as applied to canvas/graphics widgets (ARIA Authoring Practices Guide)"
    - "Accessibility scrutiny already applied to comparable interactive-graphics libraries (charting libs, drag-and-drop boards)"
  not_derived_from_our_flows: true
maps_to_flows:
  - "src/react/__specs__/flows/click-node.flow.md"
  - "src/react/nodes/__specs__/flows/flow-node.flow.md"
  - "src/react/__specs__/flows/playback-controls.flow.md"
---

# J-018: Confirm the diagram is keyboard- and screen-reader-accessible
