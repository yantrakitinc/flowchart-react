/**
 * Map a semantic edge type to React Flow edge visuals. Colors come from CSS tokens so
 * themes can restyle without touching JS. Warning edges render dashed; error edges render
 * thick; happy edges use the success color; default is neutral.
 */
import { MarkerType, type Edge } from '@xyflow/react';
import { iEdgeType } from '../../ir/types';
import type { iRenderEdge } from '../../layout/types';

interface iEdgeVisual {
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
}

const VISUAL: Record<iEdgeType, iEdgeVisual> = {
  happy: { stroke: 'var(--fc-edge-happy)', strokeWidth: 2 },
  default: { stroke: 'var(--fc-edge-default)', strokeWidth: 1.5 },
  warning: { stroke: 'var(--fc-edge-warning)', strokeWidth: 2, strokeDasharray: '6 4' },
  error: { stroke: 'var(--fc-edge-error)', strokeWidth: 3 },
};

/** Convert a render edge (+ optional dim state) into a React Flow Edge. */
export function toReactFlowEdge(edge: iRenderEdge, dimmed: boolean): Edge {
  const v = VISUAL[edge.type];
  const style = {
    stroke: v.stroke,
    strokeWidth: v.strokeWidth,
    ...(v.strokeDasharray ? { strokeDasharray: v.strokeDasharray } : {}),
    opacity: dimmed ? 0.2 : 1,
  };
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: 'smoothstep',
    ...(edge.label !== undefined ? { label: edge.label } : {}),
    markerEnd: { type: MarkerType.ArrowClosed, color: v.stroke },
    style,
    data: { semantic: edge.type },
    className: `fc-edge fc-edge--${edge.type}`,
  };
}
