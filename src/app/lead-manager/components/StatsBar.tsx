'use client';

/**
 * 통계 바 컴포넌트
 * 상태별 리드 수 요약 표시
 */

import React from 'react';
import { TrendingUp, Users, Send, Phone, CheckCircle } from 'lucide-react';

import { Lead, LeadStatus, STATUS_COLORS, STATUS_LABELS } from '../types';

interface StatsBarProps {
  leads: Lead[];
}

export default function StatsBar({ leads }: StatsBarProps) {
  // 상태별 카운트 계산
  const stats = {
    total: leads.length,
    NEW: leads.filter(l => l.status === 'NEW').length,
    PROPOSAL_SENT: leads.filter(l => l.status === 'PROPOSAL_SENT').length,
    CONTACTED: leads.filter(l => l.status === 'CONTACTED').length,
    CONTRACTED: leads.filter(l => l.status === 'CONTRACTED').length,
  };

  // 전환율 계산
  const conversionRate = stats.total > 0
    ? Math.round((stats.CONTRACTED / stats.total) * 100)
    : 0;

  const statItems = [
    {
      label: '전체 리드',
      value: stats.total,
      icon: Users,
      color: 'bg-slate-100 text-slate-600',
    },
    {
      label: STATUS_LABELS.NEW,
      value: stats.NEW,
      icon: TrendingUp,
      color: 'bg-red-100 text-red-600',
    },
    {
      label: STATUS_LABELS.PROPOSAL_SENT,
      value: stats.PROPOSAL_SENT,
      icon: Send,
      color: 'bg-blue-100 text-blue-600',
    },
    {
      label: STATUS_LABELS.CONTACTED,
      value: stats.CONTACTED,
      icon: Phone,
      color: 'bg-orange-100 text-orange-600',
    },
    {
      label: STATUS_LABELS.CONTRACTED,
      value: stats.CONTRACTED,
      icon: CheckCircle,
      color: 'bg-green-100 text-green-600',
    },
  ];

  return (
    <div className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {statItems.map(item => (
            <div
              key={item.label}
              className="flex items-center gap-3 p-3 rounded-xl bg-slate-50"
            >
              <div className={`p-2 rounded-lg ${item.color}`}>
                <item.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-800">{item.value}</p>
                <p className="text-xs text-slate-500">{item.label}</p>
              </div>
            </div>
          ))}

          {/* 전환율 */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50">
            <div className="p-2 rounded-lg bg-indigo-100 text-indigo-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-indigo-600">{conversionRate}%</p>
              <p className="text-xs text-slate-500">전환율</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
