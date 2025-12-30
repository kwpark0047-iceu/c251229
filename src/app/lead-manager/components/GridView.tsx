'use client';

/**
 * 그리드 뷰 컴포넌트
 * 병원 리드를 카드 형태로 표시
 */

import React from 'react';
import {
  Phone,
  FileText,
  MapPin,
  Train,
  Calendar,
  ChevronDown,
} from 'lucide-react';

import { Lead, LeadStatus, STATUS_COLORS, STATUS_LABELS, LINE_COLORS } from '../types';
import { formatDistance, formatPhoneNumber, truncateString } from '../utils';

interface GridViewProps {
  leads: Lead[];
  onStatusChange: (leadId: string, status: LeadStatus) => void;
}

export default function GridView({ leads, onStatusChange }: GridViewProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {leads.map(lead => (
        <LeadCard key={lead.id} lead={lead} onStatusChange={onStatusChange} />
      ))}
    </div>
  );
}

interface LeadCardProps {
  lead: Lead;
  onStatusChange: (leadId: string, status: LeadStatus) => void;
}

function LeadCard({ lead, onStatusChange }: LeadCardProps) {
  const [isStatusOpen, setIsStatusOpen] = React.useState(false);
  const statusColor = STATUS_COLORS[lead.status];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      {/* 상단 - 상태 표시 */}
      <div className={`px-4 py-2 ${statusColor.bg} border-b ${statusColor.border}`}>
        <div className="flex items-center justify-between">
          <span className={`text-sm font-medium ${statusColor.text}`}>
            {STATUS_LABELS[lead.status]}
          </span>
          <div className="relative">
            <button
              onClick={() => setIsStatusOpen(!isStatusOpen)}
              className="p-1 hover:bg-white/50 rounded transition-colors"
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
      <div className="p-4">
        {/* 병원명 */}
        <h3 className="font-semibold text-slate-800 mb-2 line-clamp-1" title={lead.bizName}>
          {lead.bizName}
        </h3>

        {/* 진료과목 */}
        {lead.medicalSubject && (
          <p className="text-sm text-slate-500 mb-3 line-clamp-1">
            {lead.medicalSubject}
          </p>
        )}

        {/* 정보 목록 */}
        <div className="space-y-2 text-sm">
          {/* 주소 */}
          <div className="flex items-start gap-2 text-slate-600">
            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-400" />
            <span className="line-clamp-2">
              {truncateString(lead.roadAddress || lead.lotAddress || '-', 50)}
            </span>
          </div>

          {/* 인근역 */}
          {lead.nearestStation && (
            <div className="flex items-center gap-2 text-slate-600">
              <Train className="w-4 h-4 flex-shrink-0 text-slate-400" />
              <div className="flex items-center gap-1.5">
                <span className="font-medium">{lead.nearestStation}역</span>
                {lead.stationLines && (
                  <div className="flex gap-0.5">
                    {lead.stationLines.slice(0, 3).map(line => (
                      <span
                        key={line}
                        className="w-5 h-5 rounded-full text-white text-xs flex items-center justify-center font-bold"
                        style={{ backgroundColor: LINE_COLORS[line] || '#888' }}
                      >
                        {line}
                      </span>
                    ))}
                  </div>
                )}
                {lead.stationDistance && (
                  <span className="text-slate-400">
                    ({formatDistance(lead.stationDistance)})
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 인허가일 */}
          {lead.licenseDate && (
            <div className="flex items-center gap-2 text-slate-600">
              <Calendar className="w-4 h-4 flex-shrink-0 text-slate-400" />
              <span>{lead.licenseDate}</span>
            </div>
          )}
        </div>
      </div>

      {/* 하단 액션 버튼 */}
      <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex gap-2">
        {lead.phone && (
          <a
            href={`tel:${lead.phone}`}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
          >
            <Phone className="w-4 h-4" />
            전화
          </a>
        )}
        <button className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium">
          <FileText className="w-4 h-4" />
          제안서
        </button>
      </div>
    </div>
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
      <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-20">
        {statuses.map(status => {
          const color = STATUS_COLORS[status];
          return (
            <button
              key={status}
              onClick={() => onSelect(status)}
              className={`w-full px-3 py-2 text-left text-sm hover:bg-slate-50 flex items-center gap-2 ${
                status === currentStatus ? 'bg-slate-50' : ''
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${color.bg} ${color.border} border`} />
              <span className={color.text}>{STATUS_LABELS[status]}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
