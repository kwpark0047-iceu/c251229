'use client';

/**
 * 인벤토리 테이블 컴포넌트
 * 광고매체 재고 목록 표시
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Search, Train, Trash2, AlertCircle, Upload } from 'lucide-react';
import InventoryUploadModal from './InventoryUploadModal';
import {
  AdInventory,
  AvailabilityStatus,
  AVAILABILITY_LABELS,
  AVAILABILITY_COLORS,
  AD_TYPE_LABELS,
} from '../../types';
import { getInventory, deleteInventory, updateInventoryStatus } from '../../inventory-service';

interface InventoryTableProps {
  onRefresh?: () => void;
}

export default function InventoryTable({ onRefresh }: InventoryTableProps) {
  const [inventory, setInventory] = useState<AdInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [statusFilters, setStatusFilters] = useState<AvailabilityStatus[]>([]); // empty = all statuses
  const [typeFilters, setTypeFilters] = useState<string[]>([]); // empty = all types

  const loadInventory = useCallback(async () => {
    setLoading(true);
    const result = await getInventory();
    if (result.success) {
      setInventory(result.inventory);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
     
    loadInventory();
  }, [loadInventory]);

  // 필터링된 인벤토리
  const filteredInventory = inventory.filter(item => {
    const matchesSearch =
      searchTerm === '' ||
      item.stationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.locationCode.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilters.length === 0 || statusFilters.includes(item.availabilityStatus);

    const matchesType =
      typeFilters.length === 0 || typeFilters.includes(item.adType);

    return matchesSearch && matchesStatus && matchesType;
  });

  // 광고 유형 목록
  const adTypes = [...new Set(inventory.map(i => i.adType))];

  // 상태 변경 (로컬 상태 직접 업데이트로 최적화)
  const handleStatusChange = async (id: string, newStatus: AvailabilityStatus) => {
    // 낙관적 업데이트: UI 먼저 변경
    setInventory(prev => prev.map(item =>
      item.id === id ? { ...item, availabilityStatus: newStatus } : item
    ));

    const result = await updateInventoryStatus(id, newStatus);
    if (!result.success) {
      // 실패 시 원복을 위해 재조회
      loadInventory();
    }
  };

  // 삭제 (로컬 상태 직접 업데이트로 최적화)
  const handleDelete = async (id: string) => {
    if (!confirm('이 광고매체를 삭제하시겠습니까?')) return;

    // 낙관적 업데이트: UI에서 먼저 제거
    const previousInventory = inventory;
    setInventory(prev => prev.filter(item => item.id !== id));

    const result = await deleteInventory(id);
    if (result.success) {
      onRefresh?.();
    } else {
      // 실패 시 원복
      setInventory(previousInventory);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (inventory.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-700 mb-2">
          등록된 광고매체가 없습니다
        </h3>
        <p className="text-slate-500 mb-6">
          엑셀 파일을 업로드하여 광고매체를 등록하세요.
        </p>
        <button
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Upload className="w-4 h-4" />
          신규 데이터 업로드
        </button>

        {showUploadModal && (
          <InventoryUploadModal
            onClose={() => setShowUploadModal(false)}
            onSuccess={() => {
              setShowUploadModal(false);
              loadInventory();
              onRefresh?.();
            }}
          />
        )}
      </div>
    );
  }

  return (
    <>
      {showUploadModal && (
        <InventoryUploadModal
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false);
            loadInventory();
            onRefresh?.();
          }}
        />
      )}
      <div className="space-y-4">
        {/* 상단 액션 및 검색 바 */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="relative w-72 max-w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              id="inventory-search"
              type="text"
              placeholder="역명 또는 위치코드 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-xl text-sm focus:ring-2 focus:ring-[var(--metro-line2)] focus:border-transparent transition-all text-[var(--text-primary)]"
              aria-label="인벤토리 검색"
            />
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-[var(--metro-line2)]">
              {filteredInventory.length.toLocaleString()}건 조회됨
            </span>
            <button
              type="button"
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 bg-[var(--metro-line2)] text-white text-sm font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-[0_4px_15px_rgba(60,181,74,0.3)]"
            >
              <Upload className="w-4 h-4" />
              신규 업로드
            </button>
          </div>
        </div>

        {/* 필터 그룹 */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 p-3 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-xl">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[var(--text-muted)] w-10">상태</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {(['AVAILABLE', 'RESERVED', 'OCCUPIED'] as AvailabilityStatus[]).map(status => {
                const isSelected = statusFilters.includes(status);
                const colorMap = {
                  'AVAILABLE': 'var(--metro-line2)',
                  'RESERVED': 'var(--metro-line4)',
                  'OCCUPIED': 'var(--metro-line1)'
                };
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => {
                      setStatusFilters(prev =>
                        prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
                      );
                    }}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-all font-medium border ${
                      isSelected 
                        ? 'text-white shadow-sm border-transparent' 
                        : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-secondary)]'
                    }`}
                     
   
  /* stylelint-disable-next-line */
  // @ts-ignore
  // noinspection CssInlineStyle
  // NOSONAR
  style={isSelected ? { backgroundColor: colorMap[status] } : undefined}
                  >
                    {AVAILABILITY_LABELS[status]}
                  </button>
                );
              })}
            </div>
          </div>

          {adTypes.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="hidden sm:block w-px h-6 bg-[var(--border-subtle)] mr-2" />
              <span className="text-xs font-semibold text-[var(--text-muted)] w-10">유형</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {adTypes.map(type => {
                  const isSelected = typeFilters.includes(type);
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => {
                        setTypeFilters(prev =>
                          prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
                        );
                      }}
                      className={`px-3 py-1.5 text-xs rounded-lg transition-all font-medium border ${
                        isSelected 
                          ? 'bg-[var(--metro-line9)] text-white shadow-sm border-transparent' 
                          : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-secondary)]'
                      }`}
                    >
                      {AD_TYPE_LABELS[type] || type}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  역명
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  위치코드
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  광고유형
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  크기
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  월단가
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  액션
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredInventory.map(item => {
                const statusColor = AVAILABILITY_COLORS[item.availabilityStatus];
                return (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Train className="w-4 h-4 text-slate-400" />
                        <span className="font-medium text-slate-800">
                          {item.stationName}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {item.locationCode}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {AD_TYPE_LABELS[item.adType] || item.adType}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {item.adSize || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-800 text-right font-medium">
                      {item.priceMonthly
                        ? `${item.priceMonthly.toLocaleString()}원`
                        : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <select
                          id={`status-select-${item.id}`}
                          value={item.availabilityStatus}
                          onChange={(e) =>
                            handleStatusChange(item.id, e.target.value as AvailabilityStatus)
                          }
                          className={`text-xs font-medium px-2 py-1 rounded-full border ${statusColor.bg} ${statusColor.text} ${statusColor.border}`}
                          title="상태 변경"
                          aria-label={`${item.stationName} ${item.locationCode} 상태 변경`}
                        >
                          <option value="AVAILABLE">사용 가능</option>
                          <option value="RESERVED">예약됨</option>
                          <option value="OCCUPIED">사용 중</option>
                        </select>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="삭제"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 통계 요약 */}
      <div className="grid grid-cols-3 gap-4">
        {(['AVAILABLE', 'RESERVED', 'OCCUPIED'] as AvailabilityStatus[]).map(status => {
          const count = inventory.filter(i => i.availabilityStatus === status).length;
          const color = AVAILABILITY_COLORS[status];
          return (
            <div
              key={status}
              className={`p-4 rounded-lg border ${color.bg} ${color.border}`}
            >
              <div className={`text-2xl font-bold ${color.text}`}>{count}</div>
              <div className="text-sm text-slate-600">
                {AVAILABILITY_LABELS[status]}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
