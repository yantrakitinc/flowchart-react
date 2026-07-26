import { MarkerType, type Edge } from '@xyflow/react';
import type { iRenderEdge } from '../../layout/types';

/**
 * Converts a renderer-agnostic {@link iRenderEdge} into an `@xyflow/react` {@link Edge},
 * applying the semantic edge-type styling (color via CSS var, dashed for `warning`,
 * thick for `error`) and fading it when `dimmed` (off the highlighted path).
 */
export function toReactFlowEdge(edge: iRenderEdge, dimmed: boolean): Edge {
  return {
    id: edge.id,
    source: edge.from,
    target: edge.to,
    type: 'smoothstep',
    label: edge.label,
    style: {
      stroke: `var(--fc-edge-${edge.type})`,
      strokeWidth: edge.type === 'error' ? 3 : 2,
      strokeDasharray: edge.type === 'warning' ? '6 4' : undefined,
      opacity: dimmed ? 0.2 : 1,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: `var(--fc-edge-${edge.type})`,
    },
  };
}
