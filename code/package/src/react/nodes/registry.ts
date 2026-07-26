/**
 * Node-type registry. The rich {@link FlowNode} handles all seven types by default;
 * `resolveNodeTypes` merges consumer overrides over the defaults to produce the `nodeTypes`
 * map React Flow consumes (keyed by our semantic node type).
 */
import type { ComponentType } from 'react';
import type { NodeProps } from '@xyflow/react';
import { NODE_TYPES, iNodeType } from '../../ir/types';
import type { iNodeRegistry } from '../types';
import { FlowNode } from './FlowNode';

/** Every semantic type mapped to the rich default component. */
export const defaultNodeTypes: Record<iNodeType, ComponentType<NodeProps>> = NODE_TYPES.reduce(
  (acc, type) => {
    acc[type] = FlowNode;
    return acc;
  },
  {} as Record<iNodeType, ComponentType<NodeProps>>
);

/** Merge consumer overrides over the defaults. */
export function resolveNodeTypes(
  overrides?: iNodeRegistry
): Record<string, ComponentType<NodeProps>> {
  if (!overrides) return defaultNodeTypes;
  return { ...defaultNodeTypes, ...overrides };
}
