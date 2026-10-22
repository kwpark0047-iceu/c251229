'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MapPin, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { mapSopoToLead, type SopoItem } from '@/app/lead-manager/utils/sopo-utils';
import type { Lead } from '@/app/lead-manager/types';
import { useNotification } from '@/context/NotificationContext';

interface SopoLookupModalProps {
  lead: Lead;
  onClose: () => void;
  onSave: (updatedLead: Lead) => Promise<void> | void;
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
  return response.success === false ? typeof response.error === 'string' : response.success === true && (response.data === null || (Array.isArray(response.data) && response.data.every(item => typeof item === 'object' && item !== null && typeof item.bizesId === 'string' && typeof item.bizesNm === 'string')));
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
  const [managementNumber, setManagementNumber] = useState('');
  const [province, setProvince] = useState('');
  const [district, setDistrict] = useState('');
  const [dong, setDong] = useState('');
  const [sopoItems, setSopoItems] = useState<SopoItem[] | null>(null);
  const [selectedSopoId, setSelectedSopoId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const pending = useRef<AbortController | null>(null);
  const saving = useRef(false);
  const searchInput = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  const fetchSopoData = useCallback(async (mgtNo: string) => {
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    setIsLoading(true);
    setErrorMessage('');
    setSopoItems(null);
    setSelectedSopoId(null);
    try {
      const params = new URLSearchParams({ mgtNo });
      const response = await fetch(`/api/sopo/lookup?${params.toString()}`, { cache: 'no-store', signal: controller.signal });
      const result: unknown = await response.json();
      if (controller.signal.aborted) return;
      if (!isSopoLookupResponse(result)) throw new Error('SOPO API 응답 형식이 올바르지 않습니다.');
      if (!response.ok || !result.success) throw new Error(result.error || 'SOPO API 오류');

      const items = result.data || [];
      setSopoItems(items);
      setProvince('');
      setDistrict('');
      setDong('');
      setSelectedSopoId(null);
      if (items.length === 0) {
        toast('안내', { description: '조건에 맞는 SOPO 데이터가 없습니다.' });
        return;
      }
      toast('성공', { description: 'SOPO 데이터가 조회되었습니다.' });
    } catch (error) {
      if (controller.signal.aborted) return;
      setErrorMessage(error instanceof Error ? error.message : '조회 중 오류가 발생했습니다.');
      setSopoItems(null);
      setSelectedSopoId(null);
      toast('오류', { description: error instanceof Error ? error.message : 'SOPO 조회 중 오류가 발생했습니다.' });
    } finally {
      if (pending.current === controller) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    searchInput.current?.focus();
    pending.current?.abort();
    setManagementNumber('');
    setSopoItems(null);
    setSelectedSopoId(null);
    setProvince(''); setDistrict(''); setDong('');
    setErrorMessage(''); setIsLoading(false);
    return () => { pending.current?.abort(); previousFocus?.focus(); };
  }, [lead.id]);

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
    if (isLoading || saving.current) return;
    const value = managementNumber.trim();
    if (!value) {
      toast('경고', { description: '조회할 관리번호를 입력하세요.' });
      return;
    }
    void fetchSopoData(value);
  };

  const handleManagementNumberChange = (value: string) => {
    pending.current?.abort();
    setIsLoading(false);
    setErrorMessage('');
    setManagementNumber(value);
    setSopoItems(null);
    setSelectedSopoId(null);
    setProvince('');
    setDistrict('');
    setDong('');
  };

  const handleSave = async () => {
    if (!selectedItem || isLoading || saving.current) return;
    saving.current = true;
    setIsSaving(true);
    setErrorMessage('');
    try {
      await onSave(mapSopoToLead([selectedItem], lead));
      showNotification('success', 'SOPO 데이터가 저장되었습니다.');
      onClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '저장하지 못했습니다. 다시 시도해 주세요.');
    } finally {
      saving.current = false;
      setIsSaving(false);
    }
  };
  const handleClose = () => { if (!saving.current) onClose(); };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        if (!saving.current) onClose();
      }
      if (event.key === 'Tab') {
        const elements = dialog.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled)');
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    dialog.addEventListener('keydown', handleKeyDown);
    return () => dialog.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <button type="button" aria-label="배경 닫기" className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} disabled={isSaving} />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="SOPO 상가정보 조회" className="relative bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[95vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <MapPin className="h-4 w-4" /> SOPO 상가정보 조회
          </h2>
          <button onClick={handleClose} className="p-2 rounded-lg hover:bg-slate-100" aria-label="모달 닫기">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-500">건물관리번호로 해당 건물의 상가를 조회합니다. 인허가 관리번호·상가업소번호와는 다릅니다. 결과는 최대 100건이며 지역 필터는 조회된 결과에만 적용됩니다.</p>

          <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); handleSearch(); }}>
            <input
              ref={searchInput}
              aria-label="건물관리번호"
              maxLength={100}
              disabled={isSaving}
              type="text"
              placeholder="예: 3017011200113530000022216"
              value={managementNumber}
              onChange={(event) => handleManagementNumberChange(event.target.value)}
              className="flex-1 px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button type="submit" disabled={isLoading || isSaving} className="px-4 py-2 rounded-md bg-primary-600 text-white disabled:opacity-50">
              <Search className="inline-block h-4 w-4 mr-1" /> 조회
            </button>
          </form>
          {errorMessage && <p role="alert" className="text-red-600">{errorMessage}</p>}
          {isLoading && <p role="status">상가정보를 조회하고 있습니다.</p>}
          {sopoItems?.length === 0 && <p role="status">조회된 상가가 없습니다. 건물관리번호를 확인해 주세요.</p>}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select aria-label="시도" value={province} onChange={(event) => { setSelectedSopoId(null); setProvince(event.target.value); setDistrict(''); setDong(''); }} disabled={isLoading || isSaving} className="px-3 py-2 border border-slate-300 rounded-md">
              {provinceOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select aria-label="시군구" value={district} onChange={(event) => { setSelectedSopoId(null); setDistrict(event.target.value); setDong(''); }} disabled={isLoading || isSaving || !province} className="px-3 py-2 border border-slate-300 rounded-md">
              {districtOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select aria-label="행정동" value={dong} onChange={(event) => { setSelectedSopoId(null); setDong(event.target.value); }} disabled={isLoading || isSaving || !district} className="px-3 py-2 border border-slate-300 rounded-md">
              {dongOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>

          {visibleItems.length > 0 && (
            <div>
              <h3 className="font-medium mb-3">조회 결과 ({visibleItems.length}건)</h3>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {visibleItems.map((item) => (
                  <button key={item.bizesId} type="button" disabled={isSaving} aria-pressed={item.bizesId === selectedSopoId} className={`w-full text-left p-2 border-b border-slate-100 hover:bg-slate-50 ${item.bizesId === selectedSopoId ? 'bg-blue-50 dark:bg-slate-800' : ''}`} onClick={() => setSelectedSopoId(item.bizesId)}>
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
              <div className="p-3 rounded-md bg-blue-50 dark:bg-slate-800 text-xs space-y-1">
                <p>업종: {selectedItem.indsSclsNm || selectedItem.indsMclsNm || '정보 없음'}</p>
                <p>조사연월: {selectedItem.stdrYm || '정보 없음'}</p>
                <p>상호: {selectedItem.bizesNm}</p>
                <p>도로명 주소: {selectedItem.rdnmAdr}</p>
                <p>지번 주소: {selectedItem.lnoAdr}</p>
                <p>지역: {selectedItem.ctprvnNm} {selectedItem.signguNm} {selectedItem.adongNm}</p>
              </div>
            </div>
          )}

          <div className="pt-4 border-t border-slate-200 flex gap-2">
            <button onClick={handleClose} className="flex-1 py-2 rounded-md bg-gray-100 text-sm text-gray-700 hover:bg-gray-200">취소</button>
            <button onClick={handleSave} disabled={!selectedItem || isLoading || isSaving} className="flex-1 py-2 rounded-md bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-50">{isSaving ? '저장 중...' : '데이터 저장하기'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
