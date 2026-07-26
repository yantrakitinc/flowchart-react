import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePlayback } from './usePlayback';
import type { iFlowPath } from '../paths/detectPaths';

const PATH: iFlowPath = {
  id: 'path-0',
  name: 'Path 1',
  type: 'happy',
  nodeIds: ['a', 'b', 'c'],
  edgeIds: ['e0', 'e1'],
};

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('usePlayback — null path', () => {
  it('is a full no-op when path is null', () => {
    const onStep = vi.fn();
    const { result } = renderHook(() => usePlayback(null, { onStep }));
    expect(result.current.playing).toBe(false);
    expect(result.current.index).toBe(0);
    expect(result.current.currentNodeId).toBeNull();

    act(() => {
      result.current.play();
      result.current.toggle();
      result.current.restart();
      result.current.stepForward();
      result.current.stepBack();
    });

    expect(result.current.playing).toBe(false);
    expect(result.current.index).toBe(0);
    vi.advanceTimersByTime(5000);
    expect(onStep).not.toHaveBeenCalled();
  });
});

describe('usePlayback — play/pause/tick', () => {
  it('advances currentNodeId through the path on each tick and fires onStep', () => {
    const onStep = vi.fn();
    const { result } = renderHook(() => usePlayback(PATH, { speedMs: 1000, onStep }));

    act(() => result.current.play());
    expect(result.current.playing).toBe(true);
    expect(result.current.currentNodeId).toBe('a');

    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.index).toBe(1);
    expect(result.current.currentNodeId).toBe('b');
    expect(onStep).toHaveBeenCalledWith('b', 1);

    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.index).toBe(2);
    expect(result.current.currentNodeId).toBe('c');
    expect(onStep).toHaveBeenCalledWith('c', 2);
  });

  it('does not fire onStep for the initial mounted index', () => {
    const onStep = vi.fn();
    renderHook(() => usePlayback(PATH, { onStep }));
    expect(onStep).not.toHaveBeenCalled();
  });

  it('pause halts further advancement', () => {
    const { result } = renderHook(() => usePlayback(PATH, { speedMs: 1000 }));
    act(() => result.current.play());
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.index).toBe(1);
    act(() => result.current.pause());
    expect(result.current.playing).toBe(false);
    act(() => vi.advanceTimersByTime(5000));
    expect(result.current.index).toBe(1);
  });

  it('toggle flips between playing and paused', () => {
    const { result } = renderHook(() => usePlayback(PATH));
    act(() => result.current.toggle());
    expect(result.current.playing).toBe(true);
    act(() => result.current.toggle());
    expect(result.current.playing).toBe(false);
  });

  it('play() and toggle() no-op on a path with zero nodes', () => {
    const empty: iFlowPath = { ...PATH, nodeIds: [] };
    const { result } = renderHook(() => usePlayback(empty));
    act(() => result.current.play());
    expect(result.current.playing).toBe(false);
    act(() => result.current.toggle());
    expect(result.current.playing).toBe(false);
  });
});

describe('usePlayback — reaching the end', () => {
  it('pauses and fires onEnd when reaching the last node without loop', () => {
    const onEnd = vi.fn();
    const { result } = renderHook(() => usePlayback(PATH, { speedMs: 1000, onEnd }));
    act(() => result.current.play());
    act(() => vi.advanceTimersByTime(1000)); // -> b
    act(() => vi.advanceTimersByTime(1000)); // -> c (last)
    act(() => vi.advanceTimersByTime(1000)); // reaches end, pauses
    expect(result.current.playing).toBe(false);
    expect(result.current.index).toBe(2);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('wraps back to index 0 when loop is true', () => {
    const onEnd = vi.fn();
    const { result } = renderHook(() => usePlayback(PATH, { speedMs: 1000, loop: true, onEnd }));
    act(() => result.current.play());
    act(() => vi.advanceTimersByTime(1000)); // -> b
    act(() => vi.advanceTimersByTime(1000)); // -> c
    act(() => vi.advanceTimersByTime(1000)); // loop -> a
    expect(result.current.index).toBe(0);
    expect(result.current.playing).toBe(true);
    expect(onEnd).not.toHaveBeenCalled();
  });
});

describe('usePlayback — manual controls', () => {
  it('restart resets the index to 0', () => {
    const { result } = renderHook(() => usePlayback(PATH, { speedMs: 1000 }));
    act(() => result.current.play());
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.index).toBe(1);
    act(() => result.current.restart());
    expect(result.current.index).toBe(0);
  });

  it('stepForward moves forward by one and pauses, clamped to the last index', () => {
    const { result } = renderHook(() => usePlayback(PATH));
    act(() => result.current.play());
    act(() => result.current.stepForward());
    expect(result.current.index).toBe(1);
    expect(result.current.playing).toBe(false);
    act(() => result.current.stepForward());
    act(() => result.current.stepForward());
    act(() => result.current.stepForward());
    expect(result.current.index).toBe(2);
  });

  it('stepBack moves back by one and pauses, clamped to 0', () => {
    const { result } = renderHook(() => usePlayback(PATH));
    act(() => result.current.stepForward());
    act(() => result.current.stepForward());
    expect(result.current.index).toBe(2);
    act(() => result.current.stepBack());
    expect(result.current.index).toBe(1);
    act(() => result.current.stepBack());
    act(() => result.current.stepBack());
    expect(result.current.index).toBe(0);
  });

  it('resets index/playing (in the same render) when the path prop itself changes', () => {
    const OTHER_PATH: iFlowPath = { ...PATH, id: 'path-1', nodeIds: ['x', 'y'] };
    let currentPath: iFlowPath = PATH;
    const { result, rerender } = renderHook(() => usePlayback(currentPath, { speedMs: 1000 }));

    act(() => result.current.play());
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.index).toBe(1);
    expect(result.current.playing).toBe(true);

    currentPath = OTHER_PATH;
    rerender();

    expect(result.current.index).toBe(0);
    expect(result.current.playing).toBe(false);
    expect(result.current.currentNodeId).toBe('x');
  });
});

describe('usePlayback — unmount safety', () => {
  it('clears the pending timer on unmount (no further onStep calls)', () => {
    const onStep = vi.fn();
    const { result, unmount } = renderHook(() => usePlayback(PATH, { speedMs: 1000, onStep }));
    act(() => result.current.play());
    unmount();
    act(() => vi.advanceTimersByTime(5000));
    expect(onStep).not.toHaveBeenCalled();
  });
});
