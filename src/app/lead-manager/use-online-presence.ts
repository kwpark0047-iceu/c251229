'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { subscribeToOnlineUsers, type OnlineAccount, type PresenceConnection } from './online-presence';

interface Snapshot { userId: string | null; accounts: OnlineAccount[]; connection: PresenceConnection }
export function useOnlinePresence(userId: string | undefined) {
  const [snapshot, setSnapshot] = useState<Snapshot>({ userId: null, accounts: [], connection: 'disconnected' });
  useEffect(() => {
    if (!userId) { setSnapshot({ userId: null, accounts: [], connection: 'disconnected' }); return; }
    let active = true;
    setSnapshot({ userId, accounts: [], connection: 'connecting' });
    const stop = subscribeToOnlineUsers(createClient(), userId,
      accounts => { if (active) setSnapshot(previous => ({ ...previous, accounts })); },
      connection => { if (active) setSnapshot(previous => ({ ...previous, connection })); });
    return () => { active = false; stop(); };
  }, [userId]);
  // 계정 전환 렌더에서는 이전 계정 목록을 한 프레임도 노출하지 않습니다.
  if (!userId || snapshot.userId !== userId) {
    return { accounts: [] as OnlineAccount[], connection: (userId ? 'connecting' : 'disconnected') as PresenceConnection };
  }
  return snapshot;
}
