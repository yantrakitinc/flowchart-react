---
id: J-016
slug: undo-redo-diagram-edit-history
persona: >
  Developer building an internal no-code workflow-builder tool where non-technical users drag
  nodes and rewire connections directly in the browser.
intent: >
  Let end users undo/redo their diagram edits (move node, delete node, rewire edge) the way any
  editor tool is expected to support ctrl+z.
trigger: >
  A user accidentally deletes a node while rearranging a workflow and expects ctrl+z to bring
  it back, as in every other canvas tool (Figma, Excalidraw) they've used.
steps:
  - Find whether the library tracks edit history natively or expects the app to snapshot state itself.
  - Wire up state snapshots (or the library's built-in history hook) on each meaningful edit
    (move, add, delete, connect).
  - Bind an undo action to ctrl+z / a toolbar button that reverts to the previous snapshot.
  - Bind a redo action to ctrl+shift+z / a toolbar button.
  - Confirm undo/redo correctly restores both the graph structure and node positions, not just one.
success: >
  Every user-initiated structural or positional edit is undoable and redoable, restoring the
  diagram to an exact prior state.
failure_outcomes:
  - when: The app didn't snapshot a particular edit type (e.g. only position moves are tracked,
      not connection changes).
    explanation: >
      Docs must explicitly name what edit types are/aren't covered by any built-in history
      mechanism, so the gap is discoverable rather than silently unsupported.
    alternative: Developer adds manual snapshotting for the uncovered edit type.
  - when: Undo is triggered with an empty history stack.
    explanation: A no-op state is distinguishable (e.g. a disabled button) from a broken undo.
    alternative: "terminal - explanation suffices"
  - when: A redo stack is discarded because a new edit was made after an undo.
    explanation: This is standard editor behavior and is stated in docs so it isn't mistaken for a bug.
    alternative: "terminal - explanation suffices"
provenance:
  domain: "diagram-as-code / flowchart component for web apps (developer-facing React library)"
  inspired_by:
    - "Figma/Excalidraw-style canvas-editor undo/redo conventions (ctrl+z / ctrl+shift+z expectation)"
    - "General editor-history (command-stack) pattern applied to node-based UI builders"
  not_derived_from_our_flows: true
maps_to_flows: []
---

# J-016: Undo/redo diagram edits
