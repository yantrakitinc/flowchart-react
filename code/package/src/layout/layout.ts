import type { iFlowGraph } from '../ir/types';
import { dagreEngine } from './dagreEngine';
import type {
  iEngineContext,
  iLayoutEngine,
  iLayoutOptions,
  iPositionedGraph,
  iPositionedNode,
} from './types';

const DEFAULT_NODE_WIDTH = 180;
const DEFAULT_NODE_HEIGHT = 64;
const DEFAULT_RANK_SPACING = 80;
const DEFAULT_NODE_SPACING = 48;

/**
 * Computes positions for every node in `graph` and returns a fully laid-out
 * graph ready for rendering. Defaults to the bundled `dagre` engine; pass
 * `{ engine: elkEngine }` (from `./elkEngine`) to opt into ELK instead.
 *
 * Any node the engine did not return a position for falls back to `{ x: 0, y: 0 }`.
 */
export async function layout(
  graph: iFlowGraph,
  options: iLayoutOptions = {}
): Promise<iPositionedGraph> {
  const engine: iLayoutEngine = options.engine ?? dagreEngine;
  const nodeWidth = options.nodeWidth ?? DEFAULT_NODE_WIDTH;
  const nodeHeight = options.nodeHeight ?? DEFAULT_NODE_HEIGHT;
  const rankSpacing = options.rankSpacing ?? DEFAULT_RANK_SPACING;
  const nodeSpacing = options.nodeSpacing ?? DEFAULT_NODE_SPACING;

  const ctx: iEngineContext = {
    direction: graph.direction,
    nodeWidth,
    nodeHeight,
    rankSpacing,
    nodeSpacing,
  };
  const positions = await engine.run(graph, ctx);

  const nodes: iPositionedNode[] = graph.nodes.map((node) => {
    const pos = positions.get(node.id) ?? { x: 0, y: 0 };
    return { ...node, x: pos.x, y: pos.y, width: nodeWidth, height: nodeHeight };
  });

  const width = nodes.reduce((max, n) => Math.max(max, n.x + n.width), 0);
  const height = nodes.reduce((max, n) => Math.max(max, n.y + n.height), 0);

  return { nodes, edges: graph.edges, direction: graph.direction, width, height };
}
