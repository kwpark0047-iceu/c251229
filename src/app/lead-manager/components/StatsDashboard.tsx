'use client';

/**
 * 통계 대시보드 컴포넌트
 * 차트를 통한 리드 데이터 시각화
 */

import React, { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  BarChart3,
  PieChart as PieChartIcon,
  Calendar,
  Train,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

import { Lead, LeadStatus, STATUS_LABELS } from '../types';

// Recharts 동적 임포트 (SSR 방지)
const PieChart = dynamic(() => import('recharts').then(mod => mod.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then(mod => mod.Pie), { ssr: false });
const Cell = dynamic(() => import('recharts').then(mod => mod.Cell), { ssr: false });
const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then(mod => mod.Bar), { ssr: false });
const LineChart = dynamic(() => import('recharts').then(mod => mod.LineChart), { ssr: false });
const Line = dynamic(() => import('recharts').then(mod => mod.Line), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });
const Legend = dynamic(() => import('recharts').then(mod => mod.Legend), { ssr: false });

interface StatsDashboardProps {
  leads: Lead[];
  isExpanded?: boolean;
  onToggle?: () => void;
}

// 상태별 색상
const STATUS_CHART_COLORS: Record<LeadStatus, string> = {
  NEW: '#3CB54A',
  PROPOSAL_SENT: '#32A4CE',
  CONTACTED: '#993399',
  CONTRACTED: '#EF7C3D',
};

// 메트로 라인 색상 (차트용)
const METRO_CHART_COLORS: Record<string, string> = {
  '1': '#0052A4',
  '2': '#3CB54A',
  '3': '#EF7C1C',
  '4': '#32A4CE',
  '5': '#993399',
  '6': '#CD7C2F',
  '7': '#747F00',
  '8': '#E6186C',
  '9': '#877255',
  'S': '#A71E31',
  'K': '#77C4A3',
  'B': '#F5A200',
};

// 커스텀 툴팁 컴포넌트 (컴포넌트 외부에 정의하여 렌더링 시 재생성 방지)
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) {
  if (active && payload && payload.length) {
    return (
      <div
        className="px-3 py-2 rounded-lg shadow-lg border"
        style={{
          background: 'var(--bg-secondary)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <p className="text-sm font-medium text-[var(--text-primary)]">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {entry.value}건
          </p>
        ))}
      </div>
    );
  }
  return null;
}

