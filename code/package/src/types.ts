export type iNodeType = 'start' | 'end' | 'action' | 'decision' | 'error' | 'warning' | 'link';

export type iEdgeType = 'happy' | 'error' | 'warning' | 'default';

export interface iFlowNode {
  id: string;
  label: string;
  type: iNodeType;
  description?: string;
}

export interface iFlowEdge {
  from: string;
  to: string;
  type?: iEdgeType;
  label?: string;
}

export interface iFlowDefinition {
  id: string;
  name: string;
  nodes: iFlowNode[];
  edges: iFlowEdge[];
}

export interface iPositionedNode extends iFlowNode {
  x: number;
  y: number;
  level: number;
  column: number;
}

export interface iLayoutConfig {
  nodeWidth?: number;
  nodeHeight?: number;
  horizontalSpacing?: number;
  verticalSpacing?: number;
  padding?: number;
}

export type iDrawerPosition = 'top' | 'bottom' | 'left' | 'right';

export interface iFlowChartProps {
  flow: iFlowDefinition;
  config?: iLayoutConfig;
  activeNodeId?: string;
  selectedPathId?: string;
  onNodeClick?: (node: iFlowNode) => void;
  onPathChange?: (pathId: string | null) => void;
  className?: string;
  pathDrawerPosition?: iDrawerPosition;
}
