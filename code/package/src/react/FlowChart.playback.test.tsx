import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FlowChart } from './FlowChart';
import type { iFlowGraph } from '../ir/types';

const CHART = [
  'flowchart TD',
  's([Start]) --> a[Alpha] --> b[Bravo] --> e([End])',
].join('\n');

const EMPTY_GRAPH: iFlowGraph = { id: 'g', name: 'g', direction: 'TD', nodes: [], edges: [] };

/** Flushes the microtask queue so the (real-promise) layout effect resolves under fake timers. */
async function flushLayout() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('FlowChart — movie mode playback', () => {
  it('defaults to paths[0] when nothing is selected and advances on Play', async () => {
    const onPlaybackStep = vi.fn();
    render(<FlowChart chart={CHART} playbackSpeedMs={500} onPlaybackStep={onPlaybackStep} />);
    await flushLayout();

    expect(screen.getByTestId('fc-playback')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('fc-playback-play'));
    expect(screen.getByTestId('fc-playback-pause')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(500));
    expect(onPlaybackStep).toHaveBeenCalledWith('a', 1, expect.objectContaining({ label: 'Alpha' }));
  });

  it('autoPlay starts playback once the graph/paths are ready', async () => {
    const onPlaybackStep = vi.fn();
    render(<FlowChart chart={CHART} autoPlay playbackSpeedMs={500} onPlaybackStep={onPlaybackStep} />);
    await flushLayout();

    expect(screen.getByTestId('fc-playback-pause')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(500));
    expect(onPlaybackStep).toHaveBeenCalled();
  });

  it('fires onPlaybackEnd and pauses at the end without loop', async () => {
    const onPlaybackEnd = vi.fn();
    render(<FlowChart chart={CHART} autoPlay playbackSpeedMs={100} onPlaybackEnd={onPlaybackEnd} />);
    await flushLayout();

    act(() => vi.advanceTimersByTime(100)); // s -> a
    act(() => vi.advanceTimersByTime(100)); // a -> b
    act(() => vi.advanceTimersByTime(100)); // b -> e (last)
    act(() => vi.advanceTimersByTime(100)); // reaches end
    expect(onPlaybackEnd).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('fc-playback-play')).toBeInTheDocument();
  });

  it('wraps back to the first node when loop is set', async () => {
    const onPlaybackEnd = vi.fn();
    render(<FlowChart chart={CHART} autoPlay loop playbackSpeedMs={100} onPlaybackEnd={onPlaybackEnd} />);
    await flushLayout();

    act(() => vi.advanceTimersByTime(100));
    act(() => vi.advanceTimersByTime(100));
    act(() => vi.advanceTimersByTime(100));
    act(() => vi.advanceTimersByTime(100));
    expect(onPlaybackEnd).not.toHaveBeenCalled();
    expect(screen.getByTestId('fc-playback-pause')).toBeInTheDocument();
  });

  it('highlights progressively up to the current step once playback is engaged', async () => {
    const { container } = render(<FlowChart chart={CHART} playbackSpeedMs={500} />);
    await flushLayout();

    fireEvent.click(screen.getByTestId('fc-playback-step-forward'));
    const active = container.querySelector('.fc-node--active');
    expect(active).toBeInTheDocument();
    expect(container.querySelectorAll('.fc-node--dimmed').length).toBeGreaterThan(0);
  });

  it('hides the playback controls when showPlaybackControls is false', async () => {
    render(<FlowChart chart={CHART} showPlaybackControls={false} />);
    await flushLayout();
    expect(screen.queryByTestId('fc-playback')).not.toBeInTheDocument();
  });

  it('renders no playback controls when there is no playable path', async () => {
    render(<FlowChart graph={EMPTY_GRAPH} />);
    await flushLayout();
    expect(screen.queryByTestId('fc-playback')).not.toBeInTheDocument();
  });

  it('restart returns to the first step', async () => {
    render(<FlowChart chart={CHART} playbackSpeedMs={500} />);
    await flushLayout();
    fireEvent.click(screen.getByTestId('fc-playback-step-forward'));
    fireEvent.click(screen.getByTestId('fc-playback-step-forward'));
    expect(screen.getByTestId('fc-playback-count')).toHaveTextContent('3 / 4');
    fireEvent.click(screen.getByTestId('fc-playback-restart'));
    expect(screen.getByTestId('fc-playback-count')).toHaveTextContent('1 / 4');
  });

  it('step-back moves the step index back', async () => {
    render(<FlowChart chart={CHART} playbackSpeedMs={500} />);
    await flushLayout();
    fireEvent.click(screen.getByTestId('fc-playback-step-forward'));
    fireEvent.click(screen.getByTestId('fc-playback-step-forward'));
    fireEvent.click(screen.getByTestId('fc-playback-step-back'));
    expect(screen.getByTestId('fc-playback-count')).toHaveTextContent('2 / 4');
  });
});
