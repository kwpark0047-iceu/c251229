'use client';

/**
 * 콜백 알림 컴포넌트
 * 오늘 콜백 예정 리드를 표시
 */

import React, { useState, useEffect } from 'react';
import { Bell, X, Phone, Calendar, MapPin } from 'lucide-react';
import { getTodayCallbacks } from '../crm-service';
import { Lead, CallLog } from '../types';
import { formatPhoneNumber } from '../utils';

interface CallbackNotificationProps {
  onDismiss?: () => void;
  onLeadClick?: (leadId: string) => void;
}

export default function CallbackNotification({
  onDismiss,
  onLeadClick,
}: CallbackNotificationProps) {
  const [callbacks, setCallbacks] = useState<Array<{ callLog: CallLog; lead: Lead }>>([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    loadCallbacks();
  }, []);

  const loadCallbacks = async () => {
    setLoading(true);
    const data = await getTodayCallbacks();
    setCallbacks(data);
    setLoading(false);
  };

  if (dismissed || callbacks.length === 0) {
    return null;
  }

  return (
    <div
      className="fixed top-20 right-6 z-50 max-w-md animate-in slide-in-from-right duration-300"
      style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px)',
        border: '1px solid var(--glass-border)',
        borderRadius: '16px',
        boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
      }}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{
              background: 'linear-gradient(135deg, var(--metro-line3) 0%, var(--metro-line5) 100%)',
            }}
          >
            <Bell className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              오늘 콜백 예정
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              {callbacks.length}건의 콜백이 예정되어 있습니다
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            {isExpanded ? '접기' : '펼치기'}
          </button>
          <button
            onClick={() => {
              setDismissed(true);
              onDismiss?.();
            }}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 콜백 목록 */}
      {isExpanded && (
        <div className="max-h-96 overflow-y-auto">
          {callbacks.map(({ callLog, lead }) => (
            <div
              key={callLog.id}
              className="p-4 border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
              onClick={() => onLeadClick?.(lead.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-semibold text-[var(--text-primary)] mb-1 truncate">
                    {lead.bizName}
                  </h4>
                  {lead.nearestStation && (
                    <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-1">
                      <MapPin className="w-3 h-3" />
                      <span>{lead.nearestStation}역</span>
                    </div>
                  )}
                  {lead.phone && (
                    <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)] mb-1">
                      <Phone className="w-3 h-3" />
                      <span>{formatPhoneNumber(lead.phone)}</span>
                    </div>
                  )}
                  {callLog.nextAction && (
                    <p className="text-xs text-[var(--text-secondary)] mt-2 line-clamp-2">
                      {callLog.nextAction}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-[var(--metro-line3)]">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>오늘</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 요약 (접혀있을 때) */}
      {!isExpanded && (
        <div className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--text-secondary)]">
              {callbacks.length}건의 콜백이 예정되어 있습니다
            </span>
            <button
              onClick={() => setIsExpanded(true)}
              className="text-xs font-medium text-[var(--metro-line3)] hover:underline"
            >
              자세히 보기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
