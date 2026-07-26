import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FlowChart } from './FlowChart';
import type { iFlowGraph } from '../ir/types';
import type { iLayoutEngine } from '../layout/types';

const CHART = [
  'flowchart TD',
  's([Start]) --> check{OK?}',
  'check -->|yes| ship[Ship]',
  'check ==>|no| fail[Fail]:::error',
  'ship --> done([Done])',
  'fail --> done',
].join('\n');

const GRAPH: iFlowGraph = {
  id: 'g',
  name: 'g',
  direction: 'TD',
  nodes: [
    { id: 'a', label: 'Alpha', type: 'start' },
    { id: 'b', label: 'Bravo', type: 'end', description: 'the end' },
  ],
  edges: [{ id: 'e0', from: 'a', to: 'b', type: 'default' }],
};

describe('FlowChart — rendering', () => {
  it('renders a node per parsed node once layout resolves', async () => {
    render(<FlowChart chart={CHART} />);
    await waitFor(() => expect(screen.getByText('Ship')).toBeInTheDocument());
    expect(screen.getByText('Fail')).toBeInTheDocument();
    expect(screen.getByText('OK?')).toBeInTheDocument();
  });

  it('emits agent affordances on nodes', async () => {
    const { container } = render(<FlowChart chart={CHART} />);
    await waitFor(() => expect(container.querySelector('[data-node-id="ship"]')).toBeInTheDocument());
    expect(container.querySelector('[data-node-id="ship"]')).toHaveAttribute('data-agent-action', 'select-node');
  });

  it('renders from a graph prop and shows the description toggle', async () => {
    render(<FlowChart graph={GRAPH} />);
    await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument());
    expect(screen.getByText('Bravo')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('fc-node-b-expand'));
    expect(screen.getByText('the end')).toBeInTheDocument();
  });

  it('applies a direction override on the chart branch, plus minimap + active node + hidden controls', async () => {
    const { container } = render(
      <FlowChart chart={'flowchart TD\na --> b'} direction="LR" showMiniMap activeNodeId="a" showControls={false} />
    );
    await waitFor(() => expect(container.querySelector('[data-node-id="a"]')).toBeInTheDocument());
    expect(container.querySelector('.fc-node--active')).toBeInTheDocument();
    expect(container.querySelector('.react-flow__minimap')).toBeInTheDocument();
    expect(container.querySelector('.react-flow__controls')).not.toBeInTheDocument();
  });

  it.each(['BT', 'RL'] as const)('renders correctly for direction %s', async (direction) => {
    const { container } = render(<FlowChart graph={{ ...GRAPH, direction }} key={direction} />);
    await waitFor(() => expect(container.querySelector('[data-node-id="a"]')).toBeInTheDocument());
    expect(container.querySelector('[data-node-id="b"]')).toBeInTheDocument();
  });

  it('accepts a string height and a custom className', async () => {
    const { container } = render(<FlowChart graph={GRAPH} height="500px" className="my-extra" />);
    await waitFor(() => expect(container.querySelector('[data-node-id="a"]')).toBeInTheDocument());
    const root = screen.getByTestId('fc-flowchart') as HTMLElement;
    expect(root.style.height).toBe('500px');
    expect(root.className).toContain('my-extra');
  });

  it('stacks the canvas and drawer vertically for a top/bottom drawer position', async () => {
    render(<FlowChart graph={GRAPH} pathDrawerPosition="bottom" />);
    const root = await screen.findByTestId('fc-flowchart');
    expect((root as HTMLElement).style.flexDirection).toBe('column');
  });

  it('defaults height to 480px when not given', async () => {
    render(<FlowChart graph={GRAPH} />);
    const root = await screen.findByTestId('fc-flowchart');
    expect((root as HTMLElement).style.height).toBe('480px');
  });
});

describe('FlowChart — parse errors', () => {
  it('renders an error box instead of crashing on malformed chart text', () => {
    render(<FlowChart chart={'no header here --> b'} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByTestId('fc-parse-error')).toBeInTheDocument();
  });

  it('errors when neither chart nor graph is provided', () => {
    render(<FlowChart />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('stays in the loading state when the layout engine rejects', async () => {
    const rejectingEngine: iLayoutEngine = { name: 'boom', run: () => Promise.reject(new Error('nope')) };
    const { container } = render(<FlowChart graph={GRAPH} layoutEngine={rejectingEngine} />);
    await waitFor(() => expect(container.querySelector('[data-agent-action="loading"]')).toBeInTheDocument());
  });

  it('ignores a resolved layout after unmount (no state update on a dead component)', async () => {
    let resolveLayout: (value: unknown) => void = () => {};
    const slowEngine: iLayoutEngine = {
      name: 'slow',
      run: () => new Promise((resolve) => { resolveLayout = resolve; }) as never,
    };
    const { unmount } = render(<FlowChart graph={GRAPH} layoutEngine={slowEngine} />);
    unmount();
    resolveLayout(new Map());
    await Promise.resolve();
  });
});

describe('FlowChart — path drawer', () => {
  it('lists detected paths and fires onPathChange on select + deselect', async () => {
    const onPathChange = vi.fn();
    const { container } = render(<FlowChart chart={CHART} onPathChange={onPathChange} showPlaybackControls={false} />);
    await waitFor(() => expect(container.querySelector('[data-testid="fc-path-drawer"]')).toBeInTheDocument());
    const items = container.querySelectorAll('[data-agent-action="select-path"]');
    expect(items.length).toBeGreaterThanOrEqual(2);
    fireEvent.click(items[0]);
    expect(onPathChange).toHaveBeenCalled();
    fireEvent.click(items[0]);
    expect(onPathChange).toHaveBeenCalledWith(null);
  });

  it('can be hidden', async () => {
    const { container } = render(<FlowChart chart={CHART} showPathDrawer={false} />);
    await waitFor(() => expect(container.querySelector('[data-node-id="ship"]')).toBeInTheDocument());
    expect(container.querySelector('[data-testid="fc-path-drawer"]')).not.toBeInTheDocument();
  });
});

describe('FlowChart — node click', () => {
  it('fires onNodeClick with the node id and data', async () => {
    const onNodeClick = vi.fn();
    const { container } = render(<FlowChart chart={CHART} onNodeClick={onNodeClick} />);
    await waitFor(() => expect(container.querySelector('[data-node-id="ship"]')).toBeInTheDocument());
    fireEvent.click(container.querySelector('[data-node-id="ship"]')!);
    expect(onNodeClick).toHaveBeenCalled();
    expect(onNodeClick.mock.calls[0][0]).toBe('ship');
    expect(onNodeClick.mock.calls[0][1]).toMatchObject({ label: 'Ship', type: 'action' });
  });
});
