# AA-002 — Serialize the IR back into flowchart DSL text

What this flow does: takes the library's typed graph object and renders it back into the same
Mermaid-like text format `parseFlowchart` reads — every node and edge gets its exact type stamped
on with `:::type` so the round trip is stable. The one thing that never makes it back into text is
a node's optional free-form `data` payload, because the DSL has no place to put it.

Feature: parse (AA) · flow 2 of 2

Machine contract: src/parse/__specs__/flows/serialize-flowchart.flow.yaml

```mermaid
flowchart TD
  start([serializeFlowchart]) --> hdr[Emit header line]
  hdr --> nodes[Emit one line per node, :::type stamped]
  nodes --> edges[Emit one line per edge, :::type stamped, |label| if present]
  edges --> done([DSL text string])
  nodes -.->|type-system bypass only| errNode[edge_boundary_invalid_node_type]:::error
  edges -.->|type-system bypass only| errEdge[edge_boundary_invalid_edge_type]:::error
```
