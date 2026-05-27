import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FlowChart } from './FlowChart';
import { iFlowDefinition } from './types';

const createSimpleFlow = (): iFlowDefinition => ({
  id: 'test-flow',
  name: 'Test Flow',
  nodes: [
    { id: 'start', label: 'Start', type: 'start' },
    { id: 'action', label: 'Action', type: 'action' },
    { id: 'end', label: 'End', type: 'end' },
  ],
  edges: [
    { from: 'start', to: 'action' },
    { from: 'action', to: 'end' },
  ],
});

const createBranchingFlow = (): iFlowDefinition => ({
  id: 'branch-flow',
  name: 'Branch Flow',
  nodes: [
    { id: 'start', label: 'Start', type: 'start' },
    { id: 'decision', label: 'Decision', type: 'decision' },
    { id: 'yes', label: 'Yes', type: 'action' },
    { id: 'no', label: 'No', type: 'action' },
    { id: 'end', label: 'End', type: 'end' },
  ],
  edges: [
    { from: 'start', to: 'decision' },
    { from: 'decision', to: 'yes', type: 'happy' },
    { from: 'decision', to: 'no', type: 'error' },
    { from: 'yes', to: 'end' },
    { from: 'no', to: 'end' },
  ],
});

describe('FlowChart', () => {
  describe('rendering', () => {
    it('renders the flowchart container', () => {
      render(<FlowChart flow={createSimpleFlow()} />);

      expect(screen.getByTestId('flowchart-container')).toBeInTheDocument();
    });

    it('renders the toolbar', () => {
      render(<FlowChart flow={createSimpleFlow()} />);

      expect(screen.getByTestId('flowchart-toolbar')).toBeInTheDocument();
    });

    it('renders the canvas', () => {
      render(<FlowChart flow={createSimpleFlow()} />);

      expect(screen.getByTestId('flowchart-canvas')).toBeInTheDocument();
    });

    it('renders the SVG element', () => {
      render(<FlowChart flow={createSimpleFlow()} />);

      expect(screen.getByTestId('flowchart-svg')).toBeInTheDocument();
    });

    it('renders all nodes with correct testids', () => {
      render(<FlowChart flow={createSimpleFlow()} />);

      expect(screen.getByTestId('flow-node-start')).toBeInTheDocument();
      expect(screen.getByTestId('flow-node-action')).toBeInTheDocument();
      expect(screen.getByTestId('flow-node-end')).toBeInTheDocument();
    });

    it('renders decision nodes', () => {
      render(<FlowChart flow={createBranchingFlow()} />);

      expect(screen.getByTestId('flow-node-decision')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      render(<FlowChart flow={createSimpleFlow()} className="custom-class" />);

      const container = screen.getByTestId('flowchart-container');
      expect(container).toHaveClass('custom-class');
    });
  });

  describe('zoom controls', () => {
    it('renders zoom controls', () => {
      render(<FlowChart flow={createSimpleFlow()} />);

      expect(screen.getByTestId('zoom-controls')).toBeInTheDocument();
      expect(screen.getByTestId('zoom-in-btn')).toBeInTheDocument();
      expect(screen.getByTestId('zoom-out-btn')).toBeInTheDocument();
      expect(screen.getByTestId('zoom-reset-btn')).toBeInTheDocument();
      expect(screen.getByTestId('zoom-input')).toBeInTheDocument();
    });

    it('shows default zoom level of 100%', () => {
      render(<FlowChart flow={createSimpleFlow()} />);

      const zoomInput = screen.getByTestId('zoom-input') as HTMLInputElement;
      expect(zoomInput.value).toBe('100');
    });

    it('increases zoom on zoom in click', () => {
      render(<FlowChart flow={createSimpleFlow()} />);

      const zoomInBtn = screen.getByTestId('zoom-in-btn');
      const zoomInput = screen.getByTestId('zoom-input') as HTMLInputElement;

      fireEvent.click(zoomInBtn);

      expect(parseInt(zoomInput.value, 10)).toBeGreaterThan(100);
    });

    it('decreases zoom on zoom out click', () => {
      render(<FlowChart flow={createSimpleFlow()} />);

      const zoomOutBtn = screen.getByTestId('zoom-out-btn');
      const zoomInput = screen.getByTestId('zoom-input') as HTMLInputElement;

      fireEvent.click(zoomOutBtn);

      expect(parseInt(zoomInput.value, 10)).toBeLessThan(100);
    });

    it('resets zoom on reset click', () => {
      render(<FlowChart flow={createSimpleFlow()} />);

      const zoomInBtn = screen.getByTestId('zoom-in-btn');
      const zoomResetBtn = screen.getByTestId('zoom-reset-btn');
      const zoomInput = screen.getByTestId('zoom-input') as HTMLInputElement;

      fireEvent.click(zoomInBtn);
      fireEvent.click(zoomInBtn);
      expect(parseInt(zoomInput.value, 10)).toBeGreaterThan(100);

      fireEvent.click(zoomResetBtn);
      expect(zoomInput.value).toBe('100');
    });

    it('allows manual zoom input', () => {
      render(<FlowChart flow={createSimpleFlow()} />);

      const zoomInput = screen.getByTestId('zoom-input') as HTMLInputElement;

      fireEvent.change(zoomInput, { target: { value: '200' } });

      expect(zoomInput.value).toBe('200');
    });
  });

  describe('scroll mode toggle', () => {
    it('renders scroll mode buttons', () => {
      render(<FlowChart flow={createSimpleFlow()} />);

      expect(screen.getByTestId('scroll-mode-move')).toBeInTheDocument();
      expect(screen.getByTestId('scroll-mode-zoom')).toBeInTheDocument();
    });

    it('defaults to zoom mode', () => {
      render(<FlowChart flow={createSimpleFlow()} />);

      const zoomBtn = screen.getByTestId('scroll-mode-zoom');
      expect(zoomBtn).toHaveClass('yk-flowchart-btn-group-item--active');
    });

    it('toggles to move mode', () => {
      render(<FlowChart flow={createSimpleFlow()} />);

      const moveBtn = screen.getByTestId('scroll-mode-move');
      fireEvent.click(moveBtn);

      expect(moveBtn).toHaveClass('yk-flowchart-btn-group-item--active');
    });
  });

  describe('path selection', () => {
    it('renders path selector when onPathChange is provided', () => {
      const onPathChange = vi.fn();
      render(<FlowChart flow={createBranchingFlow()} onPathChange={onPathChange} />);

      expect(screen.getByTestId('path-selector')).toBeInTheDocument();
    });

    it('does not render path selector when onPathChange is not provided', () => {
      render(<FlowChart flow={createSimpleFlow()} />);

      expect(screen.queryByTestId('path-selector')).not.toBeInTheDocument();
    });

    it('calls onPathChange when path is selected', () => {
      const onPathChange = vi.fn();
      render(<FlowChart flow={createBranchingFlow()} onPathChange={onPathChange} />);

      const pathSelector = screen.getByTestId('path-selector');
      fireEvent.change(pathSelector, { target: { value: 'path-1' } });

      expect(onPathChange).toHaveBeenCalledWith('path-1');
    });

    it('calls onPathChange with null when all paths is selected', () => {
      const onPathChange = vi.fn();
      render(
        <FlowChart
          flow={createBranchingFlow()}
          onPathChange={onPathChange}
          selectedPathId="path-1"
        />
      );

      const pathSelector = screen.getByTestId('path-selector');
      fireEvent.change(pathSelector, { target: { value: 'all' } });

      expect(onPathChange).toHaveBeenCalledWith(null);
    });
  });

  describe('node interactions', () => {
    it('calls onNodeClick when node is clicked', () => {
      const onNodeClick = vi.fn();
      render(<FlowChart flow={createSimpleFlow()} onNodeClick={onNodeClick} />);

      const startNode = screen.getByTestId('flow-node-start');
      fireEvent.click(startNode);

      expect(onNodeClick).toHaveBeenCalledTimes(1);
      expect(onNodeClick).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'start', type: 'start' })
      );
    });

    it('highlights active node', () => {
      render(<FlowChart flow={createSimpleFlow()} activeNodeId="action" />);

      const actionNode = screen.getByTestId('flow-node-action');
      expect(actionNode).toBeInTheDocument();
    });
  });

  describe('path drawer', () => {
    it('renders path drawer', () => {
      render(<FlowChart flow={createSimpleFlow()} />);

      expect(screen.getByTestId('path-drawer')).toBeInTheDocument();
    });

    it('accepts different drawer positions', () => {
      const { rerender } = render(
        <FlowChart flow={createSimpleFlow()} pathDrawerPosition="left" />
      );
      expect(screen.getByTestId('path-drawer')).toBeInTheDocument();

      rerender(<FlowChart flow={createSimpleFlow()} pathDrawerPosition="right" />);
      expect(screen.getByTestId('path-drawer')).toBeInTheDocument();

      rerender(<FlowChart flow={createSimpleFlow()} pathDrawerPosition="top" />);
      expect(screen.getByTestId('path-drawer')).toBeInTheDocument();

      rerender(<FlowChart flow={createSimpleFlow()} pathDrawerPosition="bottom" />);
      expect(screen.getByTestId('path-drawer')).toBeInTheDocument();
    });
  });

  describe('edge rendering', () => {
    it('handles edges with labels', () => {
      const flowWithLabels: iFlowDefinition = {
        id: 'label-flow',
        name: 'Label Flow',
        nodes: [
          { id: 'start', label: 'Start', type: 'start' },
          { id: 'end', label: 'End', type: 'end' },
        ],
        edges: [{ from: 'start', to: 'end', label: 'Yes' }],
      };

      render(<FlowChart flow={flowWithLabels} />);

      expect(screen.getByTestId('flowchart-svg')).toBeInTheDocument();
    });
  });
});
