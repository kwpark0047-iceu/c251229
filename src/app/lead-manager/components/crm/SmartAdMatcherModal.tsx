'use client';

import React, { useMemo } from 'react';
import { X, Sparkles, TrendingUp, Users, Target, CheckCircle2, ArrowRight, Zap, Building2, MapPin } from 'lucide-react';
import { Lead, AdInventory } from '../../types';
import { calculateAdRoi, AdRoiAnalysis } from '@/lib/roi-calculator';
import { formatWon } from '../../utils';

interface SmartAdMatcherModalProps {
  lead: Lead;
  inventory: AdInventory[];
  onClose: () => void;
  onSelectForProposal?: (item: AdInventory) => void;
}

export default function SmartAdMatcherModal({
  lead,
  inventory,
  onClose,
  onSelectForProposal,
}: SmartAdMatcherModalProps) {
  const roiAnalyses: AdRoiAnalysis[] = useMemo(() => {
    return inventory
      .map(item => calculateAdRoi(lead, item))
      .sort((a, b) => b.roiScore - a.roiScore);
  }, [lead, inventory]);

  const topMatch = roiAnalyses[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-[var(--bg-secondary)] border border-[var(--glass-border)] shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)]/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-gradient-to-br from-[var(--metro-line2)] to-[var(--metro-line4)] shadow-[0_0_20px_rgba(60,181,74,0.3)]">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                AI 스마트 매체 매칭 &amp; ROI 예측 리포트
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                {lead.bizName} ({lead.nearestStation ? `${lead.nearestStation}역` : '역세권'}) 맞춤 매체 효과 시뮬레이션
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content Scroll Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Target Business Card Summary */}
          <div className="p-4 rounded-2xl bg-[var(--bg-tertiary)]/80 border border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-[var(--text-primary)] text-base">{lead.bizName}</h3>
                <p className="text-xs text-[var(--text-secondary)] flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-[var(--metro-line4)]" />
                  {lead.roadAddress || lead.lotAddress || '주소 정보 없음'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                <span className="text-[var(--text-muted)]">인근역: </span>
                <span className="font-bold text-[var(--metro-line2)]">{lead.nearestStation || '미지정'}</span>
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-subtle)]">
                <span className="text-[var(--text-muted)]">리드 등급: </span>
                <span className="font-bold text-amber-400">{lead.leadGrade || 'A'}등급 ({lead.leadScore || 85}점)</span>
              </div>
            </div>
          </div>

          {/* Top Recommendation Highlight Banner */}
          {topMatch && (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-[var(--metro-line2)]/15 via-blue-500/10 to-purple-500/10 border border-[var(--metro-line2)]/40 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-[var(--metro-line2)] text-white shadow-sm flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 fill-current" /> TOP 1 최고 추천 매체
                  </span>
                  <span className="text-xs font-bold text-[var(--text-primary)]">
                    {topMatch.stationName}역 {topMatch.locationCode} ({topMatch.adType})
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-[var(--text-muted)]">ROI 랭킹 점수 </span>
                  <span className="text-lg font-black text-[var(--metro-line2)]">{topMatch.roiScore}점</span>
                </div>
              </div>
              <p className="text-xs text-[var(--text-secondary)] mb-4">
                💡 <strong className="text-[var(--text-primary)]">추천 이유:</strong> {topMatch.recommendationReason}
              </p>

              {/* 4 Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-[var(--bg-secondary)]/90 border border-[var(--border-subtle)] text-center">
                  <p className="text-[10px] text-[var(--text-muted)] font-medium">월 예상 노출수</p>
                  <p className="text-sm font-bold text-blue-400 mt-1">
                    {(topMatch.monthlyImpressions / 10000).toFixed(0)}만 회
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-secondary)]/90 border border-[var(--border-subtle)] text-center">
                  <p className="text-[10px] text-[var(--text-muted)] font-medium">1천회 노출당 비용 (CPM)</p>
                  <p className="text-sm font-bold text-emerald-400 mt-1">{topMatch.cpm.toLocaleString()}원</p>
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-secondary)]/90 border border-[var(--border-subtle)] text-center">
                  <p className="text-[10px] text-[var(--text-muted)] font-medium">월 예상 신규 유입</p>
                  <p className="text-sm font-bold text-purple-400 mt-1">약 {topMatch.estimatedNewClients}명</p>
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-secondary)]/90 border border-[var(--border-subtle)] text-center">
                  <p className="text-[10px] text-[var(--text-muted)] font-medium">월 단가</p>
                  <p className="text-sm font-bold text-[var(--text-primary)] mt-1">{formatWon(topMatch.priceMonthly)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Matched Inventory List */}
          <div>
            <h4 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center justify-between">
              <span>인근 추천 매체 목록 ({roiAnalyses.length}개)</span>
              <span className="text-xs font-normal text-[var(--text-muted)]">ROI 점수 순 정렬</span>
            </h4>

            {roiAnalyses.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-[var(--bg-tertiary)]/50 border border-[var(--border-subtle)]">
                <p className="text-sm text-[var(--text-muted)]">해당 위치 반경 내 추천 가능한 매체가 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {roiAnalyses.map(analysis => {
                  const invItem = inventory.find(i => i.id === analysis.inventoryId);
                  return (
                    <div
                      key={analysis.inventoryId}
                      className="p-4 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] hover:border-[var(--metro-line2)]/50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-[var(--text-primary)]">
                            {analysis.stationName}역 {analysis.locationCode}
                          </span>
                          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            {analysis.adType}
                          </span>
                          <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-md ${
                            invItem?.availabilityStatus === 'AVAILABLE'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {invItem?.availabilityStatus === 'AVAILABLE' ? '즉시 가용' : `계약중 (${invItem?.availableFrom || '만료예정'})`}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {invItem?.description || '역세권 프리미엄 매체'}
                        </p>
                        <p className="text-[11px] text-emerald-400/90 font-medium">
                          ✨ {analysis.recommendationReason}
                        </p>
                      </div>

                      <div className="flex items-center gap-6 justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-[var(--border-subtle)]">
                        <div className="text-right">
                          <p className="text-xs font-bold text-[var(--text-primary)]">
                            {formatWon(analysis.priceMonthly)} <span className="text-[10px] text-[var(--text-muted)] font-normal">/ 월</span>
                          </p>
                          <p className="text-[11px] text-[var(--text-muted)]">
                            CPM: {analysis.cpm.toLocaleString()}원 | 월 {(analysis.monthlyImpressions / 10000).toFixed(0)}만회
                          </p>
                        </div>

                        {onSelectForProposal && invItem && (
                          <button
                            onClick={() => {
                              onSelectForProposal(invItem);
                              onClose();
                            }}
                            className="px-4 py-2 text-xs font-bold text-white rounded-xl bg-[var(--metro-line2)] hover:opacity-90 transition-opacity shadow-[0_4px_12px_rgba(60,181,74,0.3)] flex items-center gap-1.5 whitespace-nowrap"
                          >
                            제안서 적용 <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
