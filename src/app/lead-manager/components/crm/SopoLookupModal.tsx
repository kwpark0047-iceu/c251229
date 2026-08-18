'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { MapPin, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { mapSopoToLead, type SopoItem } from '@/app/lead-manager/utils/sopo-utils';
import type { Lead } from '@/app/lead-manager/types';
import { useNotification } from '@/context/NotificationContext';

interface SopoLookupModalProps {
  lead: Lead;
  onClose: () => void;
  onSave: (updatedLead: Lead) => void;
}

interface SopoRegionOption {
  value: string;
  label: string;
}

interface SopoLookupResponse {
  success: boolean;
  data: SopoItem[] | null;
  error?: string;
}

function isSopoLookupResponse(value: unknown): value is SopoLookupResponse {
  if (typeof value !== 'object' || value === null) return false;
  const response = value as Record<string, unknown>;
  return typeof response.success === 'boolean' && (response.data === null || Array.isArray(response.data));
}

function createRegionOptions(
  items: readonly SopoItem[],
  codeKey: 'ctprvnCd' | 'signguCd' | 'adongCd',
  nameKey: 'ctprvnNm' | 'signguNm' | 'adongNm'
): SopoRegionOption[] {
  const options = new Map<string, string>();
  for (const item of items) {
    const value = item[codeKey];
    const label = item[nameKey];
    if (value && label) options.set(value, label);
  }
  return [
    { value: '', label: '선택하세요' },
    ...Array.from(options, ([value, label]) => ({ value, label })),
  ];
}

export default function SopoLookupModal({ lead, onClose, onSave }: SopoLookupModalProps) {
  const { showNotification } = useNotification();
  const [managementNumber, setManagementNumber] = useState(lead.mgtNo || '');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [dong, setDong] = useState('');
  const [sopoItems, setSopoItems] = useState<SopoItem[] | null>(null);
  const [selectedSopoId, setSelectedSopoId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchSopoData = useCallback(async (mgtNo: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ mgtNo });
      const response = await fetch(`/api/sopo/lookup?${params.toString()}`, { cache: 'no-store' });
      const result: unknown = await response.json();
      if (!isSopoLookupResponse(result)) throw new Error('SOPO API 응답 형식이 올바르지 않습니다.');
      if (!result.success) throw new Error(result.error || 'SOPO API 오류');

      const items = result.data || [];
      setSopoItems(items);
      setProvince('');
      setDistrict('');
      setDong('');
      setSelectedSopoId(items[0]?.bizesId || null);
      if (items.length === 0) {
        toast('안내', { description: '조건에 맞는 SOPO 데이터가 없습니다.' });
        return;
      }
      toast('성공', { description: 'SOPO 데이터가 조회되었습니다.' });
    } catch (error) {
      console.error('SOPO API 오류:', error);
      setSopoItems(null);
      setSelectedSopoId(null);
      toast('오류', { description: error instanceof Error ? error.message : 'SOPO 조회 중 오류가 발생했습니다.' });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (lead.mgtNo) void fetchSopoData(lead.mgtNo);
  }, [fetchSopoData, lead.mgtNo]);

  const provinceItems = sopoItems || [];
  const districtItems = province
    ? provinceItems.filter((item) => item.ctprvnCd === province)
    : provinceItems;
  const dongItems = district
    ? districtItems.filter((item) => item.signguCd === district)
    : districtItems;
  const visibleItems = dong
    ? dongItems.filter((item) => item.adongCd === dong)
    : dongItems;
  const provinceOptions = createRegionOptions(provinceItems, 'ctprvnCd', 'ctprvnNm');
  const districtOptions = createRegionOptions(districtItems, 'signguCd', 'signguNm');
  const dongOptions = createRegionOptions(dongItems, 'adongCd', 'adongNm');
  const selectedItem = visibleItems.find((item) => item.bizesId === selectedSopoId);

  const handleSearch = () => {
    const value = managementNumber.trim();
    if (!value) {
      toast('경고', { description: '조회할 관리번호를 입력하세요.' });
      return;
    }
    void fetchSopoData(value);
  };

  const handleManagementNumberChange = (value: string) => {
    setManagementNumber(value);
    setSopoItems(null);
    setSelectedSopoId(null);
    setProvince('');
    setDistrict('');
    setDong('');
  };

  const handleSave = () => {
    if (!selectedItem) {
      toast('경고', { description: '저장할 SOPO 데이터를 선택하세요.' });
      return;
    }
    onSave(mapSopoToLead([selectedItem], lead));
    showNotification('success', 'SOPO 데이터가 리드에 매핑되었습니다.');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <MapPin className="h-4 w-4" /> SOPO 상가정보 조회
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100" aria-label="모달 닫기">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-500">상가정보 관리번호를 입력하거나 기존 리드의 관리번호를 확인한 뒤 조회하세요.</p>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="예: 3017011200113530000022216"
              value={managementNumber}
              onChange={(event) => handleManagementNumberChange(event.target.value)}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button onClick={handleSearch} disabled={isLoading} className="px-4 py-2 rounded-md bg-primary-600 text-white disabled:opacity-50">
              <Search className="inline-block h-4 w-4 mr-1" /> 조회
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select value={province} onChange={(event) => { setProvince(event.target.value); setDistrict(''); setDong(''); }} disabled={isLoading} className="px-3 py-2 border border-slate-300 rounded-md">
              {provinceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select value={district} onChange={(event) => { setDistrict(event.target.value); setDong(''); }} disabled={isLoading || !province} className="px-3 py-2 border border-slate-300 rounded-md">
              {districtOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select value={dong} onChange={(event) => setDong(event.target.value)} disabled={isLoading || !district} className="px-3 py-2 border border-slate-300 rounded-md">
              {dongOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>

          {visibleItems.length > 0 && (
            <div>
              <h3 className="font-medium mb-3">조회 결과 ({visibleItems.length}건)</h3>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {visibleItems.map((item) => (
                  <button key={item.bizesId} type="button" className={`w-full text-left p-2 border-b border-slate-100 hover:bg-slate-50 ${item.bizesId === selectedSopoId ? 'bg-blue-50' : ''}`} onClick={() => setSelectedSopoId(item.bizesId)}>
                    <p className="font-medium truncate">{item.bizesNm}</p>
                    <p className="text-xs text-slate-500">{item.rdnmAdr}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {selectedItem && (
            <div className="pt-4 border-t border-slate-200">
              <h3 className="font-medium mb-3">매핑 미리보기</h3>
              <div className="p-3 rounded-md bg-blue-50 text-xs space-y-1">
                <p>상호: {selectedItem.bizesNm}</p>
                <p>도로명 주소: {selectedItem.rdnmAdr}</p>
                <p>지번 주소: {selectedItem.lnoAdr}</p>
                <p>지역: {selectedItem.ctprvnNm} {selectedItem.signguNm} {selectedItem.adongNm}</p>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-200 flex gap-2">
            <button onClick={onClose} className="flex-1 py-2 rounded-md bg-gray-100 text-sm text-gray-700 hover:bg-gray-200">취소</button>
            <button onClick={handleSave} disabled={!selectedItem} className="flex-1 py-2 rounded-md bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50">데이터 저장하기</button>
          </div>
        </div>
      </div>
    </div>
  );
}
