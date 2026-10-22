import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OnlineAccount, PresenceConnection } from './online-presence';
const mocks = vi.hoisted(() => ({ subscribe: vi.fn(), client: vi.fn(() => ({})) }));
vi.mock('@/lib/supabase/client', () => ({ createClient: mocks.client }));
vi.mock('./online-presence', () => ({ subscribeToOnlineUsers: mocks.subscribe }));
import { useOnlinePresence } from './use-online-presence';

describe('Presence 계정 전환', () => {
  const subscriptions: { users: (users: OnlineAccount[]) => void; status: (value: PresenceConnection) => void; stop: ReturnType<typeof vi.fn> }[] = [];
  beforeEach(() => {
    subscriptions.length = 0;
    vi.clearAllMocks();
    mocks.subscribe.mockImplementation((_client, _user, users, status) => {
      const stop = vi.fn(); subscriptions.push({ users, status, stop }); return stop;
    });
  });
  it('로그아웃/다시 로그인 시 이전 목록을 제거하고 구독을 정리한다', () => {
    const h = renderHook(({ id }) => useOnlinePresence(id), { initialProps: { id: 'a' as string | undefined } });
    act(() => { subscriptions[0].users([{ user_id: 'a' }]); subscriptions[0].status('connected'); });
    expect(h.result.current.accounts).toHaveLength(1);
    h.rerender({ id: undefined });
    expect(h.result.current).toMatchObject({ accounts: [], connection: 'disconnected' });
    expect(subscriptions[0].stop).toHaveBeenCalledTimes(1);
    h.rerender({ id: 'a' });
    expect(h.result.current).toMatchObject({ accounts: [], connection: 'connecting' });
    act(() => subscriptions[0].users([{ user_id: 'stale' }]));
    expect(h.result.current.accounts).toEqual([]);
    h.unmount();
    expect(subscriptions[1].stop).toHaveBeenCalledTimes(1);
  });
  it('다른 계정으로 바뀌면 이전 콜백을 무시한다', () => {
    const h = renderHook(({ id }) => useOnlinePresence(id), { initialProps: { id: 'a' } });
    h.rerender({ id: 'b' });
    act(() => { subscriptions[0].users([{ user_id: 'a' }]); subscriptions[0].status('connected'); });
    expect(h.result.current).toMatchObject({ accounts: [], connection: 'connecting' });
    act(() => { subscriptions[1].users([{ user_id: 'b' }]); subscriptions[1].status('connected'); });
    expect(h.result.current.accounts).toEqual([{ user_id: 'b' }]);
    h.unmount();
  });
});
