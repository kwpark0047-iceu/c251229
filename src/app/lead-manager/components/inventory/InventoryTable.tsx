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
import { TOTAL_SUBWAY_STATIONS } from '../../data/stations';

// ─── 상수 정의 ───────────────────────────────────────────────
// 노선 번호 및 역명 정규식 / 상수
const LINE_NUMBER_REGEX = /(\d+)호선/g;
const HOSUN = '호선';
const STATION_SUFFIX_REGEX = /역$/;

// 삭제 확인 메시지
const DELETE_CONFIRM_MESSAGE = '이 광고매체를 삭제하시겠습니까?';

// 로딩 스피너 클래스
const SPINNER_CLASS = 'animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600';

// 빈 상태(인벤토리 없음) UI
const EMPTY_TITLE = '등록된 광고매체가 없습니다';
const EMPTY_DESCRIPTION = '엑셀 파일을 업로드하여 광고매체를 등록하세요.';
const EMPTY_UPLOAD_BUTTON_CLASS =
  'inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors';
const EMPTY_UPLOAD_LABEL = '신규 데이터 업로드';

// 검색바 UI
const SEARCH_PLACEHOLDER = '역명 또는 위치코드 검색...';
const SEARCH_INPUT_CLASS =
  'w-full pl-10 pr-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-xl text-sm focus:ring-2 focus:ring-[var(--metro-line2)] focus:border-transparent transition-all text-[var(--text-primary)]';
const SEARCH_ARIA_LABEL = '인벤토리 검색';
const SEARCH_ICON_CLASS = 'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]';

// 헤더 카운트/업로드 버튼 UI
const COUNT_SUFFIX = '건 조회됨';
const HEADER_UPLOAD_BUTTON_CLASS =
  'px-4 py-2 bg-[var(--metro-line2)] text-white text-sm font-bold rounded-xl hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-[0_4px_15px_rgba(60,181,74,0.3)]';
const HEADER_UPLOAD_LABEL = '신규 업로드';

// 상태 필터 목록 및 색상 맵 (모듈 스코프 상수)
const STATUS_FILTERS = ['AVAILABLE', 'RESERVED', 'OCCUPIED'] as AvailabilityStatus[];
const AVAILABILITY_COLOR_MAP: Record<AvailabilityStatus, string> = {
  AVAILABLE: 'var(--metro-line2)',
  RESERVED: 'var(--metro-line4)',
  OCCUPIED: 'var(--metro-line1)',
};

// 필터 버튼 공통/선택/비선택 클래스
const FILTER_BUTTON_BASE = 'px-3 py-1.5 text-xs rounded-lg transition-all font-medium border';
const FILTER_BUTTON_SELECTED = 'text-white shadow-sm border-transparent';
const FILTER_BUTTON_UNSELECTED =
  'bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-secondary)]';
const TYPE_FILTER_SELECTED = 'bg-[var(--metro-line9)] text-white shadow-sm border-transparent';
const TYPE_FILTER_UNSELECTED = FILTER_BUTTON_UNSELECTED;

// 테이블 및 컬럼 헤더
const TABLE_WRAPPER_CLASS = 'overflow-x-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-tertiary)]';
const COLUMN_HEADERS: { label: string; className: string }[] = [
  { label: '역명', className: 'px-4 py-3 font-semibold' },
  { label: '위치코드', className: 'px-4 py-3 font-semibold' },
  { label: '광고유형', className: 'px-4 py-3 font-semibold' },
  { label: '상태', className: 'px-4 py-3 font-semibold' },
  { label: '작업', className: 'px-4 py-3 font-semibold text-center' },
];

