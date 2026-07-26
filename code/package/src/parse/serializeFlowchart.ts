import type { iEdgeType, iFlowGraph, iNodeType } from '../ir/types';

const GLYPH_BY_EDGE_TYPE: Record<iEdgeType, string> = {
  default: '-->',
  happy: '-->',
  warning: '-.->',
  error: '==>',
};

/** Renders the DSL shape wrapper (`[..]`, `{..}`, `([..])`) for a given node type + label. */
function shapeFor(type: iNodeType, label: string): string {
  if (type === 'decision') return `{${label}}`;
  if (type === 'start' || type === 'end') return `([${label}])`;
  return `[${label}]`;
}

/**
 * Serializes a renderer-agnostic {@link iFlowGraph} back to Mermaid-like flowchart DSL text.
 *
 * The inverse of {@link parseFlowchart}: round-trips node/edge structure, types and labels
 * (every node/edge is written with an explicit `:::type` class so type fidelity survives
 * the shape/glyph ambiguity). `node.data` is intentionally dropped — the DSL carries no
 * channel for opaque consumer payloads.
 */
export function serializeFlowchart(graph: iFlowGraph): string {
  const lines: string[] = [`flowchart ${graph.direction}`];

  for (const node of graph.nodes) {
    lines.push(`${node.id}${shapeFor(node.type, node.label)}:::${node.type}`);
  }

  for (const edge of graph.edges) {
    const glyph = GLYPH_BY_EDGE_TYPE[edge.type];
    const label = edge.label !== undefined ? `|${edge.label}|` : '';
    lines.push(`${edge.from} ${glyph}${label}:::${edge.type} ${edge.to}`);
  }

  return lines.join('\n');
}
