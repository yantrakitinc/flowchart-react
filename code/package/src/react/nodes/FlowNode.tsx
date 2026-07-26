/**
 * The rich default node component. One component renders all seven semantic types, varying
 * shape (stadium / diamond / rounded-rect), icon, and status color (all via CSS tokens).
 * Carries the agent affordances (`data-node-id`, `data-agent-action`, aria-label) and an
 * expand toggle for the optional description. Replaceable per type via the node registry.
 */
import { useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { iDirection, iNodeType } from '../../ir/types';
import type { iFlowNodeData } from '../types';

/** Small glyph shown before the label, per semantic type. */
const ICON: Record<iNodeType, string> = {
  start: '▶',
  end: '⏹',
  action: '▭',
  decision: '◆',
  error: '✕',
  warning: '⚠',
  link: '↗',
};

/** Handle placement derived from flow direction. */
function handleSides(direction: iDirection): { target: Position; source: Position } {
  switch (direction) {
    case 'TD':
      return { target: Position.Top, source: Position.Bottom };
    case 'BT':
      return { target: Position.Bottom, source: Position.Top };
    case 'LR':
      return { target: Position.Left, source: Position.Right };
    case 'RL':
      return { target: Position.Right, source: Position.Left };
  }
}

/** Rich default node — bound to the shared state vocabulary + CSS tokens. */
export function FlowNode({ id, data }: NodeProps): JSX.Element {
  const d = data as iFlowNodeData;
  const [expanded, setExpanded] = useState(false);
  const { target, source } = handleSides(d.direction);
  const hasDescription = typeof d.description === 'string' && d.description.length > 0;

  const classes = [
    'fc-node',
    `fc-node--${d.type}`,
    d.active ? 'fc-node--active' : '',
    d.onSelectedPath ? 'fc-node--on-path' : '',
    d.dimmed ? 'fc-node--dimmed' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classes}
      data-testid={`fc-node-${id}`}
      data-node-id={id}
      data-node-type={d.type}
      data-agent-action="select-node"
      data-agent-step="node"
      aria-label={`${d.type} node: ${d.label}`}
    >
      <Handle type="target" position={target} className="fc-handle" />

      <div className="fc-node__row">
        <span className="fc-node__icon" aria-hidden="true">
          {ICON[d.type]}
        </span>
        <span className="fc-node__label">{d.label}</span>
        {hasDescription && (
          <button
            type="button"
            className="fc-node__expand"
            data-testid={`fc-node-${id}-expand`}
            data-agent-action="toggle-description"
            aria-label={expanded ? 'Hide details' : 'Show details'}
            aria-expanded={expanded}
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((v) => !v);
            }}
          >
            {expanded ? '−' : '+'}
          </button>
        )}
      </div>

      {hasDescription && expanded && <div className="fc-node__description">{d.description}</div>}

      <Handle type="source" position={source} className="fc-handle" />
    </div>
  );
}
