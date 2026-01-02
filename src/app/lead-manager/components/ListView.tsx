'use client';

/**
 * 리스트 뷰 컴포넌트 - Neo-Seoul Transit Design
 * 병원 리드를 테이블 형태로 표시
 */

import React, { useState } from 'react';
import { Phone, FileText, ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';

import { Lead, LeadStatus, STATUS_LABELS, LINE_COLORS } from '../types';
import { formatDistance, formatPhoneNumber, truncateString, getHighlightParts } from '../utils';
import { ProgressDots } from './crm/ProgressChecklist';
import CallLogModal from './crm/CallLogModal';
import LeadDetailPanel from './crm/LeadDetailPanel';

// 상태별 메트로 라인 색상 매핑
const STATUS_METRO_COLORS: Record<LeadStatus, { bg: string; text: string; border: string }> = {
  NEW: {
    bg: 'rgba(60, 181, 74, 0.15)',
    text: 'var(--metro-line2)',
    border: 'rgba(60, 181, 74, 0.4)',
  },
  PROPOSAL_SENT: {
    bg: 'rgba(50, 164, 206, 0.15)',
    text: 'var(--metro-line4)',
    border: 'rgba(50, 164, 206, 0.4)',
  },
  CONTACTED: {
    bg: 'rgba(153, 51, 153, 0.15)',
    text: 'var(--metro-line5)',
    border: 'rgba(153, 51, 153, 0.4)',
  },
  CONTRACTED: {
    bg: 'rgba(239, 124, 61, 0.15)',
    text: 'var(--metro-line3)',
    border: 'rgba(239, 124, 61, 0.4)',
  },
};

interface ListViewProps {
  leads: Lead[];
  onStatusChange: (leadId: string, status: LeadStatus) => void;
  searchQuery?: string;
}

type SortField = 'bizName' | 'nearestStation' | 'stationDistance' | 'licenseDate' | 'status' | 'createdAt';
type SortOrder = 'asc' | 'desc';

export default function ListView({ leads, onStatusChange, searchQuery = '' }: ListViewProps) {
  const [sortField, setSortField] = useState<SortField>('licenseDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [callModalLeadId, setCallModalLeadId] = useState<string | null>(null);

  const selectedLead = leads.find(l => l.id === selectedLeadId);
  const callModalLead = leads.find(l => l.id === callModalLeadId);

  // 정렬 처리
  const sortedLeads = [...leads].sort((a, b) => {
    let aVal: string | number = '';
    let bVal: string | number = '';

    switch (sortField) {
      case 'bizName':
        aVal = a.bizName || '';
        bVal = b.bizName || '';
        break;
      case 'nearestStation':
        aVal = a.nearestStation || '';
        bVal = b.nearestStation || '';
        break;
      case 'stationDistance':
        aVal = a.stationDistance || 999999;
        bVal = b.stationDistance || 999999;
        break;
      case 'licenseDate':
        aVal = a.licenseDate || '';
        bVal = b.licenseDate || '';
        break;
      case 'status':
        aVal = a.status;
        bVal = b.status;
        break;
      case 'createdAt':
        aVal = a.createdAt || '';
        bVal = b.createdAt || '';
        break;
    }

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortOrder === 'asc'
        ? aVal.localeCompare(bVal, 'ko')
        : bVal.localeCompare(aVal, 'ko');
    }

    return sortOrder === 'asc'
      ? (aVal as number) - (bVal as number)
      : (bVal as number) - (aVal as number);
  });

  // 정렬 토글
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // 정렬 아이콘
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? (
      <ChevronUp className="w-4 h-4" />
    ) : (
      <ChevronDown className="w-4 h-4" />
    );
  };

  return (
    <>
      <div
        className="rounded-xl border overflow-hidden"
        style={{
          background: 'var(--glass-bg)',
          borderColor: 'var(--glass-border)',
          boxShadow: '0 4px 30px rgba(0, 0, 0, 0.2)',
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr
                className="border-b"
                style={{
                  background: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <th
                  className="px-5 py-4 text-left text-sm font-semibold text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                  onClick={() => handleSort('bizName')}
                >
                  <div className="flex items-center gap-1.5">
                    병원명
                    <SortIcon field="bizName" />
                  </div>
                </th>
                <th className="px-5 py-4 text-left text-sm font-semibold text-[var(--text-secondary)]">
                  주소
                </th>
                <th
                  className="px-5 py-4 text-left text-sm font-semibold text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                  onClick={() => handleSort('nearestStation')}
                >
                  <div className="flex items-center gap-1.5">
                    인근역
                    <SortIcon field="nearestStation" />
                  </div>
                </th>
                <th
                  className="px-5 py-4 text-left text-sm font-semibold text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)] transition-colors whitespace-nowrap"
                  onClick={() => handleSort('stationDistance')}
                >
                  <div className="flex items-center gap-1.5">
                    거리
                    <SortIcon field="stationDistance" />
                  </div>
                </th>
                <th className="px-5 py-4 text-left text-sm font-semibold text-[var(--text-secondary)]">
                  전화번호
                </th>
                <th
                  className="px-5 py-4 text-left text-sm font-semibold text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                  onClick={() => handleSort('licenseDate')}
                >
                  <div className="flex items-center gap-1.5">
                    인허가일
                    <SortIcon field="licenseDate" />
                  </div>
                </th>
                <th className="px-5 py-4 text-left text-sm font-semibold text-[var(--text-secondary)]">
                  진행
                </th>
                <th
                  className="px-5 py-4 text-left text-sm font-semibold text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-1.5">
                    상태
                    <SortIcon field="status" />
                  </div>
                </th>
                <th className="px-5 py-4 text-center text-sm font-semibold text-[var(--text-secondary)]">
                  액션
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedLeads.map((lead, index) => (
                <LeadRow
                  key={lead.id}
                  lead={lead}
                  index={index}
                  onStatusChange={onStatusChange}
                  onSelect={() => setSelectedLeadId(lead.id)}
                  onCallLog={() => setCallModalLeadId(lead.id)}
                  searchQuery={searchQuery}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 리드 상세 패널 */}
      {selectedLeadId && (
        <LeadDetailPanel
          leadId={selectedLeadId}
          onClose={() => setSelectedLeadId(null)}
          onStatusChange={() => onStatusChange(selectedLeadId, selectedLead?.status || 'NEW')}
        />
      )}

      {/* 통화 기록 모달 */}
      {callModalLeadId && callModalLead && (
        <CallLogModal
          leadId={callModalLeadId}
          leadName={callModalLead.bizName}
          phone={callModalLead.phone}
          onClose={() => setCallModalLeadId(null)}
          onSuccess={() => {}}
        />
      )}
    </>
  );
}

interface LeadRowProps {
  lead: Lead;
  index: number;
  onStatusChange: (leadId: string, status: LeadStatus) => void;
  onSelect: () => void;
  onCallLog: () => void;
  searchQuery?: string;
}

function LeadRow({ lead, index, onStatusChange, onSelect, onCallLog, searchQuery = '' }: LeadRowProps) {
  const statusColor = STATUS_METRO_COLORS[lead.status];

  // 하이라이트 렌더링 컴포넌트
  const HighlightText = ({ text }: { text: string }) => {
    const parts = getHighlightParts(text, searchQuery);
    return (
      <>
        {parts.map((part, i) =>
          part.isHighlight ? (
            <mark key={i} className="bg-yellow-400/60 text-inherit rounded px-0.5">{part.text}</mark>
          ) : (
            <span key={i}>{part.text}</span>
          )
        )}
      </>
    );
  };

  return (
    <tr
      className="border-b border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button, a, select')) return;
        onSelect();
      }}
      style={{
        animationDelay: `${index * 20}ms`,
      }}
    >
      {/* 병원명 */}
      <td className="px-5 py-4">
        <div>
          <div className="font-semibold text-[var(--text-primary)] line-clamp-1" title={lead.bizName}>
            <HighlightText text={lead.bizName} />
          </div>
          {lead.medicalSubject && (
            <div className="text-xs text-[var(--text-muted)] line-clamp-1 mt-0.5">
              <HighlightText text={lead.medicalSubject} />
            </div>
          )}
        </div>
      </td>

      {/* 주소 */}
      <td className="px-5 py-4">
        <span className="text-sm text-[var(--text-secondary)] line-clamp-1" title={lead.roadAddress || lead.lotAddress}>
          <HighlightText text={truncateString(lead.roadAddress || lead.lotAddress || '-', 30)} />
        </span>
      </td>

      {/* 인근역 */}
      <td className="px-5 py-4">
        {lead.nearestStation ? (
          <div className="flex items-center gap-2">
            <span className="font-medium text-[var(--text-primary)]"><HighlightText text={lead.nearestStation || ''} /></span>
            {lead.stationLines && (
              <div className="flex gap-1">
                {lead.stationLines.slice(0, 2).map(line => (
                  <span
                    key={line}
                    className="w-5 h-5 rounded-full text-white text-[10px] flex items-center justify-center font-bold shadow-sm"
                    style={{ backgroundColor: LINE_COLORS[line] || '#888' }}
                  >
                    {line}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <span className="text-[var(--text-muted)]">-</span>
        )}
      </td>

      {/* 거리 */}
      <td className="px-5 py-4">
        <span className="text-sm text-[var(--text-secondary)]">
          {lead.stationDistance ? formatDistance(lead.stationDistance) : '-'}
        </span>
      </td>

      {/* 전화번호 */}
      <td className="px-5 py-4">
        {lead.phone ? (
          <a
            href={`tel:${lead.phone}`}
            className="text-sm font-medium hover:underline transition-colors"
            style={{ color: 'var(--metro-line4)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <HighlightText text={formatPhoneNumber(lead.phone)} />
          </a>
        ) : (
          <span className="text-[var(--text-muted)]">-</span>
        )}
      </td>

      {/* 인허가일 */}
      <td className="px-5 py-4">
        <span className="text-sm text-[var(--text-secondary)]">{lead.licenseDate || '-'}</span>
      </td>

      {/* 진행 상태 */}
      <td className="px-5 py-4">
        <ProgressDots leadId={lead.id} />
      </td>

      {/* 상태 */}
      <td className="px-5 py-4">
        <select
          value={lead.status}
          onChange={(e) => {
            e.stopPropagation();
            onStatusChange(lead.id, e.target.value as LeadStatus);
          }}
          onClick={(e) => e.stopPropagation()}
          className="text-sm px-3 py-1.5 rounded-lg border font-medium cursor-pointer focus:outline-none focus:ring-2 focus:ring-[var(--metro-line4)] appearance-none"
          style={{
            background: statusColor.bg,
            color: statusColor.text,
            borderColor: statusColor.border,
          }}
        >
          {(['NEW', 'PROPOSAL_SENT', 'CONTACTED', 'CONTRACTED'] as LeadStatus[]).map(status => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </td>

      {/* 액션 */}
      <td className="px-5 py-4">
        <div className="flex items-center justify-center gap-2">
          {lead.phone && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCallLog();
              }}
              className="p-2.5 rounded-lg transition-all duration-300 hover:scale-110"
              style={{
                background: 'rgba(60, 181, 74, 0.15)',
                color: 'var(--metro-line2)',
              }}
              title="통화 기록"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            className="p-2.5 rounded-lg transition-all duration-300 hover:scale-110"
            style={{
              background: 'rgba(50, 164, 206, 0.15)',
              color: 'var(--metro-line4)',
            }}
            title="제안서 보내기"
          >
            <FileText className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}
