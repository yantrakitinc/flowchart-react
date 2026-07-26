# PlaybackControls

## Purpose

Transport controls for path "movie mode" playback: step-back, play/pause toggle, step-forward and
restart, plus a `"<step> / <total>"` readout.

## Paths

See the `paths:` field in the machine spec fenced block below for the full happy / edge-case enumeration.

```yaml
flow: PlaybackControls
kind: composition-root
source: src/react/PlaybackControls.tsx
symbol: PlaybackControls
inputs:
  playing: "boolean — whether playback is currently auto-advancing"
  index: "number — current step index (0-based)"
  total: "number — total steps in the path being played"
  onPlay: "() => void — starts (or resumes) auto-advancing"
  onPause: "() => void — stops auto-advancing"
  onRestart: "() => void — resets the current step back to the first node"
  onStepForward: "() => void — moves one step forward"
  onStepBack: "() => void — moves one step back"
returns:
  - "JSX.Element — fc-playback transport bar (step-back, play-or-pause, step-forward, restart, count readout)"
throws: []
calls:
  - "onPlay / onPause / onRestart / onStepForward / onStepBack (caller-supplied props, typically from usePlayback)"
called_by:
  - "src/react/FlowChart.tsx (rendered when showPlaybackControls is true and a path is selected)"
emits_events: []
side_effects_on_success:
  - "invokes exactly one of the caller-supplied transport callbacks per button click"
side_effects_on_failure: none
transaction: none
test: src/react/PlaybackControls.test.tsx
spec: src/react/__specs__/spec.md
ai_agent_action:
  when_to_call: "the user wants to play/pause, step through, or restart movie-mode playback of the currently selected path"
  when_not_to_call: "no path is currently selected — FlowChart does not render this component in that state"
  natural_language_examples:
    - "Play the happy path"
    - "Pause playback"
    - "Step forward to the next node"
    - "Restart the movie from the beginning"
  agent_invocation: "UI click on [data-testid=\"fc-playback-play\"|\"fc-playback-pause\"|\"fc-playback-step-forward\"|\"fc-playback-step-back\"|\"fc-playback-restart\"]"
  confirm_with_user_before: "none — non-destructive playback control"
  summarize_to_user_after: "Playing." / "Paused at step <index+1> of <total>." / "Restarted."
paths:
  happy_play_pause_toggle:
    - "playing is false -> the ▶ button renders (data-testid=\"fc-playback-play\", aria-label=\"Play\"); clicking it calls onPlay"
    - "playing is true -> the ⏸ button renders instead (data-testid=\"fc-playback-pause\", aria-label=\"Pause\"); clicking it calls onPause"
  happy_step:
    - "clicking data-testid=\"fc-playback-step-forward\" calls onStepForward; clicking data-testid=\"fc-playback-step-back\" calls onStepBack"
  happy_restart:
    - "clicking data-testid=\"fc-playback-restart\" (aria-label=\"Restart\") calls onRestart"
  edge_boundary_count_readout:
    - "total > 0 -> the count readout renders \"<index + 1> / <total>\" (1-based display of a 0-based index)"
    - "total === 0 -> the count readout renders \"0 / 0\" regardless of index (the `total > 0 ? index + 1 : 0` guard)"
mermaid: |
  flowchart TD
    A[render] --> B{playing?}
    B -->|true| C[render pause button]
    B -->|false| D[render play button]
    C --> E[click -> onPause]
    D --> F[click -> onPlay]
    A --> G[step-back / step-forward / restart buttons always render]
    G --> H[click -> onStepBack / onStepForward / onRestart]
```
