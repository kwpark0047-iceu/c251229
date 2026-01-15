'use client';

/**
 * 영업 진행 체크리스트 컴포넌트
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Check } from 'lucide-react';
import {
  ProgressStep,
  PROGRESS_STEP_LABELS,
  PROGRESS_STEPS,
  SalesProgress,
} from '../../types';
import { getProgress, updateProgress, removeProgress } from '../../crm-service';

interface ProgressChecklistProps {
  leadId: string;
  compact?: boolean;
  onUpdate?: () => void;
}

export default function ProgressChecklist({
  leadId,
  compact = false,
  onUpdate,
}: ProgressChecklistProps) {
  const [progress, setProgress] = useState<SalesProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<ProgressStep | null>(null);

  const loadProgress = useCallback(async () => {
    setLoading(true);
    const data = await getProgress(leadId);
    setProgress(data);
    setLoading(false);
  }, [leadId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadProgress();
  }, [loadProgress]);

  const isCompleted = (step: ProgressStep): boolean => {
    return progress.some(p => p.step === step && p.completedAt);
  };

  const getCompletedDate = (step: ProgressStep): string | null => {
    const found = progress.find(p => p.step === step);
    if (found?.completedAt) {
      return new Date(found.completedAt).toLocaleDateString('ko-KR');
    }
    return null;
  };

  const toggleStep = async (step: ProgressStep) => {
    setUpdating(step);

    if (isCompleted(step)) {
      await removeProgress(leadId, step);
    } else {
      await updateProgress(leadId, step);
    }

    await loadProgress();
    setUpdating(null);
    onUpdate?.();
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-slate-200 rounded w-24"></div>
      </div>
    );
  }

  // 컴팩트 모드: 진행률 바만 표시
  if (compact) {
    const completedCount = PROGRESS_STEPS.filter(s => isCompleted(s)).length;
    const percentage = (completedCount / PROGRESS_STEPS.length) * 100;

    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-xs text-slate-500">
          {completedCount}/{PROGRESS_STEPS.length}
        </span>
      </div>
    );
  }

  // 전체 모드: 체크리스트 표시
  return (
    <div className="space-y-2">
      {PROGRESS_STEPS.map((step, index) => {
        const completed = isCompleted(step);
        const date = getCompletedDate(step);
        const isUpdating = updating === step;

        return (
          <button
            key={step}
            onClick={() => toggleStep(step)}
            disabled={isUpdating}
            className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
              completed
                ? 'bg-green-50 border-green-200'
                : 'bg-white border-slate-200 hover:bg-slate-50'
            } ${isUpdating ? 'opacity-50' : ''}`}
          >
            {/* 체크 아이콘 */}
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                completed
                  ? 'bg-green-500 text-white'
                  : 'bg-slate-200 text-slate-400'
              }`}
            >
              {completed ? (
                <Check className="w-4 h-4" />
              ) : (
                <span className="text-xs font-medium">{index + 1}</span>
              )}
            </div>

            {/* 라벨 */}
            <div className="flex-1 text-left">
              <span
                className={`text-sm font-medium ${
                  completed ? 'text-green-700' : 'text-slate-700'
                }`}
              >
                {PROGRESS_STEP_LABELS[step]}
              </span>
              {date && (
                <span className="ml-2 text-xs text-green-600">
                  {date}
                </span>
              )}
            </div>

            {/* 상태 아이콘 */}
            {completed && (
              <Check className="w-5 h-5 text-green-500 flex-shrink-0" />
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * 인라인 진행 상태 표시 (카드용)
 * progress props가 제공되면 API 호출 없이 사용
 */
export function ProgressDots({
  leadId,
  progress: progressProp
}: {
  leadId: string;
  progress?: SalesProgress[];
}) {
  const [localProgress, setLocalProgress] = useState<SalesProgress[]>([]);

  // progress가 props로 제공되지 않은 경우에만 API 호출
  useEffect(() => {
    if (!progressProp) {
      getProgress(leadId).then(setLocalProgress);
    }
  }, [leadId, progressProp]);

  const progress = progressProp ?? localProgress;

  const isCompleted = (step: ProgressStep): boolean => {
    return progress.some(p => p.step === step && p.completedAt);
  };

  return (
    <div className="flex items-center gap-1">
      {PROGRESS_STEPS.map((step) => (
        <div
          key={step}
          className={`w-2 h-2 rounded-full ${
            isCompleted(step) ? 'bg-green-500' : 'bg-slate-300'
          }`}
          title={PROGRESS_STEP_LABELS[step]}
        />
      ))}
    </div>
  );
}
