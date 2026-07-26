/**
 * Semantic path detection — the package's differentiator over plain Mermaid.
 * Enumerates every start→end route and classifies each by the semantic edge types along
 * it (happy / warning / error / neutral). Pure TS; consumable standalone.
 */
import { iEdgeType, iFlowEdge, iFlowGraph } from '../ir/types';

/** Classification of a whole path, derived from its edges. */
export type iPathType = 'happy' | 'warning' | 'error' | 'neutral';

/** One concrete route through the graph. */
export interface iFlowPath {
  id: string;
  name: string;
  type: iPathType;
  /** Node ids in order, start → end. */
  nodeIds: string[];
  /** Edge ids in order. */
  edgeIds: string[];
}

/** Result of {@link detectPaths}. */
export interface iPathDetectionResult {
  paths: iFlowPath[];
  startNodeIds: string[];
  endNodeIds: string[];
}

/** DFS guards — protect against pathological/cyclic graphs. */
const MAX_PATHS = 50;
const MAX_DEPTH = 100;

/** Enumerate + classify every start→end path in the graph. */
export function detectPaths(graph: iFlowGraph): iPathDetectionResult {
  const { nodes, edges } = graph;

  const adjacency = new Map<string, { to: string; edgeId: string }[]>();
  nodes.forEach((n) => adjacency.set(n.id, []));
  edges.forEach((e) => adjacency.get(e.from)?.push({ to: e.to, edgeId: e.id }));

  const edgeById = new Map<string, iFlowEdge>(edges.map((e) => [e.id, e]));
  const startNodeIds = resolveStarts(graph);
  const endNodeIds = resolveEnds(graph);

  const paths: iFlowPath[] = [];
  let counter = 1;

  for (const startId of startNodeIds) {
    for (const endId of endNodeIds) {
      for (const raw of findAllPaths(startId, endId, adjacency)) {
        paths.push({
          id: `path-${counter}`,
          name: `Path ${counter}`,
          type: classifyPath(raw.edgeIds, edgeById),
          nodeIds: raw.nodeIds,
          edgeIds: raw.edgeIds,
        });
        counter++;
      }
    }
  }

  if (paths.length === 0 && nodes.length > 0) {
    paths.push({
      id: 'path-1',
      name: 'Path 1',
      type: 'neutral',
      nodeIds: nodes.map((n) => n.id),
      edgeIds: edges.map((e) => e.id),
    });
  }

  return { paths, startNodeIds, endNodeIds };
}

function resolveStarts(graph: iFlowGraph): string[] {
  const explicit = graph.nodes.filter((n) => n.type === 'start').map((n) => n.id);
  if (explicit.length > 0) return explicit;
  const noIncoming = graph.nodes
    .filter((n) => !graph.edges.some((e) => e.to === n.id))
    .map((n) => n.id);
  if (noIncoming.length > 0) return noIncoming;
  return graph.nodes.length > 0 ? [graph.nodes[0].id] : [];
}

function resolveEnds(graph: iFlowGraph): string[] {
  const explicit = graph.nodes.filter((n) => n.type === 'end').map((n) => n.id);
  if (explicit.length > 0) return explicit;
  return graph.nodes.filter((n) => !graph.edges.some((e) => e.from === n.id)).map((n) => n.id);
}

interface iRawPath {
  nodeIds: string[];
  edgeIds: string[];
}

function findAllPaths(
  startId: string,
  endId: string,
  adjacency: Map<string, { to: string; edgeId: string }[]>
): iRawPath[] {
  const results: iRawPath[] = [];
  const visited = new Set<string>([startId]);

  const dfs = (currentId: string, nodePath: string[], edgePath: string[], depth: number): void => {
    if (results.length >= MAX_PATHS || depth > MAX_DEPTH) return;
    if (currentId === endId) {
      results.push({ nodeIds: [...nodePath], edgeIds: [...edgePath] });
      return;
    }
    for (const { to, edgeId } of adjacency.get(currentId) ?? []) {
      if (visited.has(to)) continue;
      visited.add(to);
      nodePath.push(to);
      edgePath.push(edgeId);
      dfs(to, nodePath, edgePath, depth + 1);
      nodePath.pop();
      edgePath.pop();
      visited.delete(to);
    }
  };

  dfs(startId, [startId], [], 0);
  return results;
}

/**
 * Classify a path from its edge types:
 *   error   if any error edge and error-count ≥ happy-count
 *   warning if warning-count > happy-count and > error-count
 *   happy   if any happy edge
 *   neutral otherwise (including all-default paths)
 */
function classifyPath(edgeIds: string[], edgeById: Map<string, iFlowEdge>): iPathType {
  if (edgeIds.length === 0) return 'neutral';
  const counts: Record<iEdgeType, number> = { happy: 0, warning: 0, error: 0, default: 0 };
  for (const id of edgeIds) {
    // Every path edge id comes from the graph's own edges, so it is always present.
    const type = (edgeById.get(id) as iFlowEdge).type;
    counts[type]++;
  }
  if (counts.error > 0 && counts.error >= counts.happy) return 'error';
  if (counts.warning > counts.happy && counts.warning > counts.error) return 'warning';
  if (counts.happy > 0) return 'happy';
  return 'neutral';
}
