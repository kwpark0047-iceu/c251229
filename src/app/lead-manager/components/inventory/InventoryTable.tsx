'use client';

/**
 * 인벤토리 테이블 컴포넌트
 * 광고매체 재고 목록 표시
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Train,
  Search,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import {
  AdInventory,
  AvailabilityStatus,
  AVAILABILITY_STATUS_LABELS,
  AVAILABILITY_STATUS_COLORS,
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
  const [statusFilter, setStatusFilter] = useState<AvailabilityStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

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
      statusFilter === 'ALL' || item.availabilityStatus === statusFilter;

    const matchesType =
      typeFilter === 'ALL' || item.adType === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  // 광고 유형 목록
  const adTypes = [...new Set(inventory.map(i => i.adType))];

  // 상태 변경
  const handleStatusChange = async (id: string, newStatus: AvailabilityStatus) => {
    const result = await updateInventoryStatus(id, newStatus);
    if (result.success) {
      loadInventory();
    }
  };

  // 삭제
  const handleDelete = async (id: string) => {
    if (!confirm('이 광고매체를 삭제하시겠습니까?')) return;
    const result = await deleteInventory(id);
    if (result.success) {
      loadInventory();
      onRefresh?.();
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
        <p className="text-slate-500">
          엑셀 파일을 업로드하여 광고매체를 등록하세요.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 필터 바 */}
      <div className="flex flex-wrap gap-4 items-center">
        {/* 검색 */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="역명 또는 위치코드 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* 상태 필터 */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as AvailabilityStatus | 'ALL')}
          className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">모든 상태</option>
          <option value="AVAILABLE">사용 가능</option>
          <option value="RESERVED">예약됨</option>
          <option value="OCCUPIED">사용 중</option>
        </select>

        {/* 유형 필터 */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="ALL">모든 유형</option>
          {adTypes.map(type => (
            <option key={type} value={type}>
              {AD_TYPE_LABELS[type] || type}
            </option>
          ))}
        </select>

        {/* 결과 수 */}
        <span className="text-sm text-slate-500">
          {filteredInventory.length}개
        </span>
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
                const statusColor = AVAILABILITY_STATUS_COLORS[item.availabilityStatus];
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
                          value={item.availabilityStatus}
                          onChange={(e) =>
                            handleStatusChange(item.id, e.target.value as AvailabilityStatus)
                          }
                          className={`text-xs font-medium px-2 py-1 rounded-full border ${statusColor.bg} ${statusColor.text} ${statusColor.border}`}
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
          const color = AVAILABILITY_STATUS_COLORS[status];
          return (
            <div
              key={status}
              className={`p-4 rounded-lg border ${color.bg} ${color.border}`}
            >
              <div className={`text-2xl font-bold ${color.text}`}>{count}</div>
              <div className="text-sm text-slate-600">
                {AVAILABILITY_STATUS_LABELS[status]}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
