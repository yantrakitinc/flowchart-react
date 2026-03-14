import { useState, useMemo } from 'react';
import { iFlowChartProps, iFlowEdge, iPositionedNode } from './types';
import { calculateLayout, getEdgeColor, getNodeColor } from './layoutEngine';
import { detectPaths, getPathColor, iFlowPath } from './pathDetector';
import './styles.css';

export function FlowChart({
  flow,
  config,
  activeNodeId,
  selectedPathId,
  onNodeClick,
  onPathChange,
  className = '',
  pathDrawerPosition = 'right',
}: iFlowChartProps) {
  const isDrawerVertical = pathDrawerPosition === 'left' || pathDrawerPosition === 'right';
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [scrollMode, setScrollMode] = useState<'zoom' | 'move'>('zoom');
  const [showPathText, setShowPathText] = useState(false);
  const [copied, setCopied] = useState(false);

  const { nodes, width, height } = useMemo(
    () => calculateLayout(flow, config),
    [flow, config]
  );

  const nodeMap = useMemo(() => {
    const map = new Map<string, iPositionedNode>();
    nodes.forEach((node) => map.set(node.id, node));
    return map;
  }, [nodes]);

  const pathDetection = useMemo(() => detectPaths(flow), [flow]);
  const pathTypeOrder: Record<string, number> = { happy: 0, neutral: 1, warning: 2, error: 3 };
  const paths = useMemo(() => {
    return [...pathDetection.paths].sort((a, b) => {
      return (pathTypeOrder[a.type] ?? 1) - (pathTypeOrder[b.type] ?? 1);
    });
  }, [pathDetection.paths]);

  const selectedPath = useMemo(() => {
    if (!selectedPathId) return null;
    return paths.find((p) => p.id === selectedPathId) || null;
  }, [selectedPathId, paths]);

  const isNodeInSelectedPath = (nodeId: string): boolean => {
    if (!selectedPath) return true;
    return selectedPath.nodeIds.includes(nodeId);
  };

  const isEdgeInSelectedPath = (edgeIdx: number): boolean => {
    if (!selectedPath) return true;
    return selectedPath.edgeIndices.includes(edgeIdx);
  };

  const getPathAsText = (path: iFlowPath): string => {
    const nodeLabels = path.nodeIds.map(id => {
      const node = flow.nodes.find(n => n.id === id);
      return node ? `${id} (${node.label})` : id;
    });
    return nodeLabels.join(' → ');
  };

  const getPathAsSimpleText = (path: iFlowPath): string => {
    return path.nodeIds.join(' → ');
  };

  const copyPathToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 100));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.1));
  const handleZoomReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (scrollMode === 'zoom') {
      setZoom((z) => {
        if (e.deltaY < 0) return Math.min(z + 0.1, 100);
        return Math.max(z - 0.1, 0.1);
      });
    } else {
      setPan((p) => ({
        x: p.x - e.deltaX,
        y: p.y - e.deltaY,
      }));
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && !e.defaultPrevented) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  };

  const handleMouseUp = () => setIsPanning(false);

  const renderEdge = (edge: iFlowEdge, idx: number) => {
    const fromNode = nodeMap.get(edge.from);
    const toNode = nodeMap.get(edge.to);
    if (!fromNode || !toNode) return null;

    const inPath = isEdgeInSelectedPath(idx);
    const isActive = edge.from === activeNodeId || edge.to === activeNodeId;
    const edgeType = edge.type || 'default';
    const strokeColor = isActive ? '#10b981' : getEdgeColor(edgeType);
    const markerType = isActive ? 'active' : edgeType;
    const opacity = selectedPath && !inPath ? 0.15 : 1;

    const dx = toNode.x - fromNode.x;
    const dy = toNode.y - fromNode.y;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length === 0) return null;

    const offsetStart = 30;
    const offsetEnd = 35;

    const startX = fromNode.x + (dx / length) * offsetStart;
    const startY = fromNode.y + (dy / length) * offsetStart;
    const endX = toNode.x - (dx / length) * offsetEnd;
    const endY = toNode.y - (dy / length) * offsetEnd;

    const midX = (fromNode.x + toNode.x) / 2;
    const midY = (fromNode.y + toNode.y) / 2;

    // Calculate angle for arrow rotation
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    // Effective line length after offsets
    const lineLength = length - offsetStart - offsetEnd;

    // Positions for smaller arrows (just behind the main arrow)
    const arrow1X = endX - (dx / length) * 45;
    const arrow1Y = endY - (dy / length) * 45;
    const arrow2X = endX - (dx / length) * 35;
    const arrow2Y = endY - (dy / length) * 35;

    // Only show trailing arrows if line is long enough
    const showTrailingArrows = lineLength > 60;

    return (
      <g key={`edge-${idx}`} opacity={opacity}>
        <line
          x1={startX}
          y1={startY}
          x2={endX}
          y2={endY}
          stroke={strokeColor}
          strokeWidth={isActive ? 3 : 2}
          markerEnd={`url(#arrowhead-${markerType})`}
        />
        {/* Smaller faded arrows along the line */}
        {showTrailingArrows && (
          <>
            <polygon
              points="-4,-3 4,0 -4,3"
              fill={strokeColor}
              opacity={0.3}
              transform={`translate(${arrow1X}, ${arrow1Y}) rotate(${angle})`}
            />
            <polygon
              points="-5,-4 5,0 -5,4"
              fill={strokeColor}
              opacity={0.5}
              transform={`translate(${arrow2X}, ${arrow2Y}) rotate(${angle})`}
            />
          </>
        )}
        {edge.label && (
          <g>
            <rect
              x={midX - 14}
              y={midY - 7}
              width="28"
              height="12"
              rx="6"
              fill="#09090b"
            />
            <text
              x={midX}
              y={midY}
              fill={strokeColor}
              fontSize="9"
              fontWeight="500"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {edge.label}
            </text>
          </g>
        )}
      </g>
    );
  };

  const renderNode = (node: iPositionedNode) => {
    const inPath = isNodeInSelectedPath(node.id);
    const isActive = node.id === activeNodeId;
    const fillColor = getNodeColor(node.type);
    const nodeWidth = node.type === 'decision' ? 70 : 160;
    const nodeHeight = node.type === 'decision' ? 70 : 50;
    const opacity = selectedPath && !inPath ? 0.15 : 1;
    const isClickable = !selectedPath || inPath;

    const handleClick = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (isClickable) {
        onNodeClick?.(node);
      }
    };

    if (node.type === 'decision') {
      return (
        <g
          key={node.id}
          onClick={handleClick}
          style={{ cursor: isClickable ? 'pointer' : 'not-allowed' }}
          opacity={opacity}
          data-testid={`flow-node-${node.id}`}
        >
          <g transform={`translate(${node.x}, ${node.y})`}>
            <rect
              x={-nodeWidth / 2}
              y={-nodeHeight / 2}
              width={nodeWidth}
              height={nodeHeight}
              fill={fillColor}
              stroke={isActive ? '#10b981' : '#71717a'}
              strokeWidth={isActive ? 3 : 1}
              transform="rotate(45)"
              rx="4"
            />
            <text
              fill="white"
              fontSize="10"
              fontWeight="bold"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {node.id}
            </text>
            <text
              y="16"
              fill="white"
              fontSize="9"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {node.label.slice(0, 16)}
            </text>
          </g>
        </g>
      );
    }

    if (node.type === 'start' || node.type === 'end') {
      return (
        <g
          key={node.id}
          onClick={handleClick}
          style={{ cursor: isClickable ? 'pointer' : 'not-allowed' }}
          opacity={opacity}
          data-testid={`flow-node-${node.id}`}
        >
          <g transform={`translate(${node.x}, ${node.y})`}>
            <ellipse
              cx="0"
              cy="0"
              rx={nodeWidth / 2}
              ry={nodeHeight / 2}
              fill={fillColor}
              stroke={isActive ? '#10b981' : '#71717a'}
              strokeWidth={isActive ? 3 : 1}
            />
            <text
              fill="white"
              fontSize="12"
              fontWeight="bold"
              textAnchor="middle"
              dominantBaseline="middle"
            >
              {node.label}
            </text>
          </g>
        </g>
      );
    }

    return (
      <g
        key={node.id}
        onClick={handleClick}
        style={{ cursor: isClickable ? 'pointer' : 'not-allowed' }}
        opacity={opacity}
        data-testid={`flow-node-${node.id}`}
      >
        <g transform={`translate(${node.x}, ${node.y})`}>
          <rect
            x={-nodeWidth / 2}
            y={-nodeHeight / 2}
            width={nodeWidth}
            height={nodeHeight}
            fill={fillColor}
            stroke={isActive ? '#10b981' : '#71717a'}
            strokeWidth={isActive ? 3 : 1}
            strokeDasharray={node.type === 'link' ? '4,2' : 'none'}
            rx="6"
          />
          <text
            y="-8"
            fill="white"
            fontSize="10"
            fontWeight="bold"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {node.id}
          </text>
          <text
            y="10"
            fill="white"
            fontSize="10"
            textAnchor="middle"
            dominantBaseline="middle"
          >
            {node.label.slice(0, 20)}
          </text>
        </g>
      </g>
    );
  };

  const getDrawerClasses = () => {
    const base = 'yk-flowchart-drawer';
    switch (pathDrawerPosition) {
      case 'left':
        return `${base} yk-flowchart-drawer--left ${showPathText ? 'yk-flowchart-drawer--open' : ''}`;
      case 'right':
        return `${base} yk-flowchart-drawer--right ${showPathText ? 'yk-flowchart-drawer--open' : ''}`;
      case 'top':
        return `${base} yk-flowchart-drawer--top ${showPathText ? 'yk-flowchart-drawer--open' : ''}`;
      case 'bottom':
        return `${base} yk-flowchart-drawer--bottom ${showPathText ? 'yk-flowchart-drawer--open' : ''}`;
    }
  };

  return (
    <div className={`yk-flowchart ${className}`}>
      {/* Toolbar */}
      <div className="yk-flowchart-toolbar">
        {/* Path Selection */}
        {paths.length > 0 && onPathChange && (
          <div className="yk-flowchart-select-wrapper">
            <select
              value={selectedPathId || 'all'}
              onChange={(e) => onPathChange(e.target.value === 'all' ? null : e.target.value)}
              className="yk-flowchart-select"
            >
              <option value="all">All Paths</option>
              {paths.map((path) => (
                <option key={path.id} value={path.id}>
                  {path.name} ({path.type})
                </option>
              ))}
            </select>
            {selectedPathId && (
              <span
                className="yk-flowchart-path-indicator"
                style={{ backgroundColor: getPathColor(selectedPath?.type || 'neutral') }}
              />
            )}
          </div>
        )}

        {/* Path Text Button */}
        {selectedPath && (
          <button
            onClick={() => setShowPathText(!showPathText)}
            className={`yk-flowchart-btn ${showPathText ? 'yk-flowchart-btn--active' : ''}`}
            title="Show path as text"
          >
            <svg className="yk-flowchart-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
        )}

        {/* Scroll Mode Toggle */}
        <div className="yk-flowchart-btn-group">
          <button
            onClick={() => setScrollMode('move')}
            className={`yk-flowchart-btn-group-item ${scrollMode === 'move' ? 'yk-flowchart-btn-group-item--active' : ''}`}
            title="Scroll to pan"
          >
            Move
          </button>
          <button
            onClick={() => setScrollMode('zoom')}
            className={`yk-flowchart-btn-group-item ${scrollMode === 'zoom' ? 'yk-flowchart-btn-group-item--active' : ''}`}
            title="Scroll to zoom"
          >
            Zoom
          </button>
        </div>

        {/* Zoom Controls */}
        <div className="yk-flowchart-zoom-controls">
          <button onClick={handleZoomOut} className="yk-flowchart-zoom-btn">
            <svg className="yk-flowchart-icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <input
            type="number"
            value={Math.round(zoom * 100)}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val) && val >= 10 && val <= 10000) {
                setZoom(val / 100);
              }
            }}
            className="yk-flowchart-zoom-input"
            min="10"
            max="10000"
          />
          <button onClick={handleZoomIn} className="yk-flowchart-zoom-btn">
            <svg className="yk-flowchart-icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
          <button onClick={handleZoomReset} className="yk-flowchart-zoom-btn">
            <svg className="yk-flowchart-icon-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* SVG Canvas */}
      <div
        className="yk-flowchart-canvas"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
      >
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${width} ${height}`}
          style={{
            transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
            transformOrigin: 'center center',
          }}
        >
          {/* Arrow marker definitions */}
          <defs>
            {['default', 'happy', 'error', 'warning', 'active'].map((type) => (
              <marker
                key={type}
                id={`arrowhead-${type}`}
                markerWidth="12"
                markerHeight="10"
                refX="30"
                refY="5"
                orient="auto"
                markerUnits="userSpaceOnUse"
              >
                <polygon
                  points="0 0, 12 5, 0 10"
                  fill={
                    type === 'happy' ? '#22c55e' :
                    type === 'error' ? '#ef4444' :
                    type === 'warning' ? '#f59e0b' :
                    type === 'active' ? '#10b981' :
                    '#71717a'
                  }
                />
              </marker>
            ))}
          </defs>

          {/* Edges */}
          {flow.edges.map((edge, idx) => renderEdge(edge, idx))}

          {/* Nodes */}
          {nodes.map((node) => renderNode(node))}
        </svg>
      </div>

      {/* Path Text Drawer */}
      <div className={getDrawerClasses()}>
        <div className={`yk-flowchart-drawer-content ${isDrawerVertical ? 'yk-flowchart-drawer-content--vertical' : ''}`}>
          <div className="yk-flowchart-drawer-header">
            <div className="yk-flowchart-drawer-title">
              <span
                className="yk-flowchart-drawer-dot"
                style={{ backgroundColor: selectedPath ? getPathColor(selectedPath.type) : '#71717a' }}
              />
              <span className="yk-flowchart-drawer-name">{selectedPath?.name || 'No path selected'}</span>
              {selectedPath && (
                <span
                  className="yk-flowchart-drawer-badge"
                  style={{ backgroundColor: getPathColor(selectedPath.type) }}
                >
                  {selectedPath.type}
                </span>
              )}
            </div>
            <button
              onClick={() => setShowPathText(false)}
              className="yk-flowchart-drawer-close"
            >
              <svg className="yk-flowchart-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {selectedPath && (
            <div className={`yk-flowchart-drawer-body ${isDrawerVertical ? 'yk-flowchart-drawer-body--vertical' : ''}`}>
              <div className="yk-flowchart-drawer-section">
                <div className="yk-flowchart-drawer-section-header">
                  <span className="yk-flowchart-drawer-section-label">Simple (IDs only)</span>
                  <button
                    onClick={() => copyPathToClipboard(getPathAsSimpleText(selectedPath))}
                    className="yk-flowchart-copy-btn"
                  >
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <code className="yk-flowchart-code">
                  {getPathAsSimpleText(selectedPath)}
                </code>
              </div>

              <div className="yk-flowchart-drawer-section">
                <div className="yk-flowchart-drawer-section-header">
                  <span className="yk-flowchart-drawer-section-label">With Labels</span>
                  <button
                    onClick={() => copyPathToClipboard(getPathAsText(selectedPath))}
                    className="yk-flowchart-copy-btn"
                  >
                    Copy
                  </button>
                </div>
                <code className={`yk-flowchart-code ${isDrawerVertical ? 'yk-flowchart-code--wrap' : ''}`}>
                  {getPathAsText(selectedPath)}
                </code>
              </div>

              <div className="yk-flowchart-drawer-section">
                <span className="yk-flowchart-drawer-section-label">Step Count</span>
                <span className="yk-flowchart-step-count">{selectedPath.nodeIds.length} steps</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
