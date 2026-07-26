import { describe, expect, it } from 'vitest';
import { FlowchartParseError } from './errors';

describe('FlowchartParseError', () => {
  it('carries reason/line/column and a formatted message', () => {
    const err = new FlowchartParseError('bad thing', 3, 5);
    expect(err.reason).toBe('bad thing');
    expect(err.line).toBe(3);
    expect(err.column).toBe(5);
    expect(err.message).toBe('bad thing (line 3)');
    expect(err.name).toBe('FlowchartParseError');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(FlowchartParseError);
  });

  it('defaults column to 1', () => {
    const err = new FlowchartParseError('bad thing', 1);
    expect(err.column).toBe(1);
  });
});
