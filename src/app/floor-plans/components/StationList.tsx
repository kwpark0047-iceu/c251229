'use client';

/**
 * 역 목록 사이드바 컴포넌트
 * 도면 유형별 역 목록 표시
 */

import React, { useState, useMemo } from 'react';
import { Search, MapPin, FileImage, ChevronDown, ChevronRight } from 'lucide-react';
import {
  FloorPlan,
  PlanType,
  PLAN_TYPE_LABELS,
  METRO_LINE_COLORS,
  MetroLine,
} from '../types';

interface StationListProps {
  plans: FloorPlan[];
  selectedPlanId: string | null;
  onSelectPlan: (plan: FloorPlan) => void;
  lineNumber: MetroLine;
}

export default function StationList({
  plans,
  selectedPlanId,
  onSelectPlan,
  lineNumber,
}: StationListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedTypes, setExpandedTypes] = useState<Record<PlanType, boolean>>({
    station_layout: true,
    psd: true,
  });

  const lineColor = METRO_LINE_COLORS[lineNumber];

  // 도면 유형별로 그룹화
  const groupedPlans = useMemo(() => {
    const filtered = plans.filter((plan) =>
      plan.stationName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return {
      station_layout: filtered.filter((p) => p.planType === 'station_layout'),
      psd: filtered.filter((p) => p.planType === 'psd'),
    };
  }, [plans, searchQuery]);

  const toggleType = (type: PlanType) => {
    setExpandedTypes((prev) => ({ ...prev, [type]: !prev[type] }));
  };

  return (
    <div className="h-full flex flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50">
      {/* 검색 */}
      <div className="p-4 border-b border-[var(--border-subtle)]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="역명 검색..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--glass-border)] transition-colors"
          />
        </div>
      </div>

      {/* 도면 목록 */}
      <div className="flex-1 overflow-y-auto">
        {(['station_layout', 'psd'] as PlanType[]).map((type) => {
          const typePlans = groupedPlans[type];
          const isExpanded = expandedTypes[type];

          return (
            <div key={type} className="border-b border-[var(--border-subtle)]">
              {/* 유형 헤더 */}
              <button
                onClick={() => toggleType(type)}
                className="w-full flex items-center justify-between px-4 py-3 bg-[var(--bg-tertiary)] hover:bg-[var(--bg-secondary)] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FileImage className="w-4 h-4" style={{ color: lineColor }} />
                  <span className="font-medium text-sm text-[var(--text-primary)]">
                    {PLAN_TYPE_LABELS[type]}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--bg-secondary)] text-[var(--text-muted)]">
                    {typePlans.length}
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                )}
              </button>

              {/* 역 목록 */}
              {isExpanded && (
                <div className="py-1">
                  {typePlans.length === 0 ? (
                    <div className="px-4 py-3 text-sm text-[var(--text-muted)] text-center">
                      도면이 없습니다
                    </div>
                  ) : (
                    typePlans.map((plan) => {
                      const isSelected = selectedPlanId === plan.id;
                      return (
                        <button
                          key={plan.id}
                          onClick={() => onSelectPlan(plan)}
                          className={`
                            w-full flex items-center gap-3 px-4 py-2.5
                            transition-all duration-200 text-left
                            ${isSelected
                              ? 'bg-[var(--bg-tertiary)] border-l-2'
                              : 'hover:bg-[var(--bg-tertiary)]/50 border-l-2 border-transparent'
                            }
                          `}
                          style={{
                            borderLeftColor: isSelected ? lineColor : undefined,
                          }}
                        >
                          <MapPin
                            className="w-4 h-4 flex-shrink-0"
                            style={{ color: isSelected ? lineColor : 'var(--text-muted)' }}
                          />
                          <span
                            className={`text-sm truncate ${isSelected ? 'font-medium' : ''}`}
                            style={{ color: isSelected ? lineColor : 'var(--text-primary)' }}
                          >
                            {plan.stationName}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 하단 통계 */}
      <div className="p-4 border-t border-[var(--border-subtle)] bg-[var(--bg-tertiary)]">
        <div className="text-xs text-[var(--text-muted)]">
          총 {plans.length}개 도면
        </div>
      </div>
    </div>
  );
}
