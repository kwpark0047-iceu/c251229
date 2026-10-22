import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import ScheduleCalendar from './ScheduleCalendar';
import { getMonthEvents } from '../../task-service';

vi.mock('../../task-service', () => ({ getMonthEvents: vi.fn() }));
afterEach(cleanup);

describe('calendar sibling controls', () => {
  it.each(['{Enter}', ' '])('selects days and activates tasks independently with %s', async key => {
    const now = new Date();
    const date = new Date(now.getFullYear(), now.getMonth(), 15).toISOString().split('T')[0];
    const event = { id: 'fixture', title: 'Fixture task', type: 'task' as const, date, taskType: 'CALL' as const };
    vi.mocked(getMonthEvents).mockResolvedValue([event]);
    const select = vi.fn();
    const open = vi.fn();
    const add = vi.fn();
    const user = userEvent.setup();
    const { container } = render(<ScheduleCalendar onDateSelect={select} onEventClick={open} onAddTask={add} />);
    const day = await screen.findByRole('button', { name: `${date} 날짜 선택` });
    day.focus();
    await user.keyboard(key);
    expect(select).toHaveBeenCalledExactlyOnceWith(date);
    select.mockClear();
    const task = screen.getByRole('button', { name: event.title });
    task.focus();
    await user.keyboard(key);
    expect(open).toHaveBeenCalledExactlyOnceWith(event);
    expect(select).not.toHaveBeenCalled();
    const addButton = screen.getByRole('button', { name: `${date} 업무 추가` });
    addButton.focus();
    await user.keyboard(key);
    expect(add).toHaveBeenCalledExactlyOnceWith(date);
    expect(select).not.toHaveBeenCalled();
    expect(container.querySelector('button button')).toBeNull();
  });
});
