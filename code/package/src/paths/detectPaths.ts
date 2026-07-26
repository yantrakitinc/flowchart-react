import type { iFlowEdge, iFlowGraph } from '../ir/types';

/** Semantic classification of a detected start→end route. */
export type iPathType = 'happy' | 'warning' | 'error' | 'neutral';

/** A single detected start→end route through a {@link iFlowGraph}. */
export interface iFlowPath {
  /** Stable identifier, unique within a single {@link detectPaths} result. */
  id: string;
  /** Human-readable name, e.g. `"Path 1"`. */
  name: string;
  /** Classification derived from the edge types along the route. */
  type: iPathType;
  /** Node ids visited, in traversal order (start first, end last). */
  nodeIds: string[];
  /** Edge ids traversed, in traversal order. */
  edgeIds: string[];
}

/** Result of running {@link detectPaths} against a graph. */
export interface iPathDetectionResult {
  /** Every detected route. */
  paths: iFlowPath[];
  /** Node ids treated as route origins. */
  startNodeIds: string[];
  /** Node ids treated as route destinations. */
  endNodeIds: string[];
}

/** Hard cap on the number of routes recorded, guarding against combinatorial blowup. */
const MAX_PATHS = 50;

/** Hard cap on route length, guarding against runaway recursion on cyclic graphs. */
const MAX_DEPTH = 100;

/** Classifies a route from the edge types it traverses. */
function classifyPath(edgeIds: string[], edgeById: Map<string, iFlowEdge>): iPathType {
  let happy = 0;
  let warning = 0;
  let error = 0;
  for (const edgeId of edgeIds) {
    // Every edgeId in a recorded route comes from this same graph's own edges, so
    // edgeById always has an entry for it.
    const edge = edgeById.get(edgeId)!;
    if (edge.type === 'happy') happy += 1;
    else if (edge.type === 'warning') warning += 1;
    else if (edge.type === 'error') error += 1;
  }
  if (error > 0 && error >= happy) return 'error';
  if (warning > happy && warning > error) return 'warning';
  if (happy > 0) return 'happy';
  return 'neutral';
}

/**
 * Detects every start→end route through a flow graph and classifies each one.
 *
 * Start nodes are `type: 'start'` nodes, falling back to nodes with no incoming
 * edges, falling back to the first node. End nodes resolve the same way with
 * `type: 'end'` / no outgoing edges. Traversal is a depth-first search guarded
 * against cycles (a node cannot repeat within a single route), against runaway
 * recursion (`MAX_DEPTH`) and against combinatorial blowup (`MAX_PATHS`). If no
 * route reaches an end node but the graph has nodes, a single neutral fallback
 * path over every node is returned instead.
 */
export function detectPaths(graph: iFlowGraph): iPathDetectionResult {
  const { nodes, edges } = graph;
  if (nodes.length === 0) {
    return { paths: [], startNodeIds: [], endNodeIds: [] };
  }

  const edgeById = new Map(edges.map((edge): [string, iFlowEdge] => [edge.id, edge]));
  const outgoingByNode = new Map<string, iFlowEdge[]>();
  for (const edge of edges) {
    const list = outgoingByNode.get(edge.from) ?? [];
    list.push(edge);
    outgoingByNode.set(edge.from, list);
  }
  const hasIncoming = new Set(edges.map((edge) => edge.to));
  const hasOutgoing = new Set(edges.map((edge) => edge.from));

  let startNodeIds = nodes.filter((n) => n.type === 'start').map((n) => n.id);
  if (startNodeIds.length === 0) {
    startNodeIds = nodes.filter((n) => !hasIncoming.has(n.id)).map((n) => n.id);
  }
  if (startNodeIds.length === 0) {
    startNodeIds = [nodes[0].id];
  }

  let endNodeIds = nodes.filter((n) => n.type === 'end').map((n) => n.id);
  if (endNodeIds.length === 0) {
    endNodeIds = nodes.filter((n) => !hasOutgoing.has(n.id)).map((n) => n.id);
  }
  if (endNodeIds.length === 0) {
    endNodeIds = [nodes[0].id];
  }
  const endSet = new Set(endNodeIds);

  const paths: iFlowPath[] = [];

  function dfs(nodeId: string, nodeIds: string[], edgeIds: string[], visited: Set<string>): void {
    if (paths.length >= MAX_PATHS || nodeIds.length > MAX_DEPTH) return;
    if (endSet.has(nodeId)) {
      paths.push({
        id: `path-${paths.length}`,
        name: `Path ${paths.length + 1}`,
        type: classifyPath(edgeIds, edgeById),
        nodeIds: [...nodeIds],
        edgeIds: [...edgeIds],
      });
      return;
    }
    for (const edge of outgoingByNode.get(nodeId) ?? []) {
      if (paths.length >= MAX_PATHS) return;
      if (visited.has(edge.to)) continue;
      visited.add(edge.to);
      dfs(edge.to, [...nodeIds, edge.to], [...edgeIds, edge.id], visited);
      visited.delete(edge.to);
    }
  }

  for (const startId of startNodeIds) {
    if (paths.length >= MAX_PATHS) break;
    dfs(startId, [startId], [], new Set([startId]));
  }

  if (paths.length === 0) {
    paths.push({
      id: 'path-0',
      name: 'Path 1',
      type: 'neutral',
      nodeIds: nodes.map((n) => n.id),
      edgeIds: edges.map((e) => e.id),
    });
  }

  return { paths, startNodeIds, endNodeIds };
}
