'use client';

/**
 * 리스트 뷰 컴포넌트 - Neo-Seoul Transit Design
 * 병원 리드를 테이블 형태로 표시
 */

import React, { useState } from 'react';
import { FileText, ChevronDown, ChevronUp, MessageSquare, User } from 'lucide-react';

import { Lead, LeadStatus, STATUS_LABELS, STATUS_METRO_COLORS, LINE_COLORS, SalesProgress } from '../types';
import { formatDistance, formatPhoneNumber, truncateString, getHighlightParts } from '../utils';
import { ProgressDots } from './crm/ProgressChecklist';
import CallLogModal from './crm/CallLogModal';
import LeadDetailPanel from './crm/LeadDetailPanel';

interface ListViewProps {
  leads: Lead[];
  onStatusChange: (leadId: string, status: LeadStatus) => void;
  searchQuery?: string;
  onMapView?: (lead: Lead) => void;
  salesProgressMap?: Map<string, SalesProgress[]>;
  // 페이지네이션 관련 추가
  currentPage: number;
  totalCount: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

type SortField = 'bizName' | 'nearestStation' | 'stationDistance' | 'licenseDate' | 'status' | 'createdAt';
type SortOrder = 'asc' | 'desc';

// 정렬 아이콘 컴포넌트 (렌더 밖에서 정의)
function SortIcon({
  field,
  sortField,
  sortOrder
}: {
  field: SortField;
  sortField: SortField;
  sortOrder: SortOrder;
}) {
  if (sortField !== field) return null;
  return sortOrder === 'asc' ? (
    <ChevronUp className="w-4 h-4" />
  ) : (
    <ChevronDown className="w-4 h-4" />
  );
}

// 하이라이트 텍스트 컴포넌트 (렌더 밖에서 정의)
function HighlightText({ text, searchQuery }: { text: string; searchQuery: string }) {
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
}

export default function ListView({
  leads,
  onStatusChange,
  searchQuery = '',
  onMapView,
  salesProgressMap,
  currentPage,
  totalCount,
  pageSize,
  onPageChange
}: ListViewProps) {
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
        {/* 데스크톱: 테이블 뷰 */}
        <div className="hidden md:block overflow-x-auto">
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
                    <SortIcon field="bizName" sortField={sortField} sortOrder={sortOrder} />
                  </div>
                </th>
                <th className="px-5 py-4 text-left text-sm font-semibold text-[var(--text-secondary)] hidden md:table-cell">
                  주소
                </th>
                <th
                  className="px-5 py-4 text-left text-sm font-semibold text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                  onClick={() => handleSort('nearestStation')}
                >
                  <div className="flex items-center gap-1.5">
                    인근역
                    <SortIcon field="nearestStation" sortField={sortField} sortOrder={sortOrder} />
                  </div>
                </th>
                <th
                  className="px-5 py-4 text-left text-sm font-semibold text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)] transition-colors whitespace-nowrap hidden md:table-cell"
                  onClick={() => handleSort('stationDistance')}
                >
                  <div className="flex items-center gap-1.5">
                    거리
                    <SortIcon field="stationDistance" sortField={sortField} sortOrder={sortOrder} />
                  </div>
                </th>
                <th className="px-5 py-4 text-left text-sm font-semibold text-[var(--text-secondary)] hidden md:table-cell">
                  전화번호
                </th>
                <th
                  className="px-5 py-4 text-left text-sm font-semibold text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                  onClick={() => handleSort('licenseDate')}
                >
                  <div className="flex items-center gap-1.5">
                    인허가일
                    <SortIcon field="licenseDate" sortField={sortField} sortOrder={sortOrder} />
                  </div>
                </th>
                <th className="px-5 py-4 text-left text-sm font-semibold text-[var(--text-secondary)] hidden md:table-cell">
                  진행
                </th>
                <th className="px-5 py-4 text-left text-sm font-semibold text-[var(--text-secondary)] hidden md:table-cell">
                  담당자
                </th>
                <th
                  className="px-5 py-4 text-left text-sm font-semibold text-[var(--text-secondary)] cursor-pointer hover:text-[var(--text-primary)] transition-colors"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-1.5">
                    상태
                    <SortIcon field="status" sortField={sortField} sortOrder={sortOrder} />
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
                  onMapView={() => onMapView?.(lead)}
                  salesProgressMap={salesProgressMap}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* 모바일: 카드 뷰 */}
        <div className="md:hidden divide-y divide-[var(--border-subtle)]">
          {sortedLeads.map((lead, index) => (
            <div
              key={lead.id}
              className="p-4 active:bg-[var(--bg-secondary)] transition-colors cursor-pointer"
              onClick={() => setSelectedLeadId(lead.id)}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-[var(--text-primary)]">
                    <HighlightText text={lead.bizName} searchQuery={searchQuery} />
                  </h3>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    <HighlightText text={lead.medicalSubject || ''} searchQuery={searchQuery} />
                  </p>
                </div>
                <div
                  className="px-2 py-1 rounded text-[10px] font-bold"
                  style={{
                    background: STATUS_METRO_COLORS[lead.status].bg,
                    color: STATUS_METRO_COLORS[lead.status].text,
                    border: `1px solid ${STATUS_METRO_COLORS[lead.status].border}`
                  }}
                >
                  {STATUS_LABELS[lead.status]}
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-[var(--text-secondary)]">
                <div className="flex items-center gap-1.5">
                  <span className="w-4 flex justify-center">📍</span>
                  <span className="line-clamp-1">{lead.roadAddress || lead.lotAddress}</span>
                </div>
                {lead.nearestStation && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 flex justify-center">🚉</span>
                    <span>
                      {lead.nearestStation}
                      {lead.stationDistance && ` (${formatDistance(lead.stationDistance)})`}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-3 mt-4 pt-3 border-t border-dashed border-[var(--border-subtle)]">
                {lead.phone && (
                  <a
                    href={`tel:${lead.phone}`}
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 text-[var(--metro-line2)] font-bold text-xs"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    전화
                  </a>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedLeadId(lead.id);
                  }}
                  className="flex items-center gap-1.5 text-[var(--metro-line4)] font-bold text-xs"
                >
                  <FileText className="w-3.5 h-3.5" />
                  제안
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* 페이지네이션 UI 추가 */}
        <div
          className="px-6 py-4 flex items-center justify-between border-t"
          style={{
            background: 'var(--bg-tertiary)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div className="text-sm text-[var(--text-secondary)]">
            전체 <span className="font-semibold text-[var(--text-primary)]">{totalCount.toLocaleString()}</span>건 중
            <span className="mx-1 font-semibold text-[var(--text-primary)]">
              {Math.min((currentPage - 1) * pageSize + 1, totalCount)} - {Math.min(currentPage * pageSize, totalCount)}
            </span>
            표시
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              title="이전 페이지"
              className="p-2 rounded-lg border transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--bg-secondary)]"
              style={{ borderColor: 'var(--glass-border)' }}
            >
              <ChevronUp className="w-5 h-5 -rotate-90" />
            </button>

            <div className="flex items-center gap-1.5 px-2">
              {Array.from({ length: Math.min(5, Math.ceil(totalCount / pageSize)) }, (_, i) => {
                // 현재 페이지 주변의 페이지 번호 계산
                const totalPages = Math.ceil(totalCount / pageSize);
                let pageNum = i + 1;

                if (totalPages > 5) {
                  if (currentPage > 3) {
                    pageNum = currentPage - 2 + i;
                    if (pageNum + (4 - i) > totalPages) {
                      pageNum = totalPages - 4 + i;
                    }
                  }
                }

                if (pageNum > totalPages) return null;

                return (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum)}
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-medium transition-all duration-200"
                    style={{
                      background: currentPage === pageNum ? 'var(--metro-line4)' : 'transparent',
                      color: currentPage === pageNum ? 'white' : 'var(--text-secondary)',
                      border: currentPage === pageNum ? 'none' : '1px solid var(--glass-border)',
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
              className="p-2 rounded-lg border transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[var(--bg-secondary)]"
              style={{ borderColor: 'var(--glass-border)' }}
            >
              <ChevronUp className="w-5 h-5 rotate-90" />
            </button>
          </div>
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
          onSuccess={() => { }}
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
  onMapView?: () => void;
  salesProgressMap?: Map<string, SalesProgress[]>;
}

function LeadRow({ lead, index, onStatusChange, onSelect, onCallLog, searchQuery = '', onMapView, salesProgressMap }: LeadRowProps) {
  const statusColor = STATUS_METRO_COLORS[lead.status];

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
      {/* 병원명 - 클릭 시 맵 뷰로 이동 */}
      <td className="px-5 py-4">
        <div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMapView?.();
            }}
            className="font-semibold text-[var(--text-primary)] line-clamp-1 text-left hover:text-[var(--metro-line4)] hover:underline transition-colors"
            title={`${lead.bizName} - 지도에서 보기`}
          >
            <HighlightText text={lead.bizName} searchQuery={searchQuery} />
          </button>
          {lead.medicalSubject && (
            <div className="text-xs text-[var(--text-muted)] line-clamp-1 mt-0.5">
              <HighlightText text={lead.medicalSubject} searchQuery={searchQuery} />
            </div>
          )}
        </div>
      </td>

      {/* 주소 */}
      <td className="px-5 py-4 hidden md:table-cell">
        <span className="text-sm text-[var(--text-secondary)] line-clamp-1" title={lead.roadAddress || lead.lotAddress}>
          <HighlightText text={truncateString(lead.roadAddress || lead.lotAddress || '-', 30)} searchQuery={searchQuery} />
        </span>
      </td>

      {/* 인근역 */}
      <td className="px-5 py-4">
        {lead.nearestStation ? (
          <div className="flex items-center gap-2">
            <span className="font-medium text-[var(--text-primary)]"><HighlightText text={lead.nearestStation || ''} searchQuery={searchQuery} /></span>
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
      <td className="px-5 py-4 hidden md:table-cell">
        <span className="text-sm text-[var(--text-secondary)]">
          {lead.stationDistance ? formatDistance(lead.stationDistance) : '-'}
        </span>
      </td>

      {/* 전화번호 */}
      <td className="px-5 py-4 hidden md:table-cell">
        {lead.phone ? (
          <a
            href={`tel:${lead.phone}`}
            className="text-sm font-medium hover:underline transition-colors"
            style={{ color: 'var(--metro-line4)' }}
            onClick={(e) => e.stopPropagation()}
            title="전화 걸기"
          >
            <HighlightText text={formatPhoneNumber(lead.phone)} searchQuery={searchQuery} />
          </a>
        ) : (
          <span className="text-[var(--text-muted)]">-</span>
        )}
      </td>

      {/* 인허가일 */}
      <td className="px-5 py-4 hidden md:table-cell">
        <span className="text-sm text-[var(--text-secondary)]">{lead.licenseDate || '-'}</span>
      </td>

      {/* 진행 상태 */}
      <td className="px-5 py-4 hidden md:table-cell">
        <ProgressDots leadId={lead.id} progress={salesProgressMap?.get(lead.id)} />
      </td>

      {/* 담당자 */}
      <td className="px-5 py-4 hidden md:table-cell">
        {lead.assignedToName ? (
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-[var(--metro-line9)]" />
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {lead.assignedToName.split('@')[0]}
            </span>
          </div>
        ) : (
          <span className="text-[var(--text-muted)]">-</span>
        )}
      </td>

      {/* 상태 */}
      <td className="px-5 py-4">
        <select
          id={`status-select-${lead.id}`}
          name="status"
          value={lead.status}
          onChange={(e) => {
            e.stopPropagation();
            onStatusChange(lead.id, e.target.value as LeadStatus);
          }}
          onClick={(e) => e.stopPropagation()}
          title="상태 변경"
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
