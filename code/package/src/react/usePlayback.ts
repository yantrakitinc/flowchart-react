import { useCallback, useEffect, useRef, useState } from 'react';
import type { iFlowPath } from '../paths/detectPaths';

/** Options accepted by {@link usePlayback}. */
export interface iUsePlaybackOptions {
  /** Milliseconds between playback steps. Default `1200`. */
  speedMs?: number;
  /** Restart from the first node after reaching the end, instead of pausing. Default `false`. */
  loop?: boolean;
  /** Fired every time the current node changes (auto-advance, step, or restart). */
  onStep?: (nodeId: string, index: number) => void;
  /** Fired when playback reaches the end of the path and is not looping. */
  onEnd?: () => void;
}

/** Result of {@link usePlayback}. */
export interface iUsePlaybackResult {
  /** Whether playback is currently auto-advancing. */
  playing: boolean;
  /** Current index into `path.nodeIds`. */
  index: number;
  /** Node id at the current index, or `null` when there is no path. */
  currentNodeId: string | null;
  /** Starts (or resumes) auto-advancing. No-op without a playable path. */
  play: () => void;
  /** Stops auto-advancing. */
  pause: () => void;
  /** Toggles between `play()` and `pause()`. */
  toggle: () => void;
  /** Resets the index to `0`, without changing `playing`. */
  restart: () => void;
  /** Moves the index forward by one (clamped to the last node) and pauses. */
  stepForward: () => void;
  /** Moves the index back by one (clamped to `0`) and pauses. */
  stepBack: () => void;
}

/**
 * Drives "movie mode" playback of a detected {@link iFlowPath}: a self-scheduling
 * `setTimeout` chain advances `index` through `path.nodeIds` every `speedMs` while
 * `playing`. Reaching the last node either loops back to `0` (`opts.loop`) or
 * pauses and fires `opts.onEnd`. Passing `path: null` makes every control a no-op.
 *
 * The pending tick is held in a ref and cleared **synchronously** by every control
 * that stops or reseeks playback (`pause`, `toggle`-to-paused, `stepForward`,
 * `stepBack`). `useEffect` cleanup runs asynchronously after paint, so relying on
 * it alone let a tick scheduled inside that window fire after a pause (one extra
 * step), and let a rapid step→play interleave leave the live timer cleared while
 * `playing` stayed true (frozen). Clearing in the click handler closes both races.
 */
export function usePlayback(path: iFlowPath | null, opts: iUsePlaybackOptions = {}): iUsePlaybackResult {
  const { speedMs = 1200, loop = false, onStep, onEnd } = opts;

  const [playing, setPlaying] = useState(false);
  const [index, setIndex] = useState(0);
  const [trackedPath, setTrackedPath] = useState(path);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  let resolvedIndex = index;
  let resolvedPlaying = playing;
  if (path !== trackedPath) {
    setTrackedPath(path);
    setIndex(0);
    setPlaying(false);
    resolvedIndex = 0;
    resolvedPlaying = false;
  }

  const onStepRef = useRef(onStep);
  onStepRef.current = onStep;
  const onEndRef = useRef(onEnd);
  onEndRef.current = onEnd;

  const hasMountedRef = useRef(false);
  useEffect(() => {
    if (!path) return;
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    onStepRef.current?.(path.nodeIds[index], index);
  }, [index, path]);

  useEffect(() => {
    if (!playing || !path || path.nodeIds.length === 0) {
      clearTimer();
      return;
    }
    clearTimer();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      const atEnd = index >= path.nodeIds.length - 1;
      if (!atEnd) {
        setIndex(index + 1);
        return;
      }
      if (loop) {
        setIndex(0);
        return;
      }
      setPlaying(false);
      onEndRef.current?.();
    }, speedMs);
    return clearTimer;
  }, [playing, index, path, speedMs, loop, clearTimer]);

  const play = useCallback(() => {
    if (!path || path.nodeIds.length === 0) return;
    setPlaying(true);
  }, [path]);

  const pause = useCallback(() => {
    clearTimer();
    setPlaying(false);
  }, [clearTimer]);

  const toggle = useCallback(() => {
    if (!path || path.nodeIds.length === 0) return;
    setPlaying((value) => {
      if (value) clearTimer();
      return !value;
    });
  }, [path, clearTimer]);

  const restart = useCallback(() => {
    if (!path) return;
    setIndex(0);
  }, [path]);

  const stepForward = useCallback(() => {
    if (!path) return;
    clearTimer();
    setPlaying(false);
    setIndex((current) => Math.min(current + 1, Math.max(path.nodeIds.length - 1, 0)));
  }, [path, clearTimer]);

  const stepBack = useCallback(() => {
    if (!path) return;
    clearTimer();
    setPlaying(false);
    setIndex((current) => Math.max(current - 1, 0));
  }, [path, clearTimer]);

  const currentNodeId = path ? path.nodeIds[resolvedIndex] ?? null : null;

  return {
    playing: resolvedPlaying,
    index: resolvedIndex,
    currentNodeId,
    play,
    pause,
    toggle,
    restart,
    stepForward,
    stepBack,
  };
}
