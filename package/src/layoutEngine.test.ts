import { describe, it, expect } from 'vitest';
import { calculateLayout, getEdgeColor, getNodeColor } from './layoutEngine';
import { iFlowDefinition } from './types';

describe('layoutEngine', () => {
  describe('calculateLayout', () => {
    it('calculates layout for a simple linear flow', () => {
      const flow: iFlowDefinition = {
        id: 'test-flow',
        name: 'Test Flow',
        nodes: [
          { id: 'start', label: 'Start', type: 'start' },
          { id: 'action1', label: 'Action 1', type: 'action' },
          { id: 'end', label: 'End', type: 'end' },
        ],
        edges: [
          { from: 'start', to: 'action1' },
          { from: 'action1', to: 'end' },
        ],
      };

      const result = calculateLayout(flow);

      expect(result.nodes).toHaveLength(3);
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);

      const startNode = result.nodes.find((n) => n.id === 'start');
      const action1Node = result.nodes.find((n) => n.id === 'action1');
      const endNode = result.nodes.find((n) => n.id === 'end');

      expect(startNode).toBeDefined();
      expect(action1Node).toBeDefined();
      expect(endNode).toBeDefined();

      expect(startNode!.level).toBe(0);
      expect(action1Node!.level).toBe(1);
      expect(endNode!.level).toBe(2);
    });

    it('assigns correct positions with x and y coordinates', () => {
      const flow: iFlowDefinition = {
        id: 'test-flow',
        name: 'Test Flow',
        nodes: [
          { id: 'start', label: 'Start', type: 'start' },
          { id: 'end', label: 'End', type: 'end' },
        ],
        edges: [{ from: 'start', to: 'end' }],
      };

      const result = calculateLayout(flow);

      result.nodes.forEach((node) => {
        expect(node.x).toBeGreaterThan(0);
        expect(node.y).toBeGreaterThan(0);
        expect(typeof node.level).toBe('number');
        expect(typeof node.column).toBe('number');
      });
    });

    it('handles branching flows with multiple children', () => {
      const flow: iFlowDefinition = {
        id: 'branch-flow',
        name: 'Branch Flow',
        nodes: [
          { id: 'start', label: 'Start', type: 'start' },
          { id: 'decision', label: 'Decision?', type: 'decision' },
          { id: 'yes', label: 'Yes Path', type: 'action' },
          { id: 'no', label: 'No Path', type: 'action' },
          { id: 'end', label: 'End', type: 'end' },
        ],
        edges: [
          { from: 'start', to: 'decision' },
          { from: 'decision', to: 'yes', type: 'happy' },
          { from: 'decision', to: 'no', type: 'error' },
          { from: 'yes', to: 'end' },
          { from: 'no', to: 'end' },
        ],
      };

      const result = calculateLayout(flow);

      expect(result.nodes).toHaveLength(5);

      const decisionNode = result.nodes.find((n) => n.id === 'decision');
      const yesNode = result.nodes.find((n) => n.id === 'yes');
      const noNode = result.nodes.find((n) => n.id === 'no');

      expect(decisionNode!.level).toBe(1);
      expect(yesNode!.level).toBe(2);
      expect(noNode!.level).toBe(2);

      expect(yesNode!.column).not.toBe(noNode!.column);
    });

    it('uses custom config when provided', () => {
      const flow: iFlowDefinition = {
        id: 'test-flow',
        name: 'Test Flow',
        nodes: [
          { id: 'start', label: 'Start', type: 'start' },
          { id: 'end', label: 'End', type: 'end' },
        ],
        edges: [{ from: 'start', to: 'end' }],
      };

      const customConfig = {
        nodeWidth: 200,
        nodeHeight: 100,
        horizontalSpacing: 200,
        verticalSpacing: 150,
        padding: 50,
      };

      const defaultResult = calculateLayout(flow);
      const customResult = calculateLayout(flow, customConfig);

      expect(customResult.width).not.toBe(defaultResult.width);
      expect(customResult.height).not.toBe(defaultResult.height);
    });

    it('handles empty flow', () => {
      const flow: iFlowDefinition = {
        id: 'empty-flow',
        name: 'Empty Flow',
        nodes: [],
        edges: [],
      };

      const result = calculateLayout(flow);

      expect(result.nodes).toHaveLength(0);
    });

    it('handles flow without start node', () => {
      const flow: iFlowDefinition = {
        id: 'no-start-flow',
        name: 'No Start Flow',
        nodes: [
          { id: 'action1', label: 'Action 1', type: 'action' },
          { id: 'action2', label: 'Action 2', type: 'action' },
        ],
        edges: [{ from: 'action1', to: 'action2' }],
      };

      const result = calculateLayout(flow);

      expect(result.nodes).toHaveLength(2);
      const action1Node = result.nodes.find((n) => n.id === 'action1');
      expect(action1Node!.level).toBe(0);
    });

    it('handles disconnected nodes', () => {
      const flow: iFlowDefinition = {
        id: 'disconnected-flow',
        name: 'Disconnected Flow',
        nodes: [
          { id: 'start', label: 'Start', type: 'start' },
          { id: 'isolated', label: 'Isolated', type: 'action' },
          { id: 'end', label: 'End', type: 'end' },
        ],
        edges: [{ from: 'start', to: 'end' }],
      };

      const result = calculateLayout(flow);

      expect(result.nodes).toHaveLength(3);
      const isolatedNode = result.nodes.find((n) => n.id === 'isolated');
      expect(isolatedNode).toBeDefined();
    });
  });

  describe('getEdgeColor', () => {
    it('returns green for happy edges', () => {
      expect(getEdgeColor('happy')).toBe('#22c55e');
    });

    it('returns red for error edges', () => {
      expect(getEdgeColor('error')).toBe('#ef4444');
    });

    it('returns amber for warning edges', () => {
      expect(getEdgeColor('warning')).toBe('#f59e0b');
    });

    it('returns gray for default edges', () => {
      expect(getEdgeColor('default')).toBe('#71717a');
    });

    it('returns gray for undefined edges', () => {
      expect(getEdgeColor(undefined)).toBe('#71717a');
    });
  });

  describe('getNodeColor', () => {
    it('returns blue for start nodes', () => {
      expect(getNodeColor('start')).toBe('#2563eb');
    });

    it('returns green for end nodes', () => {
      expect(getNodeColor('end')).toBe('#16a34a');
    });

    it('returns yellow for decision nodes', () => {
      expect(getNodeColor('decision')).toBe('#ca8a04');
    });

    it('returns red for error nodes', () => {
      expect(getNodeColor('error')).toBe('#dc2626');
    });

    it('returns amber for warning nodes', () => {
      expect(getNodeColor('warning')).toBe('#f59e0b');
    });

    it('returns purple for link nodes', () => {
      expect(getNodeColor('link')).toBe('#9333ea');
    });

    it('returns gray for unknown node types', () => {
      expect(getNodeColor('action')).toBe('#3f3f46');
      expect(getNodeColor('unknown')).toBe('#3f3f46');
    });
  });
});
