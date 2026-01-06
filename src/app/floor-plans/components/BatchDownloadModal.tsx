'use client';

/**
 * 일괄 다운로드 모달 컴포넌트
 * 선택한 도면들을 ZIP으로 다운로드
 */

import React, { useState } from 'react';
import { X, Download, Archive, FileImage, Check, Loader2 } from 'lucide-react';
import { FloorPlan, METRO_LINE_COLORS, METRO_LINE_NAMES } from '../types';
import { downloadFloorPlansAsZip, downloadFloorPlanImage } from '../storage-service';

interface BatchDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  plans: FloorPlan[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export default function BatchDownloadModal({
  isOpen,
  onClose,
  plans,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onDeselectAll,
}: BatchDownloadModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, status: '' });
  const [downloadType, setDownloadType] = useState<'zip' | 'individual'>('zip');

  if (!isOpen) return null;

  const selectedPlans = plans.filter((p) => selectedIds.includes(p.id));
  const allSelected = selectedIds.length === plans.length && plans.length > 0;

  const handleDownload = async () => {
    if (selectedPlans.length === 0) return;

    setIsDownloading(true);

    try {
      if (downloadType === 'zip') {
        // ZIP 다운로드
        const images = selectedPlans.map((plan) => ({
          imageUrl: plan.imageUrl,
          fileName: `${plan.lineNumber}호선_${plan.stationName}_${plan.planType}.jpg`,
        }));

        const lineNumber = selectedPlans[0].lineNumber;
        const zipName = `${METRO_LINE_NAMES[lineNumber]}_도면_${selectedPlans.length}개.zip`;

        await downloadFloorPlansAsZip(images, zipName, (current, total, status) => {
          setProgress({ current, total, status });
        });
      } else {
        // 개별 다운로드
        for (let i = 0; i < selectedPlans.length; i++) {
          const plan = selectedPlans[i];
          setProgress({
            current: i + 1,
            total: selectedPlans.length,
            status: `다운로드 중: ${plan.stationName}`,
          });

          const fileName = `${plan.lineNumber}호선_${plan.stationName}_${plan.planType}.jpg`;
          await downloadFloorPlanImage(plan.imageUrl, fileName);

          // 브라우저 과부하 방지
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      onClose();
    } catch (error) {
      console.error('다운로드 오류:', error);
      alert('다운로드 중 오류가 발생했습니다.');
    } finally {
      setIsDownloading(false);
      setProgress({ current: 0, total: 0, status: '' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* 모달 */}
      <div className="relative w-full max-w-2xl max-h-[80vh] flex flex-col bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-subtle)] shadow-2xl overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[var(--metro-line2)]/10">
              <Archive className="w-5 h-5 text-[var(--metro-line2)]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                도면 다운로드
              </h2>
              <p className="text-sm text-[var(--text-muted)]">
                {selectedIds.length}개 선택됨
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
          >
            <X className="w-5 h-5 text-[var(--text-muted)]" />
          </button>
        </div>

        {/* 다운로드 옵션 */}
        <div className="px-6 py-4 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-[var(--text-primary)]">
              다운로드 형식:
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setDownloadType('zip')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  downloadType === 'zip'
                    ? 'border-[var(--metro-line2)] bg-[var(--metro-line2)]/10 text-[var(--metro-line2)]'
                    : 'border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--glass-border)]'
                }`}
              >
                <Archive className="w-4 h-4" />
                ZIP 파일
              </button>
              <button
                onClick={() => setDownloadType('individual')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                  downloadType === 'individual'
                    ? 'border-[var(--metro-line2)] bg-[var(--metro-line2)]/10 text-[var(--metro-line2)]'
                    : 'border-[var(--border-subtle)] text-[var(--text-muted)] hover:border-[var(--glass-border)]'
                }`}
              >
                <FileImage className="w-4 h-4" />
                개별 파일
              </button>
            </div>
          </div>
        </div>

        {/* 선택 도구 */}
        <div className="px-6 py-3 border-b border-[var(--border-subtle)] flex items-center gap-4">
          <button
            onClick={allSelected ? onDeselectAll : onSelectAll}
            className="text-sm text-[var(--metro-line2)] hover:underline"
          >
            {allSelected ? '선택 해제' : '전체 선택'}
          </button>
          <span className="text-sm text-[var(--text-muted)]">
            총 {plans.length}개 중 {selectedIds.length}개 선택
          </span>
        </div>

        {/* 도면 목록 */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {plans.map((plan) => {
              const isSelected = selectedIds.includes(plan.id);
              const lineColor = METRO_LINE_COLORS[plan.lineNumber];

              return (
                <button
                  key={plan.id}
                  onClick={() => onToggleSelect(plan.id)}
                  className={`
                    relative p-3 rounded-xl border transition-all text-left
                    ${isSelected
                      ? 'border-[var(--metro-line2)] bg-[var(--metro-line2)]/5'
                      : 'border-[var(--border-subtle)] hover:border-[var(--glass-border)]'
                    }
                  `}
                >
                  {/* 체크 표시 */}
                  <div
                    className={`
                      absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center
                      transition-colors
                      ${isSelected
                        ? 'bg-[var(--metro-line2)] text-white'
                        : 'border border-[var(--border-subtle)] bg-[var(--bg-tertiary)]'
                      }
                    `}
                  >
                    {isSelected && <Check className="w-3 h-3" />}
                  </div>

                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ background: lineColor }}
                    />
                    <span className="text-xs text-[var(--text-muted)]">
                      {plan.lineNumber}호선
                    </span>
                  </div>
                  <p className="font-medium text-sm text-[var(--text-primary)] truncate">
                    {plan.stationName}
                  </p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {plan.planType === 'psd' ? 'PSD도면' : '역구내도면'}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30">
          {isDownloading ? (
            <div className="flex items-center gap-4">
              <Loader2 className="w-5 h-5 text-[var(--metro-line2)] animate-spin" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-[var(--text-primary)]">
                    {progress.status}
                  </span>
                  <span className="text-sm text-[var(--text-muted)]">
                    {progress.current}/{progress.total}
                  </span>
                </div>
                <div className="h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[var(--metro-line2)] transition-all duration-300"
                    style={{
                      width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-[var(--border-subtle)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDownload}
                disabled={selectedIds.length === 0}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--metro-line2)] text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              >
                <Download className="w-4 h-4" />
                {selectedIds.length}개 다운로드
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
