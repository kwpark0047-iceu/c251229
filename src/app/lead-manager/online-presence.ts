import type { SupabaseClient } from '@supabase/supabase-js';

export interface OnlineAccount { user_id: string }
export type PresenceConnection = 'connecting' | 'connected' | 'reconnecting' | 'unavailable' | 'disconnected';
export const presenceLabels: Record<PresenceConnection, string> = {
  connecting: '연결 중', connected: '접속 중', reconnecting: '재연결 중', unavailable: '확인 불가', disconnected: '연결 안 됨',
};
const pendingRemovals = new WeakMap<SupabaseClient, Promise<unknown>>();

export function getOnlineAccounts(state: Record<string, unknown[]>): OnlineAccount[] {
  const ids = new Set<string>();
  for (const entries of Object.values(state)) {
    if (!Array.isArray(entries)) continue;
    for (const entry of entries) {
      const id = (entry as Partial<OnlineAccount> | null)?.user_id;
      if (typeof id === 'string' && id) ids.add(id);
    }
  }
  return Array.from(ids, user_id => ({ user_id }));
}

export function subscribeToOnlineUsers(
  client: SupabaseClient,
  userId: string,
  onChange: (users: OnlineAccount[]) => void,
  onConnection: (status: PresenceConnection) => void = () => {},
): () => void {
  let disposed = false;
  let generation = 0, transportReady = false, tracked = false, synced = false, attempted = false;
  onChange([]);
  onConnection('connecting');
  // 탭별 Presence 키는 SDK가 만들며 화면의 계정 수만 user_id로 중복 제거합니다.
  let channel: ReturnType<SupabaseClient['channel']> | undefined;
  const publish = () => {
    if (disposed || !channel || !transportReady || !tracked || !synced) return;
    onChange(getOnlineAccounts(channel.presenceState()));
    onConnection('connected');
  };
  const start = () => {
    if (disposed) return;
    const activeChannel = client.channel('online-users');
    channel = activeChannel;
    activeChannel.on('presence', { event: 'sync' }, () => {
    if (disposed || !transportReady) return;
    synced = true;
    publish();
  }).subscribe(async status => {
    if (disposed) return;
    if (status === 'SUBSCRIBED') {
      const current = ++generation;
      transportReady = true; tracked = false; synced = false;
      onChange([]);
      onConnection(attempted ? 'reconnecting' : 'connecting');
      attempted = true;
      try {
        const result = await activeChannel.track({ user_id: userId });
        if (disposed || current !== generation) return;
        if (result !== 'ok') { transportReady = false; onConnection('unavailable'); return; }
        tracked = true;
        publish();
      } catch {
        if (!disposed && current === generation) { transportReady = false; onChange([]); onConnection('unavailable'); }
      }
    } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      ++generation;
      transportReady = false; tracked = false; synced = false;
      onChange([]);
      onConnection(status === 'CLOSED' ? 'unavailable' : 'reconnecting');
    }
    });
  };
  // SDK는 같은 topic을 재사용하므로 StrictMode 재마운트는 이전 unsubscribe 완료 후 시작합니다.
  const pending = pendingRemovals.get(client);
  if (pending) void pending.then(start).catch(() => { if (!disposed) onConnection('unavailable'); });
  else start();
  return () => {
    if (disposed) return;
    disposed = true;
    ++generation;
    if (!channel) return;
    try {
      const removal = Promise.resolve(client.removeChannel(channel)).catch(() => {});
      pendingRemovals.set(client, removal);
      void removal.then(() => { if (pendingRemovals.get(client) === removal) pendingRemovals.delete(client); });
    } catch { /* 종료 중 오류는 UI를 갱신하지 않습니다. */ }
  };
}
