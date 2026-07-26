import { describe, expect, it } from 'vitest';
import { toReactFlowEdge } from './edgeStyle';
import type { iRenderEdge } from '../../layout/types';

function edge(type: iRenderEdge['type'], label?: string): iRenderEdge {
  return { id: 'e0', from: 'a', to: 'b', type, ...(label !== undefined ? { label } : {}) };
}

describe('toReactFlowEdge', () => {
  it('maps id/source/target and uses the smoothstep type', () => {
    const rf = toReactFlowEdge(edge('default'), false);
    expect(rf.id).toBe('e0');
    expect(rf.source).toBe('a');
    expect(rf.target).toBe('b');
    expect(rf.type).toBe('smoothstep');
  });

  it('renders warning edges dashed and error edges thick', () => {
    const warning = toReactFlowEdge(edge('warning'), false);
    expect((warning.style as Record<string, unknown>).strokeDasharray).toBe('6 4');
    const error = toReactFlowEdge(edge('error'), false);
    expect((error.style as Record<string, unknown>).strokeWidth).toBe(3);
  });

  it('omits the dash for happy/default edges', () => {
    expect((toReactFlowEdge(edge('happy'), false).style as Record<string, unknown>).strokeDasharray).toBeUndefined();
    expect((toReactFlowEdge(edge('default'), false).style as Record<string, unknown>).strokeDasharray).toBeUndefined();
  });

  it('fades a dimmed edge and keeps full opacity otherwise', () => {
    expect((toReactFlowEdge(edge('happy'), true).style as Record<string, unknown>).opacity).toBe(0.2);
    expect((toReactFlowEdge(edge('happy'), false).style as Record<string, unknown>).opacity).toBe(1);
  });

  it('carries the label through and uses an ArrowClosed marker', () => {
    const rf = toReactFlowEdge(edge('happy', 'yes'), false);
    expect(rf.label).toBe('yes');
    expect((rf.markerEnd as Record<string, unknown>).type).toBe('arrowclosed');
  });
});
