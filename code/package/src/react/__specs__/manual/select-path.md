# select-path

## Target

local — http://localhost:6006 (this package's Storybook, the FlowChart demo story)

## Preconditions

Storybook is running locally and the FlowChart story is loaded with a `chart` that produces at least 2 detected
paths (e.g. a decision node branching to two distinct end nodes — one happy, one error/warning). If the story's
default chart has only one path, switch the `chart` knob to one of the story's presets that branches.

## Steps

1. Confirm the drawer is visible with at least 2 selectable items.
   - selector: `[data-testid="fc-path-drawer"]`, child items `[data-agent-action="select-path"]`
   - expected: >= 2 items are present, none has `aria-pressed="true"` yet.
2. Click the first path item.
   - selector: `[data-testid^="fc-path-"]` (first one)
   - expected: that item's `aria-pressed` becomes `"true"`; on the canvas, nodes/edges on that path show the
     "on path"/full-opacity styling, and every other node/edge dims (reduced opacity).
3. Adversarial — click that SAME path item again (deselect).
   - expected: `aria-pressed` flips back to `"false"`; ALL dimming/highlighting clears across the whole canvas —
     no node or edge remains faded.
4. Adversarial — click a DIFFERENT path item, then IMMEDIATELY click a third path item (or the first again) before
   any visual transition completes.
   - expected: only the LAST-clicked path ends up highlighted/selected; at no point do two path items show
     `aria-pressed="true"` simultaneously (check mid-transition if the UI animates).
5. Adversarial — if the story exposes a controlled `selectedPathId` knob, set it to a made-up id that does not
   match any real path (e.g. `"path-does-not-exist"`).
   - input: `"path-does-not-exist"`
   - expected: no crash/blank screen; the drawer shows no item as selected; the canvas shows no highlight (falls
     back cleanly to the "nothing selected" state).
6. Adversarial — switch the `chart` knob to a completely different diagram while a path is still selected.
   - expected: the old selection does not visually linger on the new diagram (no stale highlight); no thrown error.

If a step fails twice, record the flow FAIL with a note and STOP — do not loop the step.

## Assertions

- Exactly one path-drawer item MUST ever show `aria-pressed="true"` at a time (or zero, never more than one).
- Selecting, deselecting, and re-selecting MUST NOT throw or blank the canvas.
- An unknown/stale `selectedPathId` MUST NOT crash the render.
- Switching the underlying chart/graph MUST NOT leave a highlight from the previous diagram's path.

## Report

POST the results to `/api/v1/manual-results/select-path`. Also print the full results to the console/chat for the
human copy-back fallback.
