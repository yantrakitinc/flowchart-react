# User Journey Catalog — diagram-as-code / flowchart component for web apps

Discovered outside-in (repo-blind): every journey below is derived from the product category
(a developer-facing React flowchart/diagram library) and from comparable peers — Mermaid.js,
React Flow (@xyflow/react), Reaflow, ELK.js/dagre auto-layout, and adjacent LLM/diagram-generation
conventions. No journey was derived from this repo's own flows, specs, or code
(`not_derived_from_our_flows: true` on every entry).

The MATCH step maps every journey's `maps_to_flows:` to the per-exported-symbol flow docs under
`code/package/src/*/__specs__/flows/`. The RECONCILE step (reading the actual specs/flows/source)
turned up four journeys with no legitimate flow — `export-diagram-as-image`,
`undo-redo-diagram-edit-history`, `build-decision-tree-editor-drag-connect`, and
`realtime-collaborative-diagram-editing` — each contradicted by an explicit, permanent product-scope
decision (see `retired/`), not merely "not built yet". Per `USER_JOURNEYS.md.journey_loop.update`
("retire journeys that no longer fit"), those four are retired to `retired/` and excluded from the
active catalog + counts below. Two journeys (`migrate-from-previous-major-version`,
`evaluate-library-before-adopting`) are satisfied by real repository documentation artifacts rather
than a runtime flow — cited as `docs:<file>` in their `maps_to_flows:` — since a semver-migration
guide and a pre-adoption evaluation are not exported-function behaviors.

## Coverage summary

- unmapped_journeys: 0
- orphan_flows: 0

## Journeys

| ID | Slug | Persona | Intent | Maps to |
|----|------|---------|--------|---------|
| J-001 | [render-flowchart-from-text-dsl](./J-001-render-flowchart-from-text-dsl.md) | First-time integrator, product engineer | Author a diagram from a compact text/DSL description | parse-flowchart, render-flowchart, flow-chart |
| J-002 | [render-flowchart-from-structured-data](./J-002-render-flowchart-from-structured-data.md) | Internal-tools engineer with existing JSON workflow data | Render a diagram directly from a nodes/edges data object | render-flowchart, flow-chart, isNodeType |
| J-003 | [semantic-color-branches-success-error-warning](./J-003-semantic-color-branches-success-error-warning.md) | Incident-response runbook developer | Semantically color success/error/warning branches | to-react-flow-edge, isEdgeType |
| J-004 | [interactive-clickable-custom-nodes](./J-004-interactive-clickable-custom-nodes.md) | Decision-tree quiz app developer | Make each node a custom interactive React component | click-node, flow-node, resolve-node-types |
| J-005 | [auto-layout-top-down-left-right](./J-005-auto-layout-top-down-left-right.md) | Org-chart / approval-chain developer | Auto-layout the diagram without hand-positioning | layout, dagre-engine-run, elk-engine-run, load-elk, isDirection |
| J-006 | [highlight-all-paths-start-to-end](./J-006-highlight-all-paths-start-to-end.md) | Compliance/audit tool developer | Find and highlight all paths between a start and end node | detect-paths, select-path, use-paths, path-drawer, play-path-movie, use-playback, playback-controls |
| J-007 | [theme-diagram-to-app-design-tokens](./J-007-theme-diagram-to-app-design-tokens.md) | Design-systems engineer | Theme the diagram to the app's own design tokens / dark mode | render-flowchart, to-react-flow-edge |
| J-008 | [agent-read-mutate-write-diagram](./J-008-agent-read-mutate-write-diagram.md) | AI workflow-automation agent | Read, mutate, and write back a diagram programmatically | parse-flowchart, serialize-flowchart |
| J-009 | [validate-diagram-surface-parse-errors](./J-009-validate-diagram-surface-parse-errors.md) | Developer building a diagram-import feature | Validate/parse a diagram and surface actionable errors | parse-flowchart, render-flowchart |
| J-010 | [migrate-from-previous-major-version](./J-010-migrate-from-previous-major-version.md) | Maintainer doing a routine dependency upgrade | Migrate across a breaking major-version bump | docs:MIGRATION.md |
| J-012 | [persist-diagram-as-json-save-load](./J-012-persist-diagram-as-json-save-load.md) | Admin-tool developer | Save a diagram as JSON and reload it identically later | serialize-flowchart, isNodeType |
| J-013 | [evaluate-library-before-adopting](./J-013-evaluate-library-before-adopting.md) | Senior engineer doing a build-vs-buy spike | Evaluate the library (size/license/types/activity) before adopting | docs:README.md |
| J-014 | [integrate-in-nextjs-ssr-app](./J-014-integrate-in-nextjs-ssr-app.md) | Next.js App Router developer | Integrate the diagram in an SSR/SSG framework without hydration errors | render-flowchart |
| J-015 | [pan-zoom-minimap-large-diagram-navigation](./J-015-pan-zoom-minimap-large-diagram-navigation.md) | Ops-dashboard developer with a 100+ node graph | Pan/zoom/minimap-navigate a large diagram | render-flowchart |
| J-018 | [accessible-screen-reader-keyboard-diagram](./J-018-accessible-screen-reader-keyboard-diagram.md) | Accessibility auditor | Confirm keyboard + screen-reader navigability | click-node, flow-node, playback-controls |
| J-020 | [switch-from-mermaid-after-hitting-limits](./J-020-switch-from-mermaid-after-hitting-limits.md) | Developer migrating off Mermaid | Port a diagram over after Mermaid's interactivity limits blocked a requirement | parse-flowchart |
| J-021 | [typescript-strict-types-for-nodes-edges](./J-021-typescript-strict-types-for-nodes-edges.md) | Strict-mode TypeScript developer | Get generic, strongly-typed node/edge data | isNodeType, isEdgeType, isDirection |
| J-022 | [llm-generates-diagram-from-natural-language](./J-022-llm-generates-diagram-from-natural-language.md) | LLM-backed "describe your process" feature | Turn natural language into a validated, rendered diagram | parse-flowchart |

