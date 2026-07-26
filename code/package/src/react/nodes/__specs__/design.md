# FlowNode — design

> References `research.md` (Phase 0). Lives at `src/react/nodes/__specs__/design.md`.

## Anatomy diagram

```
              ● target handle (orients by flow direction)
   +------------------------------------------+
   |  [icon]  Label text            [ + ]      |   ← fc-node__row
   |  · · · · · · · · · · · · · · · · · · · ·   |
   |  Optional description (when expanded)     |   ← fc-node__description
   +------------------------------------------+
              ● source handle (orients by flow direction)
```

Parts named:
1. `root` (`.fc-node--<type>`) — the bordered surface; border color = the type's status token.
2. `target handle` / `source handle` (`.fc-handle`) — React Flow connection points; sides derive from direction (TD→top/bottom, LR→left/right, BT/RL mirrored).
3. `icon` (`.fc-node__icon`) — per-type glyph.
4. `label` (`.fc-node__label`) — the node text.
5. `expand` (`.fc-node__expand`) — toggle that reveals `description` (only when a description exists).
6. `description` (`.fc-node__description`) — optional secondary text.

## State matrix

Node type is the "variant". States: rest, hover, active (`activeNodeId`), on-path (selected path), dimmed (off selected path).

| type | rest | hover | active | on-path | dimmed |
|---|---|---|---|---|---|
| `start` | border `--fc-node-start` | `state-hover-contained` | `fc-node--active` ring | `fc-node--on-path` ring | `fc-node--dimmed` (opacity) |
| `end` | border `--fc-node-end` | `state-hover-contained` | `fc-node--active` | `fc-node--on-path` | `fc-node--dimmed` |
| `action` | border `--fc-node-action` | `state-hover-contained` | `fc-node--active` | `fc-node--on-path` | `fc-node--dimmed` |
| `decision` | border `--fc-node-decision` | `state-hover-contained` | `fc-node--active` | `fc-node--on-path` | `fc-node--dimmed` |
| `error` | border `--fc-node-error` | `state-hover-contained` | `fc-node--active` | `fc-node--on-path` | `fc-node--dimmed` |
| `warning` | border `--fc-node-warning` | `state-hover-contained` | `fc-node--active` | `fc-node--on-path` | `fc-node--dimmed` |
| `link` | border `--fc-node-link` | `state-hover-contained` | `fc-node--active` | `fc-node--on-path` | `fc-node--dimmed` |

### Cross-variant consistency rule

> All seven node types share the SAME state classes for active / on-path / dimmed / hover —
> only the rest-state border color token differs per type. No per-type invention of hover /
> active behavior. This is the contract the state-vocabulary gate enforces.

## Token bindings

| Part | State | Token |
|---|---|---|
| root | rest.border | `var(--fc-node-<type>)` |
| root | rest.bg | `var(--fc-node-bg)` |
| root | rest.fg | `var(--fc-node-text)` |
| root | hover | inherits from `state-hover-contained` (no direct override) |
| description | divider | `var(--fc-drawer-border)` |
| handle | fill | `#a1a1aa` (neutral, non-status) |

No hardcoded status colors in the component source — every status color is a `--fc-*` token.

## ARIA pattern

Reference: https://www.w3.org/WAI/ARIA/apg/patterns/ (no exact APG pattern for a graph node;
the node is a labelled interactive region).
What we use: the node root carries `aria-label="<type> node: <label>"`; the expand control is a
`<button>` with `aria-expanded` + `aria-label`. React Flow provides the pane's
keyboard/focus handling; nodes are focusable within it.

## Agent affordances

`data-node-id`, `data-node-type`, `data-agent-action="select-node"`, `data-agent-step="node"`,
`aria-label` on the root; `data-agent-action="toggle-description"` on the expand control.

## Responsive / mobile

`min-width: 120px`, fluid width via React Flow node sizing; touch targets ≥ the expand button's
18px (acceptable for a dense diagram node; the pane itself is pan/pinch-zoom via React Flow).

<!-- design-locked: 2026-07-26 by:agent -->
