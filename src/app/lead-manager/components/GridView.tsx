'use client';

/**
 * 그리드 뷰 컴포넌트 - Neo-Seoul Transit Design
 * 병원 리드를 카드 형태로 표시
 */

import React, { useState } from 'react';
import {
  Phone,
  FileText,
  MapPin,
  Train,
  Calendar,
  ChevronDown,
  User,
} from 'lucide-react';

import { Lead, LeadStatus, STATUS_LABELS, STATUS_METRO_COLORS, LINE_COLORS, SalesProgress } from '../types';
import { formatDistance, truncateString, getHighlightParts } from '../utils';
import CallLogModal from './crm/CallLogModal';
import LeadDetailPanel from './crm/LeadDetailPanel';
import { ProgressDots } from './crm/ProgressChecklist';

interface GridViewProps {
  leads: Lead[];
  onStatusChange: (leadId: string, newStatus: LeadStatus) => Promise<void>;
  searchQuery: string;
  onMapView: (lead: Lead) => void;
  salesProgressMap?: Map<string, SalesProgress[]>;
  isFieldMode?: boolean;
  // 페이지네이션 관련 추가
  currentPage: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
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
  onPageChange
}: GridViewProps) {
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  return (
    <>
      <div className={`grid gap-4 ${isFieldMode ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'}`}>
        {leads.map((lead, index) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            index={index}
            onStatusChange={onStatusChange}
            onSelect={() => setSelectedLeadId(lead.id)}
            searchQuery={searchQuery}
            onMapView={() => onMapView(lead)}
            progress={salesProgressMap?.get(lead.id)}
            isFieldMode={isFieldMode}
          />
        ))}
      </div>

      {/* 페이지네이션 UI */}
      {totalCount > pageSize && (
        <div className="mt-8 mb-4 flex items-center justify-center gap-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            title="이전 페이지"
            className="p-2.5 rounded-xl border transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--bg-secondary)]"
            style={{
              background: 'var(--glass-bg)',
              borderColor: 'var(--glass-border)',
              color: 'var(--text-secondary)'
            }}
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
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-300"
                  style={{
                    background: currentPage === pageNum ? 'var(--metro-line4)' : 'var(--glass-bg)',
                    color: currentPage === pageNum ? 'white' : 'var(--text-secondary)',
                    border: '1px solid var(--glass-border)',
                    boxShadow: currentPage === pageNum ? '0 0 15px rgba(50, 164, 206, 0.4)' : 'none',
                  }}
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
            className="p-2.5 rounded-xl border transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--bg-secondary)]"
            style={{
              background: 'var(--glass-bg)',
              borderColor: 'var(--glass-border)',
              color: 'var(--text-secondary)'
            }}
          >
            <ChevronDown className="w-5 h-5 -rotate-90" />
          </button>
        </div>
      )}

      {/* 리드 상세 패널 */}
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

// 하이라이트 렌더링 컴포넌트 (렌더 밖에서 정의)
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
  searchQuery?: string;
  onMapView?: () => void;
  progress?: SalesProgress[];
  isFieldMode?: boolean;
}

