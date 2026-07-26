/**
 * Path-selector drawer. Lists every detected start→end path, colored by its semantic type,
 * and lets the user highlight one (or clear the selection). Carries agent affordances so an
 * agent can enumerate and select paths.
 */
import type { iFlowPath } from '../paths/detectPaths';
import type { iDrawerPosition } from './types';

interface iPathDrawerProps {
  paths: iFlowPath[];
  selectedPathId: string | null;
  onSelect: (id: string | null) => void;
  position: iDrawerPosition;
}

/** The path list + selector shown alongside the canvas. */
export function PathDrawer({
  paths,
  selectedPathId,
  onSelect,
  position,
}: iPathDrawerProps): JSX.Element | null {
  if (paths.length === 0) return null;

  return (
    <aside
      className={`fc-drawer fc-drawer--${position}`}
      data-testid="fc-path-drawer"
      data-agent-action="path-drawer"
      aria-label="Path selector"
    >
      <div className="fc-drawer__title">Paths ({paths.length})</div>
      <ul className="fc-drawer__list" role="listbox" aria-label="Detected paths">
        <li>
          <button
            type="button"
            className={`fc-drawer__item ${selectedPathId === null ? 'is-selected' : ''}`}
            data-agent-action="select-path"
            data-path-id="all"
            aria-selected={selectedPathId === null}
            onClick={() => onSelect(null)}
          >
            All paths
          </button>
        </li>
        {paths.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              className={`fc-drawer__item fc-drawer__item--${p.type} ${
                selectedPathId === p.id ? 'is-selected' : ''
              }`}
              data-testid={`fc-path-${p.id}`}
              data-agent-action="select-path"
              data-path-id={p.id}
              data-path-type={p.type}
              aria-selected={selectedPathId === p.id}
              onClick={() => onSelect(selectedPathId === p.id ? null : p.id)}
            >
              <span className={`fc-drawer__dot fc-drawer__dot--${p.type}`} aria-hidden="true" />
              {p.name}
              <span className="fc-drawer__type">{p.type}</span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
