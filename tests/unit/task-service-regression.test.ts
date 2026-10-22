import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ from: vi.fn(), query: {} as Record<string, ReturnType<typeof vi.fn>> }));
vi.mock('@/lib/supabase/utils', () => ({ getSupabase: () => ({ from: mocks.from }) }));
vi.mock('@/app/lead-manager/auth-service', () => ({ getOrganizationId: vi.fn() }));
import { getMonthEvents, getTodayTasks, updateTaskStatus } from '@/app/lead-manager/task-service';

function setup() {
  const query: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of ['select', 'eq', 'order', 'gte', 'lte', 'not', 'update']) {
    query[method] = vi.fn(() => query);
  }
  query.then = vi.fn(resolve => resolve({ data: [], error: null }));
  mocks.from.mockReturnValue(query);
  mocks.query = query;
  return query;
}

afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

describe('업무 날짜 및 상태 회귀', () => {
  it('한국 시간 자정 직후 오늘 날짜를 전날로 조회하지 않는다', async () => {
    const query = setup();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 9, 22, 0, 15));
    await getTodayTasks();
    expect(query.eq).toHaveBeenCalledWith('due_date', '2026-10-22');
  });

  it('월 조회는 현지 달력의 첫날부터 마지막 날까지 포함한다', async () => {
    const query = setup();
    await getMonthEvents(2026, 9);
    expect(query.gte).toHaveBeenCalledWith('due_date', '2026-10-01');
    expect(query.lte).toHaveBeenCalledWith('due_date', '2026-10-31');
  });

  it.each(['PENDING', 'IN_PROGRESS', 'CANCELLED'] as const)('완료 업무를 %s로 변경하면 완료 시각을 비운다', async status => {
    const query = setup();
    await updateTaskStatus('synthetic-task', status);
    expect(query.update).toHaveBeenCalledWith({ status, completed_at: null });
  });

  it('완료 처리에는 UTC 시각을 기록한다', async () => {
    const query = setup();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-22T01:00:00Z'));
    await updateTaskStatus('synthetic-task', 'COMPLETED');
    expect(query.update).toHaveBeenCalledWith({ status: 'COMPLETED', completed_at: '2026-10-22T01:00:00.000Z' });
  });
});
