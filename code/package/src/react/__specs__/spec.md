# src/react — interactive React Flow rendering layer (with movie-mode playback)

## Concept

This folder is the package's ONLY consumer-facing surface: a single published React component (`FlowChart`) that
takes either Mermaid-like `chart` DSL text or a pre-built renderer-agnostic `iFlowGraph` IR object, lays it out
(async, dagre by default via `../layout/`), and renders it on `@xyflow/react` with a rich per-node-type registry,
semantic edge styling driven by CSS custom properties, an optional path-selector drawer, and "movie mode" — path
autoplay/step-through transport controls. It is the ONLY layer in this package allowed to import `@xyflow/react`;
every other folder (`ir/`, `parse/`, `layout/`, `paths/`) is renderer-agnostic and framework-blind. This folder owns
zero domain logic of its own (parsing, layout math, and path detection are all delegated) — its job is exclusively
composition, React state (selection + playback), and presentation.

## Files

1. `types.ts` — SETUP: shared prop/data contracts (`iFlowChartProps`, `iFlowNodeData`, `iNodeRegistry`, `iDrawerPosition`) consumed by every other file in this folder.
2. `FlowChart.tsx` — the package's single exported top-level component; composition root wiring parse → layout → path-detection → playback → React Flow render.
3. `usePaths.ts` — runs `../paths/detectPaths` over the graph and manages "currently selected path" state (controlled or uncontrolled).
4. `usePlayback.ts` — self-scheduling timer hook driving movie-mode playback (play/pause/toggle/restart/step) over a single `iFlowPath`.
5. `PlaybackControls.tsx` — the playback transport UI (step-back / play-or-pause / step-forward / restart / count readout).
6. `PathDrawer.tsx` — lists every detected path and lets the caller select/deselect one to highlight.
7. `nodes/FlowNode.tsx` — the default renderer used for all 7 `iNodeType` values; shape/color driven by CSS classes, structure + connection handles + expand-for-description affordance supplied here.
8. `nodes/registry.ts` — `defaultNodeTypes` (every `iNodeType` → `FlowNode`) and `resolveNodeTypes` (merges caller overrides over the defaults).
9. `edges/edgeStyle.ts` — `toReactFlowEdge`, converting a renderer-agnostic `iRenderEdge` into an `@xyflow/react` `Edge` with semantic color/dash/thickness + dimmed-when-off-path opacity.
10. `index.ts` — SETUP: this folder's public barrel (`FlowChart`, `FlowNode`, `PathDrawer`, `PlaybackControls`, `usePaths`, `usePlayback`, `defaultNodeTypes`, `resolveNodeTypes`, and every public type).

