'use client';

import { useEffect, useRef, useState } from 'react';
import type { Proposal } from '../types';
import { deleteProposal } from '../proposal-service';

export default function ProposalDeleteDialog({ proposal, onClose, onDeleted }: {
  proposal: Proposal;
  onClose: () => void;
  onDeleted: (id: string, message: string, warnings: string[]) => void | Promise<void>;
}) {
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [completed, setCompleted] = useState('');
  const lock = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const title = proposal.title || '제목 없는 제안서';
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    input.current?.focus();
    return () => { if (previous?.isConnected) previous.focus(); };
  }, []);
  useEffect(() => { if (busy) panel.current?.focus(); }, [busy]);
  useEffect(() => { if (completed && !busy) closeButton.current?.focus(); }, [completed, busy]);
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!panel.current?.contains(event.target as Node)) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        if (!lock.current) onClose();
      }
      if (event.key === 'Tab') {
        const nodes = panel.current.querySelectorAll<HTMLElement>('input:not(:disabled),button:not(:disabled)');
        if (!nodes.length) { event.preventDefault(); return; }
        const first = nodes[0], last = nodes[nodes.length - 1];
        const onContainer = document.activeElement === panel.current;
        if (event.shiftKey && (document.activeElement === first || onContainer)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || onContainer)) { event.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (lock.current || completed || confirmation.trim() !== title.trim()) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await deleteProposal(proposal.id, confirmation, proposal.updatedAt);
      if (!result.success) { setError(result.message); return; }
      setCompleted([result.message, ...(result.warnings || [])].join(' '));
      try {
        await onDeleted(proposal.id, result.message, result.warnings || []);
        onClose();
      } catch {
        setError('삭제 완료: 화면 갱신에 실패했습니다. 재삭제하지 말고 목록을 새로고침해주세요.');
      }
    } catch { setError('삭제 결과를 확인하지 못했습니다. 목록을 새로고침해주세요.'); }
    finally { lock.current = false; setBusy(false); }
  }

  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4">
    <div ref={panel} role="dialog" aria-modal="true" aria-labelledby="proposal-delete-title" aria-describedby="proposal-delete-description" tabIndex={-1}
      className="glass-card w-full max-w-lg rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-6 text-[var(--text-primary)]">
      <h2 id="proposal-delete-title" className="text-xl font-bold">제안서 삭제 확인</h2>
      <p className="mt-3 break-words font-semibold">{title}</p>
      <p id="proposal-delete-description" className="mt-3 text-sm text-[var(--text-secondary)]">
        삭제하면 제안서와 접근 기록을 복구할 수 없습니다. 이 제안서 전용 업로드 파일도 정리하며 외부 링크 원본과 다른 제안서가 사용하는 파일은 유지합니다. 이미 수신자가 내려받은 파일은 회수되지 않습니다. 리드와 광고매체는 삭제하지 않습니다.
      </p>
      {proposal.status === 'ACCEPTED' && <p className="mt-3 text-sm text-amber-500">수락된 제안서입니다. 삭제하면 계약 현황 표시에도 영향을 줄 수 있습니다.</p>}
      {completed ? <div className="mt-5" aria-busy={busy}>
        <p role="status">{completed}</p>
        {error && <p role="alert" className="mt-3 text-sm text-rose-500">{error}</p>}
        <button ref={closeButton} type="button" disabled={busy} onClick={onClose} className="mt-6 rounded-xl border px-4 py-2 disabled:opacity-50">닫기</button>
      </div> : <form onSubmit={submit} aria-busy={busy} className="mt-5">
        <label htmlFor="proposal-delete-confirmation" className="block text-sm font-medium">확인을 위해 제안서 제목을 그대로 입력해주세요.</label>
        <input id="proposal-delete-confirmation" ref={input} value={confirmation} onChange={event => setConfirmation(event.target.value)} disabled={busy} required autoComplete="off"
          className="mt-2 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] p-3" />
        {error && <p role="alert" className="mt-3 text-sm text-rose-500">{error}</p>}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" disabled={busy} onClick={onClose} className="rounded-xl border px-4 py-2 disabled:opacity-50">취소</button>
          <button type="submit" disabled={busy || confirmation.trim() !== title.trim()} className="rounded-xl bg-rose-600 px-4 py-2 font-bold text-white disabled:opacity-50">{busy ? '삭제 중...' : '삭제 확정'}</button>
        </div>
      </form>}
    </div>
  </div>;
}