## Flow → journey (reverse map; every flow doc must appear at least once)

| Flow doc | Journeys |
|---|---|
| `src/ir/__specs__/flows/isNodeType.flow.md` | J-002, J-012, J-021 |
| `src/ir/__specs__/flows/isEdgeType.flow.md` | J-003, J-021 |
| `src/ir/__specs__/flows/isDirection.flow.md` | J-005, J-021 |
| `src/parse/__specs__/flows/parse-flowchart.flow.md` | J-001, J-008, J-009, J-020, J-022 |
| `src/parse/__specs__/flows/serialize-flowchart.flow.md` | J-008, J-012 |
| `src/paths/__specs__/flows/detect-paths.flow.md` | J-006 |
| `src/layout/__specs__/flows/layout.flow.md` | J-005 |
| `src/layout/__specs__/flows/dagre-engine-run.flow.md` | J-005 |
| `src/layout/__specs__/flows/elk-engine-run.flow.md` | J-005 |
| `src/layout/__specs__/flows/load-elk.flow.md` | J-005 |
| `src/react/__specs__/flows/render-flowchart.flow.md` | J-001, J-002, J-007, J-009, J-014, J-015 |
| `src/react/__specs__/flows/flow-chart.flow.md` | J-001, J-002 |
| `src/react/__specs__/flows/click-node.flow.md` | J-004, J-018 |
| `src/react/__specs__/flows/select-path.flow.md` | J-006 |
| `src/react/__specs__/flows/play-path-movie.flow.md` | J-006 |
| `src/react/__specs__/flows/path-drawer.flow.md` | J-006 |
| `src/react/__specs__/flows/playback-controls.flow.md` | J-006, J-018 |
| `src/react/__specs__/flows/use-paths.flow.md` | J-006 |
| `src/react/__specs__/flows/use-playback.flow.md` | J-006 |
| `src/react/nodes/__specs__/flows/flow-node.flow.md` | J-004, J-018 |
| `src/react/nodes/__specs__/flows/resolve-node-types.flow.md` | J-004 |
| `src/react/edges/__specs__/flows/to-react-flow-edge.flow.md` | J-003, J-007 |

## Retired journeys (`retired/`)

Retired per `USER_JOURNEYS.md.journey_loop.update` ("retire journeys that no longer fit") — each
names a specific, permanent product-scope decision (not merely "not yet built") that the
RECONCILE step surfaced. See each file's `retired_reason:` frontmatter field for the specifics.

| ID | Slug | Why retired |
|----|------|-------------|
| J-011 | [export-diagram-as-image](./retired/J-011-export-diagram-as-image.md) | no image-export dependency or code surface anywhere in the package |
| J-016 | [undo-redo-diagram-edit-history](./retired/J-016-undo-redo-diagram-edit-history.md) | the package has no diagram-mutation surface at all to have a history of |
| J-017 | [build-decision-tree-editor-drag-connect](./retired/J-017-build-decision-tree-editor-drag-connect.md) | `nodesDraggable={false}` / `nodesConnectable={false}` is a deliberate, permanent design choice |
| J-019 | [realtime-collaborative-diagram-editing](./retired/J-019-realtime-collaborative-diagram-editing.md) | no network/DB/shared-state surface exists to synchronize |

## Peer products / conventions scanned

Mermaid.js (text-DSL authoring, parse-error UX, classDef semantic styling), React Flow /
@xyflow/react (nodes/edges data model, custom nodes, theming via colorMode + CSS variables,
dagre/elkjs auto-layout examples, download-image export, toObject() persistence, v11->v12
migration guide, generic TypeScript types, SSR/SSG support), Reaflow (Canvas/nodes/edges API
shape), general canvas-editor conventions (Figma/Excalidraw undo-redo, draw.io direct-manipulation
editing, ARIA Authoring Practices Guide for graphics widgets, CRDT/OT multiplayer sync).
