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
const AreaChart = dynamic(() => import('recharts').then(mod => mod.AreaChart), { ssr: false });
const Area = dynamic(() => import('recharts').then(mod => mod.Area), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });
const Legend = dynamic(() => import('recharts').then(mod => mod.Legend), { ssr: false });

import { getExtendedCRMStats } from '../crm-service';
import { CATEGORY_LABELS } from '../types';

interface StatsDashboardProps {
  leads: Lead[];
  isExpanded?: boolean;
  onToggle?: () => void;
  onStatusFilter?: (status: LeadStatus | 'ALL') => void;
  currentStatusFilter?: LeadStatus | 'ALL';
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

// 커스텀 툴팁 컴포넌트
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div
        className="px-3 py-2 rounded-lg shadow-xl border backdrop-blur-md"
        style={{
          background: 'var(--glass-bg)',
          borderColor: 'var(--glass-border)',
        }}
      >
        <p className="text-xs font-bold text-[var(--text-primary)] mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }} />
            <p className="text-xs text-[var(--text-secondary)]">
              {entry.name}: <span className="font-bold text-[var(--text-primary)]">
                {typeof entry.value === 'number' && entry.name.includes('율')
                  ? `${entry.value.toFixed(1)}%`
                  : `${entry.value}${entry.name.includes('수') || entry.name.includes('리드') ? '건' : ''}`}
              </span>
            </p>
          </div>
        ))}
      </div>
    );
  }
  return null;
}

