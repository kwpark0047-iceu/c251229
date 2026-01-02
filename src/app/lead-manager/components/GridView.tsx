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
} from 'lucide-react';

import { Lead, LeadStatus, STATUS_LABELS, LINE_COLORS } from '../types';
import { formatDistance, truncateString, getHighlightParts } from '../utils';
import CallLogModal from './crm/CallLogModal';
import LeadDetailPanel from './crm/LeadDetailPanel';
import { ProgressDots } from './crm/ProgressChecklist';

// 상태별 메트로 라인 색상 매핑
const STATUS_METRO_COLORS: Record<LeadStatus, { bg: string; text: string; border: string; glow: string }> = {
  NEW: {
    bg: 'rgba(60, 181, 74, 0.15)',
    text: 'var(--metro-line2)',
    border: 'rgba(60, 181, 74, 0.4)',
    glow: 'rgba(60, 181, 74, 0.2)',
  },
  PROPOSAL_SENT: {
    bg: 'rgba(50, 164, 206, 0.15)',
    text: 'var(--metro-line4)',
    border: 'rgba(50, 164, 206, 0.4)',
    glow: 'rgba(50, 164, 206, 0.2)',
  },
  CONTACTED: {
    bg: 'rgba(153, 51, 153, 0.15)',
    text: 'var(--metro-line5)',
    border: 'rgba(153, 51, 153, 0.4)',
    glow: 'rgba(153, 51, 153, 0.2)',
  },
  CONTRACTED: {
    bg: 'rgba(239, 124, 61, 0.15)',
    text: 'var(--metro-line3)',
    border: 'rgba(239, 124, 61, 0.4)',
    glow: 'rgba(239, 124, 61, 0.2)',
  },
};

interface GridViewProps {
  leads: Lead[];
  onStatusChange: (leadId: string, status: LeadStatus) => void;
  searchQuery?: string;
}

export default function GridView({ leads, onStatusChange, searchQuery = '' }: GridViewProps) {
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {leads.map((lead, index) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            index={index}
            onStatusChange={onStatusChange}
            onSelect={() => setSelectedLeadId(lead.id)}
            searchQuery={searchQuery}
          />
        ))}
      </div>

      {/* 리드 상세 패널 */}
      {selectedLeadId && (
        <LeadDetailPanel
          leadId={selectedLeadId}
          onClose={() => setSelectedLeadId(null)}
          onStatusChange={() => onStatusChange(selectedLeadId, leads.find(l => l.id === selectedLeadId)?.status || 'NEW')}
        />
      )}
    </>
  );
}

interface LeadCardProps {
  lead: Lead;
  index: number;
  onStatusChange: (leadId: string, status: LeadStatus) => void;
  onSelect: () => void;
  searchQuery?: string;
}

function LeadCard({ lead, index, onStatusChange, onSelect, searchQuery = '' }: LeadCardProps) {
  const [isStatusOpen, setIsStatusOpen] = useState(false);

  // 하이라이트 렌더링 컴포넌트
  const HighlightText = ({ text, className }: { text: string; className?: string }) => {
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
  };

  const [showCallModal, setShowCallModal] = useState(false);
  const statusColor = STATUS_METRO_COLORS[lead.status];

  return (
    <>
      <div
        className="group relative rounded-xl border overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.02]"
        style={{
          background: 'var(--glass-bg)',
          borderColor: 'var(--glass-border)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.2)',
          animationDelay: `${index * 30}ms`,
        }}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest('button, a')) return;
          onSelect();
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
              <ProgressDots leadId={lead.id} />
            </div>
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsStatusOpen(!isStatusOpen);
                }}
                className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
                style={{ color: statusColor.text }}
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
          {/* 병원명 */}
          <h3
            className="font-bold text-[var(--text-primary)] mb-2 line-clamp-1"
            title={lead.bizName}
          >
            <HighlightText text={lead.bizName} />
          </h3>

          {/* 진료과목 */}
          {lead.medicalSubject && (
            <p className="text-sm text-[var(--text-muted)] mb-3 line-clamp-1">
              <HighlightText text={lead.medicalSubject} />
            </p>
          )}

          {/* 정보 목록 */}
          <div className="space-y-2.5 text-sm">
            {/* 주소 */}
            <div className="flex items-start gap-2.5 text-[var(--text-secondary)]">
              <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-[var(--metro-line3)]" />
              <span className="line-clamp-2">
                <HighlightText text={truncateString(lead.roadAddress || lead.lotAddress || '-', 50)} />
              </span>
            </div>

            {/* 인근역 */}
            {lead.nearestStation && (
              <div className="flex items-center gap-2.5 text-[var(--text-secondary)]">
                <Train className="w-4 h-4 flex-shrink-0 text-[var(--metro-line4)]" />
                <div className="flex items-center gap-2">
                  <span className="font-medium text-[var(--text-primary)]">
                    <HighlightText text={lead.nearestStation + '역'} />
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
          </div>
        </div>

        {/* 하단 액션 버튼 */}
        <div
          className="relative px-4 py-3 border-t flex gap-2"
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
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm text-white transition-all duration-300 hover:scale-105"
              style={{
                background: 'var(--metro-line2)',
                boxShadow: '0 2px 10px rgba(60, 181, 74, 0.3)',
              }}
            >
              <Phone className="w-4 h-4" />
              통화기록
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-semibold text-sm text-white transition-all duration-300 hover:scale-105"
            style={{
              background: 'var(--metro-line4)',
              boxShadow: '0 2px 10px rgba(50, 164, 206, 0.3)',
            }}
          >
            <FileText className="w-4 h-4" />
            제안서
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
          onSuccess={() => {}}
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
              className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-3 transition-colors ${
                status === currentStatus
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
