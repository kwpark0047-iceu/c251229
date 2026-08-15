'use client';

/**
 * 그리드 뷰 컴포넌트 - Neo-Seoul Transit Design (최적화 버전)
 * 병원 리드를 카드 형태로 표시
 */

import React, { useState, useMemo } from 'react';
import {
  Phone,
  FileText,
  MapPin,
  Train,
  Calendar,
  ChevronDown,
  User,
  Trash2,
} from 'lucide-react';

import { Lead, LeadStatus, STATUS_LABELS, STATUS_METRO_COLORS, LINE_COLORS, SalesProgress } from '../types';
import { formatDistance, truncateString, getHighlightParts, findNearestStation } from '../utils';
import CallLogModal from './crm/CallLogModal';
import LeadDetailPanel from './crm/LeadDetailPanel';
import { ProgressDots } from './crm/ProgressChecklist';
import { getCardClass } from '../utils/design-tokens';

interface GridViewProps {
  leads: Lead[];
  onStatusChange: (leadId: string, newStatus: LeadStatus) => Promise<void>;
  searchQuery: string;
  onMapView: (lead: Lead) => void;
  onSopoClick?: (lead: Lead) => void;
  salesProgressMap?: Map<string, SalesProgress[]>;
  isFieldMode?: boolean;
  currentPage: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onRefresh?: () => void;
  onDeleteLead?: (leadId: string) => void;
  sortByScore?: boolean;
}

export default function GridView({
  leads,
  onStatusChange,
  searchQuery = '',
  onMapView,
  salesProgressMap,
  isFieldMode = false,
  currentPage,
  totalCount,
  pageSize,
  onPageChange,
  onRefresh,
  onDeleteLead,
  sortByScore = false,
  onSopoClick,
}: GridViewProps) {
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const sortedLeads = useMemo(() => {
    if (sortByScore) {
      return leads.slice().sort((a, b) => (b.leadScore ?? -1) - (a.leadScore ?? -1));
    }
    return leads.slice().sort((a, b) => {
      const dateA = a.licenseDate ? new Date(a.licenseDate).getTime() : 0;
      const dateB = b.licenseDate ? new Date(b.licenseDate).getTime() : 0;
      return dateB - dateA;
    });
  }, [leads, sortByScore]);

  return (
    <>
      <div className={`grid gap-4 ${isFieldMode ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'}`}>
        {sortedLeads.map((lead, index) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            index={index}
            onStatusChange={onStatusChange}
            onSelect={() => setSelectedLeadId(lead.id)}
            searchQuery={searchQuery}
            onMapView={() => onMapView(lead)}
            onSopoClick={onSopoClick}
            progress={salesProgressMap?.get(lead.id)}
            isFieldMode={isFieldMode}
            onRefresh={onRefresh}
            onDeleteLead={onDeleteLead}
          />
        ))}
      </div>

      {totalCount > pageSize && (
        <div className="mt-8 mb-4 flex items-center justify-center gap-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            title="이전 페이지"
            className="p-2.5 rounded-xl border transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--bg-secondary)] bg-[var(--glass-bg)] border-[var(--glass-border)] text-[var(--text-secondary)]"
          >
            <ChevronDown className="w-5 h-5 rotate-90" />
          </button>

          <div className="flex items-center gap-2 px-4">
            {Array.from({ length: Math.min(5, Math.ceil(totalCount / pageSize)) }, (_, i) => {
              const totalPages = Math.ceil(totalCount / pageSize);
              let pageNum = i + 1;
              if (totalPages > 5 && currentPage > 3) {
                pageNum = currentPage - 2 + i;
                if (pageNum + (4 - i) > totalPages) pageNum = totalPages - 4 + i;
              }
              if (pageNum > totalPages) return null;

              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-300 border border-[var(--glass-border)] ${
                    currentPage === pageNum 
                      ? 'bg-[var(--metro-line4)] text-white shadow-[0_0_15px_rgba(50,164,206,0.4)]' 
                      : 'bg-[var(--glass-bg)] text-[var(--text-secondary)]'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= Math.ceil(totalCount / pageSize)}
            title="다음 페이지"
            className="p-2.5 rounded-xl border border-[var(--glass-border)] transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--bg-secondary)] text-[var(--text-secondary)] bg-[var(--glass-bg)]"
          >
            <ChevronDown className="w-5 h-5 -rotate-90" />
          </button>
        </div>
      )}

      {selectedLeadId && (
        <LeadDetailPanel
          leadId={selectedLeadId}
          onClose={() => setSelectedLeadId(null)}
          onStatusChange={() => {
            const lead = leads.find(l => l.id === selectedLeadId);
            if (lead) onStatusChange(selectedLeadId, lead.status);
          }}
        />
      )}
    </>
  );
}

function HighlightText({ text, searchQuery, className }: { text: string; searchQuery: string; className?: string }) {
  const parts = getHighlightParts(text, searchQuery);
  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.isHighlight ? (
          <mark key={i} className="bg-yellow-400/60 text-inherit rounded px-0.5">{part.text}</mark>
        ) : (
          <span key={i}>{part.text}</span>
        )
      )}
    </span>
  );
}

