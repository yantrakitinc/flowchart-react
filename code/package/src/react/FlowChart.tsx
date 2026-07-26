'use client';

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
import type { iFlowGraph } from '../ir/types';
import { parseFlowchart } from '../parse/parseFlowchart';
import { FlowchartParseError } from '../parse/errors';
import { layout } from '../layout/layout';
import type { iPositionedGraph } from '../layout/types';
import { toReactFlowEdge } from './edges/edgeStyle';
import { resolveNodeTypes } from './nodes/registry';
import { PathDrawer } from './PathDrawer';
import { PlaybackControls } from './PlaybackControls';
import { usePaths } from './usePaths';
import { usePlayback } from './usePlayback';
import type { iFlowChartProps, iFlowNodeData } from './types';

const EMPTY_GRAPH: iFlowGraph = { id: 'empty', name: 'empty', direction: 'TD', nodes: [], edges: [] };

/**
 * The package's single component. Renders a diagram authored as Mermaid-like `chart`
 * DSL text, or as a pre-built `graph` IR object, laying it out (dagre by default) and
 * rendering it on React Flow with the rich node registry, semantic edge styling, a
 * path-selector drawer, and "movie mode" path playback.
 */
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
    autoPlay = false,
    playbackSpeedMs = 1200,
    loop = false,
    showPlaybackControls = true,
    onPlaybackStep,
    onPlaybackEnd,
  } = props;

  const parsed = useMemo((): { graph: iFlowGraph | null; error: FlowchartParseError | null } => {
    try {
      if (typeof chart === 'string') {
        return { graph: parseFlowchart(chart, direction ? { direction } : {}), error: null };
      }
      if (graphProp) {
        return { graph: graphProp, error: null };
      }
      throw new FlowchartParseError('FlowChart requires either a `chart` or a `graph` prop', 1);
    } catch (err) {
      // Every throw reachable above is a FlowchartParseError (from parseFlowchart itself,
      // or the explicit throw when neither `chart` nor `graph` is given).
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
    layout(graph, engineRef.current ? { engine: engineRef.current } : {}).then(
      (result) => {
        if (!cancelled) setPositioned(result);
      },
      () => {
        // A rejecting engine leaves the canvas in its loading state rather than crashing.
      }
    );
    return () => {
      cancelled = true;
    };
  }, [graph]);

  const paths = usePaths(graph ?? EMPTY_GRAPH, selectedPathId, onPathChange);

  // "Movie mode": the path being played is the user's current selection, falling back
  // to the first detected path so playback works out of the box with zero setup.
  const playingPath = paths.selectedPath ?? paths.paths[0] ?? null;

  const nodeById = useMemo(() => {
    const map = new Map(graph?.nodes.map((n) => [n.id, n]));
    return map;
  }, [graph]);

  const nodeDataFor = (nodeId: string): iFlowNodeData => {
    // Only ever invoked from playback's onStep, which only fires for a nodeId drawn
    // from `playingPath` — and a path only exists once `graph` (and this node) does.
    const node = nodeById.get(nodeId)!;
    return { label: node.label, type: node.type, description: node.description, direction: graph!.direction };
  };

  const playback = usePlayback(playingPath, {
    speedMs: playbackSpeedMs,
    loop,
    onStep: (nodeId, index) => onPlaybackStep?.(nodeId, index, nodeDataFor(nodeId)),
    onEnd: onPlaybackEnd,
  });

  // Playback is only "engaged" (and so only takes over highlighting) once the caller
  // has actually started it — either via autoPlay or by using the transport controls.
  // Until then the ordinary path-selection highlight (or no highlight) applies.
  const [engaged, setEngaged] = useState(autoPlay);
  const hasAutoStartedRef = useRef(false);
  useEffect(() => {
    if (!autoPlay || hasAutoStartedRef.current || !positioned || !playingPath) return;
    hasAutoStartedRef.current = true;
    playback.play();
  }, [autoPlay, positioned, playingPath, playback]);

  const handlePlay = () => {
    setEngaged(true);
    playback.play();
  };
  const handleRestart = () => {
    setEngaged(true);
    playback.restart();
  };
  const handleStepForward = () => {
    setEngaged(true);
    playback.stepForward();
  };
  const handleStepBack = () => {
    setEngaged(true);
    playback.stepBack();
  };

  const highlightNodeIds = useMemo(() => {
    if (engaged && playingPath) return new Set(playingPath.nodeIds.slice(0, playback.index + 1));
    if (paths.selectedPath) return new Set(paths.selectedPath.nodeIds);
    return null;
  }, [engaged, playingPath, playback.index, paths.selectedPath]);

  const highlightEdgeIds = useMemo(() => {
    if (engaged && playingPath) return new Set(playingPath.edgeIds.slice(0, playback.index));
    if (paths.selectedPath) return new Set(paths.selectedPath.edgeIds);
    return null;
  }, [engaged, playingPath, playback.index, paths.selectedPath]);

  // playback.currentNodeId is only ever null when there is no path to play — and
  // `engaged` can only become true once a path exists, so it is never null here.
  const effectiveActiveNodeId = engaged ? (playback.currentNodeId as string) : activeNodeId;

  const rfNodes: Node[] = useMemo(() => {
    if (!positioned) return [];
    return positioned.nodes.map((node) => {
      const data: iFlowNodeData = {
        label: node.label,
        type: node.type,
        description: node.description,
        direction: positioned.direction,
        active: node.id === effectiveActiveNodeId,
        onSelectedPath: highlightNodeIds ? highlightNodeIds.has(node.id) : undefined,
        dimmed: highlightNodeIds ? !highlightNodeIds.has(node.id) : false,
      };
      return {
        id: node.id,
        type: node.type,
        position: { x: node.x, y: node.y },
        data: data as unknown as Record<string, unknown>,
        style: { width: node.width, height: node.height },
      };
    });
  }, [positioned, effectiveActiveNodeId, highlightNodeIds]);

  const rfEdges: Edge[] = useMemo(() => {
    if (!positioned) return [];
    return positioned.edges.map((edge) =>
      toReactFlowEdge(edge, highlightEdgeIds ? !highlightEdgeIds.has(edge.id) : false)
    );
  }, [positioned, highlightEdgeIds]);

  const resolvedNodeTypes = useMemo(() => resolveNodeTypes(nodeTypes), [nodeTypes]);

  const handleNodeClick: NodeMouseHandler = (_event, node) => {
    onNodeClick?.(node.id, node.data as unknown as iFlowNodeData);
  };

  if (parsed.error) {
    return (
      <div className={`fc-flowchart fc-flowchart--error ${className}`.trim()} data-testid="fc-flowchart" data-agent-action="flowchart">
        <div className="fc-parse-error" data-testid="fc-parse-error" role="alert">
          <strong>Flowchart parse error</strong>
          <pre className="fc-parse-error-message">{parsed.error.message}</pre>
        </div>
      </div>
    );
  }

  const heightStyle = typeof height === 'number' ? `${height}px` : height;
  const showPlayback = showPlaybackControls && playingPath !== null;
  const drawerIsVertical = pathDrawerPosition === 'left' || pathDrawerPosition === 'right';

  return (
    <div
      className={`fc-flowchart fc-flowchart--drawer-${pathDrawerPosition} ${className}`.trim()}
      data-testid="fc-flowchart"
      data-agent-action="flowchart"
      style={{ height: heightStyle, flexDirection: drawerIsVertical ? 'row' : 'column' }}
    >
      <div className="fc-canvas" data-testid="fc-canvas">
        {positioned ? (
          <ReactFlow
            nodes={rfNodes}
            edges={rfEdges}
            nodeTypes={resolvedNodeTypes}
            nodesDraggable={false}
            nodesConnectable={false}
            onNodeClick={handleNodeClick}
            fitView
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
        <PathDrawer paths={paths.paths} selectedPathId={paths.selectedPathId} onSelect={paths.setSelectedPathId} />
      )}
      {showPlayback && playingPath && (
        <PlaybackControls
          playing={playback.playing}
          index={playback.index}
          total={playingPath.nodeIds.length}
          onPlay={handlePlay}
          onPause={playback.pause}
          onRestart={handleRestart}
          onStepForward={handleStepForward}
          onStepBack={handleStepBack}
        />
      )}
    </div>
  );
}
