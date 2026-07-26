import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PlaybackControls } from './PlaybackControls';

describe('PlaybackControls', () => {
  it('shows the play button and step readout when paused', () => {
    render(
      <PlaybackControls
        playing={false}
        index={1}
        total={4}
        onPlay={() => {}}
        onPause={() => {}}
        onRestart={() => {}}
        onStepForward={() => {}}
        onStepBack={() => {}}
      />
    );
    expect(screen.getByTestId('fc-playback-play')).toBeInTheDocument();
    expect(screen.queryByTestId('fc-playback-pause')).not.toBeInTheDocument();
    expect(screen.getByTestId('fc-playback-count')).toHaveTextContent('2 / 4');
  });

  it('shows the pause button when playing and reports 0 / 0 for an empty path', () => {
    render(
      <PlaybackControls
        playing
        index={0}
        total={0}
        onPlay={() => {}}
        onPause={() => {}}
        onRestart={() => {}}
        onStepForward={() => {}}
        onStepBack={() => {}}
      />
    );
    expect(screen.getByTestId('fc-playback-pause')).toBeInTheDocument();
    expect(screen.queryByTestId('fc-playback-play')).not.toBeInTheDocument();
    expect(screen.getByTestId('fc-playback-count')).toHaveTextContent('0 / 0');
  });

  it('fires every callback when its button is clicked', () => {
    const onPlay = vi.fn();
    const onPause = vi.fn();
    const onRestart = vi.fn();
    const onStepForward = vi.fn();
    const onStepBack = vi.fn();
    const { rerender } = render(
      <PlaybackControls
        playing={false}
        index={0}
        total={3}
        onPlay={onPlay}
        onPause={onPause}
        onRestart={onRestart}
        onStepForward={onStepForward}
        onStepBack={onStepBack}
      />
    );
    fireEvent.click(screen.getByTestId('fc-playback-play'));
    expect(onPlay).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId('fc-playback-restart'));
    expect(onRestart).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId('fc-playback-step-forward'));
    expect(onStepForward).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTestId('fc-playback-step-back'));
    expect(onStepBack).toHaveBeenCalledTimes(1);

    rerender(
      <PlaybackControls
        playing
        index={0}
        total={3}
        onPlay={onPlay}
        onPause={onPause}
        onRestart={onRestart}
        onStepForward={onStepForward}
        onStepBack={onStepBack}
      />
    );
    fireEvent.click(screen.getByTestId('fc-playback-pause'));
    expect(onPause).toHaveBeenCalledTimes(1);
  });
});