interface LeadCardProps {
  lead: Lead;
  index: number;
  onStatusChange: (leadId: string, status: LeadStatus) => void;
  onSelect: () => void;
  onSopoClick?: (lead: Lead) => void;
  searchQuery?: string;
  onMapView?: () => void;
  progress?: SalesProgress[];
  isFieldMode?: boolean;
  onRefresh?: () => void;
  onDeleteLead?: (leadId: string) => void;
}

function LeadCard({ lead, index, onStatusChange, onSelect, onSopoClick, searchQuery = '', onMapView, progress, isFieldMode = false, onRefresh, onDeleteLead }: LeadCardProps) {
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const statusColor = STATUS_METRO_COLORS[lead.status];

  return (
    <>
      <div
        className={`group relative rounded-pro border overflow-hidden cursor-pointer bg-[var(--glass-bg)] border-[var(--glass-border)] ${getCardClass()}`}
        style={{
          '--delay': `${index * 20}ms`,
        } as React.CSSProperties}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('button, a')) return;
          onSelect();
        }}
      >
        <div
          style={{
            '--glow-gradient': `radial-gradient(circle at 50% 0%, ${statusColor.glow} 0%, transparent 70%)`,
          } as React.CSSProperties}
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-[image:var(--glow-gradient)]"
        />

        <div
          className="relative px-4 py-3 border-b bg-[--status-bg] border-[--status-border]"
          style={{
            '--status-bg': statusColor.bg,
            '--status-border': statusColor.border,
          } as React.CSSProperties}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="text-sm font-semibold text-[--status-text]"
                style={{ '--status-text': statusColor.text } as React.CSSProperties}
              >
                {STATUS_LABELS[lead.status]}
              </span>
              {lead.leadGrade && (
                <span
                  className={`text-xs font-bold px-1.5 py-0.5 rounded-md leading-none ${
                    lead.leadGrade === 'A'
                      ? 'bg-red-500/20 text-red-500'
                      : lead.leadGrade === 'B'
                        ? 'bg-blue-500/20 text-blue-500'
                        : lead.leadGrade === 'C'
                          ? 'bg-yellow-500/20 text-yellow-500'
                          : 'bg-gray-500/20 text-gray-400'
                  }`}
                  title={`리드 점수: ${lead.leadScore ?? '-'}`}
                >
                  {lead.leadGrade}등급
                </span>
              )}
              <ProgressDots leadId={lead.id} progress={progress} />
            </div>
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsStatusOpen(!isStatusOpen);
                }}
                title="상태 변경 메뉴 열기"
                aria-label="상태 변경 메뉴 열기"
                className="p-1.5 rounded-lg transition-colors hover:bg-white/10 text-[--status-text]"
                style={{ '--status-text': statusColor.text } as React.CSSProperties}
              >
                <ChevronDown className="w-4 h-4" />
              </button>
              {isStatusOpen && (
                <StatusDropdown
                  currentStatus={lead.status}
                  onSelect={(status) => {
                    onStatusChange(lead.id, status);
                    setIsStatusOpen(false);
                  }}
                  onClose={() => setIsStatusOpen(false)}
                />
              )}
            </div>
          </div>
        </div>

        <div className="relative p-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMapView?.();
            }}
            title={`${lead.bizName} 지도에서 보기`}
            aria-label={`${lead.bizName} 지도에서 보기`}
            className="font-bold text-[var(--text-primary)] mb-2 line-clamp-1 text-left w-full hover:text-[var(--metro-line4)] hover:underline transition-colors"
          >
            <HighlightText text={lead.bizName} searchQuery={searchQuery} />
          </button>

          {lead.medicalSubject && (
            <p className="text-sm text-[var(--text-muted)] mb-3 line-clamp-1">
              <HighlightText text={lead.medicalSubject} searchQuery={searchQuery} />
            </p>
          )}

          <div className="space-y-2.5 text-sm">
            {lead.licenseDate && (
              <div className="flex items-center gap-2.5 text-[var(--text-secondary)]">
                <Calendar className="w-4 h-4 flex-shrink-0 text-[var(--metro-line5)]" />
                <span>
                  인허가일: <span className="font-medium text-[var(--text-primary)]">{lead.licenseDate}</span>
                </span>
              </div>
            )}

            <div className="flex items-start gap-2.5 text-[var(--text-secondary)]">
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-[var(--metro-line3)]" />
              <span className="line-clamp-2">
                <HighlightText text={truncateString(lead.roadAddress || lead.lotAddress || '-', 50)} searchQuery={searchQuery} />
              </span>
            </div>

            <div className="flex items-center gap-2.5 text-[var(--text-secondary)]">
              <Train className="w-4 h-4 flex-shrink-0 text-[var(--metro-line4)]" />
              {(() => {
                // DB에 값이 없으면 실시간 계산
                const calcStation = (!lead.nearestStation && lead.latitude && lead.longitude) 
                  ? findNearestStation(lead.latitude, lead.longitude) 
                  : null;
                  
                const displayStation = lead.nearestStation || (calcStation ? calcStation.station.name : null);
                const displayDistance = lead.stationDistance || (calcStation ? calcStation.distance : null);
                const displayLines = lead.stationLines || (calcStation ? calcStation.station.lines : []);

                return displayStation ? (
                  <div className="flex flex-col gap-1 w-full">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[var(--text-primary)]">
                        <HighlightText text={displayStation.endsWith('역') ? displayStation : displayStation + '역'} searchQuery={searchQuery} />
                      </span>
                      {displayDistance && (
                        <span className="text-xs text-[var(--text-muted)]">({formatDistance(displayDistance)})</span>
                      )}
                      {displayLines && displayLines.length > 0 && (
                        <div className="flex gap-1 ml-1">
                          {displayLines.slice(0, 3).map(line => (
                            <span
                              key={line}
                              className="w-5 h-5 rounded-full text-white text-xs flex items-center justify-center font-bold shadow-sm bg-[--line-color]"
                              style={{ '--line-color': LINE_COLORS[line] || '#888' } as React.CSSProperties}
                            >
                              {line}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center text-xs text-[var(--text-muted)]">
                      <span>출구: <span className="font-medium text-[var(--text-secondary)]">{lead.nearestExitNo ? `${lead.nearestExitNo}번 출구` : '미확인'}</span></span>
                    </div>
                  </div>
                ) : (
                  <span className="text-[var(--text-muted)] text-xs italic">인근역 정보 없음</span>
                );
              })()}
            </div>

            {lead.assignedToName && (
              <div className="flex items-center gap-2.5 text-[var(--text-secondary)]">
                <User className="w-4 h-4 flex-shrink-0 text-[var(--metro-line9)]" />
                <span className="font-medium text-[var(--text-primary)]">
                  {lead.assignedToName}
                </span>
              </div>
            )}
          </div>
        </div>

        <div
          className={`relative px-4 border-t flex gap-4 ${isFieldMode ? 'py-4' : 'py-3'} border-[var(--border-subtle)] bg-[var(--bg-tertiary)]`}
        >
          {lead.phone && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowCallModal(true);
              }}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg font-semibold text-sm text-white transition-all duration-300 hover:scale-105 bg-[var(--metro-line2)] ${isFieldMode ? 'py-3.5 text-base' : 'py-2.5'}`}
            >
              <Phone className={`${isFieldMode ? 'w-5 h-5' : 'w-4 h-4'}`} />
              통화
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg font-semibold text-sm text-white transition-all duration-300 hover:scale-105 bg-[var(--metro-line4)] ${isFieldMode ? 'py-3.5 text-base' : 'py-2.5'}`}
          >
            <FileText className={`${isFieldMode ? 'w-5 h-5' : 'w-4 h-4'}`} />
제안
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteLead?.(lead.id);
            }}
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg font-semibold text-sm text-white transition-all duration-300 hover:scale-105 bg-red-500/80 ${isFieldMode ? 'py-3.5 text-base' : 'py-2.5'}`}
          >
            <Trash2 className={`${isFieldMode ? 'w-5 h-5' : 'w-4 h-4'}`} />삭제
          </button>
          {onSopoClick && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onSopoClick(lead);
              }}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg font-semibold text-sm text-white transition-all duration-300 hover:scale-105 bg-[var(--metro-line5)] ${isFieldMode ? 'py-3.5 text-base' : 'py-2.5'}`}
              title="SOPO 상가정보 조회"
            >
              <MapPin className="w-4 h-4" /> SOPO
            </button>
          )}
        </div>
      </div>
      {showCallModal && (
        <CallLogModal
          leadId={lead.id}
          leadName={lead.bizName}
          phone={lead.phone}
          onClose={() => setShowCallModal(false)}
          onSuccess={() => onRefresh?.()}
        />
      )}
    </>
  );
}

