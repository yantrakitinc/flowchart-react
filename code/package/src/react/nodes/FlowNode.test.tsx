import { fireEvent, render, screen } from '@testing-library/react';
import { ReactFlowProvider, type Node, type NodeProps } from '@xyflow/react';
import { describe, expect, it } from 'vitest';
import { FlowNode } from './FlowNode';
import type { iFlowNodeData } from '../types';

function makeProps(data: iFlowNodeData, id = 'n1'): NodeProps<Node<iFlowNodeData>> {
  return {
    id,
    data,
    type: data.type,
    dragging: false,
    zIndex: 0,
    selectable: true,
    deletable: true,
    selected: false,
    draggable: true,
    isConnectable: true,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
  };
}

function renderNode(data: iFlowNodeData, id = 'n1') {
  return render(
    <ReactFlowProvider>
      <FlowNode {...makeProps(data, id)} />
    </ReactFlowProvider>
  );
}

describe('FlowNode', () => {
  it.each(['start', 'end', 'action', 'decision', 'error', 'warning', 'link'] as const)(
    'renders the %s type with its testid, data attributes and aria-label',
    (type) => {
      renderNode({ label: 'My Label', type, direction: 'TD' });
      const el = screen.getByTestId('fc-node-n1');
      expect(el).toHaveAttribute('data-node-id', 'n1');
      expect(el).toHaveAttribute('data-node-type', type);
      expect(el).toHaveAttribute('data-agent-action', 'select-node');
      expect(el).toHaveAttribute('data-agent-step', 'node');
      expect(el).toHaveAttribute('aria-label', `${type} node: My Label`);
      expect(el.className).toContain(`fc-node--${type}`);
      expect(screen.getByText('My Label')).toBeInTheDocument();
    }
  );

  it.each(['TD', 'BT', 'LR', 'RL'] as const)('renders connection handles for direction %s', (direction) => {
    const { container } = renderNode({ label: 'X', type: 'action', direction });
    expect(container.querySelectorAll('.react-flow__handle')).toHaveLength(2);
  });

  it('applies active/onSelectedPath/dimmed state classes', () => {
    renderNode({ label: 'X', type: 'action', direction: 'TD', active: true, onSelectedPath: true, dimmed: true });
    const el = screen.getByTestId('fc-node-n1');
    expect(el.className).toContain('fc-node--active');
    expect(el.className).toContain('fc-node--on-path');
    expect(el.className).toContain('fc-node--dimmed');
  });

  it('omits the expand affordance when there is no description', () => {
    renderNode({ label: 'X', type: 'action', direction: 'TD' });
    expect(screen.queryByTestId('fc-node-n1-expand')).not.toBeInTheDocument();
  });

  it('toggles the description open and closed via the expand affordance', () => {
    renderNode({ label: 'X', type: 'action', direction: 'TD', description: 'more detail' });
    expect(screen.queryByText('more detail')).not.toBeInTheDocument();
    const toggle = screen.getByTestId('fc-node-n1-expand');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(screen.getByText('more detail')).toBeInTheDocument();
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(toggle);
    expect(screen.queryByText('more detail')).not.toBeInTheDocument();
  });
});
