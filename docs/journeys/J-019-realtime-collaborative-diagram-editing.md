---
id: J-019
slug: realtime-collaborative-diagram-editing
persona: >
  Developer building a Figma/Miro-style collaborative whiteboard product feature where multiple
  users edit the same flowchart simultaneously.
intent: >
  Have two or more users' edits to the same diagram (moving nodes, adding connections) reflected
  live to each other without one user's changes silently overwriting another's.
trigger: >
  The product requires "multiple people editing the same flow at once" as a headline feature,
  the way collaborative whiteboard tools already do.
steps:
  - Find whether the diagram's state model is compatible with an external real-time sync layer
    (accepts incremental patches rather than only full-array replacement).
  - Wire node/edge mutations from local user interaction into outgoing sync messages
    (via a CRDT/OT provider or websocket relay).
  - Apply incoming remote mutations from other users into the local diagram state without
    discarding the local user's own in-progress interaction (e.g. an active drag).
  - Render a lightweight presence indicator (colored cursor/avatar) per remote collaborator.
  - Confirm two browser sessions editing the same diagram converge to the same final state
    after edits from both.
success: >
  Concurrent edits from multiple users converge to a consistent shared diagram state, with no
  user's committed edit silently lost, and live presence is visible.
failure_outcomes:
  - when: Two users move the same node at nearly the same instant.
    explanation: >
      A conflict-resolution rule (last-write-wins with a visible "moved by X" flash, or CRDT
      merge) is explicit rather than one edit vanishing unexplained.
    alternative: "terminal - explanation of the resolution rule suffices, or user re-adjusts after seeing the merged result"
  - when: A user's connection drops mid-edit.
    explanation: Local edits queue and a "reconnecting" state is shown rather than edits silently failing to sync.
    alternative: Edits flush once connection resumes; if unrecoverable, the user is told which edits didn't sync.
  - when: The diagram's own internal state update conflicts with an externally-applied remote
      patch (e.g. it resets the whole array, discarding a position another user just moved).
    explanation: This is named as an integration constraint in docs (state must be patched, not replaced, under multiplayer use).
    alternative: Developer uses the documented incremental-update API instead of full-state replacement.
provenance:
  domain: "diagram-as-code / flowchart component for web apps (developer-facing React library)"
  inspired_by:
    - "CRDT/OT-based multiplayer canvas conventions from collaborative whiteboard tools (Figma, Miro, tldraw)"
    - "React Flow's controlled-state model as the integration surface external sync layers must patch incrementally"
  not_derived_from_our_flows: true
maps_to_flows: []
---

# J-019: Real-time collaborative editing of the same diagram
