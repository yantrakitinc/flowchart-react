import { describe, it, expect } from 'vitest';
import { detectPaths, getPathColor, getPathBgColor } from './pathDetector';
import { iFlowDefinition } from './types';

describe('pathDetector', () => {
  describe('detectPaths', () => {
    it('detects a simple linear path', () => {
      const flow: iFlowDefinition = {
        id: 'linear-flow',
        name: 'Linear Flow',
        nodes: [
          { id: 'start', label: 'Start', type: 'start' },
          { id: 'action', label: 'Action', type: 'action' },
          { id: 'end', label: 'End', type: 'end' },
        ],
        edges: [
          { from: 'start', to: 'action' },
          { from: 'action', to: 'end' },
        ],
      };

      const result = detectPaths(flow);

      expect(result.paths).toHaveLength(1);
      expect(result.paths[0].nodeIds).toEqual(['start', 'action', 'end']);
      expect(result.startNodeIds).toContain('start');
      expect(result.endNodeIds).toContain('end');
    });

    it('detects multiple paths in a branching flow', () => {
      const flow: iFlowDefinition = {
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
      };

      const result = detectPaths(flow);

      expect(result.paths.length).toBeGreaterThanOrEqual(2);
      expect(result.startNodeIds).toContain('start');
      expect(result.endNodeIds).toContain('end');
    });

    it('determines path type based on edge types - happy path', () => {
      const flow: iFlowDefinition = {
        id: 'happy-flow',
        name: 'Happy Flow',
        nodes: [
          { id: 'start', label: 'Start', type: 'start' },
          { id: 'end', label: 'End', type: 'end' },
        ],
        edges: [{ from: 'start', to: 'end', type: 'happy' }],
      };

      const result = detectPaths(flow);

      expect(result.paths).toHaveLength(1);
      expect(result.paths[0].type).toBe('happy');
    });

    it('determines path type based on edge types - error path', () => {
      const flow: iFlowDefinition = {
        id: 'error-flow',
        name: 'Error Flow',
        nodes: [
          { id: 'start', label: 'Start', type: 'start' },
          { id: 'end', label: 'End', type: 'end' },
        ],
        edges: [{ from: 'start', to: 'end', type: 'error' }],
      };

      const result = detectPaths(flow);

      expect(result.paths).toHaveLength(1);
      expect(result.paths[0].type).toBe('error');
    });

    it('determines path type based on edge types - warning path', () => {
      const flow: iFlowDefinition = {
        id: 'warning-flow',
        name: 'Warning Flow',
        nodes: [
          { id: 'start', label: 'Start', type: 'start' },
          { id: 'middle', label: 'Middle', type: 'action' },
          { id: 'end', label: 'End', type: 'end' },
        ],
        edges: [
          { from: 'start', to: 'middle', type: 'warning' },
          { from: 'middle', to: 'end', type: 'warning' },
        ],
      };

      const result = detectPaths(flow);

      expect(result.paths).toHaveLength(1);
      expect(result.paths[0].type).toBe('warning');
    });

    it('handles flow without explicit start/end nodes', () => {
      const flow: iFlowDefinition = {
        id: 'no-markers',
        name: 'No Markers',
        nodes: [
          { id: 'a', label: 'A', type: 'action' },
          { id: 'b', label: 'B', type: 'action' },
          { id: 'c', label: 'C', type: 'action' },
        ],
        edges: [
          { from: 'a', to: 'b' },
          { from: 'b', to: 'c' },
        ],
      };

      const result = detectPaths(flow);

      expect(result.startNodeIds).toContain('a');
      expect(result.endNodeIds).toContain('c');
    });

    it('handles empty flow', () => {
      const flow: iFlowDefinition = {
        id: 'empty',
        name: 'Empty',
        nodes: [],
        edges: [],
      };

      const result = detectPaths(flow);

      expect(result.paths).toHaveLength(0);
      expect(result.startNodeIds).toHaveLength(0);
      expect(result.endNodeIds).toHaveLength(0);
    });

    it('generates unique path IDs', () => {
      const flow: iFlowDefinition = {
        id: 'multi-path',
        name: 'Multi Path',
        nodes: [
          { id: 'start', label: 'Start', type: 'start' },
          { id: 'a', label: 'A', type: 'action' },
          { id: 'b', label: 'B', type: 'action' },
          { id: 'end', label: 'End', type: 'end' },
        ],
        edges: [
          { from: 'start', to: 'a' },
          { from: 'start', to: 'b' },
          { from: 'a', to: 'end' },
          { from: 'b', to: 'end' },
        ],
      };

      const result = detectPaths(flow);

      const pathIds = result.paths.map((p) => p.id);
      const uniqueIds = new Set(pathIds);
      expect(uniqueIds.size).toBe(pathIds.length);
    });

    it('includes edge indices in path result', () => {
      const flow: iFlowDefinition = {
        id: 'edge-test',
        name: 'Edge Test',
        nodes: [
          { id: 'start', label: 'Start', type: 'start' },
          { id: 'end', label: 'End', type: 'end' },
        ],
        edges: [{ from: 'start', to: 'end' }],
      };

      const result = detectPaths(flow);

      expect(result.paths[0].edgeIndices).toBeDefined();
      expect(result.paths[0].edgeIndices).toHaveLength(1);
      expect(result.paths[0].edgeIndices[0]).toBe(0);
    });

    it('detects paths with multiple end nodes', () => {
      const flow: iFlowDefinition = {
        id: 'multi-end',
        name: 'Multi End',
        nodes: [
          { id: 'start', label: 'Start', type: 'start' },
          { id: 'success', label: 'Success', type: 'end' },
          { id: 'failure', label: 'Failure', type: 'end' },
        ],
        edges: [
          { from: 'start', to: 'success', type: 'happy' },
          { from: 'start', to: 'failure', type: 'error' },
        ],
      };

      const result = detectPaths(flow);

      expect(result.paths.length).toBe(2);
      expect(result.endNodeIds).toContain('success');
      expect(result.endNodeIds).toContain('failure');
    });
  });

  describe('getPathColor', () => {
    it('returns green for happy paths', () => {
      expect(getPathColor('happy')).toBe('#22c55e');
    });

    it('returns red for error paths', () => {
      expect(getPathColor('error')).toBe('#ef4444');
    });

    it('returns amber for warning paths', () => {
      expect(getPathColor('warning')).toBe('#f59e0b');
    });

    it('returns gray for neutral paths', () => {
      expect(getPathColor('neutral')).toBe('#71717a');
    });
  });

  describe('getPathBgColor', () => {
    it('returns emerald class for happy paths', () => {
      expect(getPathBgColor('happy')).toBe('bg-emerald-500');
    });

    it('returns red class for error paths', () => {
      expect(getPathBgColor('error')).toBe('bg-red-500');
    });

    it('returns yellow class for warning paths', () => {
      expect(getPathBgColor('warning')).toBe('bg-yellow-500');
    });

    it('returns zinc class for neutral paths', () => {
      expect(getPathBgColor('neutral')).toBe('bg-zinc-500');
    });
  });
});
