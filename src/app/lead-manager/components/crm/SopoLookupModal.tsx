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

  // 지역 옵션 로드 (프로비언스 변경 시 시군구 재로드)
  const loadProvinceOptions = useCallback(async () => {
    setIsLoading(true);
    try {
      // 실제 API 호출은 향후 구현
      // const items = await fetchSopoData({ key: sopoKey, ... });
      // 여기에 API 응답 처리 로직 추가

      // 시범 데이터로 provinces 설정
      const mockProvinces = [
        { value: '11', label: '서울특별시' },
        { value: '26', label: '인천광역시' },
        { value: '29', label: '대전광역시' },
        { value: '31', label: '대구광역시' },
        { value: '34', label: '광주광역시' },
        { value: '35', label: '부산광역시' },
        { value: '36', label: '울산광역시' },
        { value: '37', label: '세종특별자치시' },
        { value: '38', label: '경기도' },
      ];

      setProvinceOptions([
        { value: '', label: '선택하세요' },
        ...mockProvinces,
      ]);
      setDistrictOptions([{ value: '', label: '선택하세요' }]);
      setDongOptions([{ value: '', label: '선택하세요' }]);
    } catch (error) {
      console.error('SOPO 시도 로드 오류:', error);
      toast('오류', { description: 'SOPO 시도 조회 중 오류가 발생했습니다.' });
    } finally {
      setIsLoading(false);
    }
  }, [sopoKey]);

  const loadDistrictOptions = useCallback(async () => {
    setIsLoading(true);
    try {
      // 실제 API 호출은 향후 구현
      const mockDistricts = [
        { value: '30170', label: '서울 강남구' },
        { value: '30171', label: '서울 강북구' },
      ];

      setDistrictOptions([
        { value: '', label: '선택하세요' },
        ...mockDistricts,
      ]);
      setDongOptions([{ value: '', label: '선택하세요' }]);
    } catch (error) {
      console.error('시군구 로드 오류:', error);
    } finally {
      setIsLoading(false);
    }
  }, [sopoKey]);

  const loadDongOptions = useCallback(async () => {
    setIsLoading(true);
    try {
      // 실제 API 호출은 향후 구현
      const mockDongs = [
        { value: '30170640', label: '대전 대덕구 탄방동' },
        { value: '30170650', label: '대전 대덕구 법동' },
      ];

      setDongOptions([
        { value: '', label: '선택하세요' },
        ...mockDongs,
      ]);
    } catch (error) {
      console.error('행정동 로드 오류:', error);
    } finally {
      setIsLoading(false);
    }
  }, [sopoKey, provinceOptions[0]?.value]);

  // 프로비언스 변경 시 시군구 및 행정동 초기화 및 로드
  useEffect(() => {
    if (sopoKey) {
      setDistrictOptions([{ value: '', label: '선택하세요' }]);
      setDongOptions([{ value: '', label: '선택하세요' }]);
      loadDistrictOptions();
    }
  }, [sopoKey, provinceOptions[0]?.value]);

  // SOPO 조회 버튼 핸들러
  const handleSearchSopo = useCallback(() => {
    setIsLoading(true);
    // 실제 API 호출은 향후 구현
    // const items = await fetchSopoData({ key: sopoKey, ...});
    
    // 시범 데이터로 조회 결과 표시
    const mockItems = [
      {
        bizesNm: '테스트 상가',
        rdnmAdr: '테스트 도로명 주소',
        ctprvnNm: '서울특별시',
        signguNm: '강남구',
        adongNm: '신사동',
      },
    ];
    setSopoItems(mockItems);
    setSelectedSopoIndex(0);
    toast('성공', { description: 'SOPO 데이터가 조회되었습니다.' });
    setIsLoading(false);
  }, [sopoKey]);

  // 데이터 저장 핸들러
  const handleSave = useCallback(async () => {
    if (!sopoItems || sopoItems.length === 0 || selectedSopoIndex < 0) {
      toast('경고', { description: '조회된 SOPO 데이터가 없습니다.' });
      return;
    }

    const mappedLead = {
      ...lead,
      // SOPO 필드 매핑 (더미 데이터 활용)
      sopoBizesId: sopoItems[selectedSopoIndex]?.bizesNm ? 'MA010120220800000218' : undefined,
      sopoBizName: sopoItems[selectedSopoIndex]?.bizesNm,
      sopoRoadAddress: sopoItems[selectedSopoIndex]?.rdnmAdr,
      sopoLotAddress: '',
      sopoLatitude: 37.5665,
      sopoLongitude: 126.9780,
      sopoCategoryLarge: 'FOOD',
      sopoCategoryLargeName: '식음업',
      sopoCategoryMiddle: 'I201',
      sopoCategoryMiddleName: '한식',
      sopoCategorySmall: 'I20101',
      sopoCategorySmallName: '백반/한정식',
      sopoProvinceCode: '11',
      sopoProvinceName: '서울특별시',
      sopoDistrictCode: '30170',
      sopoDistrictName: '강남구',
      sopoDongCode: '30170640',
      sopoDongName: '신사동',
      sopoStdYm: '202606',
      sopoDataFetchedAt: new Date().toISOString(),
    };

    showNotification('success', 'SOPO 데이터가 리드에 매핑되었습니다.');
    onSave(mappedLead as Lead);
    onClose();
  }, [sopoItems, selectedSopoIndex, lead, onSave, onClose]);

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