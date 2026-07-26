# click-node

## Target

local — http://localhost:6006 (this package's Storybook, the FlowChart demo story)

## Preconditions

Storybook is running locally with a `chart` loaded that contains at least one node WITH a `description` and at
least one node WITHOUT one. The story should have an Actions panel (or equivalent) wired to `onNodeClick` so
clicks are observable; if not, watch the story's own visible feedback for `onNodeClick`.

## Steps

1. Click the body of a node that has NO description (no sibling `[data-testid="fc-node-<id>-expand"]" exists for it).
   - selector: `[data-testid="fc-node-<id>"]`
   - expected: the click is observable via the Actions panel / story feedback (onNodeClick fired with that node's
     id and data); confirm no expand button (`+`/`−`) is rendered anywhere on that node.
2. Click the body of a node that DOES have a description.
   - expected: onNodeClick fires with that node's id/data, same as step 1.
3. Click that same node's expand button.
   - selector: `[data-testid="fc-node-<id>-expand"]`, initial `aria-expanded="false"`
   - expected: `aria-expanded` flips to `"true"`; the description text becomes visible; check the Actions
     panel — the onNodeClick action from step 2 must NOT fire again for this specific click (the expand button
     stops the click from bubbling to the node).
4. Click the expand button again (collapse).
   - expected: `aria-expanded` flips back to `"false"`; the description text hides.
5. Adversarial — rapidly double-click (or triple-click) the expand button in quick succession.
   - expected: the UI ends in one stable, deterministic expanded-or-collapsed state — no duplicated description
     blocks, no torn/inconsistent `aria-expanded` value, no console error.
6. Adversarial — attempt to DRAG a node from one position to another (mousedown, move, mouseup).
   - expected: the node does NOT move (nodesDraggable is disabled); dragging must not be required for, or
     interfere with, the plain click affordance from step 1.
7. Adversarial — attempt to drag FROM a node's connection handle to another node (simulate a connect gesture).
   - expected: no new edge/connection is created (nodesConnectable is disabled).

If a step fails twice, record the flow FAIL with a note and STOP — do not loop the step.

## Assertions

- Clicking the expand button MUST NOT also fire `onNodeClick` for the underlying node (no double-fire).
- Nodes MUST NOT be draggable or connectable.
- Every node exposes `data-testid`, `data-agent-action="select-node"`, and a plain-English `aria-label`
  (`"<type> node: <label>"`) — spot-check via the browser's accessibility tree, not just the DOM.
- Rapid repeated clicks on the expand button MUST NOT produce a torn or duplicated UI state.

## Report

POST the results to `/api/v1/manual-results/click-node`. Also print the full results to the console/chat for the
human copy-back fallback.
