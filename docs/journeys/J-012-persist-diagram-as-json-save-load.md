---
id: J-012
slug: persist-diagram-as-json-save-load
persona: >
  Developer building a "save my flowchart and come back to it later" feature in an internal
  admin tool, backed by a database JSON column.
intent: >
  Serialize the current diagram (including any manual repositioning) to a portable JSON
  representation, then later reload that JSON to get back the identical diagram.
trigger: >
  Users need to edit a diagram across multiple sessions; the developer expects a
  serialize/deserialize round-trip, similar to React Flow's toObject()-style state snapshot.
steps:
  - Find the utility/method that snapshots the full current diagram state (nodes, edges,
    positions, viewport) into a plain serializable object.
  - Call it on save (button click or autosave interval) and persist the JSON to the backend.
  - On next visit, fetch that JSON from the backend.
  - Feed it back into the diagram component as the initial state.
  - Confirm the reloaded diagram is identical to how the user left it (positions, zoom/pan,
    custom data).
success: >
  A saved-then-reloaded diagram is indistinguishable from its state at save time, across a
  full session boundary.
failure_outcomes:
  - when: The saved JSON was produced by an older schema version than the currently-installed
      library expects.
    explanation: The message names the schema/version mismatch rather than silently misrendering.
    alternative: Developer runs a documented data-migration step for old snapshots before loading.
  - when: The persisted JSON is corrupted/truncated (e.g. a backend storage limit truncated the payload).
    explanation: Load fails with a parse error naming the malformed section.
    alternative: App falls back to the last-known-good snapshot, or an empty diagram with a clear message.
  - when: Two browser tabs save the same diagram at nearly the same time.
    explanation: Last-write-wins or the conflict is named explicitly, rather than silently merging incorrectly.
    alternative: App offers a "reload latest" vs "overwrite" choice to the user.
  - when: The diagram JSON exceeds the backend's storage/column size limit.
    explanation: Save fails with a size-limit message rather than silently truncating.
    alternative: Developer switches to a larger storage column/blob store, or prunes diagram size.
provenance:
  domain: "diagram-as-code / flowchart component for web apps (developer-facing React library)"
  inspired_by:
    - "React Flow's toObject()/viewport+nodes+edges state-snapshot convention for persistence"
  not_derived_from_our_flows: true
maps_to_flows: []
---

# J-012: Persist a diagram as JSON and reload it later
