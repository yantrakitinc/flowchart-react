import { iFlowDefinition, iFlowEdge, iPositionedNode, iLayoutConfig } from './types';

const DEFAULT_CONFIG: Required<iLayoutConfig> = {
  nodeWidth: 180,
  nodeHeight: 60,
  horizontalSpacing: 150,
  verticalSpacing: 100,
  padding: 100,
};

interface iNodeInfo {
  id: string;
  level: number;
  column: number;
  children: string[];
  parents: string[];
  edgeType: iEdgeType | 'default';
}

type iEdgeType = 'happy' | 'error' | 'warning' | 'default';

export function calculateLayout(
  flow: iFlowDefinition,
  config: iLayoutConfig = {}
): { nodes: iPositionedNode[]; width: number; height: number } {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  const nodeMap = new Map<string, iNodeInfo>();
  const edgesByFrom = new Map<string, iFlowEdge[]>();
  const edgesByTo = new Map<string, iFlowEdge[]>();

  flow.nodes.forEach((node) => {
    nodeMap.set(node.id, {
      id: node.id,
      level: -1,
      column: 0,
      children: [],
      parents: [],
      edgeType: 'default',
    });
  });

  flow.edges.forEach((edge) => {
    const fromInfo = nodeMap.get(edge.from);
    const toInfo = nodeMap.get(edge.to);
    if (fromInfo && toInfo) {
      fromInfo.children.push(edge.to);
      toInfo.parents.push(edge.from);
      toInfo.edgeType = edge.type || 'default';
    }

    if (!edgesByFrom.has(edge.from)) edgesByFrom.set(edge.from, []);
    edgesByFrom.get(edge.from)!.push(edge);

    if (!edgesByTo.has(edge.to)) edgesByTo.set(edge.to, []);
    edgesByTo.get(edge.to)!.push(edge);
  });

  const startNode = flow.nodes.find((n) => n.type === 'start');
  if (!startNode) {
    const firstNode = flow.nodes[0];
    if (firstNode) {
      assignLevels(firstNode.id, 0, nodeMap, new Set());
    }
  } else {
    assignLevels(startNode.id, 0, nodeMap, new Set());
  }

  flow.nodes.forEach((node) => {
    const info = nodeMap.get(node.id)!;
    if (info.level === -1) {
      info.level = 0;
    }
  });

  const levelGroups = new Map<number, string[]>();
  nodeMap.forEach((info, id) => {
    if (!levelGroups.has(info.level)) {
      levelGroups.set(info.level, []);
    }
    levelGroups.get(info.level)!.push(id);
  });

  levelGroups.forEach((nodeIds, _level) => {
    const sorted = sortNodesAtLevel(nodeIds, nodeMap, flow.edges);
    sorted.forEach((id, index) => {
      const info = nodeMap.get(id)!;
      info.column = index;
    });
  });

  const maxLevel = Math.max(...Array.from(levelGroups.keys()));
  const maxColumns = Math.max(
    ...Array.from(levelGroups.values()).map((ids) => ids.length)
  );

  const width = maxColumns * (cfg.nodeWidth + cfg.horizontalSpacing) + cfg.padding * 2;
  const height = (maxLevel + 1) * (cfg.nodeHeight + cfg.verticalSpacing) + cfg.padding * 2;

  const positionedNodes: iPositionedNode[] = flow.nodes.map((node) => {
    const info = nodeMap.get(node.id)!;
    const nodesAtLevel = levelGroups.get(info.level)!.length;
    const levelWidth = nodesAtLevel * (cfg.nodeWidth + cfg.horizontalSpacing) - cfg.horizontalSpacing;
    const startX = (width - levelWidth) / 2;

    return {
      ...node,
      x: startX + info.column * (cfg.nodeWidth + cfg.horizontalSpacing) + cfg.nodeWidth / 2,
      y: cfg.padding + info.level * (cfg.nodeHeight + cfg.verticalSpacing) + cfg.nodeHeight / 2,
      level: info.level,
      column: info.column,
    };
  });

  return { nodes: positionedNodes, width, height };
}

function assignLevels(
  nodeId: string,
  level: number,
  nodeMap: Map<string, iNodeInfo>,
  visited: Set<string>
): void {
  if (visited.has(nodeId)) return;

  const info = nodeMap.get(nodeId);
  if (!info) return;

  if (info.level < level) {
    info.level = level;
  }

  visited.add(nodeId);

  info.children.forEach((childId) => {
    assignLevels(childId, level + 1, nodeMap, visited);
  });

  visited.delete(nodeId);
}

function sortNodesAtLevel(
  nodeIds: string[],
  nodeMap: Map<string, iNodeInfo>,
  edges: iFlowEdge[]
): string[] {
  const edgeTypeOrder: Record<string, number> = {
    happy: 0,
    default: 1,
    warning: 2,
    error: 3,
  };

  return nodeIds.sort((a, b) => {
    const edgeA = edges.find((e) => e.to === a);
    const edgeB = edges.find((e) => e.to === b);

    const typeA = edgeA?.type || 'default';
    const typeB = edgeB?.type || 'default';

    const orderA = edgeTypeOrder[typeA] ?? 1;
    const orderB = edgeTypeOrder[typeB] ?? 1;

    if (orderA !== orderB) return orderA - orderB;

    return a.localeCompare(b);
  });
}

export function getEdgeColor(type: iEdgeType | undefined): string {
  switch (type) {
    case 'happy':
      return '#22c55e';
    case 'error':
      return '#ef4444';
    case 'warning':
      return '#f59e0b';
    default:
      return '#71717a';
  }
}

export function getNodeColor(type: string): string {
  switch (type) {
    case 'start':
      return '#2563eb';
    case 'end':
      return '#16a34a';
    case 'decision':
      return '#ca8a04';
    case 'error':
      return '#dc2626';
    case 'warning':
      return '#f59e0b';
    case 'link':
      return '#9333ea';
    default:
      return '#3f3f46';
  }
}
