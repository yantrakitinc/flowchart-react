import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PathDrawer } from './PathDrawer';
import type { iFlowPath } from '../paths/detectPaths';

const PATHS: iFlowPath[] = [
  { id: 'path-0', name: 'Path 1', type: 'happy', nodeIds: ['a', 'b'], edgeIds: ['e0'] },
  { id: 'path-1', name: 'Path 2', type: 'error', nodeIds: ['a', 'c'], edgeIds: ['e1'] },
];

describe('PathDrawer', () => {
  it('renders nothing when there are no paths', () => {
    const { container } = render(<PathDrawer paths={[]} onSelect={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('lists every path with its testid and type', () => {
    render(<PathDrawer paths={PATHS} onSelect={() => {}} />);
    expect(screen.getByTestId('fc-path-path-0')).toHaveAttribute('data-path-id', 'path-0');
    expect(screen.getByTestId('fc-path-path-1')).toHaveAttribute('data-path-id', 'path-1');
    expect(screen.getByText('happy')).toBeInTheDocument();
    expect(screen.getByText('error')).toBeInTheDocument();
  });

  it('selects an unselected path on click', () => {
    const onSelect = vi.fn();
    render(<PathDrawer paths={PATHS} selectedPathId={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByTestId('fc-path-path-0'));
    expect(onSelect).toHaveBeenCalledWith('path-0');
  });

  it('deselects the already-selected path on click', () => {
    const onSelect = vi.fn();
    render(<PathDrawer paths={PATHS} selectedPathId="path-0" onSelect={onSelect} />);
    const item = screen.getByTestId('fc-path-path-0');
    expect(item).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(item);
    expect(onSelect).toHaveBeenCalledWith(null);
  });
});
