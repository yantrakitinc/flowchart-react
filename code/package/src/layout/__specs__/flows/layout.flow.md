# AA-001 — layout()

What this flow does: given a flowchart's IR (its nodes, edges, and direction) and
some optional tuning, this step computes an on-screen x/y position and a size for
every node, ready to hand to a renderer. It never draws anything itself — it just
does the geometry math, defaulting to a fast built-in engine (dagre) but letting the
caller swap in a fancier one (ELK) when asked.

Feature: layout (AA) · flow 1 of 4

Machine contract: `code/package/src/layout/__specs__/flows/layout.flow.yaml`

```mermaid
flowchart TD
  A[layout called with graph + options] --> B[resolve engine: options.engine ?? dagreEngine]
  B --> C[build iEngineContext: direction + nodeWidth/nodeHeight/rankSpacing/nodeSpacing, defaulted]
  C --> D{await engine.run graph, ctx}
  D -->|resolves iPositions Map| E[map graph.nodes -> iPositionedNode using positions.get id ?? 0,0]
  D -->|rejects| F[propagate rejection unchanged]
  E --> G[map graph.edges -> iRenderEdge: source=from, target=to]
  G --> H[return iPositionedGraph]
```
