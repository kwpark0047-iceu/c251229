'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function AccountAccessGuard({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState('CHECKING');
  useEffect(() => {
    let disposed = false;
    let epoch = 0;
    let activeRequest: number | null = null;
    let identity: string | null | undefined;
    let scheduled: number | undefined;
    const client = createClient();
    function scheduleCheck() {
      if (scheduled !== undefined) window.clearTimeout(scheduled);
      scheduled = window.setTimeout(() => { scheduled = undefined; void check(); }, 0);
    }
    async function check() {
      if (disposed || activeRequest === epoch || document.visibilityState === 'hidden') return;
      const requestEpoch = epoch;
      activeRequest = requestEpoch;
      const current = () => !disposed && requestEpoch === epoch;
      try {
        const { data: { user }, error: authError } = await client.auth.getUser();
        if (!current()) return;
        if (!user || authError) {
          setStatus('UNAUTHENTICATED');
          return;
        }
        identity = user.id;
        const { data, error } = await client.from('profiles').select('account_status').eq('id', user.id).maybeSingle();
        if (!current()) return;
        const accountStatus = !error && typeof data?.account_status === 'string' ? data.account_status : 'UNKNOWN';
        if (['ARCHIVED', 'SUSPENDED'].includes(accountStatus)) {
          const latest = await client.auth.getUser();
          if (!current()) return;
          if (latest.error) { setStatus('UNKNOWN'); return; }
          if (latest.data.user?.id !== user.id) {
            epoch++;
            identity = latest.data.user?.id ?? null;
            setStatus(identity ? 'CHECKING' : 'UNAUTHENTICATED');
            if (identity) scheduleCheck();
            return;
          }
          setStatus(accountStatus);
          // 이 브라우저의 세션만 정리한다. 다른 기기의 권한도 서버/RLS에서 즉시 거부한다.
          try { await client.auth.signOut({ scope: 'local' }); } catch { /* DB 접근 차단은 유지된다. */ }
        } else {
          setStatus(accountStatus);
        }
      } catch {
        if (current()) setStatus('UNKNOWN');
      } finally { if (activeRequest === requestEpoch) activeRequest = null; }
    }
    const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
      if (disposed) return;
      // 이전 계정의 지연 응답을 무효화하고 인증 콜백 밖에서 재조회한다.
      epoch++;
      if (event === 'SIGNED_OUT' || !session?.user) {
        identity = null;
        setStatus('UNAUTHENTICATED');
        if (scheduled !== undefined) window.clearTimeout(scheduled);
        scheduled = undefined;
        return;
      }
      if (identity !== session.user.id) setStatus('CHECKING');
      identity = session.user.id;
      scheduleCheck();
    });
    void check();
    const onChange = () => { void check(); };
    const timer = window.setInterval(onChange, 30_000);
    window.addEventListener('focus', onChange);
    window.addEventListener('online', onChange);
    window.addEventListener('storage', onChange);
    document.addEventListener('visibilitychange', onChange);
    return () => {
      disposed = true;
      epoch++;
      subscription.unsubscribe();
      if (scheduled !== undefined) window.clearTimeout(scheduled);
      window.clearInterval(timer);
      window.removeEventListener('focus', onChange);
      window.removeEventListener('online', onChange);
      window.removeEventListener('storage', onChange);
      document.removeEventListener('visibilitychange', onChange);
    };
  }, []);
  if (status === 'ACTIVE') return children;
  return <main className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] text-[var(--text-primary)] p-6">
    <div className="glass-card max-w-lg p-6 space-y-4">
      <p role={status === 'CHECKING' ? 'status' : 'alert'}>{status === 'CHECKING' ? '계정 이용 상태를 확인하고 있습니다.'
        : status === 'PENDING' ? '회원가입 승인 대기 중입니다. 승인 후 서비스를 이용할 수 있습니다.'
          : status === 'ARCHIVED' ? '삭제·보관된 계정입니다. 서비스 접근 권한이 없습니다.'
            : status === 'SUSPENDED' ? '이용이 중지된 계정입니다. 관리자에게 문의해주세요.'
              : '계정 이용 권한을 확인하지 못했습니다. 다시 로그인해주세요.'}</p>
      {status !== 'CHECKING' && <a href="/api/auth/logout?redirect=1" className="inline-block underline">로그아웃 및 로그인 화면으로 이동</a>}
    </div>
  </main>;
}