function LeadCard({ lead, index, onStatusChange, onSelect, searchQuery = '', onMapView, progress, isFieldMode = false }: LeadCardProps) {
  const [isStatusOpen, setIsStatusOpen] = useState(false);
  const [showCallModal, setShowCallModal] = useState(false);
  const statusColor = STATUS_METRO_COLORS[lead.status];

  return (
    <>
      <div
        className="parallax-card group relative rounded-pro border overflow-hidden cursor-pointer"
        style={{
          background: 'var(--glass-bg)',
          borderColor: 'var(--glass-border)',
          animationDelay: `${index * 30}ms`,
        }}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('button, a')) return;
          onSelect();
        }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const x = ((e.clientX - rect.left) / rect.width) * 100;
          const y = ((e.clientY - rect.top) / rect.height) * 100;
          e.currentTarget.style.setProperty('--mouse-x', `${x}%`);
          e.currentTarget.style.setProperty('--mouse-y', `${y}%`);
        }}
      >
        {/* 호버 시 글로우 효과 */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
          style={{
            background: `radial-gradient(circle at 50% 0%, ${statusColor.glow} 0%, transparent 70%)`,
          }}
        />

        {/* 상단 - 상태 표시 */}
        <div
          className="relative px-4 py-3 border-b"
          style={{
            background: statusColor.bg,
            borderColor: statusColor.border,
          }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="text-sm font-semibold"
                style={{ color: statusColor.text }}
              >
                {STATUS_LABELS[lead.status]}
              </span>
              <ProgressDots leadId={lead.id} progress={progress} />
            </div>
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsStatusOpen(!isStatusOpen);
                }}
                className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
                style={{ color: statusColor.text }}
                title="상태 변경"
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

        {/* 본문 */}
        <div className="relative p-4">
          {/* 병원명 - 클릭 시 지도 뷰로 이동 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMapView?.();
            }}
            className="font-bold text-[var(--text-primary)] mb-2 line-clamp-1 text-left w-full hover:text-[var(--metro-line4)] hover:underline transition-colors"
            title={`${lead.bizName} - 지도에서 보기`}
          >
            <HighlightText text={lead.bizName} searchQuery={searchQuery} />
          </button>

          {/* 진료과목 */}
          {lead.medicalSubject && (
            <p className="text-sm text-[var(--text-muted)] mb-3 line-clamp-1">
              <HighlightText text={lead.medicalSubject} searchQuery={searchQuery} />
            </p>
          )}

          {/* 정보 목록 */}
          <div className="space-y-2.5 text-sm">
            {/* 주소 */}
            <div className="flex items-start gap-2.5 text-[var(--text-secondary)]">
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-[var(--metro-line3)]" />
              <span className="line-clamp-2">
                <HighlightText text={truncateString(lead.roadAddress || lead.lotAddress || '-', 50)} searchQuery={searchQuery} />
              </span>
            </div>

            {/* 인근역 */}
            {lead.nearestStation && (
              <div className="flex items-center gap-2.5 text-[var(--text-secondary)]">
                <Train className="w-4 h-4 flex-shrink-0 text-[var(--metro-line4)]" />
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[var(--text-primary)]">
                    <HighlightText text={lead.nearestStation.endsWith('역') ? lead.nearestStation : lead.nearestStation + '역'} searchQuery={searchQuery} />
                  </span>
                  {lead.stationLines && (
                    <div className="flex gap-1">
                      {lead.stationLines.slice(0, 3).map(line => (
                        <span
                          key={line}
                          className="w-5 h-5 rounded-full text-white text-xs flex items-center justify-center font-bold shadow-sm"
                          style={{ backgroundColor: LINE_COLORS[line] || '#888' }}
                        >
                          {line}
                        </span>
                      ))}
                    </div>
                  )}
                  {lead.stationDistance && (
                    <span className="text-[var(--text-muted)]">
                      ({formatDistance(lead.stationDistance)})
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* 인허가일 */}
            {lead.licenseDate && (
              <div className="flex items-center gap-2.5 text-[var(--text-secondary)]">
                <Calendar className="w-4 h-4 flex-shrink-0 text-[var(--metro-line5)]" />
                <span>{lead.licenseDate}</span>
              </div>
            )}

            {/* 담당자 */}
            {lead.assignedToName && (
              <div className="flex items-center gap-2.5 text-[var(--text-secondary)]">
                <User className="w-4 h-4 flex-shrink-0 text-[var(--metro-line9)]" />
                <span className="font-medium text-[var(--text-primary)]">
                  {lead.assignedToName}
                </span>
              </div>
            )}
          </div>

          {/* 필드 모드일 때 추가 여백 및 강조 (선택적) */}
          {isFieldMode && (
            <div className="mt-3">
              {/* 필드 모드에서는 중요 정보만 강조 */}
            </div>
          )}
        </div>

        {/* 하단 액션 버튼 - 필드 모드에서 더 크게 표시 */}
        <div
          className={`relative px-4 border-t flex gap-2 ${isFieldMode ? 'py-4' : 'py-3'}`}
          style={{
            background: 'var(--bg-tertiary)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          {lead.phone && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowCallModal(true);
              }}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg font-semibold text-sm text-white transition-all duration-300 hover:scale-105 ${isFieldMode ? 'py-3.5 text-base' : 'py-2.5'}`}
              style={{
                background: 'var(--metro-line2)',
                boxShadow: '0 2px 10px rgba(60, 181, 74, 0.3)',
              }}
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
            className={`flex-1 flex items-center justify-center gap-2 rounded-lg font-semibold text-sm text-white transition-all duration-300 hover:scale-105 ${isFieldMode ? 'py-3.5 text-base' : 'py-2.5'}`}
            style={{
              background: 'var(--metro-line4)',
              boxShadow: '0 2px 10px rgba(50, 164, 206, 0.3)',
            }}
          >
            <FileText className={`${isFieldMode ? 'w-5 h-5' : 'w-4 h-4'}`} />
            제안
          </button>
        </div>
      </div>

      {/* 통화 기록 모달 */}
      {showCallModal && (
        <CallLogModal
          leadId={lead.id}
          leadName={lead.bizName}
          phone={lead.phone}
          onClose={() => setShowCallModal(false)}
          onSuccess={() => { }}
        />
      )}
    </>
  );
}

interface StatusDropdownProps {
  currentStatus: LeadStatus;
  onSelect: (status: LeadStatus) => void;
  onClose: () => void;
}

function StatusDropdown({ currentStatus, onSelect, onClose }: StatusDropdownProps) {
  const statuses: LeadStatus[] = ['NEW', 'PROPOSAL_SENT', 'CONTACTED', 'CONTRACTED'];

  return (
    <>
      {/* 백드롭 */}
      <div className="fixed inset-0 z-10" onClick={onClose} />

      {/* 드롭다운 메뉴 */}
      <div
        className="absolute right-0 top-full mt-2 w-40 rounded-xl border py-2 z-20"
        style={{
          background: 'var(--glass-bg)',
          borderColor: 'var(--glass-border)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.4)',
        }}
      >
        {statuses.map(status => {
          const color = STATUS_METRO_COLORS[status];
          return (
            <button
              key={status}
              onClick={() => onSelect(status)}
              className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 transition-colors ${status === currentStatus
                ? 'bg-[var(--bg-secondary)]'
                : 'hover:bg-[var(--bg-secondary)]'
                }`}
            >
              <span
                className="w-3 h-3 rounded-full border-2"
                style={{
                  background: color.bg,
                  borderColor: color.border,
                }}
              />
              <span
                className="font-medium"
                style={{ color: color.text }}
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
