/**
 * usePaths — detect paths for a graph and manage (optionally controlled) selection.
 * Reusable standalone if a consumer wants to build their own path UI.
 */
import { useCallback, useMemo, useState } from 'react';
import { iFlowGraph } from '../ir/types';
import { detectPaths, iFlowPath, iPathDetectionResult } from '../paths/detectPaths';

/** Result of {@link usePaths}. */
export interface iUsePathsResult {
  paths: iFlowPath[];
  detection: iPathDetectionResult;
  selectedPathId: string | null;
  selectedPath: iFlowPath | null;
  setSelectedPathId: (id: string | null) => void;
}

/** Detect + select paths, honoring a controlled `controlledId` when supplied. */
export function usePaths(
  graph: iFlowGraph,
  controlledId?: string | null,
  onChange?: (id: string | null) => void
): iUsePathsResult {
  const detection = useMemo(() => detectPaths(graph), [graph]);
  const [internalId, setInternalId] = useState<string | null>(null);
  const isControlled = controlledId !== undefined;
  const selectedPathId = isControlled ? controlledId ?? null : internalId;

  const selectedPath = useMemo(
    () => detection.paths.find((p) => p.id === selectedPathId) ?? null,
    [detection.paths, selectedPathId]
  );

  const setSelectedPathId = useCallback(
    (id: string | null) => {
      if (!isControlled) setInternalId(id);
      onChange?.(id);
    },
    [isControlled, onChange]
  );

  return { paths: detection.paths, detection, selectedPathId, selectedPath, setSelectedPathId };
}
