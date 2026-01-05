'use client';

/**
 * 데이터 백업 버튼 컴포넌트
 * Neo-Seoul Transit Design
 */

import React, { useState, useRef } from 'react';
import { Download, Upload, Loader2, Database, CheckCircle, AlertCircle } from 'lucide-react';

interface BackupButtonProps {
  className?: string;
}

export default function BackupButton({ className = '' }: BackupButtonProps) {
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 백업 다운로드
  const handleBackup = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch('/api/backup');

      if (!response.ok) {
        throw new Error('백업 생성 실패');
      }

      // 파일 다운로드
      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition?.match(/filename="(.+)"/)?.[1] || 'backup.json';

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setMessage({ type: 'success', text: '백업이 완료되었습니다.' });
    } catch (error) {
      setMessage({ type: 'error', text: `백업 실패: ${(error as Error).message}` });
    } finally {
      setLoading(false);
    }
  };

  // 복원 파일 선택
  const handleRestoreClick = () => {
    fileInputRef.current?.click();
  };

  // 복원 실행
  const handleRestore = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setRestoring(true);
    setMessage(null);

    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      // 확인 대화상자
      const counts = backup.counts || {};
      const countStr = Object.entries(counts)
        .map(([table, count]) => `${table}: ${count}건`)
        .join(', ');

      if (!confirm(`다음 데이터를 복원하시겠습니까?\n\n${countStr}\n\n기존 데이터가 덮어쓰기될 수 있습니다.`)) {
        setRestoring(false);
        return;
      }

      const response = await fetch('/api/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: text,
      });

      const result = await response.json();

      if (result.success) {
        const resultStr = Object.entries(result.results || {})
          .map(([table, r]: [string, any]) => `${table}: ${r.success}건 성공, ${r.failed}건 실패`)
          .join('\n');
        setMessage({ type: 'success', text: `복원 완료\n${resultStr}` });
      } else {
        setMessage({ type: 'error', text: result.message });
      }
    } catch (error) {
      setMessage({ type: 'error', text: `복원 실패: ${(error as Error).message}` });
    } finally {
      setRestoring(false);
      // 파일 입력 초기화
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className={`relative ${className}`}>
      <div className="flex gap-2">
        {/* 백업 버튼 */}
        <button
          onClick={handleBackup}
          disabled={loading || restoring}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm text-white transition-all disabled:opacity-50"
          style={{
            background: 'var(--metro-line4)',
            boxShadow: '0 2px 10px rgba(50, 164, 206, 0.3)',
          }}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          백업
        </button>

        {/* 복원 버튼 */}
        <button
          onClick={handleRestoreClick}
          disabled={loading || restoring}
          className="flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm transition-all disabled:opacity-50"
          style={{
            background: 'var(--bg-secondary)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {restoring ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          복원
        </button>

        {/* 숨겨진 파일 입력 */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleRestore}
          className="hidden"
        />
      </div>

      {/* 메시지 표시 */}
      {message && (
        <div
          className={`absolute top-full mt-2 right-0 p-3 rounded-lg text-sm whitespace-pre-line z-10 ${
            message.type === 'success'
              ? 'bg-green-100 text-green-800 border border-green-300'
              : 'bg-red-100 text-red-800 border border-red-300'
          }`}
          style={{ minWidth: '200px', maxWidth: '300px' }}
        >
          <div className="flex items-start gap-2">
            {message.type === 'success' ? (
              <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="absolute top-1 right-1 p-1 hover:bg-black/10 rounded"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
}
