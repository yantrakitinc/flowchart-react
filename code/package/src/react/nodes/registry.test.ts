import { describe, expect, it } from 'vitest';
import { NODE_TYPES } from '../../ir/types';
import { defaultNodeTypes, resolveNodeTypes } from './registry';
import { FlowNode } from './FlowNode';

describe('defaultNodeTypes', () => {
  it('maps every node type to FlowNode', () => {
    for (const type of NODE_TYPES) {
      expect(defaultNodeTypes[type]).toBe(FlowNode);
    }
  });
});

describe('resolveNodeTypes', () => {
  it('returns the defaults unchanged when no overrides are given', () => {
    expect(resolveNodeTypes()).toBe(defaultNodeTypes);
  });

  it('merges overrides over the defaults', () => {
    function Custom() {
      return null;
    }
    const merged = resolveNodeTypes({ decision: Custom });
    expect(merged.decision).toBe(Custom);
    expect(merged.start).toBe(defaultNodeTypes.start);
  });
});
