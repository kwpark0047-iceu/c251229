'use client';

/**
 * 리스트 뷰 컴포넌트
 * 병원 리드를 테이블 형태로 표시
 */

import React, { useState } from 'react';
import { Phone, FileText, ChevronDown, ChevronUp } from 'lucide-react';

import { Lead, LeadStatus, STATUS_COLORS, STATUS_LABELS, LINE_COLORS } from '../types';
import { formatDistance, formatPhoneNumber, truncateString } from '../utils';

interface ListViewProps {
  leads: Lead[];
  onStatusChange: (leadId: string, status: LeadStatus) => void;
}

type SortField = 'bizName' | 'nearestStation' | 'stationDistance' | 'licenseDate' | 'status';
type SortOrder = 'asc' | 'desc';

export default function ListView({ leads, onStatusChange }: ListViewProps) {
  const [sortField, setSortField] = useState<SortField>('licenseDate');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

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
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th
                className="px-4 py-3 text-left text-sm font-semibold text-slate-600 cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort('bizName')}
              >
                <div className="flex items-center gap-1">
                  병원명
                  <SortIcon field="bizName" />
                </div>
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">
                주소
              </th>
              <th
                className="px-4 py-3 text-left text-sm font-semibold text-slate-600 cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort('nearestStation')}
              >
                <div className="flex items-center gap-1">
                  인근역
                  <SortIcon field="nearestStation" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-sm font-semibold text-slate-600 cursor-pointer hover:bg-slate-100 whitespace-nowrap"
                onClick={() => handleSort('stationDistance')}
              >
                <div className="flex items-center gap-1">
                  거리
                  <SortIcon field="stationDistance" />
                </div>
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-600">
                전화번호
              </th>
              <th
                className="px-4 py-3 text-left text-sm font-semibold text-slate-600 cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort('licenseDate')}
              >
                <div className="flex items-center gap-1">
                  인허가일
                  <SortIcon field="licenseDate" />
                </div>
              </th>
              <th
                className="px-4 py-3 text-left text-sm font-semibold text-slate-600 cursor-pointer hover:bg-slate-100"
                onClick={() => handleSort('status')}
              >
                <div className="flex items-center gap-1">
                  상태
                  <SortIcon field="status" />
                </div>
              </th>
              <th className="px-4 py-3 text-center text-sm font-semibold text-slate-600">
                액션
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedLeads.map(lead => (
              <LeadRow key={lead.id} lead={lead} onStatusChange={onStatusChange} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

interface LeadRowProps {
  lead: Lead;
  onStatusChange: (leadId: string, status: LeadStatus) => void;
}

function LeadRow({ lead, onStatusChange }: LeadRowProps) {
  const statusColor = STATUS_COLORS[lead.status];

  return (
    <tr className="hover:bg-slate-50 transition-colors">
      {/* 병원명 */}
      <td className="px-4 py-3">
        <div>
          <div className="font-medium text-slate-800 line-clamp-1" title={lead.bizName}>
            {lead.bizName}
          </div>
          {lead.medicalSubject && (
            <div className="text-xs text-slate-500 line-clamp-1">
              {lead.medicalSubject}
            </div>
          )}
        </div>
      </td>

      {/* 주소 */}
      <td className="px-4 py-3">
        <span className="text-sm text-slate-600 line-clamp-1" title={lead.roadAddress || lead.lotAddress}>
          {truncateString(lead.roadAddress || lead.lotAddress || '-', 30)}
        </span>
      </td>

      {/* 인근역 */}
      <td className="px-4 py-3">
        {lead.nearestStation ? (
          <div className="flex items-center gap-1.5">
            <span className="font-medium text-slate-700">{lead.nearestStation}</span>
            {lead.stationLines && (
              <div className="flex gap-0.5">
                {lead.stationLines.slice(0, 2).map(line => (
                  <span
                    key={line}
                    className="w-4 h-4 rounded-full text-white text-[10px] flex items-center justify-center font-bold"
                    style={{ backgroundColor: LINE_COLORS[line] || '#888' }}
                  >
                    {line}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <span className="text-slate-400">-</span>
        )}
      </td>

      {/* 거리 */}
      <td className="px-4 py-3">
        <span className="text-sm text-slate-600">
          {lead.stationDistance ? formatDistance(lead.stationDistance) : '-'}
        </span>
      </td>

      {/* 전화번호 */}
      <td className="px-4 py-3">
        {lead.phone ? (
          <a
            href={`tel:${lead.phone}`}
            className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
          >
            {formatPhoneNumber(lead.phone)}
          </a>
        ) : (
          <span className="text-slate-400">-</span>
        )}
      </td>

      {/* 인허가일 */}
      <td className="px-4 py-3">
        <span className="text-sm text-slate-600">{lead.licenseDate || '-'}</span>
      </td>

      {/* 상태 */}
      <td className="px-4 py-3">
        <select
          value={lead.status}
          onChange={(e) => onStatusChange(lead.id, e.target.value as LeadStatus)}
          className={`text-sm px-2 py-1 rounded-md border ${statusColor.bg} ${statusColor.text} ${statusColor.border} cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500`}
        >
          {(['NEW', 'PROPOSAL_SENT', 'CONTACTED', 'CONTRACTED'] as LeadStatus[]).map(status => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
      </td>

      {/* 액션 */}
      <td className="px-4 py-3">
        <div className="flex items-center justify-center gap-1">
          {lead.phone && (
            <a
              href={`tel:${lead.phone}`}
              className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
              title="전화하기"
            >
              <Phone className="w-4 h-4" />
            </a>
          )}
          <button
            className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
            title="제안서 보내기"
          >
            <FileText className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}
