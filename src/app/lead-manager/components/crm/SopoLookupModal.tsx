/**
 * SOPO(소상공인시장진흥공단) 상가정보 조회 모달 컴포넌트
 * 데이터.go.kr B553077 API 엔드포인트를 통해 상가 정보를 조회하고
 * 리드와 매핑하여 저장합니다.
 * 
 * TODO: 실제 API 연동 및 Supabase 저장 로드를 추가하세요.
 * 현재는 UI 구조와 타입 검증에 집중합니다.
 */

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { X, Search, MapPin, CheckCircle, Loader2, } from 'lucide-react';
import { toast } from 'sonner';
import { Lead } from '@/app/lead-manager/types';
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

/**
 * SOPO 조회 모달 컴포넌트
 * - 지역 선택 프로세스 UI 제공
 * - SOPO 데이터 조회 인터페이스 제공
 * - 리드 데이터 매핑 미리보기 제공
 * - 데이터 저장 콜백 제공
 */
export default function SopoLookupModal({
  lead,
  onClose,
  onSave,
}: SopoLookupModalProps) {
  const { showNotification } = useNotification();

  // 기존 리드에서 SOPO 키 추출 (관리번호)
  // lnoCd는 Lead 인터페이스에 없으므로 sopoKey는 useEffect 의존성에서 직접 사용
  const sopoKey = lead.mgtNo || '';

  // 상태 관리 - 지역 옵션
  const [provinceOptions, setProvinceOptions] = useState<SopoRegionOption[]>([
    { value: '', label: '선택하세요' },
  ]);
  const [districtOptions, setDistrictOptions] = useState<SopoRegionOption[]>([
    { value: '', label: '선택하세요' },
  ]);
  const [dongOptions, setDongOptions] = useState<SopoRegionOption[]>([
    { value: '', label: '선택하세요' },
  ]);

  // SOPO 조회 결과 상태
  const [sopoItems, setSopoItems] = useState<
    | { bizesNm: string; rdnmAdr: string; ctprvnNm: string; signguNm: string; adongNm: string }[]
    | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSopoIndex, setSelectedSopoIndex] = useState(-1);

  const fetchSopoData = useCallback(async (mgtNo: string, sigunNm?: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/sopo/lookup?mgtNo=${mgtNo}${sigunNm ? `&sigunNm=${sigunNm}` : ''}`, {
        cache: 'no-store',
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'API 오류');
      setSopoItems(result.data || []);
      setSelectedSopoIndex(0);
      toast('성공', { description: 'SOPO 데이터가 조회되었습니다.' });
    } catch (error: any) {
      console.error('SOPO API 오류:', error);
      toast('오류', { description: error.message || 'SOPO 조회 중 오류가 발생했습니다.' });
      setSopoItems(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadProvinceOptions = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!sopoKey) {
        setProvinceOptions([{ value: '', label: '선택하세요' }]);
        setDistrictOptions([{ value: '', label: '선택하세요' }]);
        setDongOptions([{ value: '', label: '선택하세요' }]);
        return;
      }
      // API 호출로 시도 목록 조회
      const response = await fetch(`/api/sopo/lookup?mgtNo=${sopoKey}`, {
        cache: 'no-store',
      });
      const result = await response.json();
      if (!result.success) throw new Error('API 오류');

      // 결과에서 고유 시도 추출
      const allItems = result.data || [];
      const provinces = [...new Set(allItems.map((item: any) => item.ctprvnNm))].sort() as { value: string; label: string }[];
      setProvinceOptions([
        { value: '', label: '선택하세요' },
        ...provinces.map((name: { value: string; label: string }) => ({ value: name.value, label: name.label })),
      ]);
      setDistrictOptions([{ value: '', label: '선택하세요' }]);
      setDongOptions([{ value: '', label: '선택하세요' }]);
    } catch (error) {
      console.error('SOPO 시도 로드 오류:', error);
      toast('오류', { description: 'SOPO 시도 조회 중 오류가 발생했습니다.' });
      setProvinceOptions([{ value: '', label: '선택하세요' }]);
    } finally {
      setIsLoading(false);
    }
  }, [sopoKey]);

  const loadDistrictOptions = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!sopoKey) {
        setDistrictOptions([{ value: '', label: '선택하세요' }]);
        setDongOptions([{ value: '', label: '선택하세요' }]);
        return;
      }
      // API 호출로 시군구 조회
      const response = await fetch(`/api/sopo/lookup?mgtNo=${sopoKey}`, {
        cache: 'no-store',
      });
      const result = await response.json();
      if (!result.success) throw new Error('API 오류');

      const allItems = result.data || [];
// 고유 시도 추출 및 정렬
      const districts = [...new Set(allItems.map((item: any) => item.signguNm || ''))].sort() as { value: string; label: string }[];
      
      setDistrictOptions([
        { value: '', label: '선택하세요' },
        ...districts.map((name: { value: string; label: string }) => ({ value: name.value, label: name.label })),
      ]);
      setDongOptions([{ value: '', label: '선택하세요' }]);
    } catch (error: any) {
      console.error('시군구 로드 오류:', error);
      toast('오류', { description: '시군구 조회 중 오류가 발생했습니다.' });
      setDistrictOptions([{ value: '', label: '선택하세요' }]);
      setDongOptions([{ value: '', label: '선택하세요' }]);
    } finally {
      setIsLoading(false);
    }
  }, [sopoKey]);

  const loadDongOptions = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!sopoKey || selectedSopoIndex < 0 || !sopoItems || sopoItems.length === 0) {
        setDongOptions([{ value: '', label: '선택하세요' }]);
        return;
      }
      const selectedItem = sopoItems[selectedSopoIndex];
      const sigunNm = selectedItem.signguNm || '';
      const response = await fetch(`/api/sopo/lookup?mgtNo=${sopoKey}&sigunNm=${encodeURIComponent(sigunNm)}`, {
        cache: 'no-store',
      });
      const result = await response.json();
      if (!result.success) throw new Error('API 오류');

const allItems = result.data || [];
      const dongs = [...new Set(allItems.map((item: any) => item.adongNm || ''))].sort() as { value: string; label: string }[];

      setDongOptions([
        { value: '', label: '선택하세요' },
        ...dongs.map((name: { value: string; label: string }) => ({ value: name.value, label: name.label })),
      ]);
    } catch (error: any) {
      console.error('행정동 로드 오류:', error);
      toast('오류', { description: '행정동 조회 중 오류가 발생했습니다.' });
      setDongOptions([{ value: '', label: '선택하세요' }]);
    } finally {
      setIsLoading(false);
    }
  }, [sopoKey, selectedSopoIndex, sopoItems]);

  // 프로비언스 변경 시 시군구 및 행정동 초기화 및 로드
  useEffect(() => {
    if (sopoKey) {
      setDistrictOptions([{ value: '', label: '선택하세요' }]);
      setDongOptions([{ value: '', label: '선택하세요' }]);
      loadDistrictOptions();
    }
  }, [sopoKey, loadDistrictOptions]);

  // SOPO 조회 버튼 핸들러
  const handleSearchSopo = useCallback(() => {
    if (!sopoKey) {
      toast('경고', { description: '조회할 관리번호가 없습니다.' });
      return;
    }
    fetchSopoData(sopoKey);
  }, [sopoKey, fetchSopoData]);

  // 데이터 저장 핸들러
const handleSave = useCallback(async () => {
    if (!sopoItems || sopoItems.length === 0 || selectedSopoIndex < 0) {
      toast('경고', { description: '조회된 SOPO 데이터가 없습니다.' });
      return;
    }

    const selectedItem = sopoItems[selectedSopoIndex] as any;
    const mappedLead = {
      ...lead,
      sopoBizesId: selectedItem.bizesId || selectedItem.사업자번호 || '',
      sopoBizName: selectedItem.bizesNm || '',
      sopoRoadAddress: selectedItem.rdnmAdr || '',
      sopoLotAddress: selectedItem.법정동주소 || '',
      sopoLatitude: selectedItem.위도 || 37.5665,
      sopoLongitude: selectedItem.경도 || 126.9780,
      sopoCategoryLarge: selectedItem.업종대분류 || 'ETC',
      sopoCategoryLargeName: selectedItem.업종대분류명 || '기타',
      sopoCategoryMiddle: selectedItem.업종중분류 || 'I00',
      sopoCategoryMiddleName: selectedItem.업종중분류명 || '',
      sopoCategorySmall: selectedItem.업종소분류 || 'I000',
      sopoCategorySmallName: selectedItem.업종소분류명 || '',
      sopoProvinceCode: selectedItem.시도코드 || '11',
      sopoProvinceName: selectedItem.시도명 || '서울특별시',
      sopoDistrictCode: selectedItem.시군구코드 || '30170',
      sopoDistrictName: selectedItem.시군구명 || '강남구',
      sopoDongCode: selectedItem.행정동코드 || '30170640',
      sopoDongName: selectedItem.행정동명 || '신사동',
      sopoStdYm: selectedItem.표준월 || new Date().getFullYear().toString(),
      sopoDataFetchedAt: new Date().toISOString(),
    };

    showNotification('success', 'SOPO 데이터가 리드에 매핑되었습니다.');
    onSave(mappedLead as Lead);
    onClose();
  }, [sopoItems, selectedSopoIndex, lead, onSave, onClose, showNotification]);

  // 취소 버튼
  const handleCancel = () => {
    setSelectedSopoIndex(-1);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[95vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-semibold">
            <MapPin className="mr-2 h-4 w-4" /> SOPO 상가정보 조회
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition-colors" aria-label="모달 닫기">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* 조회 섹션 */}
          <div>
            <h3 className="font-medium mb-3">SOPO 데이터 조회</h3>
            <p className="text-sm text-slate-500 mb-4">
              상가(상권) 정보를 조회할 관리번호를 입력하거나,
              지역을 선택하여 조회할 수 있습니다.
            </p>

            {/* 관리번호 입력 */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
 관리번호
</label>
              <input
                type="text"
                placeholder="예: 3017011200113530000022216"
                value=""
                onChange={(e) => {
                  const key = (e.target as HTMLInputElement).value;
                  if (key.trim()) {
                    loadProvinceOptions();
                  }
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* 시도 선택 */}
            <div>
              <label className="block text-sm font-medium mb-1">
                시도
              </label>
              <select
                onChange={(e) => {
                  const code = (e.target as HTMLSelectElement).value;
                  if (code && code !== '') {
                    setDistrictOptions([{ value: '', label: '로딩중...' }]);
                    loadDistrictOptions();
                  }
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                disabled={isLoading}
              >
                <option value="">선택하세요</option>
                {provinceOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 시군구 선택 */}
            {provinceOptions.length > 1 && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  시군구
                </label>
                <select
                  onChange={(e) => {
                    const code = (e.target as HTMLSelectElement).value;
                    if (code) {
                      setDongOptions([{ value: '', label: '로딩중...' }]);
                      loadDongOptions();
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  disabled={isLoading}
                >
                  <option value="">선택하세요</option>
                  {districtOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 행정동 선택 */}
            {districtOptions.length > 1 && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  행정동
                </label>
                <select
                  className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  disabled={isLoading}
                >
                  <option value="">선택하세요</option>
                  {dongOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 조회 결과 */}
            {sopoItems && sopoItems.length > 0 && (
              <div>
                <h3 className="font-medium mb-3">조회 결과 ({sopoItems.length}건)</h3>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {sopoItems.map((item, index) => (
                    <div
                      key={index}
                      className="p-2 border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer"
                      onClick={() => setSelectedSopoIndex(index)}
                    >
                      <p className="font-medium truncate">{item.bizesNm}</p>
                      <p className="text-xs text-slate-500">
                        {item.rdnmAdr}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 매핑 미리보기 */}
            {selectedSopoIndex >= 0 && sopoItems && (
              <div className="pt-4 border-t border-slate-200">
                <h3 className="font-medium mb-3">매핑 미리보기</h3>
                <div className="p-3 rounded-md bg-blue-50 text-xs">
                  <p>상호: {sopoItems[selectedSopoIndex].bizesNm}</p>
                  <p>주소: {sopoItems[selectedSopoIndex].rdnmAdr}</p>
                  <p>지역: {sopoItems[selectedSopoIndex].ctprvnNm} {sopoItems[selectedSopoIndex].signguNm} {sopoItems[selectedSopoIndex].adongNm}</p>
                </div>
              </div>
            )}

            {/* 액션 버튼 */}
            <div className="pt-4 border-t border-slate-200 flex gap-2">
              <button onClick={handleCancel} className="flex-1 py-2 rounded-md bg-gray-100 text-sm text-gray-700 hover:bg-gray-200 transition-colors">
                취소
              </button>
              <button onClick={handleSave} className="flex-1 py-2 rounded-md bg-primary-600 text-white hover:bg-primary-700 transition-colors">
                데이터 저장하기
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}