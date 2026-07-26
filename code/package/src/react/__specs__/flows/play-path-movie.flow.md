# play-path-movie

## Purpose

Drives movie-mode autoplay/step-through transport over a single selected `iFlowPath`.

## Paths

See the `paths:` field in the machine spec fenced block below for the full happy / edge-case enumeration.

```yaml
flow: usePlayback
kind: helper
source: src/react/usePlayback.ts
symbol: usePlayback
inputs:
  path: "iFlowPath | null — the path to play; null makes every control a no-op"
  opts: "iUsePlaybackOptions — { speedMs?: number (default 1200), loop?: boolean (default false), onStep?: (nodeId, index) => void, onEnd?: () => void }"
returns:
  - "iUsePlaybackResult { playing, index, currentNodeId, play, pause, toggle, restart, stepForward, stepBack }"
throws: []
calls:
  - "setTimeout / clearTimeout (browser timer)"
  - "opts.onStep (caller-supplied, optional)"
  - "opts.onEnd (caller-supplied, optional)"
called_by:
  - "FlowChart (drives PlaybackControls, node/edge highlight-by-index, and the effective active node id)"
emits_events: []
side_effects_on_success:
  - "schedules a self-rescheduling setTimeout chain while `playing`"
  - "invokes onStep(nodeId, index) on every index change (auto-advance, manual step, or restart) after the initial mount"
  - "invokes onEnd() once, on reaching the last node without `loop`"
side_effects_on_failure: none
transaction: none
test:
  - src/react/usePlayback.test.ts
  - src/react/FlowChart.playback.test.tsx
spec: src/react/__specs__/spec.md
ai_agent_action:
  when_to_call: "The user wants to auto-play or step through a detected path node-by-node (\"movie mode\") — e.g. narrating a happy-path or an error path."
  when_not_to_call: "No path is available to play (empty/disconnected graph, or `showPlaybackControls=false`) — there is no path to step through."
  natural_language_examples:
    - "Play this path as a movie"
    - "Step through the flow one node at a time"
    - "Auto-play the flowchart on load"
    - "Loop the playback"
  agent_invocation: >-
    FlowChart props (`autoPlay`, `playbackSpeedMs`, `loop`), or UI clicks on
    [data-testid="fc-playback-play|pause|step-forward|step-back|restart"]
    (data-agent-action="playback-play|playback-pause|playback-step-forward|playback-step-back|playback-restart")
  confirm_with_user_before: "none — read-only playback, fully pausable/restartable"
  summarize_to_user_after: "Played through \"<path.name>\" (<total> node(s))."
paths:
  happy_autoplay:
    - "FlowChart's `autoPlay` prop is true; once `positioned` and `playingPath` both exist, a one-shot effect (hasAutoStartedRef guard) calls playback.play() exactly once"
    - "`playing` becomes true; a setTimeout(speedMs) chain begins"
    - "each tick advances `index` by 1; onStep(nodeId, index) fires -> FlowChart's onPlaybackStep(nodeId, index, nodeDataFor(nodeId)) fires with that node's rendered iFlowNodeData"
    - "the current node/edges up to `index` are highlighted (fc-node--active on the current node; on-path/dimmed classes reflect `playingPath.nodeIds.slice(0, index+1)`)"
    - "reaching `path.nodeIds.length - 1` with `loop` false: setPlaying(false), onEnd() fires -> FlowChart's onPlaybackEnd() fires -> PlaybackControls shows the Play button again"
  happy_manual_play_pause:
    - "user clicks fc-playback-play (data-agent-action=\"playback-play\") -> FlowChart.handlePlay -> setEngaged(true) + playback.play()"
    - "user clicks fc-playback-pause (data-agent-action=\"playback-pause\") mid-playback -> playback.pause() -> playing becomes false; the scheduling effect's cleanup clears the pending timer; index holds at its current value"
  happy_step_forward_back:
    - "user clicks fc-playback-step-forward (data-agent-action=\"playback-step-forward\") -> stepForward(): pauses, and index is clamped to min(current+1, length-1)"
    - "user clicks fc-playback-step-back (data-agent-action=\"playback-step-back\") -> stepBack(): pauses, and index is clamped to max(current-1, 0)"
    - "each manual step still fires onStep via the index-change effect — guarded by hasMountedRef so the FIRST render of a path never double-fires onStep for index 0"
  happy_restart:
    - "user clicks fc-playback-restart (data-agent-action=\"playback-restart\") -> FlowChart.handleRestart -> setEngaged(true) + playback.restart()"
    - "index resets to 0 WITHOUT changing `playing` — if it was already playing, it keeps playing from the start; if paused, it stays paused at index 0"
  edge_loop_true:
    - "`loop` is true and playback reaches the last index"
    - "instead of pausing, index resets to 0 and `playing` remains true — the non-loop-only onEnd branch never runs while looping, so onEnd is NEVER fired in this mode"
  edge_boundary_no_playable_path:
    - "`playingPath` (selected path, or paths[0] fallback) is null — e.g. an empty or fully disconnected graph with zero detected paths"
    - "`showPlayback` resolves false (showPlaybackControls && playingPath !== null) -> PlaybackControls is not rendered at all"
    - "usePlayback(null, opts): play()/toggle() are no-ops (`if (!path) return`); currentNodeId is null; the ticking/onStep effects both short-circuit on the null-path guard"
  edge_boundary_single_node_path:
    - "`path.nodeIds.length === 1`"
    - "play(): sets playing true; on the very first tick, `atEnd = index >= length - 1` is already true (0 >= 0) — with `loop` true it resets to 0 (a visual no-op) and keeps playing; with `loop` false it immediately pauses and fires onEnd on that first tick"
  edge_concurrent_path_changes_mid_playback:
    - "the `path` argument's identity changes (user selects a different path, or the graph re-parses) WHILE playback is actively running"
    - "usePlayback detects `path !== trackedPath` during render and synchronously resets trackedPath/index/playing (before the timer effect re-runs) — the new path always starts paused at index 0, never at a stale index carried over from the old path"
    - "any in-flight setTimeout scheduled against the OLD path/index is cleared by that effect's own cleanup function once its dependency array changes"
  edge_concurrent_rapid_repeated_clicks:
    - "user rapidly clicks Play twice, or Play then Restart, before a re-render has landed"
    - "play()/restart() are plain setState calls; React batches/dedupes identical repeated state updates, and the single scheduling effect is keyed on `[playing, index, path, speedMs, loop]` — at most ONE timer is ever active per (playing, index) pair, so no double-speed advance can occur"
mermaid: |
  flowchart TD
    A[autoPlay=true & path ready] -->|first render only| B[play()]
    C[user clicks Play] --> B
    B --> D[playing=true; schedule setTimeout(speedMs)]
    D --> E{index at last node?}
    E -->|no| F[index += 1; onStep fires]
    F --> D
    E -->|yes, loop=true| G[index = 0; keep playing]
    G --> D
    E -->|yes, loop=false| H[playing=false; onEnd fires]
    I[user clicks Pause] --> J[playing=false; timer cleared]
    K[user clicks Step Forward/Back] --> L[pause; clamp index +-1; onStep fires]
    M[user clicks Restart] --> N[index=0; playing unchanged]
    O[path identity changes] --> P[trackedPath/index/playing reset to 0/false synchronously]
```
