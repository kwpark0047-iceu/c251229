import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it } from 'vitest';
import StationFloorPlans from './StationFloorPlans';
import type { FloorPlan } from '../../types';

afterEach(cleanup);
const plan: FloorPlan = { id: 'plan', stationName: 'Test', floorName: 'B1', imageUrl: '/plan.png', createdAt: '', updatedAt: '' };

it('uses native thumbnail and backdrop buttons with keyboard activation and isolated content', async () => {
  const user = userEvent.setup();
  const { container } = render(<StationFloorPlans floorPlans={[plan]} />);
  const thumbnail = screen.getByRole('button', { name: 'Test B1 도면' });
  expect(thumbnail.tagName).toBe('BUTTON');
  for (const key of ['{Enter}', ' ']) {
    thumbnail.focus();
    await user.keyboard(key);
    fireEvent.click(screen.getByText('Test B1'));
    expect(screen.getByRole('button', { name: '도면 모달 닫기' })).toBeInTheDocument();
    const backdrop = screen.getByRole('button', { name: '도면 배경 닫기' });
    expect(backdrop.tagName).toBe('BUTTON');
    backdrop.focus();
    await user.keyboard(key);
    expect(screen.queryByRole('button', { name: '도면 모달 닫기' })).not.toBeInTheDocument();
  }
  expect(container.querySelector('button button')).toBeNull();
});
