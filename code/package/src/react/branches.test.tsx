import { describe, it, expect, vi } from 'vitest';
import { render, renderHook, act, fireEvent } from '@testing-library/react';
import { PathDrawer } from './PathDrawer';
import { usePaths } from './usePaths';
import { toReactFlowEdge } from './edges/edgeStyle';
import type { iFlowGraph } from '../ir/types';
import type { iRenderEdge } from '../layout/types';

describe('PathDrawer', () => {
  it('renders nothing when there are no paths', () => {
    const { container } = render(
      <PathDrawer paths={[]} selectedPathId={null} onSelect={() => {}} position="right" />
    );
    expect(container.firstChild).toBeNull();
  });

  it('deselects when clicking the already-selected path', () => {
    const onSelect = vi.fn();
    const paths = [{ id: 'path-1', name: 'Path 1', type: 'happy' as const, nodeIds: ['a'], edgeIds: [] }];
    const { container } = render(
      <PathDrawer paths={paths} selectedPathId="path-1" onSelect={onSelect} position="left" />
    );
    fireEvent.click(container.querySelector('[data-path-id="path-1"]')!);
    expect(onSelect).toHaveBeenCalledWith(null);
  });
});

describe('usePaths — controlled', () => {
  const graph: iFlowGraph = {
    id: 'g',
    name: 'g',
    direction: 'TD',
    nodes: [
      { id: 'a', label: 'A', type: 'start' },
      { id: 'b', label: 'B', type: 'end' },
    ],
    edges: [{ id: 'e0', from: 'a', to: 'b', type: 'happy' }],
  };

  it('reflects the controlled id and calls onChange without mutating internal state', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => usePaths(graph, 'path-1', onChange));
    expect(result.current.selectedPathId).toBe('path-1');
    expect(result.current.selectedPath?.id).toBe('path-1');
    act(() => result.current.setSelectedPathId(null));
    expect(onChange).toHaveBeenCalledWith(null);
    // still controlled → stays at the controlled value
    expect(result.current.selectedPathId).toBe('path-1');
  });

  it('treats an explicit null controlled id as controlled (no selection)', () => {
    const { result } = renderHook(() => usePaths(graph, null));
    expect(result.current.selectedPathId).toBeNull();
    expect(result.current.selectedPath).toBeNull();
  });
});

describe('toReactFlowEdge', () => {
  const edge = (type: iRenderEdge['type']): iRenderEdge => ({
    id: 'e0',
    source: 'a',
    target: 'b',
    type,
    label: 'x',
  });

  it('renders a dashed style for warning edges', () => {
    const rf = toReactFlowEdge(edge('warning'), false);
    expect((rf.style as Record<string, unknown>).strokeDasharray).toBe('6 4');
  });

  it('omits dash for solid edge types and dims when requested', () => {
    expect((toReactFlowEdge(edge('happy'), false).style as Record<string, unknown>).strokeDasharray).toBeUndefined();
    expect((toReactFlowEdge(edge('error'), true).style as Record<string, unknown>).opacity).toBe(0.2);
    expect((toReactFlowEdge(edge('default'), false).style as Record<string, unknown>).opacity).toBe(1);
  });
});
