'use client';

/**
 * 리드 활동 타임라인
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  StickyNote,
  FileText,
  Send,
  Download,
  Phone,
  UserPlus,
  Settings,
  Activity,
  Clock,
} from 'lucide-react';
import { getLeadActivities, ActivityLog } from '../../activity-service';

interface ActivityTimelineProps {
  leadId: string;
}

const ACTION_META: Record<string, { label: string; icon: typeof Activity; color: string; bg: string }> = {
  LEAD_STATUS_UPDATE: { label: '상태 변경', icon: RefreshCw, color: 'text-blue-600', bg: 'bg-blue-100' },
  LEAD_NOTE_UPDATE: { label: '메모 수정', icon: StickyNote, color: 'text-amber-600', bg: 'bg-amber-100' },
  LEAD_IMPORT: { label: '리드 유입', icon: UserPlus, color: 'text-emerald-600', bg: 'bg-emerald-100' },
  CALL_LOG: { label: '통화 기록', icon: Phone, color: 'text-green-600', bg: 'bg-green-100' },
  PROPOSAL_CREATE: { label: '제안서 생성', icon: FileText, color: 'text-orange-600', bg: 'bg-orange-100' },
  PROPOSAL_SENT: { label: '제안서 발송', icon: Send, color: 'text-purple-600', bg: 'bg-purple-100' },
  PROPOSAL_DOWNLOAD: { label: '제안서 다운로드', icon: Download, color: 'text-cyan-600', bg: 'bg-cyan-100' },
  SETTINGS_UPDATE: { label: '설정 변경', icon: Settings, color: 'text-slate-600', bg: 'bg-slate-100' },
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function groupByDate(activities: ActivityLog[]): { date: string; items: ActivityLog[] }[] {
  const groups = new Map<string, ActivityLog[]>();
  for (const log of activities) {
    const date = new Date(log.created_at).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    if (!groups.has(date)) groups.set(date, []);
    groups.get(date)!.push(log);
  }
  return Array.from(groups.entries()).map(([date, items]) => ({ date, items }));
}

export default function ActivityTimeline({ leadId }: ActivityTimelineProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const logs = await getLeadActivities(leadId);
    setActivities(logs);
    setLoading(false);
  }, [leadId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-10 text-slate-500">
        <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>활동 기록이 없습니다.</p>
        <p className="text-sm mt-1">상태 변경, 통화, 메모 수정 등이 여기에 기록됩니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {groupByDate(activities).map(group => (
        <div key={group.date}>
          <p className="text-xs font-bold text-slate-400 mb-3">{group.date}</p>
          <div className="relative space-y-4 before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
            {group.items.map(log => {
              const meta = ACTION_META[log.action_type] || {
                label: log.action_type,
                icon: Activity,
                color: 'text-slate-600',
                bg: 'bg-slate-100',
              };
              const Icon = meta.icon;
              const message = (log.details as any)?.message || meta.label;

              return (
                <div key={log.id} className="flex items-start gap-3">
                  <div className={`shrink-0 w-8 h-8 rounded-full ${meta.bg} flex items-center justify-center z-10`}>
                    <Icon className={`w-4 h-4 ${meta.color}`} />
                  </div>
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-700">{meta.label}</span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 flex-shrink-0">
                        <Clock className="w-3 h-3" />
                        {formatTime(log.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 mt-0.5 break-words">{message}</p>
                    {log.user_email && (
                      <p className="text-[10px] text-slate-400 mt-0.5">{log.user_email}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
