# detectPaths — semantic path detection

What this flow does: given a flowchart (nodes + directed, semantically-typed edges), find every
distinct route from a start point to an end point, and label each route "happy", "warning",
"error", or "neutral" depending on what kind of edges it crosses. If the diagram has no clear start
or end (for example, everything loops back on itself), return one catch-all route over the whole
diagram instead of nothing.

Feature: paths (PA) · flow 1 of 1

Machine contract: src/paths/__specs__/flows/detect-paths.flow.yaml

```mermaid
flowchart TD
  A[detectPaths graph] --> B[resolveStarts]
  A --> C[resolveEnds]
  B --> D{startNodeIds x endNodeIds}
  C --> D
  D -->|for each pair| E[findAllPaths DFS]
  E -->|MAX_PATHS / MAX_DEPTH guards| F[raw node/edge id routes]
  F --> G[classifyPath per route]
  G --> H[paths accumulator]
  H --> I{paths.length === 0 and nodes.length > 0?}
  I -->|yes| J[push single neutral fallback over all nodes/edges]
  I -->|no| K[return as-is]
  J --> L[return iPathDetectionResult]
  K --> L
```