export default function StatsDashboard({ leads, isExpanded = false, onToggle, onStatusFilter, currentStatusFilter }: StatsDashboardProps) {
  const [activeChart, setActiveChart] = useState<'status' | 'trend' | 'line' | 'funnel' | 'category'>('status');
  const [extendedStats, setExtendedStats] = useState<any>(null);

  // 고도화된 통계 데이터 로드
  React.useEffect(() => {
    if (isExpanded) {
      getExtendedCRMStats().then(setExtendedStats);
    }
  }, [isExpanded, leads]);

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
      .slice(0, 8);
  }, [leads]);

  // 주요 지표 계산
  const metrics = useMemo(() => {
    const totalLeads = leads.length;
    const contracted = leads.filter(l => l.status === 'CONTRACTED').length;

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

    return {
      total: totalLeads,
      contracted,
      viewRate: extendedStats?.totalMetrics?.proposalViewRate || 0,
      closingRate: extendedStats?.totalMetrics?.closingRate || 0,
      thisWeekLeads,
      weeklyChange
    };
  }, [leads, extendedStats]);

  if (!isExpanded) {
    return (
      <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30 backdrop-blur-sm">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <button onClick={onToggle} className="w-full flex items-center justify-between group">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[var(--metro-line2)]/10">
                  <Users className="w-4 h-4 text-[var(--metro-line2)]" />
                </div>
                <div>
                  <p className="text-lg font-bold text-[var(--text-primary)] leading-none mb-1">{metrics.total}</p>
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Total Leads</p>
                </div>
              </div>
              <div className="w-px h-6 bg-[var(--border-subtle)]" />
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[var(--metro-line4)]/10">
                  <TrendingUp className="w-4 h-4 text-[var(--metro-line4)]" />
                </div>
                <div>
                  <p className="text-lg font-bold text-[var(--text-primary)] leading-none mb-1">{metrics.viewRate.toFixed(1)}%</p>
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">View Rate</p>
                </div>
              </div>
              <div className="w-px h-6 bg-[var(--border-subtle)]" />
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[var(--metro-line3)]/10">
                  <Target className="w-4 h-4 text-[var(--metro-line3)]" />
                </div>
                <div>
                  <p className="text-lg font-bold text-[var(--text-primary)] leading-none mb-1">{metrics.closingRate.toFixed(1)}%</p>
                  <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Closing Rate</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors">
              <span className="text-xs font-medium">상세 대시보드</span>
              <ChevronDown className="w-4 h-4" />
            </div>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30 backdrop-blur-sm">
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[var(--metro-line2)] to-[var(--metro-line4)] flex items-center justify-center shadow-lg shadow-[var(--metro-line4)]/20">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">영업 성과 분석 리포트</h2>
              <p className="text-xs text-[var(--text-muted)]">Real-time Sales Performance & Lead Analytics</p>
            </div>
          </div>
          <button onClick={onToggle} title="대시보드 접기" className="p-2 rounded-xl bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all">
            <ChevronUp className="w-5 h-5" />
          </button>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <MetricCard
            icon={Users}
            label="전체 리드 수"
            value={metrics.total}
            color="var(--metro-line2)"
            onClick={() => onStatusFilter?.('ALL')}
            isActive={currentStatusFilter === 'ALL'}
          />
          <MetricCard
            icon={PieChartIcon}
            label="제안서 열람률"
            value={`${metrics.viewRate.toFixed(1)}%`}
            color="var(--metro-line4)"
          />
          <MetricCard
            icon={Target}
            label="계약 전환율"
            value={`${metrics.closingRate.toFixed(1)}%`}
            color="var(--metro-line3)"
            onClick={() => onStatusFilter?.('CONTRACTED')}
            isActive={currentStatusFilter === 'CONTRACTED'}
          />
          <MetricCard icon={Calendar} label="이번 주 신규" value={metrics.thisWeekLeads} change={metrics.weeklyChange} color="var(--metro-line5)" />
        </div>

        {/* Chart Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Tabs & Charts */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center p-1 bg-[var(--bg-tertiary)] rounded-xl w-fit">
              {[
                { id: 'status', label: '상태 분포', icon: PieChartIcon },
                { id: 'funnel', label: '전환 퍼널', icon: Target },
                { id: 'category', label: '업종 성과', icon: Users },
                { id: 'trend', label: '성과 트렌드', icon: TrendingUp },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveChart(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeChart === tab.id ? 'bg-[var(--bg-primary)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                    }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-6 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] h-[320px]">
              <ResponsiveContainer width="100%" height="100%">
                {activeChart === 'status' ? (
                  <PieChart>
                    <Pie
                      data={statusStats}
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusStats.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.color}
                          stroke="none"
                          className="cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => onStatusFilter?.(entry.status)}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                  </PieChart>
                ) : activeChart === 'funnel' ? (
                  <BarChart data={extendedStats?.funnelData || []} layout="vertical" margin={{ left: 20 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="stage" type="category" axisLine={false} tickLine={false} fontSize={12} width={80} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="리드 수" radius={[0, 4, 4, 0]} barSize={30}>
                      {(extendedStats?.funnelData || []).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.8} />
                      ))}
                    </Bar>
                  </BarChart>
                ) : activeChart === 'category' ? (
                  <BarChart data={extendedStats?.categoryPerformance || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                    <XAxis dataKey="category" tickFormatter={(v) => (CATEGORY_LABELS as any)[v] || v} fontSize={10} />
                    <YAxis fontSize={10} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="leads" name="리드 수" fill="var(--metro-line2)" radius={[4, 4, 0, 0]} barSize={40} />
                    <Bar dataKey="conversionRate" name="전환율(%)" fill="var(--metro-line3)" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                ) : (
                  <AreaChart data={extendedStats?.weeklyTrends || []}>
                    <defs>
                      <linearGradient id="colorView" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--metro-line4)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="var(--metro-line4)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                    <XAxis dataKey="date" fontSize={10} />
                    <YAxis fontSize={10} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend fontSize={10} />
                    <Area type="monotone" dataKey="viewRate" name="열람률(%)" stroke="var(--metro-line4)" fillOpacity={1} fill="url(#colorView)" />
                    <Area type="monotone" dataKey="conversionRate" name="전환율(%)" stroke="var(--metro-line3)" fill="transparent" />
                  </AreaChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          {/* Right: Line Stats & Summary */}
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Train className="w-4 h-4 text-[var(--metro-line4)]" />
              주요 노선별 리드 분포
            </h3>
            <div className="space-y-3">
              {lineStats.map((line) => (
                <div key={line.line} className="space-y-1">
                  <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider">
                    <span className="text-[var(--text-secondary)]">{line.name}</span>
                    <span className="text-[var(--text-primary)]">{line.count}건</span>
                  </div>
                  <div className="h-1.5 w-full bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                    <div
                      className="h-full transition-all duration-1000"
                      style={{
                        width: `${(line.count / metrics.total) * 100}%`,
                        backgroundColor: line.color
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 p-4 rounded-xl bg-gradient-to-br from-[var(--metro-line2)]/10 to-[var(--metro-line4)]/10 border border-[var(--metro-line4)]/20">
              <p className="text-[11px] font-medium text-[var(--text-secondary)] leading-relaxed">
                현재 전반적인 제안서 <span className="text-[var(--metro-line4)] font-extrabold text-sm mx-1">열람률은 {metrics.viewRate.toFixed(1)}%</span>로
                양호한 수준을 유지하고 있습니다. {metrics.closingRate > 10 ? '계약 전환율이 상승세에 있어 긍정적인 성과가 기대됩니다.' : '전환율 향상을 위한 후속 팔로업이 필요해 보입니다.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  icon: Icon, label, value, color, change, onClick, isActive
}: {
  icon: any, label: string, value: any, color: string, change?: number, onClick?: () => void, isActive?: boolean
}) {
  const isClickable = !!onClick;

  return (
    <button
      onClick={onClick}
      disabled={!isClickable}
      className={`p-5 rounded-2xl bg-[var(--bg-tertiary)] border transition-all text-left w-full
        ${isClickable ? 'cursor-pointer hover:border-[var(--text-muted)] hover:translate-y-[-4px]' : 'cursor-default'}
        ${isActive ? 'border-[var(--metro-line4)] shadow-lg ring-1 ring-[var(--metro-line4)]/30' : 'border-[var(--border-subtle)]'}
      `}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="p-2.5 rounded-xl" style={{ backgroundColor: `${color}15` }}>
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        {change !== undefined && (
          <div className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 ${change >= 0 ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
            {change >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {Math.abs(change).toFixed(0)}%
          </div>
        )}
      </div>
      <div>
        <p className="text-2xl font-black text-[var(--text-primary)] tracking-tight mb-1">{value}</p>
        <p className="text-xs font-medium text-[var(--text-muted)]">{label}</p>
      </div>
    </button>
  );
}
