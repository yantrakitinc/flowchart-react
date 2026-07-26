'use client';

/**
 * FlowChart — the one component. Accepts a diagram as Mermaid-like `chart` text OR as a
 * `graph` IR object, lays it out (dagre by default), and renders it on React Flow with the
 * rich node registry, semantic edge styling, and an optional path-selector drawer.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from '@xyflow/react';
import { iFlowGraph } from '../ir/types';
import { parseFlowchart } from '../parse/parseFlowchart';
import { FlowchartParseError } from '../parse/errors';
import { layout } from '../layout/layout';
import type { iPositionedGraph } from '../layout/types';
import { toReactFlowEdge } from './edges/edgeStyle';
import { resolveNodeTypes } from './nodes/registry';
import { PathDrawer } from './PathDrawer';
import { usePaths } from './usePaths';
import type { iFlowChartProps, iFlowNodeData } from './types';

const EMPTY_GRAPH: iFlowGraph = { id: 'empty', name: 'empty', direction: 'TD', nodes: [], edges: [] };

/** The single interactive flowchart component. */
export function FlowChart(props: iFlowChartProps): JSX.Element {
  const {
    chart,
    graph: graphProp,
    nodeTypes,
    layoutEngine,
    direction,
    activeNodeId,
    selectedPathId,
    onPathChange,
    onNodeClick,
    showPathDrawer = true,
    pathDrawerPosition = 'right',
    showMiniMap = false,
    showControls = true,
    className = '',
    height = 480,
  } = props;

  const parsed = useMemo((): { graph: iFlowGraph | null; error: FlowchartParseError | null } => {
    try {
      if (typeof chart === 'string') {
        const g = parseFlowchart(chart, direction ? { direction } : {});
        return { graph: g, error: null };
      }
      if (graphProp) {
        const g = direction ? { ...graphProp, direction } : graphProp;
        return { graph: g, error: null };
      }
      throw new FlowchartParseError('FlowChart requires either a `chart` or a `graph` prop', 1);
    } catch (err) {
      // Both branches that throw here throw a FlowchartParseError.
      return { graph: null, error: err as FlowchartParseError };
    }
  }, [chart, graphProp, direction]);

  const graph = parsed.graph;

  const [positioned, setPositioned] = useState<iPositionedGraph | null>(null);
  const engineRef = useRef(layoutEngine);
  engineRef.current = layoutEngine;

  useEffect(() => {
    if (!graph) {
      setPositioned(null);
      return;
    }
    let cancelled = false;
    const apply = (result: iPositionedGraph | null) => {
      if (!cancelled) setPositioned(result);
    };
    layout(graph, engineRef.current ? { engine: engineRef.current } : {}).then(apply, () =>
      apply(null)
    );
    return () => {
      cancelled = true;
    };
  }, [graph]);

  const paths = usePaths(graph ?? EMPTY_GRAPH, selectedPathId, onPathChange);
  const pathNodeIds = paths.selectedPath ? new Set(paths.selectedPath.nodeIds) : null;
  const pathEdgeIds = paths.selectedPath ? new Set(paths.selectedPath.edgeIds) : null;

  const rfNodes: Node[] = useMemo(() => {
    if (!positioned) return [];
    return positioned.nodes.map((n) => {
      const data: iFlowNodeData = {
        label: n.label,
        type: n.type,
        direction: positioned.direction,
        ...(n.description !== undefined ? { description: n.description } : {}),
        ...(n.data ?? {}),
        active: activeNodeId === n.id,
        onSelectedPath: pathNodeIds ? pathNodeIds.has(n.id) : undefined,
        dimmed: pathNodeIds ? !pathNodeIds.has(n.id) : false,
      };
      return {
        id: n.id,
        type: n.type,
        position: n.position,
        data: data as unknown as Record<string, unknown>,
        style: { width: n.width },
      };
    });
  }, [positioned, activeNodeId, pathNodeIds]);

  const rfEdges: Edge[] = useMemo(() => {
    if (!positioned) return [];
    return positioned.edges.map((e) =>
      toReactFlowEdge(e, pathEdgeIds ? !pathEdgeIds.has(e.id) : false)
    );
  }, [positioned, pathEdgeIds]);

  const nodeTypeMap = useMemo(() => resolveNodeTypes(nodeTypes), [nodeTypes]);

  const handleNodeClick: NodeMouseHandler = (_evt, node) => {
    onNodeClick?.(node.id, node.data as unknown as iFlowNodeData);
  };

  if (parsed.error) {
    return (
      <div className={`fc-error ${className}`} role="alert" data-testid="fc-parse-error" data-agent-action="parse-error">
        <strong>Flowchart parse error</strong>
        <pre className="fc-error__message">{parsed.error.message}</pre>
      </div>
    );
  }

  const drawerIsVertical = pathDrawerPosition === 'left' || pathDrawerPosition === 'right';

  return (
    <div
      className={`fc-root fc-root--drawer-${pathDrawerPosition} ${className}`}
      data-testid="fc-flowchart"
      data-agent-action="flowchart"
      style={{
        height: typeof height === 'number' ? `${height}px` : height,
        flexDirection: drawerIsVertical ? 'row' : 'column',
      }}
    >
      <div className="fc-canvas">
        {positioned ? (
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            nodeTypes={nodeTypeMap}
            onNodeClick={handleNodeClick}
            fitView
            proOptions={{ hideAttribution: false }}
          >
            <Background />
            {showControls && <Controls />}
            {showMiniMap && <MiniMap />}
          </ReactFlow>
        ) : (
          <div className="fc-loading" data-agent-action="loading">
            Laying out…
          </div>
        )}
      </div>
      {showPathDrawer && (
        <PathDrawer
          paths={paths.paths}
          selectedPathId={paths.selectedPathId}
          onSelect={paths.setSelectedPathId}
          position={pathDrawerPosition}
        />
      )}
    </div>
  );
}
