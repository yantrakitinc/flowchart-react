# usePlayback

## Purpose

Drives "movie mode" playback of a detected `iFlowPath`: a self-scheduling `setTimeout` chain advances
`index` through `path.nodeIds` every `speedMs` while `playing`. Reaching the last node either loops
back to `0` (`opts.loop`) or pauses and fires `opts.onEnd`. Passing `path: null` makes every control
a no-op.

## Paths

See the `paths:` field in the machine spec fenced block below for the full happy / edge-case enumeration.

```yaml
flow: usePlayback
kind: hook
source: src/react/usePlayback.ts
symbol: usePlayback
inputs:
  path: "iFlowPath | null — the path to play; null makes every control a no-op"
  opts: "iUsePlaybackOptions — { speedMs? (default 1200), loop? (default false), onStep?, onEnd? }"
returns:
  - "iUsePlaybackResult — { playing, index, currentNodeId, play, pause, toggle, restart, stepForward, stepBack }"
throws: []
calls: []
called_by:
  - "src/react/FlowChart.tsx"
emits_events: []
side_effects_on_success:
  - "schedules/clears a setTimeout while playing"
  - "invokes opts.onStep(nodeId, index) whenever index changes after the initial mount"
  - "invokes opts.onEnd() when playback reaches the last node without looping"
side_effects_on_failure: "n/a — usePlayback never throws; every transport function is a guarded no-op when path is null or has zero nodeIds"
transaction: none
test: src/react/usePlayback.test.ts
spec: src/react/__specs__/spec.md
ai_agent_action:
  when_to_call: "internal to FlowChart's composition — not an independent chat-agent action"
  when_not_to_call: "n/a — not independently agent-invocable"
  natural_language_examples:
    - "n/a — not independently agent-invocable"
  agent_invocation: "internal — React hook call, not callable over HTTP/CLI/UI directly"
  confirm_with_user_before: "none — in-memory playback state only"
  summarize_to_user_after: "n/a — has no independent user-facing outcome"
paths:
  happy_auto_advance:
    - "play() is called with a path of length > 1 -> playing becomes true"
    - "after speedMs, the scheduled timeout fires: index is not at the last node -> index increments by 1; onStep(nodeId, index) fires via the index-change effect"
  happy_reach_end_no_loop:
    - "index reaches path.nodeIds.length - 1 and loop is false -> playing is set to false and opts.onEnd() fires; no further timers are scheduled"
  happy_reach_end_loop:
    - "index reaches the last node and loop is true -> index resets to 0 and playback continues auto-advancing (no onEnd call)"
  happy_manual_controls:
    - "toggle() flips playing when a playable path exists; restart() resets index to 0 without touching playing; stepForward()/stepBack() move index by one and force playing to false (pausing auto-advance)"
  edge_boundary_null_path:
    - "path is null -> play()/toggle() are no-ops (guarded by `if (!path...) return`); restart()/stepForward()/stepBack() are also no-ops; currentNodeId is null"
  edge_boundary_empty_nodeids:
    - "path.nodeIds is [] -> play()/toggle() are no-ops (length-0 guard); the auto-advance effect's own `path.nodeIds.length === 0` guard prevents scheduling a timer even if playing were somehow true"
  edge_boundary_path_identity_change:
    - "the `path` argument changes identity mid-playback (a new path selected while playing) -> the render-time comparison `path !== trackedPath` resets index to 0 and playing to false synchronously (via `resolvedIndex`/`resolvedPlaying`) for the CURRENT render, before the effect that persists `trackedPath` even commits"
  edge_boundary_stale_callback_refs:
    - "opts.onStep / opts.onEnd change identity across renders while a timer is already scheduled -> onStepRef/onEndRef are updated on every render (not just effect-dependency renders), so the eventually-fired timeout always calls the LATEST callback, never a stale closure"
  edge_boundary_step_clamping:
    - "stepForward() at the last index stays at the last index (Math.min clamp); stepBack() at index 0 stays at 0 (Math.max clamp) — neither over/under-runs nodeIds"
mermaid: |
  flowchart TD
    A[play called] --> B{path exists and has nodes?}
    B -->|no| C[no-op]
    B -->|yes| D[playing = true]
    D --> E[setTimeout speedMs]
    E --> F{at last node?}
    F -->|no| G[index += 1] --> H[onStep fires] --> E
    F -->|yes, loop| I[index = 0] --> E
    F -->|yes, no loop| J[playing = false; onEnd fires]
```
