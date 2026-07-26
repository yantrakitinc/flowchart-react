import { iFlowDefinition, iFlowEdge } from './types';

export type iPathType = 'happy' | 'error' | 'warning' | 'neutral';

export interface iFlowPath {
  id: string;
  name: string;
  type: iPathType;
  nodeIds: string[];
  edgeIndices: number[];
}

export interface iPathDetectionResult {
  paths: iFlowPath[];
  startNodeIds: string[];
  endNodeIds: string[];
}

export function detectPaths(flow: iFlowDefinition): iPathDetectionResult {
  const { nodes, edges } = flow;

  const adjacency = new Map<string, { nodeId: string; edgeIndex: number }[]>();
  nodes.forEach(n => adjacency.set(n.id, []));

  edges.forEach((edge, idx) => {
    const list = adjacency.get(edge.from);
    if (list) {
      list.push({ nodeId: edge.to, edgeIndex: idx });
    }
  });

  const startNodes = nodes.filter(n => n.type === 'start');
  const endNodes = nodes.filter(n => n.type === 'end');

  const startNodeIds = startNodes.map(n => n.id);
  const endNodeIds = endNodes.map(n => n.id);

  if (startNodes.length === 0) {
    const noIncoming = nodes.filter(n => !edges.some(e => e.to === n.id));
    if (noIncoming.length > 0) {
      startNodeIds.push(...noIncoming.map(n => n.id));
    } else if (nodes.length > 0) {
      startNodeIds.push(nodes[0].id);
    }
  }

  if (endNodes.length === 0) {
    const noOutgoing = nodes.filter(n => !edges.some(e => e.from === n.id));
    if (noOutgoing.length > 0) {
      endNodeIds.push(...noOutgoing.map(n => n.id));
    }
  }

  const allPaths: iFlowPath[] = [];
  let pathCounter = 1;

  for (const startId of startNodeIds) {
    for (const endId of endNodeIds) {
      const foundPaths = findAllPaths(startId, endId, adjacency, edges);
      for (const path of foundPaths) {
        const pathType = determinePathType(path.edgeIndices, edges);
        allPaths.push({
          id: `path-${pathCounter}`,
          name: `Path ${pathCounter}`,
          type: pathType,
          nodeIds: path.nodeIds,
          edgeIndices: path.edgeIndices,
        });
        pathCounter++;
      }
    }
  }

  if (allPaths.length === 0 && nodes.length > 0) {
    allPaths.push({
      id: 'path-1',
      name: 'Path 1',
      type: 'neutral',
      nodeIds: nodes.map(n => n.id),
      edgeIndices: edges.map((_, i) => i),
    });
  }

  return {
    paths: allPaths,
    startNodeIds,
    endNodeIds,
  };
}

interface iRawPath {
  nodeIds: string[];
  edgeIndices: number[];
}

function findAllPaths(
  startId: string,
  endId: string,
  adjacency: Map<string, { nodeId: string; edgeIndex: number }[]>,
  edges: iFlowEdge[],
  maxPaths: number = 50,
  maxDepth: number = 100
): iRawPath[] {
  const results: iRawPath[] = [];

  function dfs(
    currentId: string,
    visited: Set<string>,
    currentPath: string[],
    currentEdges: number[],
    depth: number
  ) {
    if (results.length >= maxPaths) return;
    if (depth > maxDepth) return;

    if (currentId === endId) {
      results.push({
        nodeIds: [...currentPath],
        edgeIndices: [...currentEdges],
      });
      return;
    }

    const neighbors = adjacency.get(currentId) || [];
    for (const { nodeId: nextId, edgeIndex } of neighbors) {
      if (!visited.has(nextId)) {
        visited.add(nextId);
        currentPath.push(nextId);
        currentEdges.push(edgeIndex);

        dfs(nextId, visited, currentPath, currentEdges, depth + 1);

        currentPath.pop();
        currentEdges.pop();
        visited.delete(nextId);
      }
    }
  }

  const visited = new Set<string>([startId]);
  dfs(startId, visited, [startId], [], 0);

  return results;
}

function determinePathType(edgeIndices: number[], edges: iFlowEdge[]): iPathType {
  const counts = { happy: 0, error: 0, warning: 0, default: 0 };

  for (const idx of edgeIndices) {
    const edge = edges[idx];
    if (edge) {
      const type = edge.type || 'default';
      if (type === 'happy') counts.happy++;
      else if (type === 'error') counts.error++;
      else if (type === 'warning') counts.warning++;
      else counts.default++;
    }
  }

  const total = edgeIndices.length;
  if (total === 0) return 'neutral';

  if (counts.error > 0 && counts.error >= counts.happy) return 'error';
  if (counts.warning > 0 && counts.warning > counts.happy && counts.warning > counts.error) return 'warning';
  if (counts.happy > 0) return 'happy';

  return 'neutral';
}

export function getPathColor(type: iPathType): string {
  switch (type) {
    case 'happy': return '#22c55e';
    case 'error': return '#ef4444';
    case 'warning': return '#f59e0b';
    default: return '#71717a';
  }
}

export function getPathBgColor(type: iPathType): string {
  switch (type) {
    case 'happy': return 'bg-emerald-500';
    case 'error': return 'bg-red-500';
    case 'warning': return 'bg-yellow-500';
    default: return 'bg-zinc-500';
  }
}
