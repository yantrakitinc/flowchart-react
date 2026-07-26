/**
 * Serialize an {@link iFlowGraph} back into DSL text. The inverse of
 * {@link parseFlowchart} for structure, node/edge types, labels and direction.
 *
 * Round-trip: `parseFlowchart(serializeFlowchart(g))` yields a graph semantically equal
 * to `g`. The `data` payload on nodes is not expressible in DSL and is dropped. Every node
 * and edge is emitted with an explicit `:::type` class so types survive exactly.
 */
import { iEdgeType, iFlowGraph, iFlowNode, iNodeType } from '../ir/types';

const SHAPE: Record<iNodeType, [open: string, close: string]> = {
  start: ['([', '])'],
  end: ['([', '])'],
  decision: ['{', '}'],
  action: ['[', ']'],
  error: ['[', ']'],
  warning: ['[', ']'],
  link: ['[', ']'],
};

const GLYPH: Record<iEdgeType, string> = {
  default: '-->',
  warning: '-.->',
  error: '==>',
  happy: '-->',
};

/** Render an IR graph as DSL text. */
export function serializeFlowchart(graph: iFlowGraph): string {
  const lines: string[] = [`flowchart ${graph.direction}`];
  for (const node of graph.nodes) {
    lines.push(`  ${serializeNode(node)}`);
  }
  for (const edge of graph.edges) {
    const label = edge.label ? `|${edge.label}|` : '';
    lines.push(`  ${edge.from} ${GLYPH[edge.type]}${label}:::${edge.type} ${edge.to}`);
  }
  return lines.join('\n');
}

function serializeNode(node: iFlowNode): string {
  const [open, close] = SHAPE[node.type];
  return `${node.id}${open}${node.label}${close}:::${node.type}`;
}
