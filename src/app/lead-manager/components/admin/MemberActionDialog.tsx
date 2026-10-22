'use client';

import { useEffect, useRef, useState } from 'react';
import { deleteUserProfile, updateProfileStatus } from '../../auth-service';

export interface MemberAction {
  id: string;
  email: string;
  action: 'approve' | 'revoke' | 'delete';
}

export default function MemberActionDialog({ target, onClose, onComplete }: {
  target: MemberAction;
  onClose: () => void;
  onComplete: (message: string) => Promise<void>;
}) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState('');
  const lock = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const deleting = target.action === 'delete';
  const title = deleting ? '회원 계정 삭제' : target.action === 'approve' ? '신규 회원가입 승인' : '회원 승인 취소';
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    (input.current || cancel.current)?.focus();
    return () => previous?.focus();
  }, []);
  useEffect(() => {
    if (busy) dialog.current?.focus();
  }, [busy]);
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!dialog.current?.contains(event.target as Node)) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (!lock.current) onClose();
      }
      if (event.key === 'Tab') {
        const nodes = dialog.current.querySelectorAll<HTMLElement>('input:not(:disabled), button:not(:disabled)');
        if (!nodes.length) { event.preventDefault(); return; }
        const first = nodes[0], last = nodes[nodes.length - 1];
        const onContainer = document.activeElement === dialog.current;
        if (event.shiftKey && (document.activeElement === first || onContainer)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || onContainer)) { event.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (lock.current || completed) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const result = deleting ? await deleteUserProfile(target.id, email)
        : await updateProfileStatus(target.id, { isApproved: target.action === 'approve' });
      if (!result.success) { setError(result.message); return; }
      setCompleted(result.message);
      try {
        await onComplete(result.message);
        onClose();
      } catch {
        setError(`${deleting ? '삭제 완료' : '변경 완료'}: 목록 갱신에 실패했습니다. 같은 작업을 다시 실행하지 말고 목록을 다시 불러와주세요.`);
      }
    } catch {
      setError('처리 결과를 확인하지 못했습니다. 목록을 새로고침해 상태를 확인해주세요.');
    } finally { lock.current = false; setBusy(false); }
  }

  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
    <div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="member-action-title" aria-describedby="member-action-description"
      className="glass-card w-full max-w-lg rounded-2xl border border-slate-600 bg-slate-950 p-6 text-slate-100">
      <h2 id="member-action-title" className="text-xl font-bold">{title}</h2>
      <p className="mt-3 break-all font-semibold">{target.email}</p>
      <p id="member-action-description" className="mt-3 text-sm text-slate-300">{deleting
        ? '로그인 계정과 연결된 프로필·소속 정보가 삭제됩니다. 연결된 개인 자료도 삭제될 수 있으며 되돌릴 수 없습니다. 조직의 마지막 소유자는 소유권을 이전한 뒤 삭제해주세요.'
        : target.action === 'approve' ? '이 회원의 서비스 이용을 승인하고 안내 이메일을 발송합니다.' : '승인을 취소하면 회원의 서비스 이용이 제한됩니다.'}</p>
      {completed ? <div aria-busy={busy}>
        <p role="status" className="mt-4 text-sm">{completed}</p>
        {error && <p role="alert" className="mt-4 text-sm text-rose-300">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" disabled={busy} onClick={onClose}>닫기</button>
          <button type="button" disabled={busy} onClick={async () => {
            if (lock.current) return;
            lock.current = true;
            setBusy(true);
            try { await onComplete(completed); onClose(); }
            catch { setError('처리는 완료됐으나 목록 갱신에 실패했습니다. 잠시 후 다시 불러와주세요.'); }
            finally { lock.current = false; setBusy(false); }
          }}>목록 다시 불러오기</button>
        </div>
      </div> : <form onSubmit={submit} aria-busy={busy}>
        {deleting && <div className="mt-5">
          <label htmlFor="member-delete-email" className="block text-sm">확인을 위해 삭제할 회원의 이메일을 입력해주세요.</label>
          <input ref={input} id="member-delete-email" type="email" value={email} disabled={busy} required autoComplete="off"
            onChange={event => setEmail(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-500 bg-slate-900 p-3 text-white" />
        </div>}
        {error && <p role="alert" className="mt-4 text-sm text-rose-300">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button ref={cancel} type="button" disabled={busy} onClick={onClose} className="rounded-lg border border-slate-500 px-4 py-2 disabled:opacity-50">취소</button>
          <button type="submit" disabled={busy || (deleting && email.trim().toLowerCase() !== target.email.toLowerCase())}
            className={`rounded-lg px-4 py-2 font-bold disabled:opacity-50 ${deleting ? 'bg-rose-600' : 'bg-indigo-600'}`}>{busy ? '처리 중...' : title}</button>
        </div>
      </form>}
    </div>
  </div>;
}