export default function StatsDashboard({ leads, isExpanded = false, onToggle }: StatsDashboardProps) {
  const [activeChart, setActiveChart] = useState<'status' | 'trend' | 'line' | 'funnel'>('status');

  // 상태별 통계
  const statusStats = useMemo(() => {
    const stats = {
      NEW: leads.filter(l => l.status === 'NEW').length,
      PROPOSAL_SENT: leads.filter(l => l.status === 'PROPOSAL_SENT').length,
      CONTACTED: leads.filter(l => l.status === 'CONTACTED').length,
      CONTRACTED: leads.filter(l => l.status === 'CONTRACTED').length,
    };
    return Object.entries(stats).map(([status, count]) => ({
      name: STATUS_LABELS[status as LeadStatus],
      value: count,
      status: status as LeadStatus,
      color: STATUS_CHART_COLORS[status as LeadStatus],
    }));
  }, [leads]);

  // 주간 트렌드 데이터 (최근 8주)
  const weeklyTrend = useMemo(() => {
    const weeks: { week: string; total: number; NEW: number; CONTRACTED: number }[] = [];
    const now = new Date();

    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (i * 7) - now.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      const weekLeads = leads.filter(lead => {
        const createdAt = new Date(lead.createdAt || '');
        return createdAt >= weekStart && createdAt <= weekEnd;
      });

      weeks.push({
        week: `${weekStart.getMonth() + 1}/${weekStart.getDate()}`,
        total: weekLeads.length,
        NEW: weekLeads.filter(l => l.status === 'NEW').length,
        CONTRACTED: weekLeads.filter(l => l.status === 'CONTRACTED').length,
      });
    }

    return weeks;
  }, [leads]);

  // 노선별 통계
  const lineStats = useMemo(() => {
    const lineCount: Record<string, number> = {};

    leads.forEach(lead => {
      if (lead.stationLines && lead.stationLines.length > 0) {
        lead.stationLines.forEach(line => {
          lineCount[line] = (lineCount[line] || 0) + 1;
        });
      }
    });

    return Object.entries(lineCount)
      .map(([line, count]) => ({
        name: `${line}호선`,
        line,
        count,
        color: METRO_CHART_COLORS[line] || '#888',
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [leads]);

  // 전환 퍼널 데이터
  const funnelData = useMemo(() => {
    const total = leads.length;
    const proposalSent = leads.filter(l =>
      l.status === 'PROPOSAL_SENT' || l.status === 'CONTACTED' || l.status === 'CONTRACTED'
    ).length;
    const contacted = leads.filter(l =>
      l.status === 'CONTACTED' || l.status === 'CONTRACTED'
    ).length;
    const contracted = leads.filter(l => l.status === 'CONTRACTED').length;

    return [
      { stage: '전체 리드', count: total, rate: 100, color: '#3CB54A' },
      { stage: '제안 발송', count: proposalSent, rate: total > 0 ? Math.round((proposalSent / total) * 100) : 0, color: '#32A4CE' },
      { stage: '컨택 완료', count: contacted, rate: total > 0 ? Math.round((contacted / total) * 100) : 0, color: '#993399' },
      { stage: '계약 성사', count: contracted, rate: total > 0 ? Math.round((contracted / total) * 100) : 0, color: '#EF7C3D' },
    ];
  }, [leads]);

  // 주요 지표 계산
  const metrics = useMemo(() => {
    const total = leads.length;
    const contracted = leads.filter(l => l.status === 'CONTRACTED').length;
    const conversionRate = total > 0 ? (contracted / total) * 100 : 0;

    // 이번 주 신규 리드
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const thisWeekLeads = leads.filter(lead => {
      const createdAt = new Date(lead.createdAt || '');
      return createdAt >= weekStart;
    }).length;

    // 지난주 대비 증감
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(weekStart.getDate() - 7);
    const lastWeekLeads = leads.filter(lead => {
      const createdAt = new Date(lead.createdAt || '');
      return createdAt >= lastWeekStart && createdAt < weekStart;
    }).length;

    const weeklyChange = lastWeekLeads > 0
      ? ((thisWeekLeads - lastWeekLeads) / lastWeekLeads) * 100
      : thisWeekLeads > 0 ? 100 : 0;

    return { total, contracted, conversionRate, thisWeekLeads, weeklyChange };
  }, [leads]);

  if (!isExpanded) {
    // 축소된 상태 - 요약 카드만 표시
    return (
      <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30 backdrop-blur-sm">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <button
            onClick={onToggle}
            className="w-full flex items-center justify-between group"
          >
            <div className="flex items-center gap-6">
              {/* 주요 지표 미니 카드들 */}
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ background: 'rgba(60, 181, 74, 0.15)' }}>
                  <Users className="w-4 h-4" style={{ color: 'var(--metro-line2)' }} />
                </div>
                <div>
                  <p className="text-lg font-bold text-[var(--text-primary)]">{metrics.total}</p>
                  <p className="text-xs text-[var(--text-muted)]">전체 리드</p>
                </div>
              </div>

              <div className="w-px h-8 bg-[var(--border-subtle)]" />

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ background: 'rgba(239, 124, 61, 0.15)' }}>
                  <Target className="w-4 h-4" style={{ color: 'var(--metro-line3)' }} />
                </div>
                <div>
                  <p className="text-lg font-bold text-[var(--text-primary)]">{metrics.conversionRate.toFixed(1)}%</p>
                  <p className="text-xs text-[var(--text-muted)]">전환율</p>
                </div>
              </div>

              <div className="w-px h-8 bg-[var(--border-subtle)]" />

              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ background: 'rgba(50, 164, 206, 0.15)' }}>
                  <Calendar className="w-4 h-4" style={{ color: 'var(--metro-line4)' }} />
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-lg font-bold text-[var(--text-primary)]">{metrics.thisWeekLeads}</p>
                  {metrics.weeklyChange !== 0 && (
                    <span
                      className="flex items-center text-xs font-medium px-1.5 py-0.5 rounded"
                      style={{
                        background: metrics.weeklyChange > 0 ? 'rgba(60, 181, 74, 0.15)' : 'rgba(230, 24, 108, 0.15)',
                        color: metrics.weeklyChange > 0 ? 'var(--metro-line2)' : '#E6186C',
                      }}
                    >
                      {metrics.weeklyChange > 0 ? <TrendingUp className="w-3 h-3 mr-0.5" /> : <TrendingDown className="w-3 h-3 mr-0.5" />}
                      {Math.abs(metrics.weeklyChange).toFixed(0)}%
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--text-muted)]">이번 주</p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors">
              <BarChart3 className="w-4 h-4" />
              <span className="text-sm">상세 통계 보기</span>
              <ChevronDown className="w-4 h-4" />
            </div>
          </button>
        </div>
      </div>
    );
  }

  // 확장된 상태 - 전체 대시보드
  return (
    <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30 backdrop-blur-sm">
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div
              className="p-2 rounded-lg"
              style={{
                background: 'linear-gradient(135deg, var(--metro-line2) 0%, var(--metro-line4) 100%)',
              }}
            >
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">영업 통계 대시보드</h2>
              <p className="text-xs text-[var(--text-muted)]">실시간 리드 데이터 분석</p>
            </div>
          </div>

          <button
            onClick={onToggle}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-all"
          >
            <span className="text-sm">접기</span>
            <ChevronUp className="w-4 h-4" />
          </button>
        </div>

        {/* 주요 지표 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <MetricCard
            icon={Users}
            label="전체 리드"
            value={metrics.total}
            color="var(--metro-line2)"
            bgColor="rgba(60, 181, 74, 0.15)"
          />
          <MetricCard
            icon={Target}
            label="계약 성사"
            value={metrics.contracted}
            color="var(--metro-line3)"
            bgColor="rgba(239, 124, 61, 0.15)"
          />
          <MetricCard
            icon={TrendingUp}
            label="전환율"
            value={`${metrics.conversionRate.toFixed(1)}%`}
            color="var(--metro-line4)"
            bgColor="rgba(50, 164, 206, 0.15)"
          />
          <MetricCard
            icon={Calendar}
            label="이번 주 신규"
            value={metrics.thisWeekLeads}
            change={metrics.weeklyChange}
            color="var(--metro-line5)"
            bgColor="rgba(153, 51, 153, 0.15)"
          />
        </div>

        {/* 차트 탭 */}
        <div className="flex items-center gap-2 mb-4">
          {[
            { id: 'status', label: '상태 분포', icon: PieChartIcon },
            { id: 'trend', label: '주간 트렌드', icon: TrendingUp },
            { id: 'line', label: '노선별 현황', icon: Train },
            { id: 'funnel', label: '전환 퍼널', icon: Target },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveChart(tab.id as typeof activeChart)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeChart === tab.id
                  ? 'bg-[var(--metro-line4)] text-white shadow-lg'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
              }`}
              style={{
                boxShadow: activeChart === tab.id ? '0 4px 15px rgba(50, 164, 206, 0.3)' : 'none',
              }}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* 차트 영역 */}
        <div
          className="p-6 rounded-xl border"
          style={{
            background: 'var(--bg-tertiary)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          {activeChart === 'status' && (
            <div className="flex items-center gap-8">
              <div className="flex-1" style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusStats}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={4}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {statusStats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                {statusStats.map((stat) => (
                  <div key={stat.status} className="flex items-center gap-3">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: stat.color }}
                    />
                    <span className="text-sm text-[var(--text-secondary)] w-24">{stat.name}</span>
                    <span className="text-lg font-bold" style={{ color: stat.color }}>
                      {stat.value}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                      ({leads.length > 0 ? ((stat.value / leads.length) * 100).toFixed(1) : 0}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeChart === 'trend' && (
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="week" stroke="var(--text-muted)" fontSize={12} />
                  <YAxis stroke="var(--text-muted)" fontSize={12} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="total"
                    name="전체"
                    stroke="#32A4CE"
                    strokeWidth={2}
                    dot={{ fill: '#32A4CE', strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="NEW"
                    name="신규"
                    stroke="#3CB54A"
                    strokeWidth={2}
                    dot={{ fill: '#3CB54A', strokeWidth: 2 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="CONTRACTED"
                    name="계약"
                    stroke="#EF7C3D"
                    strokeWidth={2}
                    dot={{ fill: '#EF7C3D', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {activeChart === 'line' && (
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lineStats} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis type="number" stroke="var(--text-muted)" fontSize={12} />
                  <YAxis dataKey="name" type="category" stroke="var(--text-muted)" fontSize={12} width={60} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="리드 수" radius={[0, 4, 4, 0]}>
                    {lineStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {activeChart === 'funnel' && (
            <div className="flex flex-col gap-3" style={{ height: 280 }}>
              {funnelData.map((stage) => (
                <div key={stage.stage} className="flex items-center gap-4">
                  <div className="w-24 text-sm text-[var(--text-secondary)]">{stage.stage}</div>
                  <div className="flex-1 relative h-10">
                    <div
                      className="absolute inset-y-0 left-0 rounded-lg transition-all duration-500"
                      style={{
                        width: `${stage.rate}%`,
                        backgroundColor: stage.color,
                        opacity: 0.8,
                      }}
                    />
                    <div
                      className="absolute inset-y-0 left-0 right-0 rounded-lg"
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        zIndex: -1,
                      }}
                    />
                  </div>
                  <div className="w-20 text-right">
                    <span className="text-lg font-bold" style={{ color: stage.color }}>
                      {stage.count}
                    </span>
                    <span className="text-xs text-[var(--text-muted)] ml-1">({stage.rate}%)</span>
                  </div>
                </div>
              ))}
              <div className="mt-4 pt-4 border-t border-[var(--border-subtle)]">
                <p className="text-sm text-[var(--text-muted)]">
                  전체 리드 중 <span className="font-bold text-[var(--metro-line3)]">{funnelData[3].rate}%</span>가
                  계약으로 전환되었습니다.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// 지표 카드 컴포넌트
function MetricCard({
  icon: Icon,
  label,
  value,
  change,
  color,
  bgColor,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  change?: number;
  color: string;
  bgColor: string;
}) {
  return (
    <div
      className="p-4 rounded-xl border"
      style={{
        background: 'var(--bg-tertiary)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="p-2 rounded-lg" style={{ background: bgColor }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        {change !== undefined && change !== 0 && (
          <span
            className="flex items-center text-xs font-medium px-2 py-1 rounded-full"
            style={{
              background: change > 0 ? 'rgba(60, 181, 74, 0.15)' : 'rgba(230, 24, 108, 0.15)',
              color: change > 0 ? 'var(--metro-line2)' : '#E6186C',
            }}
          >
            {change > 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
            {Math.abs(change).toFixed(0)}%
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
      <p className="text-sm text-[var(--text-muted)]">{label}</p>
    </div>
  );
}