// 상태 변경 select / 삭제 버튼 / 결과 없음 메시지
const STATUS_SELECT_BASE_CLASS = 'text-xs px-2 py-1 rounded outline-none font-medium ';
const DELETE_BUTTON_CLASS = 'p-1.5 text-[var(--text-muted)] hover:text-red-500 hover:bg-red-500/10 rounded transition-colors';
const DELETE_TITLE = '삭제';
const NO_RESULTS_MESSAGE = '조건에 맞는 광고매체가 없습니다.';

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

  // 아이템별 노선 추출 헬퍼 함수
  const getItemLines = useCallback((item: AdInventory): string[] => {
    const lines = new Set<string>();
    
    // 1. 설명(description)에서 "X호선" 패턴 추출
    if (item.description) {
      const matches = item.description.match(LINE_NUMBER_REGEX);
      if (matches) {
        matches.forEach(m => lines.add(m.replace(HOSUN, '')));
      }
    }

    // 2. 역명 기준 TOTAL_SUBWAY_STATIONS 및 SUBWAY_STATIONS 조회
    const cleanName = item.stationName.replace(STATION_SUFFIX_REGEX, '');
    const totalStation = TOTAL_SUBWAY_STATIONS.find(s => s.name === cleanName || s.name === item.stationName);
    if (totalStation && totalStation.lines) {
      totalStation.lines.forEach(l => lines.add(l));
    }

    const station = SUBWAY_STATIONS.find(s => s.name === cleanName || s.name === item.stationName);
    if (station && station.lines) {
      station.lines.forEach(l => lines.add(l));
    }

    return Array.from(lines);
  }, []);

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
      
    const itemLines = getItemLines(item);
    const matchesLine = lineFilters.length === 0 || itemLines.some(line => lineFilters.includes(line));

    return matchesSearch && matchesStatus && matchesType && matchesLine;
  });

  // 광고 유형 목록 (필터 UI 용)
  const adTypes = Array.from(new Set(inventory.map(i => i.adType)));

  // 노선 목록 (필터 UI 용)
  const availableLinesSet = new Set(inventory.flatMap(item => getItemLines(item)));
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
    if (!confirm(DELETE_CONFIRM_MESSAGE)) return;
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
        <div className={SPINNER_CLASS} />
      </div>
    );
  }

  if (inventory.length === 0) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-700 mb-2">{EMPTY_TITLE}</h3>
        <p className="text-slate-500 mb-6">{EMPTY_DESCRIPTION}</p>
        <button
          onClick={() => setShowUploadModal(true)}
          className={EMPTY_UPLOAD_BUTTON_CLASS}
        >
          <Upload className="w-4 h-4" />
{EMPTY_UPLOAD_LABEL}
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
            <Search className={SEARCH_ICON_CLASS} />
            <input
              id="inventory-search"
              type="text"
              placeholder={SEARCH_PLACEHOLDER}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={SEARCH_INPUT_CLASS}
              aria-label={SEARCH_ARIA_LABEL}
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-[var(--metro-line2)]">
              {filteredInventory.length.toLocaleString()}{COUNT_SUFFIX}
            </span>
            <button
              type="button"
              onClick={() => setShowUploadModal(true)}
              className={HEADER_UPLOAD_BUTTON_CLASS}
            >
              <Upload className="w-4 h-4" />
{HEADER_UPLOAD_LABEL}
            </button>
          </div>
        </div>
        {/* 필터 그룹 */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 p-3 bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] rounded-xl">
          {/* 상태 필터 */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[var(--text-muted)] w-10">상태</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {STATUS_FILTERS.map(status => {
                const isSelected = statusFilters.includes(status);
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => {
                      setStatusFilters(prev =>
                        prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
                      );
                    }}
className={`${FILTER_BUTTON_BASE} ${isSelected ? FILTER_BUTTON_SELECTED : FILTER_BUTTON_UNSELECTED}`}
                style={isSelected ? { backgroundColor: AVAILABILITY_COLOR_MAP[status] } : undefined}
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
                      className={`${FILTER_BUTTON_BASE} ${isSelected ? TYPE_FILTER_SELECTED : TYPE_FILTER_UNSELECTED}`}
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
                      <select title="상태 변경" aria-label="상태 변경"
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
