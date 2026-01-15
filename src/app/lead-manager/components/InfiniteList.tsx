/**
 * 무한 스크롤 리드 리스트 컴포넌트
 * 대용량 데이터 페이징 처리
 */

'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Lead, LeadStatus } from '../types';
import { STATUS_LABELS, CATEGORY_COLORS } from '../constants';

interface InfiniteListProps {
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
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
}

// 리드 로딩 스피너
const LoadingSpinner = () => (
  <div className="flex justify-center py-4">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
  </div>
);

// 리드 아이템 컴포넌트
const LeadItem = React.memo(({ 
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
    <tr
      className={`border-b hover:bg-gray-50 cursor-pointer transition-colors ${
        isSelected ? 'bg-blue-50' : ''
      }`}
      onClick={onSelect}
    >
      <td className="p-4">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => {}}
          className="rounded border-gray-300"
          onClick={(e) => e.stopPropagation()}
        />
      </td>
      <td className="p-4 font-medium">{lead.bizName}</td>
      <td className="p-4 text-gray-600">{lead.roadAddress}</td>
      <td className="p-4 text-gray-500">{lead.bizType}</td>
      <td className="p-4">
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            CATEGORY_COLORS[lead.category]
          }`}
        >
          {STATUS_LABELS[lead.status]}
        </span>
      </td>
      <td className="p-4 text-gray-500">{lead.nearestStation}</td>
      <td className="p-4 text-gray-500">{lead.distance}m</td>
      <td className="p-4 text-gray-500">
        {new Date(lead.createdAt).toLocaleDateString()}
      </td>
      <td className="p-4">
        <div className="flex items-center gap-2">
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
      </td>
    </tr>
  );
});

LeadItem.displayName = 'LeadItem';

export default function InfiniteList({
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
  onLoadMore,
  hasMore,
  isLoading,
}: InfiniteListProps) {
  const [visibleLeads, setVisibleLeads] = useState<Lead[]>([]);
  const [displayedCount, setDisplayedCount] = useState(50); // 초기 표시 개수
  const observerRef = useRef<IntersectionObserver>();
  const lastItemRef = useRef<HTMLTableRowElement>(null);

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

  // 표시할 리드 업데이트
  useEffect(() => {
    setVisibleLeads(filteredLeads.slice(0, displayedCount));
  }, [filteredLeads, displayedCount]);

  // 무한 스크롤 옵저버 설정
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMore && !isLoading) {
          onLoadMore();
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px', // 100px 미리 로드
      }
    );

    if (lastItemRef.current) {
      observerRef.current.observe(lastItemRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, isLoading, onLoadMore]);

  // 검색/필터 변경 시 표시 개수 리셋
  useEffect(() => {
    setDisplayedCount(50);
  }, [searchQuery, statusFilter, categoryFilter]);

  // 더 많이 로드 버튼 핸들러
  const handleLoadMore = useCallback(() => {
    if (hasMore && !isLoading) {
      onLoadMore();
    }
  }, [hasMore, isLoading, onLoadMore]);

  return (
    <div className="flex-1 bg-white rounded-lg overflow-hidden">
      <div className="p-4 border-b bg-gray-50">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">
            리드 목록 ({filteredLeads.length.toLocaleString()}개)
          </h2>
          <div className="text-sm text-gray-500">
            {searchQuery && `"${searchQuery}" 검색 결과`}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-4 text-left">
                <input
                  type="checkbox"
                  className="rounded border-gray-300"
                />
              </th>
              <th className="p-4 text-left font-medium">상호명</th>
              <th className="p-4 text-left font-medium">주소</th>
              <th className="p-4 text-left font-medium">업종</th>
              <th className="p-4 text-left font-medium">상태</th>
              <th className="p-4 text-left font-medium">인근역</th>
              <th className="p-4 text-left font-medium">거리</th>
              <th className="p-4 text-left font-medium">등록일</th>
              <th className="p-4 text-left font-medium">관리</th>
            </tr>
          </thead>
          <tbody>
            {visibleLeads.map((lead, index) => (
              <LeadItem
                key={lead.id}
                lead={lead}
                isSelected={selectedLeads.has(lead.id)}
                onSelect={() => onSelectLead(lead.id)}
                onUpdateStatus={(status) => onUpdateStatus(lead.id, status)}
                onDelete={() => onDeleteLead(lead.id)}
                onCall={() => onCallLead(lead.id)}
                onEdit={() => onEditLead(lead.id)}
              />
            ))}
            
            {/* 마지막 아이템 참조 */}
            {visibleLeads.length > 0 && (
              <tr ref={lastItemRef}>
                <td colSpan={9} className="p-2">
                  {isLoading && <LoadingSpinner />}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 더 불러오기 버튼 */}
      {hasMore && !isLoading && (
        <div className="p-4 border-t">
          <button
            onClick={handleLoadMore}
            className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            더보기 ({visibleLeads.length} / {filteredLeads.length})
          </button>
        </div>
      )}

      {/* 데이터 없음 */}
      {visibleLeads.length === 0 && !isLoading && (
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p>검색 결과가 없습니다</p>
          </div>
        </div>
      )}
    </div>
  );
}
