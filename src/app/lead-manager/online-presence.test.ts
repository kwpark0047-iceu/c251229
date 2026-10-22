import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getOnlineAccounts, subscribeToOnlineUsers } from './online-presence';

describe('실시간 계정 집계', () => {
  it('여러 탭을 중복 제거하고 비정상 데이터를 제외한다', () => {
    expect(getOnlineAccounts({ a: [{ user_id: 'a' }, { user_id: 'a' }], b: [{ user_id: 'b' }, {}, null] }))
      .toEqual([{ user_id: 'a' }, { user_id: 'b' }]);
  });

  it('접속 등록, 동기화, 연결 종료, 정리를 처리한다', async () => {
    let sync = () => {};
    let status!: (status: string) => Promise<void>;
    const channel = {
      on: vi.fn((_type, _event, callback) => { sync = callback; return channel; }),
      subscribe: vi.fn(callback => { status = callback; return channel; }),
      track: vi.fn().mockResolvedValue('ok'),
      presenceState: vi.fn().mockReturnValue({ a: [{ user_id: 'a' }] }),
    };
    const client = { channel: vi.fn().mockReturnValue(channel), removeChannel: vi.fn() };
    const changed = vi.fn();
    const cleanup = subscribeToOnlineUsers(client as unknown as SupabaseClient, 'a', changed);
    await status('SUBSCRIBED');
    expect(channel.track).toHaveBeenCalledWith({ user_id: 'a' });
    sync();
    expect(changed).toHaveBeenLastCalledWith([{ user_id: 'a' }]);
    await status('CHANNEL_ERROR');
    expect(changed).toHaveBeenLastCalledWith([]);
    cleanup();
    expect(client.removeChannel).toHaveBeenCalledWith(channel);
    changed.mockClear();
    sync();
    await status('SUBSCRIBED');
    expect(changed).not.toHaveBeenCalled();
    expect(channel.track).toHaveBeenCalledTimes(1);
  });
});
