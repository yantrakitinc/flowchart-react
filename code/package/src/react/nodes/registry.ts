import type { NodeTypes } from '@xyflow/react';
import { NODE_TYPES } from '../../ir/types';
import type { iNodeRegistry } from '../types';
import { FlowNode } from './FlowNode';

/** Default renderer registry: every {@link iNodeType} maps to {@link FlowNode}. */
export const defaultNodeTypes: NodeTypes = Object.fromEntries(
  NODE_TYPES.map((type) => [type, FlowNode])
);

/** Merges caller-supplied overrides over {@link defaultNodeTypes}. */
export function resolveNodeTypes(overrides?: iNodeRegistry): NodeTypes {
  if (!overrides) return defaultNodeTypes;
  return { ...defaultNodeTypes, ...overrides };
}
