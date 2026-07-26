# FlowNode — research

> Phase 0 artifact (COMPONENT_CREATION). Lives at `src/react/nodes/__specs__/research.md`.
> `design.md` references this file (verify-component-research-cited).

## Classification

- **Tier**: atomic (a single React Flow custom-node component; the flowchart's leaf UI unit).
- **Library coverage**: none — no mainstream design-system (shadcn / MUI / DaisyUI) ships a
  "graph node" primitive; the closest prior art is in the diagramming category (React Flow,
  Mermaid, Reaflow).
- **Stakes**: standard — a developer-facing library surface; not an internal throwaway, not a
  brand marketing surface. Derived by folder inference (published package, no
  `brand_surfaces` match in `.standards/autonomy.yaml`).
- **Resulting depth**: medium (coverage=none × stakes=standard → medium per the matrix).
- **Domain survey trigger**: targeted-gaps — survey the diagramming category (React Flow /
  Mermaid) since the general design-system libraries have no equivalent.

## Competitor scan

### shadcn/ui

- **Doc**: n/a — no graph/flow-node primitive in shadcn/ui.
- **API shape**: n/a.
- **A11y notes from docs**: n/a.
- **Variants shipped**: n/a.
- **Strengths**: token + `data-slot` conventions worth mirroring (we use CSS custom properties + `data-*`).
- **Gaps for our use**: no node concept at all.

### MUI (Material UI)

- **Doc**: n/a — no graph-node primitive (MUI X Charts covers charts, not node-graphs).
- **API shape**: n/a.
- **A11y notes**: n/a.
- **Variants shipped**: n/a.
- **Strengths**: `sx`-style theming maps to our CSS-var tokens.
- **Gaps for our use**: no node concept.

### DaisyUI

- **Doc**: n/a — no graph-node primitive.
- **API shape**: n/a.
- **A11y notes**: n/a.
- **Variants shipped**: n/a.
- **Strengths**: semantic color-name tokens (primary/success/warning/error) parallel our
  node/edge status tokens.
- **Gaps for our use**: no node concept.

## Domain survey (diagramming category — the relevant peers)

- **React Flow (@xyflow/react)** — https://reactflow.dev/learn/customization/custom-nodes.
  Nodes are arbitrary React components registered by `type` in a `nodeTypes` map; each renders
  `<Handle>` connection points. This is the exact substrate we build on: FlowNode is a custom
  node, and `defaultNodeTypes` is our `nodeTypes` map. Handles orient by flow direction.
- **Mermaid** — https://mermaid.js.org/syntax/flowchart.html. Node shapes carry meaning:
  `[]`=process, `{}`=decision, stadium=terminal. We mirror this semantics onto seven node
  types (start/end/action/decision/error/warning/link) with matching shape + color.
- **Reaflow** — https://reaflow.dev. Confirms the "typed node + auto-layout + custom render"
  shape is the category norm.

## Baseline decision

Build a single custom React Flow node component (`FlowNode`) that renders all seven semantic
types, varying shape (stadium / diamond / rounded-rect), a status color (CSS token per type),
an icon, the label, and an optional expandable description. Consumers replace any type via the
`nodeTypes` registry. Rationale: one component keeps the state matrix consistent and the
registry override gives full escape-hatch customization (the React Flow idiom).

## Recommendation

Adopt the single-component + registry design. Bind every color to a `--fc-*` CSS token (no
hardcoded values), orient handles from flow direction, and expose agent affordances
(`data-node-id` / `data-node-type` / `data-agent-action` / `aria-label`) on the node root.
