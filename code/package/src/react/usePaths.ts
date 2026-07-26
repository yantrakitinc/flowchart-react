import { useCallback, useMemo, useState } from 'react';
import type { iFlowGraph } from '../ir/types';
import { detectPaths, type iFlowPath, type iPathDetectionResult } from '../paths/detectPaths';

/** Result of {@link usePaths}. */
export interface iUsePathsResult {
  /** Every detected path. */
  paths: iFlowPath[];
  /** The full path-detection result (paths + start/end node ids). */
  detection: iPathDetectionResult;
  /** Currently selected path id, or `null` when none is selected. */
  selectedPathId: string | null;
  /** The currently selected path object, or `null`. */
  selectedPath: iFlowPath | null;
  /** Selects a path by id, or clears the selection when passed `null`. */
  setSelectedPathId: (pathId: string | null) => void;
}

/**
 * Runs {@link detectPaths} over `graph` and manages the "currently selected path"
 * state. Uncontrolled by default (internal `useState`); pass `controlledId`
 * (any value other than `undefined`, including `null`) to make the hook a thin
 * wrapper around the caller's own state instead.
 */
export function usePaths(
  graph: iFlowGraph,
  controlledId?: string | null,
  onChange?: (pathId: string | null) => void
): iUsePathsResult {
  const detection = useMemo(() => detectPaths(graph), [graph]);
  const [uncontrolledId, setUncontrolledId] = useState<string | null>(null);
  const isControlled = controlledId !== undefined;
  const selectedPathId = isControlled ? controlledId : uncontrolledId;

  const setSelectedPathId = useCallback(
    (pathId: string | null) => {
      if (!isControlled) {
        setUncontrolledId(pathId);
      }
      onChange?.(pathId);
    },
    [isControlled, onChange]
  );

  const selectedPath = useMemo(
    () => detection.paths.find((path) => path.id === selectedPathId) ?? null,
    [detection.paths, selectedPathId]
  );

  return { paths: detection.paths, detection, selectedPathId, selectedPath, setSelectedPathId };
}
