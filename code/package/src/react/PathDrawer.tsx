'use client';

import type { iFlowPath } from '../paths/detectPaths';

/** Props accepted by {@link PathDrawer}. */
export interface iPathDrawerProps {
  /** Every detected path to list. */
  paths: iFlowPath[];
  /** Currently selected path id, or `null`/`undefined` when none is selected. */
  selectedPathId?: string | null;
  /** Fired with the clicked path's id, or `null` when re-clicking the selected path (deselect). */
  onSelect: (pathId: string | null) => void;
}

const DOT_COLOR_BY_TYPE: Record<iFlowPath['type'], string> = {
  happy: 'var(--fc-edge-happy)',
  warning: 'var(--fc-edge-warning)',
  error: 'var(--fc-edge-error)',
  neutral: 'var(--fc-edge-default)',
};

/**
 * Lists every path detected by {@link detectPaths}, letting the caller select one
 * to highlight on the canvas. Clicking the already-selected path deselects it.
 * Renders nothing when there are no paths to show.
 */
export function PathDrawer({ paths, selectedPathId, onSelect }: iPathDrawerProps) {
  if (paths.length === 0) return null;

  return (
    <div className="fc-path-drawer" data-testid="fc-path-drawer" data-agent-action="path-drawer">
      <ul className="fc-path-drawer-list">
        {paths.map((path) => {
          const selected = path.id === selectedPathId;
          return (
            <li key={path.id}>
              <button
                type="button"
                className={`fc-path-drawer-item${selected ? ' fc-path-drawer-item--selected' : ''}`}
                data-testid={`fc-path-${path.id}`}
                data-agent-action="select-path"
                data-path-id={path.id}
                aria-pressed={selected}
                onClick={() => onSelect(selected ? null : path.id)}
              >
                <span
                  className="fc-path-drawer-dot"
                  style={{ backgroundColor: DOT_COLOR_BY_TYPE[path.type] }}
                  aria-hidden="true"
                />
                <span className="fc-path-drawer-name">{path.name}</span>
                <span className="fc-path-drawer-type">{path.type}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
