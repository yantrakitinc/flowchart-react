# Changelog

All notable changes to this project will be documented here.

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