function StatusDropdown({ currentStatus, onSelect, onClose }: { currentStatus: LeadStatus; onSelect: (status: LeadStatus) => void; onClose: () => void }) {
  const statuses: LeadStatus[] = ['NEW', 'PROPOSAL_SENT', 'CONTACTED', 'CONTRACTED'];

  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div
        className="absolute right-0 top-full mt-2 w-40 rounded-xl border py-2 z-20 bg-[var(--glass-bg)] border-[var(--glass-border)] backdrop-blur-[20px] shadow-[0_10px_30px_rgba(0,0,0,0.4)]"
      >
        {statuses.map(status => {
          const color = STATUS_METRO_COLORS[status];
          return (
            <button
              key={status}
              onClick={() => onSelect(status)}
              className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 transition-colors ${status === currentStatus ? 'bg-[var(--bg-secondary)]' : 'hover:bg-[var(--bg-secondary)]'}`}
            >
              <div
                className="w-3 h-3 rounded-full border-2 bg-[--dot-bg] border-[--dot-border]"
                style={{ '--dot-bg': color.bg, '--dot-border': color.border } as React.CSSProperties}
              />
              <span
                className="font-medium text-[--status-text]"
                style={{ '--status-text': color.text } as React.CSSProperties}
              >
                {STATUS_LABELS[status]}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}
