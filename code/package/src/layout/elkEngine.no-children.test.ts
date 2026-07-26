import { describe, expect, it, vi } from 'vitest';

vi.mock('elkjs/lib/elk.bundled.js', () => ({
  default: class {
    layout() {
      // A layout result with no `children` key at all — exercises the `?? []` fallback.
      return Promise.resolve({});
    }
  },
}));

const { elkEngine } = await import('./elkEngine');

describe('elkEngine — layout result with no children field', () => {
  it('returns an empty position map instead of throwing', async () => {
    const positions = await elkEngine.run(
      {
        id: 'g',
        name: 'G',
        direction: 'TD',
        nodes: [{ id: 'a', label: 'A', type: 'action' }],
        edges: [],
      },
      { direction: 'TD', nodeWidth: 180, nodeHeight: 64, rankSpacing: 80, nodeSpacing: 48 }
    );
    expect(positions.size).toBe(0);
  });
});
