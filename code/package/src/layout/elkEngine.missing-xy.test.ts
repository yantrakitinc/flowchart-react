import { describe, expect, it, vi } from 'vitest';

interface iFakeElkChild {
  id: string;
}

vi.mock('elkjs/lib/elk.bundled.js', () => ({
  default: class {
    layout(input: { children: iFakeElkChild[] }) {
      // Children present, but neither carries x/y — exercises the `?? 0` fallback.
      return Promise.resolve({ children: input.children.map((c) => ({ id: c.id })) });
    }
  },
}));

const { elkEngine } = await import('./elkEngine');

describe('elkEngine — layout result with children missing x/y', () => {
  it('defaults each missing coordinate to 0', async () => {
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
    expect(positions.get('a')).toEqual({ x: 0, y: 0 });
  });
});
