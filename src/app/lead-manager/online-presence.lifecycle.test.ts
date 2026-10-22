import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { subscribeToOnlineUsers } from './online-presence';

function harness() {
  let sync = () => {};
  let status!: (value: string) => Promise<void>;
  const channel = {
    on: vi.fn((_type, _event, callback) => { sync = callback; return channel; }),
    subscribe: vi.fn(callback => { status = callback; return channel; }),
    track: vi.fn().mockResolvedValue('ok'),
    presenceState: vi.fn().mockReturnValue({ a: [{ user_id: 'a' }] }),
  };
  const client = { channel: vi.fn().mockReturnValue(channel), removeChannel: vi.fn().mockResolvedValue('ok') };
  const users = vi.fn(), connection = vi.fn();
  const stop = subscribeToOnlineUsers(client as unknown as SupabaseClient, 'a', users, connection);
  return { channel, client, users, connection, stop, sync: () => sync(), status: (value: string) => status(value) };
}

describe('Presence 연결 수명주기', () => {
  it('track 확인과 sync 전에는 정상 연결 인원으로 표시하지 않는다', async () => {
    const h = harness();
    expect(h.connection).toHaveBeenLastCalledWith('connecting');
    await h.status('SUBSCRIBED');
    expect(h.connection).not.toHaveBeenLastCalledWith('connected');
    h.sync();
    expect(h.connection).toHaveBeenLastCalledWith('connected');
    expect(h.users).toHaveBeenLastCalledWith([{ user_id: 'a' }]);
    h.stop();
  });
  it('다중 탭은 중복 제거하고 마지막 탭 이탈 뒤에만 계정을 제거한다', async () => {
    const h = harness();
    await h.status('SUBSCRIBED');
    for (const state of [{ t1: [{ user_id: 'a' }], t2: [{ user_id: 'a' }] }, { t2: [{ user_id: 'a' }] }]) {
      h.channel.presenceState.mockReturnValue(state);
      h.sync();
      expect(h.users).toHaveBeenLastCalledWith([{ user_id: 'a' }]);
    }
    h.channel.presenceState.mockReturnValue({});
    h.sync();
    expect(h.users).toHaveBeenLastCalledWith([]);
    expect(h.connection).toHaveBeenLastCalledWith('connected');
    h.stop();
  });
  it('재접속은 재등록·새 sync 이후에만 정상 상태로 돌아간다', async () => {
    const h = harness();
    await h.status('SUBSCRIBED'); h.sync();
    await h.status('CHANNEL_ERROR');
    expect(h.connection).toHaveBeenLastCalledWith('reconnecting');
    expect(h.users).toHaveBeenLastCalledWith([]);
    h.sync();
    expect(h.connection).toHaveBeenLastCalledWith('reconnecting');
    await h.status('SUBSCRIBED');
    h.sync();
    expect(h.channel.track).toHaveBeenCalledTimes(2);
    expect(h.connection).toHaveBeenLastCalledWith('connected');
    h.stop();
  });
  it('이전 연결의 늦은 실패가 새 연결을 지우지 않는다', async () => {
    const h = harness();
    let finish!: (value: string) => void;
    h.channel.track.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const first = h.status('SUBSCRIBED');
    await h.status('TIMED_OUT');
    await h.status('SUBSCRIBED'); h.sync();
    finish('error'); await first;
    expect(h.connection).toHaveBeenLastCalledWith('connected');
    expect(h.users).toHaveBeenLastCalledWith([{ user_id: 'a' }]);
    h.stop();
  });
  it('등록 예외는 확인 불가로 표시하고 정리는 한 번만 수행한다', async () => {
    const h = harness();
    h.channel.track.mockRejectedValueOnce(new Error('synthetic'));
    await h.status('SUBSCRIBED');
    expect(h.connection).toHaveBeenLastCalledWith('unavailable');
    h.stop(); h.stop();
    expect(h.client.removeChannel).toHaveBeenCalledTimes(1);
    h.users.mockClear(); h.connection.mockClear();
    h.sync(); await h.status('SUBSCRIBED');
    expect(h.users).not.toHaveBeenCalled();
    expect(h.connection).not.toHaveBeenCalled();
  });
  it('구독 정리 뒤 도착한 등록 성공은 UI에 반영하지 않는다', async () => {
    const h = harness();
    let finish!: (value: string) => void;
    h.channel.track.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const pending = h.status('SUBSCRIBED');
    h.stop();
    h.users.mockClear(); h.connection.mockClear();
    finish('ok'); await pending;
    expect(h.users).not.toHaveBeenCalled();
    expect(h.connection).not.toHaveBeenCalled();
  });
  it('같은 클라이언트의 재마운트는 이전 채널 정리가 끝날 때까지 기다린다', async () => {
    const h = harness();
    let finish!: (value: string) => void;
    h.client.removeChannel.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    h.stop();
    const stop = subscribeToOnlineUsers(h.client as unknown as SupabaseClient, 'b', vi.fn());
    expect(h.client.channel).toHaveBeenCalledTimes(1);
    finish('ok');
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(h.client.channel).toHaveBeenCalledTimes(2);
    stop();
  });
});
