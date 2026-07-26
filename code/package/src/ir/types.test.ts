import { describe, expect, it } from 'vitest';
import {
  DIRECTIONS,
  EDGE_TYPES,
  NODE_TYPES,
  isDirection,
  isEdgeType,
  isNodeType,
} from './types';

describe('isNodeType', () => {
  it('returns true for every declared node type', () => {
    for (const type of NODE_TYPES) {
      expect(isNodeType(type)).toBe(true);
    }
  });

  it('returns false for an unknown string', () => {
    expect(isNodeType('bogus')).toBe(false);
  });

  it('returns false for a non-string value', () => {
    expect(isNodeType(42)).toBe(false);
  });
});

describe('isEdgeType', () => {
  it('returns true for every declared edge type', () => {
    for (const type of EDGE_TYPES) {
      expect(isEdgeType(type)).toBe(true);
    }
  });

  it('returns false for an unknown string', () => {
    expect(isEdgeType('bogus')).toBe(false);
  });

  it('returns false for a non-string value', () => {
    expect(isEdgeType(null)).toBe(false);
  });
});

describe('isDirection', () => {
  it('returns true for every declared direction', () => {
    for (const direction of DIRECTIONS) {
      expect(isDirection(direction)).toBe(true);
    }
  });

  it('returns false for an unknown string', () => {
    expect(isDirection('bogus')).toBe(false);
  });

  it('returns false for a non-string value', () => {
    expect(isDirection(undefined)).toBe(false);
  });
});
