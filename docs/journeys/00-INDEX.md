# User Journey Catalog — diagram-as-code / flowchart component for web apps

Discovered outside-in (repo-blind): every journey below is derived from the product category
(a developer-facing React flowchart/diagram library) and from comparable peers — Mermaid.js,
React Flow (@xyflow/react), Reaflow, ELK.js/dagre auto-layout, and adjacent LLM/diagram-generation
conventions. No journey was derived from this repo's own flows, specs, or code
(`not_derived_from_our_flows: true` on every entry). `maps_to_flows` starts empty on every
journey — the pm fills it in during the MATCH step of the DISCOVER -> MATCH -> RECONCILE -> UPDATE loop.

## Coverage summary

- unmapped_journeys: 22 (all — no flows matched yet, matching happens in MATCH/RECONCILE)
- orphan_flows: unknown (repo-blind pass cannot see flows; the pm computes this in RECONCILE)

## Journeys

| ID | Slug | Persona | Intent |
|----|------|---------|--------|
| J-001 | [render-flowchart-from-text-dsl](./J-001-render-flowchart-from-text-dsl.md) | First-time integrator, product engineer | Author a diagram from a compact text/DSL description |
| J-002 | [render-flowchart-from-structured-data](./J-002-render-flowchart-from-structured-data.md) | Internal-tools engineer with existing JSON workflow data | Render a diagram directly from a nodes/edges data object |
| J-003 | [semantic-color-branches-success-error-warning](./J-003-semantic-color-branches-success-error-warning.md) | Incident-response runbook developer | Semantically color success/error/warning branches |
| J-004 | [interactive-clickable-custom-nodes](./J-004-interactive-clickable-custom-nodes.md) | Decision-tree quiz app developer | Make each node a custom interactive React component |
| J-005 | [auto-layout-top-down-left-right](./J-005-auto-layout-top-down-left-right.md) | Org-chart / approval-chain developer | Auto-layout the diagram without hand-positioning |
| J-006 | [highlight-all-paths-start-to-end](./J-006-highlight-all-paths-start-to-end.md) | Compliance/audit tool developer | Find and highlight all paths between a start and end node |
| J-007 | [theme-diagram-to-app-design-tokens](./J-007-theme-diagram-to-app-design-tokens.md) | Design-systems engineer | Theme the diagram to the app's own design tokens / dark mode |
| J-008 | [agent-read-mutate-write-diagram](./J-008-agent-read-mutate-write-diagram.md) | AI workflow-automation agent | Read, mutate, and write back a diagram programmatically |
| J-009 | [validate-diagram-surface-parse-errors](./J-009-validate-diagram-surface-parse-errors.md) | Developer building a diagram-import feature | Validate/parse a diagram and surface actionable errors |
| J-010 | [migrate-from-previous-major-version](./J-010-migrate-from-previous-major-version.md) | Maintainer doing a routine dependency upgrade | Migrate across a breaking major-version bump |
| J-011 | [export-diagram-as-image](./J-011-export-diagram-as-image.md) | Reporting/docs tool developer | Export the rendered diagram as a PNG/SVG image |
| J-012 | [persist-diagram-as-json-save-load](./J-012-persist-diagram-as-json-save-load.md) | Admin-tool developer | Save a diagram as JSON and reload it identically later |
| J-013 | [evaluate-library-before-adopting](./J-013-evaluate-library-before-adopting.md) | Senior engineer doing a build-vs-buy spike | Evaluate the library (size/license/types/activity) before adopting |
| J-014 | [integrate-in-nextjs-ssr-app](./J-014-integrate-in-nextjs-ssr-app.md) | Next.js App Router developer | Integrate the diagram in an SSR/SSG framework without hydration errors |
| J-015 | [pan-zoom-minimap-large-diagram-navigation](./J-015-pan-zoom-minimap-large-diagram-navigation.md) | Ops-dashboard developer with a 100+ node graph | Pan/zoom/minimap-navigate a large diagram |
| J-016 | [undo-redo-diagram-edit-history](./J-016-undo-redo-diagram-edit-history.md) | No-code workflow-builder developer | Undo/redo end-user diagram edits |
| J-017 | [build-decision-tree-editor-drag-connect](./J-017-build-decision-tree-editor-drag-connect.md) | No-code chatbot/decision-tree builder developer | Let end users drag, connect, and delete nodes/edges |
| J-018 | [accessible-screen-reader-keyboard-diagram](./J-018-accessible-screen-reader-keyboard-diagram.md) | Accessibility auditor | Confirm keyboard + screen-reader navigability |
| J-019 | [realtime-collaborative-diagram-editing](./J-019-realtime-collaborative-diagram-editing.md) | Collaborative-whiteboard product developer | Sync concurrent multi-user edits to the same diagram |
| J-020 | [switch-from-mermaid-after-hitting-limits](./J-020-switch-from-mermaid-after-hitting-limits.md) | Developer migrating off Mermaid | Port a diagram over after Mermaid's interactivity limits blocked a requirement |
| J-021 | [typescript-strict-types-for-nodes-edges](./J-021-typescript-strict-types-for-nodes-edges.md) | Strict-mode TypeScript developer | Get generic, strongly-typed node/edge data |
| J-022 | [llm-generates-diagram-from-natural-language](./J-022-llm-generates-diagram-from-natural-language.md) | LLM-backed "describe your process" feature | Turn natural language into a validated, rendered diagram |

## Peer products / conventions scanned

Mermaid.js (text-DSL authoring, parse-error UX, classDef semantic styling), React Flow /
@xyflow/react (nodes/edges data model, custom nodes, theming via colorMode + CSS variables,
dagre/elkjs auto-layout examples, download-image export, toObject() persistence, v11->v12
migration guide, generic TypeScript types, SSR/SSG support), Reaflow (Canvas/nodes/edges API
shape), general canvas-editor conventions (Figma/Excalidraw undo-redo, draw.io direct-manipulation
editing, ARIA Authoring Practices Guide for graphics widgets, CRDT/OT multiplayer sync).
