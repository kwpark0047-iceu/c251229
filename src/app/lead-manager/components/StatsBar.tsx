'use client';

/**
 * 통계 바 컴포넌트 - Neo-Seoul Transit Design
 * 상태별 리드 수 요약 표시
 */

import React from 'react';
import { TrendingUp, Users, Send, Phone, CheckCircle, Zap } from 'lucide-react';

import { Lead, STATUS_LABELS } from '../types';

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
      color: 'var(--metro-line9)',
      bgColor: 'rgba(135, 114, 85, 0.15)',
    },
    {
      label: STATUS_LABELS.NEW,
      value: stats.NEW,
      icon: Zap,
      color: 'var(--metro-line2)',
      bgColor: 'rgba(60, 181, 74, 0.15)',
    },
    {
      label: STATUS_LABELS.PROPOSAL_SENT,
      value: stats.PROPOSAL_SENT,
      icon: Send,
      color: 'var(--metro-line4)',
      bgColor: 'rgba(50, 164, 206, 0.15)',
    },
    {
      label: STATUS_LABELS.CONTACTED,
      value: stats.CONTACTED,
      icon: Phone,
      color: 'var(--metro-line5)',
      bgColor: 'rgba(153, 51, 153, 0.15)',
    },
    {
      label: STATUS_LABELS.CONTRACTED,
      value: stats.CONTRACTED,
      icon: CheckCircle,
      color: 'var(--metro-line3)',
      bgColor: 'rgba(239, 124, 61, 0.15)',
    },
  ];

  return (
    <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30 backdrop-blur-sm">
      <div className="max-w-[1600px] mx-auto px-6 py-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {statItems.map((item, index) => (
            <div
              key={item.label}
              className="group relative flex items-center gap-4 p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] hover:border-[var(--glass-border)] transition-all duration-300 overflow-hidden"
              style={{
                animationDelay: `${index * 50}ms`,
              }}
            >
              {/* 배경 글로우 효과 */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                style={{
                  background: `radial-gradient(circle at 30% 50%, ${item.bgColor} 0%, transparent 70%)`,
                }}
              />

              <div
                className="relative p-3 rounded-xl transition-transform duration-300 group-hover:scale-110"
                style={{
                  background: item.bgColor,
                }}
              >
                <item.icon
                  className="w-5 h-5"
                  style={{ color: item.color }}
                />
              </div>
              <div className="relative">
                <p
                  className="text-2xl font-bold tracking-tight"
                  style={{ color: item.color }}
                >
                  {item.value.toLocaleString()}
                </p>
                <p className="text-xs text-[var(--text-muted)] font-medium">{item.label}</p>
              </div>
            </div>
          ))}

          {/* 전환율 - 특별 카드 */}
          <div
            className="group relative flex items-center gap-4 p-4 rounded-xl border overflow-hidden transition-all duration-300"
            style={{
              background: 'linear-gradient(135deg, rgba(60, 181, 74, 0.1) 0%, rgba(50, 164, 206, 0.1) 100%)',
              borderColor: 'rgba(60, 181, 74, 0.3)',
            }}
          >
            {/* 애니메이션 배경 */}
            <div
              className="absolute inset-0 opacity-50"
              style={{
                background: `
                  linear-gradient(90deg,
                    transparent 0%,
                    rgba(60, 181, 74, 0.1) 50%,
                    transparent 100%
                  )
                `,
                animation: 'shimmer 3s infinite',
              }}
            />

            <div
              className="relative p-3 rounded-xl"
              style={{
                background: 'linear-gradient(135deg, var(--metro-line2) 0%, var(--metro-line4) 100%)',
                boxShadow: '0 4px 15px rgba(60, 181, 74, 0.3)',
              }}
            >
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div className="relative">
              <p
                className="text-2xl font-bold tracking-tight"
                style={{
                  background: 'linear-gradient(135deg, var(--metro-line2) 0%, var(--metro-line4) 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                {conversionRate}%
              </p>
              <p className="text-xs text-[var(--text-muted)] font-medium">전환율</p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
