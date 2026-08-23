# Changelog

All notable changes to this project will be documented here.

---

## [2.0.1] - 2026-07-27

### Added

- **Package README** - `code/package/README.md`, so the npm page shows the library rather than nothing

### Changed

- **Homepage** - retargeted to `yantrakit.com/flowchart-react`

---

## [2.0.0] - 2026-07-26

**A clean break. There is no compatibility shim** - the v1 `flow` prop is gone and v2 authors
diagrams as text or as an IR object. See [`MIGRATION.md`](https://github.com/yantrakitinc/flowchart-react/blob/main/MIGRATION.md).

### Added

- **Text authoring** - a Mermaid-familiar DSL on the `chart` prop. `flowchart TD`, node shapes
  (`[]` action, `{}` decision, `([])` start/end), edge glyphs (`-->`, `-.->`, `==>`), `|labels|`,
  `:::type` overrides, `%%` comments and `A --> B --> C` chains
- **Object authoring** - the `graph` prop takes an `iFlowGraph` directly
- **React Flow rendering** - `@xyflow/react` replaces the custom SVG stack, bringing real pan,
  zoom, minimap and edge routing
- **Pluggable layout** - `dagreEngine` by default, `elkEngine` opt-in behind an optional `elkjs`
  peer, both honouring `TD` / `BT` / `LR` / `RL`
- **Semantic path detection** - `detectPaths()` returns every start-to-end path with its type
- **Node type registry** - `defaultNodeTypes` and `resolveNodeTypes()`, so a consumer can replace
  any node component
- **Movie mode** - autoplay that steps a path node by node, emitting
  `onPlaybackStep(nodeId, index, data)`, with play / pause / restart controls and optional loop
- **Parse errors are structured** - `FlowchartParseError { line, column, reason }`, rendered as an
  inline error box inside `<FlowChart>`
- **A published JSON schema** - importable at `@yantrakit/flowchart-react/schema`
- **Stable selectors** - `data-testid` and `data-agent-action` on nodes, the path drawer and the
  playback controls, documented in `AGENTS.md`

### Changed

- **`iFlowDefinition` is now `iFlowGraph`**, and `direction` is required
- **Edges require `id` and `type`** - use `'default'` where the edge carries no meaning
- **`onNodeClick(node)` is now `onNodeClick(nodeId, data)`** - TypeScript catches this; JavaScript
  does not
- **Node type `'process'` is now `'action'`**

### Removed

- The `flow` prop, `iFlowDefinition`, `calculateLayout`, and `getNodeColor` / `getEdgeColor` /
  `getPathColor` / `getPathBgColor`

### Not supported

Subgraphs, non-flowchart Mermaid diagram types, and Mermaid styling directives. Named here because
a list of what exists cannot be told apart from a list that is merely incomplete.

---

## [1.1.5] - 2026-03-14

### Fixed

- **README** - Removed incorrect GitHub Project link

---

## [1.1.4] - 2026-03-14

### Added

- **Touch Support** - Full mobile/tablet support with pointer events for panning and pinch-to-zoom gestures

### Fixed

- **Storybook Base Path** - Fixed local development by conditionally applying base path only for production builds

---

## [1.1.3] - 2026-03-14

### Added

- **User Login Flow Story** - Added comprehensive login flow example with email/password and social auth paths

### Changed

- **Edge Arrow Visibility** - Moved arrow markers back from line end for better visibility
- **Trailing Arrows** - Added smaller faded arrows behind main arrow to indicate flow direction
- Trailing arrows only appear on edges longer than 60px

---

## [1.1.2] - 2026-03-13

### Changed

- Added npm and Yantrakit links to documentation footer

---

## [1.1.1] - 2026-03-13

### Added

- **FlowChart Component** - Main flowchart visualization component with SVG rendering
- **Auto-layout Engine** - Automatic node positioning based on graph structure
- **Path Detection** - Automatic detection of all paths from start to end nodes
- **Path Selection** - Dropdown to filter and highlight specific paths
- **Path Drawer** - Slide-out panel showing path details with copy functionality
- **Node Types** - Support for 7 node types: `start`, `end`, `action`, `decision`, `error`, `warning`, `link`
- **Edge Types** - Support for 4 edge types: `happy`, `error`, `warning`, `default`
- **Interactive Features**
  - Node click handling
  - Active node highlighting
  - Path selection and filtering
  - Zoom controls (scroll, buttons, input)
  - Pan controls (drag, scroll mode toggle)
- **usePaths Hook** - React hook for managing path state externally
- **Layout Configuration** - Customizable node sizes, spacing, and padding
- **Drawer Positions** - Support for `top`, `bottom`, `left`, `right` drawer positions
- **Standalone CSS** - No Tailwind dependency, BEM-style class names
- **TypeScript Support** - Full type definitions exported
- **Storybook Documentation** - Interactive examples and usage guide

### Technical

- Zero runtime dependencies (React as peer dependency)
- ESM and CommonJS builds
- Tree-shakeable exports
- Source maps included
