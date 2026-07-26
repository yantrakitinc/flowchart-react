/**
 * @yantrakit/flowchart-react — public entry point.
 *
 * A Mermaid-like, AI-first React flowchart: author with text (`chart`) or the IR object
 * (`graph`), rendered on React Flow with rich per-node UI and semantic path detection.
 */

// ---- IR (the stable graph model) ----
export type { iNodeType, iEdgeType, iDirection, iFlowNode, iFlowEdge, iFlowGraph } from './ir/types';
export { NODE_TYPES, EDGE_TYPES, DIRECTIONS, isNodeType, isEdgeType, isDirection } from './ir/types';
export { FLOW_GRAPH_SCHEMA } from './ir/schema';

// ---- Parse / serialize (pure, no React) ----
export { parseFlowchart } from './parse/parseFlowchart';
export type { iParseOptions } from './parse/parseFlowchart';
export { serializeFlowchart } from './parse/serializeFlowchart';
export { FlowchartParseError } from './parse/errors';

// ---- Path model (pure, no React) ----
export { detectPaths } from './paths/detectPaths';
export type { iPathType, iFlowPath, iPathDetectionResult } from './paths/detectPaths';

// ---- Layout (pure, no React) ----
export { layout } from './layout/layout';
export { dagreEngine } from './layout/dagreEngine';
export { elkEngine } from './layout/elkEngine';
export type {
  iLayoutEngine,
  iLayoutOptions,
  iEngineContext,
  iPositions,
  iPositionedNode,
  iPositionedGraph,
  iRenderEdge,
} from './layout/types';

// ---- React layer ----
export { FlowChart } from './react/FlowChart';
export { FlowNode } from './react/nodes/FlowNode';
export { defaultNodeTypes, resolveNodeTypes } from './react/nodes/registry';
export { PathDrawer } from './react/PathDrawer';
export { usePaths } from './react/usePaths';
export type { iUsePathsResult } from './react/usePaths';
export type { iFlowChartProps, iFlowNodeData, iNodeRegistry, iDrawerPosition } from './react/types';