Tests are co-located as sibling `*.test.ts(x)` files next to their source (this repo's uniform convention) rather
than nested under a `__tests__/` subfolder — a documented repo-wide layout choice, not a per-file gap.

## Out of scope

- Parsing the Mermaid-like DSL text itself — owned by `../parse/` (`parseFlowchart`, `FlowchartParseError`); this folder only calls it and renders its result or its thrown error.
- Computing node/edge layout coordinates — owned by `../layout/` (`layout`, `iLayoutEngine`, `iPositionedGraph`); this folder only invokes the engine and renders the positions it returns.
- Detecting start→end routes through the graph or classifying them happy/warning/error/neutral — owned by `../paths/detectPaths`; `usePaths` only calls it and manages selection on top.
- The renderer-agnostic flow-graph type model itself (`iFlowNode`, `iFlowEdge`, `iFlowGraph`, `iNodeType`, `iEdgeType`, `iDirection`) — owned by `../ir/`.
- Any HTTP, database, server-side rendering, or authentication behavior — this is a published, client-only (`'use client'`) rendering package with no backend of its own.
- Persisting selection or playback state across sessions/reloads — both are in-memory only (or fully caller-controlled via `selectedPathId`/`onPathChange`).
- Internationalizing this package's own default chrome strings (parse-error text, loading text, playback-control aria-labels) — see `cross_cutting.i18n` below; no i18n routing layer exists in this folder today.

## Machine spec

```yaml
feature_name: react-rendering-layer
scope_authority: claude
ui_design: not-applicable
ui_design_reason: >-
  This folder ships as part of a published npm component library (PACKAGE_PROJECT_STANDARDS), not an in-app
  design-system tier — it is governed directly by ACCESSIBILITY/AGENT_AFFORDANCES/DESIGN_TOKENS/MOBILE_FIRST in
  this spec rather than COMPONENT_CREATION's human design-lock ceremony (no `ui/<flow>.md` is produced for this
  feature).

owns:
  - src/react/types.ts
  - src/react/FlowChart.tsx
  - src/react/usePaths.ts
  - src/react/usePlayback.ts
  - src/react/PlaybackControls.tsx
  - src/react/PathDrawer.tsx
  - src/react/nodes/FlowNode.tsx
  - src/react/nodes/registry.ts
  - src/react/edges/edgeStyle.ts
  - src/react/index.ts

operation:
  name: Render an interactive flowchart, with path selection and movie-mode playback
  slug: "(public)"
  description: >-
    Parses/uses a flow IR, lays it out asynchronously, and renders it on React Flow with a node-type registry,
    semantic edge styling, an optional path-selector drawer, and optional autoplay/step-through path playback.

invocation:
  type: ui
  path: >-
    N/A — no route; imported as a React component (`import { FlowChart } from '@yantrakit/flowchart-react'`),
    barrel at src/react/index.ts.
  request_schema: iFlowChartProps (src/react/types.ts)
  response_schema: JSX.Element (fc-flowchart container — canvas | parse-error box)

chat_agent:
  when_to_call: >-
    The user wants to visually render a flow/diagram (Mermaid-like chart text or an iFlowGraph IR object) inside
    a React app, optionally highlighting a path or auto-playing it as a step-through "movie".
  when_not_to_call: >-
    Rendering a graph with no start/end route semantics (e.g. a generic non-directed node graph), or an
    environment with no DOM/no client hydration (this component is 'use client' only).
  natural_language_examples:
    - "Add the flowchart component to this page"
    - "Render this mermaid-like chart as an interactive diagram"
    - "Play the happy path as a movie"
    - "Let the user pick which path to highlight"
  confirm_before: "none — read-only render; no destructive action"
  summarize_after_success: "Rendered the flowchart (N nodes, M detected path(s))."
  summarize_after_failure: "Flowchart failed to parse: <parser error message>."

cross_cutting:
  wcag: >-
    WCAG 2.2 AA. Every node/button carries data-testid + aria-label; the expand affordance uses aria-expanded;
    the parse-error box uses role="alert"; path-drawer items use aria-pressed for selection state; no
    hover-only, drag-only, or image-only (label-less) interactions (nodesDraggable/nodesConnectable are false —
    click and the expand button are the only node interactions).
  auth: "n/a — no authentication/authorization surface; public rendering component, no DB, no permission gate"
  mobile: >-
    MOBILE_FIRST. `fc-flowchart--drawer-<position>` reorders canvas/drawer/playback via flexbox so narrow
    viewports stack sanely; `height` accepts any CSS length (not just a desktop-fixed px); playback controls and
    path-drawer buttons are touch-sized tap targets.
  i18n: >-
    n/a — category:primitive rendering library (README.yaml). Ships a small set of default English chrome
    strings (parse-error text, "Laying out…" loading text, playback-control aria-labels, expand/collapse
    aria-labels) with no i18n routing layer; a consuming app needing localized chrome overrides node rendering
    via `nodeTypes` / a custom component. Flagged as a candidate gap in standards-compliance.md — not silently
    marked compliant.

authorization:
  layer_a_brand: "n/a — no DB/authorization surface (pure client rendering component)"
  rls_directive: "n/a — no schema, no DB"
  policies: []
  permission_slugs_used: []
  rls_deny_test: "n/a — no DB writes; nothing to deny-test"

links:
  flows:
    - src/react/__specs__/flows/render-flowchart.flow.md
    - src/react/__specs__/flows/select-path.flow.md
    - src/react/__specs__/flows/click-node.flow.md
    - src/react/__specs__/flows/play-path-movie.flow.md
  tests:
    - src/react/FlowChart.test.tsx
    - src/react/FlowChart.playback.test.tsx
    - src/react/usePaths.test.ts
    - src/react/usePlayback.test.ts
    - src/react/PlaybackControls.test.tsx
    - src/react/PathDrawer.test.tsx
    - src/react/nodes/FlowNode.test.tsx
    - src/react/nodes/registry.test.ts
    - src/react/edges/edgeStyle.test.ts
  manual:
    - src/react/__specs__/manual/render-flowchart.md
    - src/react/__specs__/manual/select-path.md
    - src/react/__specs__/manual/click-node.md
    - src/react/__specs__/manual/play-path-movie.md
```
