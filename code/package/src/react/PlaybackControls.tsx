'use client';

/** Props accepted by {@link PlaybackControls}. */
export interface iPlaybackControlsProps {
  /** Whether playback is currently auto-advancing. */
  playing: boolean;
  /** Current step index (0-based). */
  index: number;
  /** Total steps in the path being played. */
  total: number;
  /** Starts (or resumes) auto-advancing. */
  onPlay: () => void;
  /** Stops auto-advancing. */
  onPause: () => void;
  /** Resets the current step back to the first node. */
  onRestart: () => void;
  /** Moves one step forward. */
  onStepForward: () => void;
  /** Moves one step back. */
  onStepBack: () => void;
}

/**
 * Transport controls for path "movie mode" playback: step-back, play/pause
 * toggle, step-forward and restart, plus a `"<step> / <total>"` readout.
 */
export function PlaybackControls({
  playing,
  index,
  total,
  onPlay,
  onPause,
  onRestart,
  onStepForward,
  onStepBack,
}: iPlaybackControlsProps) {
  return (
    <div className="fc-playback" data-testid="fc-playback" data-agent-action="playback-controls">
      <button
        type="button"
        className="fc-playback-btn"
        data-testid="fc-playback-step-back"
        data-agent-action="playback-step-back"
        aria-label="Step back"
        onClick={onStepBack}
      >
        ⏮
      </button>
      {playing ? (
        <button
          type="button"
          className="fc-playback-btn"
          data-testid="fc-playback-pause"
          data-agent-action="playback-pause"
          aria-label="Pause"
          onClick={onPause}
        >
          ⏸
        </button>
      ) : (
        <button
          type="button"
          className="fc-playback-btn"
          data-testid="fc-playback-play"
          data-agent-action="playback-play"
          aria-label="Play"
          onClick={onPlay}
        >
          ▶
        </button>
      )}
      <button
        type="button"
        className="fc-playback-btn"
        data-testid="fc-playback-step-forward"
        data-agent-action="playback-step-forward"
        aria-label="Step forward"
        onClick={onStepForward}
      >
        ⏭
      </button>
      <button
        type="button"
        className="fc-playback-btn"
        data-testid="fc-playback-restart"
        data-agent-action="playback-restart"
        aria-label="Restart"
        onClick={onRestart}
      >
        ⟲
      </button>
      <span className="fc-playback-count" data-testid="fc-playback-count">
        {total > 0 ? index + 1 : 0} / {total}
      </span>
    </div>
  );
}
