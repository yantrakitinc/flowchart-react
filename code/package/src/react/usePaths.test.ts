import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { usePaths } from './usePaths';
import type { iFlowGraph } from '../ir/types';

function graph(): iFlowGraph {
  return {
    id: 'g',
    name: 'G',
    direction: 'TD',
    nodes: [
      { id: 'a', label: 'A', type: 'start' },
      { id: 'b', label: 'B', type: 'end' },
    ],
    edges: [{ id: 'e0', from: 'a', to: 'b', type: 'happy' }],
  };
}

describe('usePaths — uncontrolled', () => {
  it('detects paths and starts with no selection', () => {
    const { result } = renderHook(() => usePaths(graph()));
    expect(result.current.paths.length).toBeGreaterThan(0);
    expect(result.current.selectedPathId).toBeNull();
    expect(result.current.selectedPath).toBeNull();
  });

  it('manages its own selection state and calls onChange', () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => usePaths(graph(), undefined, onChange));
    const firstPathId = result.current.paths[0].id;
    act(() => result.current.setSelectedPathId(firstPathId));
    expect(result.current.selectedPathId).toBe(firstPathId);
    expect(result.current.selectedPath?.id).toBe(firstPathId);
    expect(onChange).toHaveBeenCalledWith(firstPathId);
  });
});

describe('usePaths — controlled', () => {
  it('reflects the controlled id and calls onChange without mutating it', () => {
    const g = graph();
    const firstPathId = usePathsFirstId(g);
    const onChange = vi.fn();
    const { result } = renderHook(() => usePaths(g, firstPathId, onChange));
    expect(result.current.selectedPathId).toBe(firstPathId);
    act(() => result.current.setSelectedPathId(null));
    expect(onChange).toHaveBeenCalledWith(null);
    expect(result.current.selectedPathId).toBe(firstPathId);
  });

  it('treats an explicit null as controlled (no selection)', () => {
    const { result } = renderHook(() => usePaths(graph(), null));
    expect(result.current.selectedPathId).toBeNull();
    expect(result.current.selectedPath).toBeNull();
  });
});

function usePathsFirstId(g: iFlowGraph): string {
  const { result } = renderHook(() => usePaths(g));
  return result.current.paths[0].id;
}
