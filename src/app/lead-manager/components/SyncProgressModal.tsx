import React from 'react';

type SyncProgressModalProps = {
  current: number;
  total: number;
  status?: string;
  onClose: () => void;
};

export default function SyncProgressModal({ current, total, status, onClose }: SyncProgressModalProps) {
  const progressPercent = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
      <div className="bg-[var(--bg-secondary)] rounded-xl shadow-lg p-6 w-96 animate-float">
        <h2 className="text-lg font-semibold mb-4 text-[var(--text-primary)]">데이터 동기화 진행 중</h2>
        {status && <p className="text-sm mb-2 text-[var(--text-muted)]">{status}</p>}
        <div className="w-full bg-[var(--bg-tertiary)] rounded-full h-3 mb-4 overflow-hidden">
          <div
            className="bg-[var(--metro-line2)] h-3 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
        <p className="text-sm text-[var(--text-muted)] mb-4">{current} / {total}</p>
        <button
          onClick={onClose}
          className="w-full py-2 bg-[var(--metro-line2)] text-white rounded hover:bg-[var(--metro-line2)]/90 transition"
        >
          닫기
        </button>
      </div>
    </div>
  );
}
