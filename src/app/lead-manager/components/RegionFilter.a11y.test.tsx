import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import { RegionDropdown } from './RegionFilter';

afterEach(cleanup);
describe('region dropdown dismissal', () => {
  it.each(['{Enter}', ' '])('dismisses with a native background button using %s without changing selection', async key => {
    const change = vi.fn();
    const user = userEvent.setup();
    render(<RegionDropdown selectedRegions={[]} onRegionChange={change} />);
    await user.click(screen.getByRole('button', { name: '지역 선택' }));
    const close = screen.getByRole('button', { name: '지역 선택 닫기' });
    close.focus();
    await user.keyboard(key);
    expect(screen.queryByRole('button', { name: '지역 선택 닫기' })).toBeNull();
    expect(change).not.toHaveBeenCalled();
  });
});
