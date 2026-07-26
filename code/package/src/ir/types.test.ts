import { describe, it, expect } from 'vitest';
import { isNodeType, isEdgeType, isDirection, NODE_TYPES, EDGE_TYPES, DIRECTIONS } from './types';

describe('IR type guards', () => {
  it('isNodeType accepts every legal node type and rejects others', () => {
    NODE_TYPES.forEach((t) => expect(isNodeType(t)).toBe(true));
    expect(isNodeType('process')).toBe(false);
    expect(isNodeType(42)).toBe(false);
    expect(isNodeType(undefined)).toBe(false);
  });

  it('isEdgeType accepts every legal edge type and rejects others', () => {
    EDGE_TYPES.forEach((t) => expect(isEdgeType(t)).toBe(true));
    expect(isEdgeType('dotted')).toBe(false);
    expect(isEdgeType(null)).toBe(false);
  });

  it('isDirection accepts every legal direction and rejects others', () => {
    DIRECTIONS.forEach((d) => expect(isDirection(d)).toBe(true));
    expect(isDirection('TB')).toBe(false);
    expect(isDirection('')).toBe(false);
  });
});
