import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom/vitest';
import TaskBoard from './TaskBoard';
import { deleteTask, getTasks, getTaskStats, updateTaskStatus } from '../../task-service';
import type { TaskWithLead } from '../../types';

vi.mock('../../task-service', () => ({
  getTasks: vi.fn(),
  getTaskStats: vi.fn(),
  updateTaskStatus: vi.fn(),
  deleteTask: vi.fn(),
}));

const task: TaskWithLead = {
  id: 'task-1', title: 'Call customer', taskType: 'CALL',
  dueDate: '2099-01-01', status: 'PENDING', priority: 'MEDIUM',
};
const detailName = `${task.title} 상세 보기`;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getTasks).mockResolvedValue([task]);
  vi.mocked(getTaskStats).mockResolvedValue({
    total: 1, pending: 1, inProgress: 0, completed: 0,
    overdue: 0, todayCount: 0, weekCount: 0,
  });
  vi.mocked(updateTaskStatus).mockResolvedValue(true);
  vi.mocked(deleteTask).mockResolvedValue(true);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('TaskBoard card interactions', () => {
  it.each(['{Enter}', ' '])('opens detail exactly once with %s', async (key) => {
    const user = userEvent.setup();
    const onTaskClick = vi.fn();
    const onEditTask = vi.fn();
    render(<TaskBoard onTaskClick={onTaskClick} onEditTask={onEditTask} />);
    const detail = await screen.findByRole('button', { name: detailName });
    expect(detail.tagName).toBe('BUTTON');
    await user.tab();
    await user.tab();
    await user.tab();
    expect(detail).toHaveFocus();
    await user.keyboard(key);
    expect(onTaskClick).toHaveBeenCalledExactlyOnceWith(task);
    expect(onEditTask).toHaveBeenCalledExactlyOnceWith(task);
  });

  it('keeps a stretched mouse detail target separate from menu controls', async () => {
    const user = userEvent.setup();
    const onTaskClick = vi.fn();
    render(<TaskBoard onTaskClick={onTaskClick} />);
    const detail = await screen.findByRole('button', { name: detailName });
    expect(detail).toHaveClass('absolute', 'inset-0');
    const menu = screen.getByRole('button', { name: '상태 변경 메뉴' });
    expect(detail).not.toContainElement(menu);
    expect(menu.closest('button')).toBe(menu);
    await user.click(detail);
    expect(onTaskClick).toHaveBeenCalledExactlyOnceWith(task);
  });

  it.each(['mouse', 'keyboard'])('never opens detail for menu/status/delete via %s', async (mode) => {
    const user = userEvent.setup();
    const onTaskClick = vi.fn();
    const onEditTask = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<TaskBoard onTaskClick={onTaskClick} onEditTask={onEditTask} />);
    const activate = async (button: HTMLElement) => {
      if (mode === 'mouse') await user.click(button);
      else {
        button.focus();
        await user.keyboard('{Enter}');
      }
    };
    await activate(await screen.findByRole('button', { name: '상태 변경 메뉴' }));
    expect(onTaskClick).not.toHaveBeenCalled();
    for (const button of screen.getAllByRole('button')) {
      expect(button.querySelector('button')).toBeNull();
    }
    await activate(screen.getByRole('button', { name: '진행중로 변경' }));
    await waitFor(() => expect(updateTaskStatus).toHaveBeenCalledExactlyOnceWith(task.id, 'IN_PROGRESS'));
    await activate(await screen.findByRole('button', { name: '상태 변경 메뉴' }));
    await activate(screen.getByRole('button', { name: '삭제' }));
    await waitFor(() => expect(deleteTask).toHaveBeenCalledExactlyOnceWith(task.id));
    await screen.findByRole('button', { name: '상태 변경 메뉴' });
    expect(onTaskClick).not.toHaveBeenCalled();
    expect(onEditTask).not.toHaveBeenCalled();
  });
});
