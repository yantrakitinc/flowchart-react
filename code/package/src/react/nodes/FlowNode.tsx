'use client';

import { useState } from 'react';
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type { iNodeType } from '../../ir/types';
import type { iFlowNodeData } from '../types';

const ICON_BY_TYPE: Record<iNodeType, string> = {
  start: '▶',
  end: '■',
  action: '▭',
  decision: '◆',
  error: '✕',
  warning: '⚠',
  link: '↗',
};

/** Resolves the Handle position each side of a node should render at, per direction. */
const HANDLE_POSITIONS_BY_DIRECTION: Record<iFlowNodeData['direction'], { target: Position; source: Position }> = {
  TD: { target: Position.Top, source: Position.Bottom },
  BT: { target: Position.Bottom, source: Position.Top },
  LR: { target: Position.Left, source: Position.Right },
  RL: { target: Position.Right, source: Position.Left },
};

function handlePositions(direction: iFlowNodeData['direction']): { target: Position; source: Position } {
  return HANDLE_POSITIONS_BY_DIRECTION[direction];
}

/**
 * Default renderer used for all 7 {@link iNodeType} values. Shape and color are
 * driven entirely by the `fc-node--<type>` CSS class; this component only
 * supplies structure, connection handles and the expand-for-description affordance.
 */
export function FlowNode({ id, data }: NodeProps<Node<iFlowNodeData>>) {
  const [expanded, setExpanded] = useState(false);
  const { target, source } = handlePositions(data.direction);

  const classNames = [
    'fc-node',
    `fc-node--${data.type}`,
    data.active && 'fc-node--active',
    data.onSelectedPath && 'fc-node--on-path',
    data.dimmed && 'fc-node--dimmed',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classNames}
      data-testid={`fc-node-${id}`}
      data-node-id={id}
      data-node-type={data.type}
      data-agent-action="select-node"
      data-agent-step="node"
      aria-label={`${data.type} node: ${data.label}`}
    >
      <Handle type="target" position={target} />
      <div className="fc-node-body">
        <span className="fc-node-icon" aria-hidden="true">
          {ICON_BY_TYPE[data.type]}
        </span>
        <span className="fc-node-label">{data.label}</span>
        {data.description && (
          <button
            type="button"
            className="fc-node-expand"
            data-testid={`fc-node-${id}-expand`}
            data-agent-action="toggle-description"
            aria-expanded={expanded}
            aria-label={`${expanded ? 'Collapse' : 'Expand'} description for ${data.label}`}
            onClick={(event) => {
              event.stopPropagation();
              setExpanded((value) => !value);
            }}
          >
            {expanded ? '−' : '+'}
          </button>
        )}
      </div>
      {data.description && expanded && <div className="fc-node-description">{data.description}</div>}
      <Handle type="source" position={source} />
    </div>
  );
}
