import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { FlowChart } from './FlowChart';
import { usePaths } from './usePaths';
import { resolveNodeTypes, defaultNodeTypes } from './nodes/registry';
import { renderHook } from '@testing-library/react';
import type { iFlowGraph } from '../ir/types';

const CHART = [
  'flowchart TD',
  '  s([Start]) --> check{OK?}',
  '  check -->|yes| ship[Ship]',
  '  check ==>|no| fail[Fail]:::error',
  '  ship --> done([Done])',
  '  fail --> done',
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

  it('renders equivalently from a graph prop and shows the description toggle', async () => {
    const { container } = render(<FlowChart graph={GRAPH} />);
    await waitFor(() => expect(screen.getByText('Alpha')).toBeInTheDocument());
    expect(screen.getByText('Bravo')).toBeInTheDocument();
    const toggle = container.querySelector('[data-agent-action="toggle-description"]')!;
    fireEvent.click(toggle);
    expect(screen.getByText('the end')).toBeInTheDocument();
  });

  it('applies a direction override + minimap + active node', async () => {
    const { container } = render(
      <FlowChart graph={GRAPH} direction="LR" showMiniMap activeNodeId="a" showControls={false} />
    );
    await waitFor(() => expect(container.querySelector('[data-node-id="a"]')).toBeInTheDocument());
    expect(container.querySelector('.fc-node--active')).toBeInTheDocument();
  });

  it.each(['BT', 'RL'] as const)('renders node handles for direction %s', async (direction) => {
    const { container } = render(<FlowChart graph={GRAPH} direction={direction} />);
    await waitFor(() => expect(container.querySelector('[data-node-id="a"]')).toBeInTheDocument());
    expect(container.querySelector('[data-node-id="b"]')).toBeInTheDocument();
  });

  it('accepts a string height + bottom drawer (horizontal layout)', async () => {
    const { container } = render(
      <FlowChart graph={GRAPH} height="500px" pathDrawerPosition="bottom" />
    );
    await waitFor(() => expect(container.querySelector('[data-node-id="a"]')).toBeInTheDocument());
    expect((container.querySelector('.fc-root') as HTMLElement).style.height).toBe('500px');
  });
});

describe('FlowChart — parse errors', () => {
  it('renders an error box instead of crashing', () => {
    render(<FlowChart chart={'no header here --> b'} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/parse error/i)).toBeInTheDocument();
  });
  it('errors when neither chart nor graph is provided', () => {
    render(<FlowChart />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
  it('stays in the loading state when the layout engine rejects', async () => {
    const rejectingEngine = { name: 'boom', run: () => Promise.reject(new Error('nope')) };
    const { container } = render(<FlowChart graph={GRAPH} layoutEngine={rejectingEngine} />);
    await waitFor(() => expect(container.querySelector('[data-agent-action="loading"]')).toBeInTheDocument());
  });

  it('applies a direction override to the chart branch', async () => {
    const { container } = render(<FlowChart chart={'flowchart TD\n a --> b'} direction="LR" />);
    await waitFor(() => expect(container.querySelector('[data-node-id="a"]')).toBeInTheDocument());
  });

  it('ignores a resolved layout after unmount (no state update on a dead component)', async () => {
    let resolveLayout: (v: unknown) => void = () => {};
    const slowEngine = {
      name: 'slow',
      run: () => new Promise((res) => { resolveLayout = res; }) as never,
    };
    const { unmount } = render(<FlowChart graph={GRAPH} layoutEngine={slowEngine} />);
    unmount();
    resolveLayout(new Map());
    await Promise.resolve();
  });
});

describe('FlowChart — path drawer', () => {
  it('lists detected paths and fires onPathChange on select', async () => {
    const onPathChange = vi.fn();
    const { container } = render(<FlowChart chart={CHART} onPathChange={onPathChange} />);
    await waitFor(() => expect(container.querySelector('[data-agent-action="path-drawer"]')).toBeInTheDocument());
    const items = container.querySelectorAll('[data-agent-action="select-path"][data-path-id^="path-"]');
    expect(items.length).toBeGreaterThanOrEqual(2);
    fireEvent.click(items[0]);
    expect(onPathChange).toHaveBeenCalledWith('path-1');
    fireEvent.click(container.querySelector('[data-path-id="all"]')!);
    expect(onPathChange).toHaveBeenCalledWith(null);
  });
  it('can be hidden', async () => {
    const { container } = render(<FlowChart chart={CHART} showPathDrawer={false} pathDrawerPosition="bottom" />);
    await waitFor(() => expect(container.querySelector('[data-node-id="ship"]')).toBeInTheDocument());
    expect(container.querySelector('[data-agent-action="path-drawer"]')).not.toBeInTheDocument();
  });
});

describe('FlowChart — node click', () => {
  it('fires onNodeClick with the node id', async () => {
    const onNodeClick = vi.fn();
    const { container } = render(<FlowChart chart={CHART} onNodeClick={onNodeClick} />);
    await waitFor(() => expect(container.querySelector('[data-node-id="ship"]')).toBeInTheDocument());
    fireEvent.click(container.querySelector('[data-node-id="ship"]')!);
    expect(onNodeClick).toHaveBeenCalled();
    expect(onNodeClick.mock.calls[0][0]).toBe('ship');
  });
});

describe('registry + usePaths', () => {
  it('resolveNodeTypes returns defaults when no overrides', () => {
    expect(resolveNodeTypes()).toBe(defaultNodeTypes);
  });
  it('resolveNodeTypes merges overrides over defaults', () => {
    const Custom = () => null;
    const merged = resolveNodeTypes({ decision: Custom });
    expect(merged.decision).toBe(Custom);
    expect(merged.start).toBe(defaultNodeTypes.start);
  });
  it('usePaths manages internal selection when uncontrolled', () => {
    const g = parseGraph();
    const { result } = renderHook(() => usePaths(g));
    expect(result.current.paths.length).toBeGreaterThan(0);
    expect(result.current.selectedPath).toBeNull();
  });
});

function parseGraph(): iFlowGraph {
  return {
    id: 'g',
    name: 'g',
    direction: 'TD',
    nodes: [
      { id: 'a', label: 'A', type: 'start' },
      { id: 'b', label: 'B', type: 'end' },
    ],
    edges: [{ id: 'e0', from: 'a', to: 'b', type: 'happy' }],
  };
}
