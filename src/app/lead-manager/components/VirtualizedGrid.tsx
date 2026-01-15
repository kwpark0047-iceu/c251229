/**
 * 가상화된 리드 그리드 컴포넌트
 * 대용량 데이터 표시를 위한 성능 최적화
 */

'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { FixedSizeGrid as Grid } from 'react-window';
import { Lead, LeadStatus } from '../types';
import { STATUS_LABELS, CATEGORY_COLORS } from '../constants';

interface VirtualizedGridProps {
  leads: Lead[];
  selectedLeads: Set<string>;
  onSelectLead: (id: string) => void;
  onUpdateStatus: (id: string, status: LeadStatus) => void;
  onDeleteLead: (id: string) => void;
  onCallLead: (id: string) => void;
  onEditLead: (id: string) => void;
  searchQuery: string;
  statusFilter: LeadStatus[];
  categoryFilter: string[];
}

// 리드 카드 컴포넌트
const LeadCard = React.memo(({ 
  lead, 
  isSelected, 
  onSelect, 
  onUpdateStatus, 
  onDelete, 
  onCall, 
  onEdit 
}: {
  lead: Lead;
  isSelected: boolean;
  onSelect: () => void;
  onUpdateStatus: (status: LeadStatus) => void;
  onDelete: () => void;
  onCall: () => void;
  onEdit: () => void;
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div
      className={`glass-card p-4 cursor-pointer transition-all duration-200 ${
        isSelected ? 'ring-2 ring-blue-500' : 'hover:shadow-lg'
      }`}
      onClick={onSelect}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-gray-900 truncate flex-1">
          {lead.bizName}
        </h3>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(!isMenuOpen);
            }}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
          
          {isMenuOpen && (
            <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg z-10">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                  setIsMenuOpen(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100"
              >
                수정
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCall();
                  setIsMenuOpen(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100"
              >
                통화
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                  setIsMenuOpen(false);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600"
              >
                삭제
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-1 text-sm">
        <p className="text-gray-600 truncate">{lead.roadAddress}</p>
        <p className="text-gray-500">{lead.bizType}</p>
        <div className="flex items-center justify-between">
          <span
            className={`px-2 py-1 rounded-full text-xs font-medium ${
              CATEGORY_COLORS[lead.category]
            }`}
          >
            {STATUS_LABELS[lead.status]}
          </span>
          <span className="text-gray-500">
            {lead.nearestStation} ({lead.distance}m)
          </span>
        </div>
      </div>

      <div className="mt-3 flex gap-2">
        <select
          value={lead.status}
          onChange={(e) => {
            e.stopPropagation();
            onUpdateStatus(e.target.value as LeadStatus);
          }}
          className="text-xs px-2 py-1 border rounded"
          onClick={(e) => e.stopPropagation()}
        >
          <option value="NEW">신규</option>
          <option value="PROPOSAL_SENT">제안서 발송</option>
          <option value="CONTACTED">연락 완료</option>
          <option value="CONTRACTED">계약 완료</option>
        </select>
      </div>
    </div>
  );
});

LeadCard.displayName = 'LeadCard';

// 그리드 아이템 컴포넌트
const GridItem = React.memo(({ 
  columnIndex, 
  rowIndex, 
  style, 
  data 
}: {
  columnIndex: number;
  rowIndex: number;
  style: React.CSSProperties;
  data: any;
}) => {
  const { leads, columns, selectedLeads, onSelectLead, onUpdateStatus, onDeleteLead, onCallLead, onEditLead } = data;
  const leadIndex = rowIndex * columns + columnIndex;
  
  if (leadIndex >= leads.length) {
    return <div style={style} />;
  }

  const lead = leads[leadIndex];
  const isSelected = selectedLeads.has(lead.id);

  return (
    <div style={style} className="p-2">
      <LeadCard
        lead={lead}
        isSelected={isSelected}
        onSelect={() => onSelectLead(lead.id)}
        onUpdateStatus={(status) => onUpdateStatus(lead.id, status)}
        onDelete={() => onDeleteLead(lead.id)}
        onCall={() => onCallLead(lead.id)}
        onEdit={() => onEditLead(lead.id)}
      />
    </div>
  );
});

GridItem.displayName = 'GridItem';

export default function VirtualizedGrid({
  leads,
  selectedLeads,
  onSelectLead,
  onUpdateStatus,
  onDeleteLead,
  onCallLead,
  onEditLead,
  searchQuery,
  statusFilter,
  categoryFilter,
}: VirtualizedGridProps) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const columns = 4; // 그리드 열 수
  const cardWidth = 280; // 카드 너비
  const cardHeight = 200; // 카드 높이
  const gap = 16; // 카드 간격

  // 필터링된 데이터 계산
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesSearch = !searchQuery || 
        lead.bizName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.roadAddress.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(lead.status);
      const matchesCategory = categoryFilter.length === 0 || categoryFilter.includes(lead.category);

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [leads, searchQuery, statusFilter, categoryFilter]);

  // 컨테이너 크기 측정
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateDimensions();
    const resizeObserver = new ResizeObserver(updateDimensions);
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  // 그리드 데이터
  const gridData = useMemo(() => ({
    leads: filteredLeads,
    columns,
    selectedLeads,
    onSelectLead,
    onUpdateStatus,
    onDeleteLead,
    onCallLead,
    onEditLead,
  }), [filteredLeads, columns, selectedLeads, onSelectLead, onUpdateStatus, onDeleteLead, onCallLead, onEditLead]);

  if (dimensions.width === 0) {
    return (
      <div 
        ref={containerRef}
        className="flex-1 bg-gray-50 rounded-lg"
        style={{ minHeight: '400px' }}
      />
    );
  }

  return (
    <div ref={containerRef} className="flex-1 bg-gray-50 rounded-lg">
      <div className="p-4 border-b bg-white">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">
            리드 목록 ({filteredLeads.length.toLocaleString()}개)
          </h2>
          <div className="text-sm text-gray-500">
            {searchQuery && `"${searchQuery}" 검색 결과`}
          </div>
        </div>
      </div>

      {filteredLeads.length === 0 ? (
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>검색 결과가 없습니다</p>
          </div>
        </div>
      ) : (
        <Grid
          columnCount={columns}
          columnWidth={cardWidth + gap}
          height={dimensions.height - 80} // 헤더 높이 제외
          rowCount={Math.ceil(filteredLeads.length / columns)}
          rowHeight={cardHeight + gap}
          width={dimensions.width}
          itemData={gridData}
          overscanCount={5} // 스크롤 시 미리 렌더링할 아이템 수
        >
          {GridItem}
        </Grid>
      )}
    </div>
  );
}
