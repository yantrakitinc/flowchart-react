# play-path-movie

## Target

local — http://localhost:6006 (this package's Storybook, the FlowChart demo story)

## Preconditions

Storybook is running locally with `autoPlay=false` and `showPlaybackControls=true` (the story's defaults), and a
`chart` loaded that produces at least one path with >= 3 nodes. Note the story's `playbackSpeedMs` value (or its
default, 1200ms) before starting.

## Steps

1. Confirm the playback bar is visible.
   - selector: `[data-testid="fc-playback"]`
   - expected: `[data-testid="fc-playback-play"]`, `[data-testid="fc-playback-step-forward"]`,
     `[data-testid="fc-playback-step-back"]`, `[data-testid="fc-playback-restart"]`, and
     `[data-testid="fc-playback-count"]` are all present; NO `[data-testid="fc-playback-pause"]` yet (Play is
     shown, not Pause, while stopped).
2. Click Play.
   - selector: `[data-agent-action="playback-play"]`
   - expected: the Play button is replaced by `[data-agent-action="playback-pause"]`; the count readout
     (`fc-playback-count`) advances roughly every `playbackSpeedMs`; the currently-playing node shows an active
     highlight on the canvas.
3. Adversarial — click Pause partway through.
   - selector: `[data-agent-action="playback-pause"]`
   - expected: advancing stops immediately; the count readout freezes at its current value; the Play button
     reappears; waiting several more seconds confirms the count does NOT continue advancing.
4. Adversarial — from the paused state, click Step Forward twice in a row.
   - selector: `[data-agent-action="playback-step-forward"]`
   - expected: the count increases by exactly 1 per click, clamped at the total (it never exceeds "<total> /
     <total>"); playback remains paused (no auto-advance resumes on its own).
5. Adversarial — click Step Back from a non-zero index.
   - selector: `[data-agent-action="playback-step-back"]`
   - expected: the count decreases by exactly 1 per click, clamped at a minimum of "1 / <total>" (never below the
     first node).
6. Click Restart.
   - selector: `[data-agent-action="playback-restart"]`
   - expected: the count resets to "1 / <total>"; the active-node highlight moves back to the path's first node;
     if playback was running before Restart, it keeps running afterward (Restart alone does not pause it).
7. Adversarial — let playback run to completion WITHOUT enabling loop (default state).
   - expected: on reaching the last node, the Play button reappears (auto-paused); the count holds at
     "<total> / <total>"; no further auto-advance occurs without another Play click.
8. Adversarial — rapid-fire click Play, then Pause, then Play, then Restart, all within about one second.
   - expected: no crash, no stuck/frozen control, no doubled advance-rate; the controls end in one coherent,
     legible play/pause + count state.
9. Adversarial — while playback is actively running, click a DIFFERENT path in the path drawer (see
   `select-path.md`).
   - expected: playback resets to the new path's first node, paused, showing "1 / <new total>" — it must NOT
     keep advancing through the old path's remaining nodes, and must NOT show a mix of old/new path highlighting.

If a step fails twice, record the flow FAIL with a note and STOP — do not loop the step.

## Assertions

- The count readout and the active-node highlight MUST stay in sync at every step.
- Play/Pause MUST always show the correct opposite control for the current state (never both, never neither).
- Switching paths mid-playback MUST NOT leave the old path's highlight lingering, and MUST NOT keep the old
  path's timer running.
- No step above may throw, freeze the controls, or leave `fc-playback-count` in a state that doesn't match what
  is actually highlighted on the canvas.

## Report

POST the results to `/api/v1/manual-results/play-path-movie`. Also print the full results to the console/chat for
the human copy-back fallback.
