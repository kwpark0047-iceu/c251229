import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import GridView from './GridView';
import ListView from './ListView';

afterEach(cleanup);

describe.each([['grid', GridView], ['list', ListView]] as const)('%s count-independent pagination', (_, View) => {
  it('keeps previous navigation if the separate count shrinks below the current page', () => {
    render(<View leads={[]} onStatusChange={vi.fn()} searchQuery="" onMapView={vi.fn()}
      currentPage={2} totalCount={0} pageSize={50} countKnown hasNext={false} onPageChange={vi.fn()} />);
    expect(screen.getByTitle('이전 페이지')).not.toBeDisabled();
    expect(screen.getByTitle('다음 페이지')).toBeDisabled();
  });
  it('allows next page without a known count', () => {
    const change = vi.fn();
    render(<View leads={[]} onStatusChange={vi.fn()} searchQuery="" onMapView={vi.fn()}
      currentPage={1} totalCount={0} pageSize={50} countKnown={false} hasNext onPageChange={change} />);
    expect(screen.getByTitle('이전 페이지')).toBeDisabled();
    fireEvent.click(screen.getByTitle('다음 페이지'));
    expect(change).toHaveBeenCalledWith(2);
    expect(screen.getByText('1페이지')).toBeInTheDocument();
  });

  it('preserves previous-page navigation on the last unknown-count page', () => {
    const change = vi.fn();
    render(<View leads={[]} onStatusChange={vi.fn()} searchQuery="" onMapView={vi.fn()}
      currentPage={2} totalCount={0} pageSize={50} countKnown={false} hasNext={false} onPageChange={change} />);
    expect(screen.getByTitle('다음 페이지')).toBeDisabled();
    fireEvent.click(screen.getByTitle('이전 페이지'));
    expect(change).toHaveBeenCalledWith(1);
  });
});
