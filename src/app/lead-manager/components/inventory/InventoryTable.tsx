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
import { SUBWAY_STATIONS, METRO_LINES, METRO_LINE_NAMES, METRO_LINE_COLORS, MetroLine } from '@/lib/constants';

interface InventoryTableProps {
  onRefresh?: () => void;
}

export default function InventoryTable({ onRefresh }: InventoryTableProps) {
  // State definitions
  const [inventory, setInventory] = useState<AdInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [statusFilters, setStatusFilters] = useState<AvailabilityStatus[]>([]);
  const [typeFilters, setTypeFilters] = useState<string[]>([]);
  const [lineFilters, setLineFilters] = useState<string[]>([]);

  // Load all inventory on mount
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

  // Apply client‑side filtering based on search, status, type, and line
  const filteredInventory = inventory.filter(item => {
    const matchesSearch =
      searchTerm === '' ||
      item.stationName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.locationCode.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus =
      statusFilters.length === 0 || statusFilters.includes(item.availabilityStatus);
      
    const matchesType =
      typeFilters.length === 0 || typeFilters.includes(item.adType);
      
    const matchesLine = lineFilters.length === 0 || (() => {
      // Find the station in the predefined list
      const cleanStationName = item.stationName.replace(/역$/, '');
      const station = SUBWAY_STATIONS.find(s => s.name === cleanStationName);
      if (station) {
        return station.lines.some(line => lineFilters.includes(line));
      }
      return false; // Exclude if we can't determine the line and filters are active
    })();

    return matchesSearch && matchesStatus && matchesType && matchesLine;
  });

  // 광고 유형 목록 (필터 UI 용)
  const adTypes = Array.from(new Set(inventory.map(i => i.adType)));

  // 노선 목록 (필터 UI 용)
  const availableLinesSet = new Set(inventory.flatMap(item => {
    const cleanStationName = item.stationName.replace(/역$/, '');
    const station = SUBWAY_STATIONS.find(s => s.name === cleanStationName);
    return station ? station.lines : [];
  }));
  const orderedAvailableLines = METRO_LINES.filter(line => availableLinesSet.has(line));

  // Optimistic status update
  const handleStatusChange = async (id: string, newStatus: AvailabilityStatus) => {
    setInventory(prev =>
      prev.map(item => (item.id === id ? { ...item, availabilityStatus: newStatus } : item))
    );
    const result = await updateInventoryStatus(id, newStatus);
    if (!result.success) {
      // Re‑load on failure to ensure UI consistency
      await loadInventory();
    }
  };

  // Optimistic delete
  const handleDelete = async (id: string) => {
    if (!confirm('이 광고매체를 삭제하시겠습니까?')) return;
    const previous = inventory;
    setInventory(prev => prev.filter(item => item.id !== id));
    const result = await deleteInventory(id);
    if (result.success) {
      onRefresh?.();
    } else {
      setInventory(previous);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (inventory.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-700 mb-2">등록된 광고매체가 없습니다</h3>
        <p className="text-slate-500 mb-6">엑셀 파일을 업로드하여 광고매체를 등록하세요.</p>
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
              onChange={e => setSearchTerm(e.target.value)}
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
          {/* 상태 필터 */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[var(--text-muted)] w-10">상태</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {(['AVAILABLE', 'RESERVED', 'OCCUPIED'] as AvailabilityStatus[]).map(status => {
                const isSelected = statusFilters.includes(status);
                const colorMap = {
                  AVAILABLE: 'var(--metro-line2)',
                  RESERVED: 'var(--metro-line4)',
                  OCCUPIED: 'var(--metro-line1)',
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
                    className={`px-3 py-1.5 text-xs rounded-lg transition-all font-medium border ${isSelected ? 'text-white shadow-sm border-transparent' : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-secondary)]'}`}
                    style={isSelected ? { backgroundColor: colorMap[status] } : undefined}
                  >
                    {AVAILABILITY_LABELS[status]}
                  </button>
                );
              })}
            </div>
          </div>
          {/* 광고 유형 필터 */}
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
                      className={`px-3 py-1.5 text-xs rounded-lg transition-all font-medium border ${isSelected ? 'bg-[var(--metro-line9)] text-white shadow-sm border-transparent' : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-secondary)]'}`}
                    >
                      {AD_TYPE_LABELS[type] || type}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {/* 노선 필터 */}
          {orderedAvailableLines.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="hidden sm:block w-px h-6 bg-[var(--border-subtle)] mr-2" />
              <span className="text-xs font-semibold text-[var(--text-muted)] w-10">노선</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {orderedAvailableLines.map(line => {
                  const isSelected = lineFilters.includes(line);
                  return (
                    <button
                      key={line}
                      type="button"
                      onClick={() => {
                        setLineFilters(prev =>
                          prev.includes(line) ? prev.filter(l => l !== line) : [...prev, line]
                        );
                      }}
                      className={`px-3 py-1.5 text-xs rounded-lg transition-all font-medium border ${isSelected ? 'text-white shadow-sm border-transparent' : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-secondary)]'}`}
                      style={isSelected ? { backgroundColor: METRO_LINE_COLORS[line] } : undefined}
                    >
                      {METRO_LINE_NAMES[line]}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 인벤토리 목록 테이블 */}
        <div className="overflow-x-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-tertiary)]">
          <table className="w-full text-sm text-left">
            <thead className="bg-[var(--bg-secondary)] text-[var(--text-muted)] border-b border-[var(--border-subtle)]">
              <tr>
                <th className="px-4 py-3 font-semibold">역명</th>
                <th className="px-4 py-3 font-semibold">위치코드</th>
                <th className="px-4 py-3 font-semibold">광고유형</th>
                <th className="px-4 py-3 font-semibold">상태</th>
                <th className="px-4 py-3 font-semibold text-center">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">
              {filteredInventory.length > 0 ? (
                filteredInventory.map((item) => (
                  <tr key={item.id} className="hover:bg-[var(--bg-secondary)]/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{item.stationName}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{item.locationCode}</td>
                    <td className="px-4 py-3 text-[var(--text-secondary)]">{AD_TYPE_LABELS[item.adType] || item.adType}</td>
                    <td className="px-4 py-3">
                      <select
                        value={item.availabilityStatus}
                        onChange={(e) => handleStatusChange(item.id, e.target.value as AvailabilityStatus)}
                        className={`text-xs px-2 py-1 rounded outline-none font-medium ${AVAILABILITY_COLORS[item.availabilityStatus].bg} ${AVAILABILITY_COLORS[item.availabilityStatus].text} border ${AVAILABILITY_COLORS[item.availabilityStatus].border}`}
                      >
                        {(Object.keys(AVAILABILITY_LABELS) as AvailabilityStatus[]).map((status) => (
                          <option key={status} value={status}>
                            {AVAILABILITY_LABELS[status]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1.5 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded transition-colors"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-[var(--text-muted)]">
                    조건에 맞는 광고매체가 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
