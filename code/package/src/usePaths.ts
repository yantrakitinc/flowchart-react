import { useState, useMemo, useCallback } from 'react';
import { iFlowDefinition } from './types';
import { detectPaths, iFlowPath, iPathDetectionResult } from './pathDetector';

export interface iUsePathsResult {
  paths: iFlowPath[];
  selectedPathId: string | null;
  selectedPath: iFlowPath | null;
  setSelectedPathId: (pathId: string | null) => void;
  detection: iPathDetectionResult;
}

export function usePaths(flow: iFlowDefinition): iUsePathsResult {
  const [selectedPathId, setSelectedPathIdState] = useState<string | null>(null);

  const detection = useMemo(() => detectPaths(flow), [flow]);
  const paths = detection.paths;

  const selectedPath = useMemo(() => {
    if (!selectedPathId) return null;
    return paths.find((p) => p.id === selectedPathId) || null;
  }, [selectedPathId, paths]);

  const setSelectedPathId = useCallback((pathId: string | null) => {
    setSelectedPathIdState(pathId);
  }, []);

  return {
    paths,
    selectedPathId,
    selectedPath,
    setSelectedPathId,
    detection,
  };
}
