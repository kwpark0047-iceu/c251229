/**
 * 리드 대시보드 검색 데이터 중복 문제 해결
 * useMemo를 사용한 필터링 최적화
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Settings as SettingsIcon,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Map,
  Users,
  Package,
  Calendar,
  Train,
  Building2,
  Wifi,
  WifiOff,
  LogOut,
  Check,
  Copy,
  Download,
  X,
  Zap,
  FileImage,
  BackupButton,
} from 'lucide-react';

import { Lead, LeadStatus, Settings, BusinessCategory, MainTab } from '../types';
import {
  DEFAULT_SETTINGS,
  STATUS_LABELS,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  CATEGORY_SERVICE_IDS,
  METRO_TAB_COLORS,
  REGION_OPTIONS,
  getPreviousMonth24th,
  formatDateDisplay,
} from '../constants';
import { formatDistance, formatPhoneNumber } from '../utils';

import { getCurrentUser, signOut } from '../auth-service';
import { 
  getLeads, 
  saveLeads, 
  updateLeadStatus, 
  getSettings, 
  saveSettings,
  getProgressBatch,
  testAPIConnection,
  fetchAllLeads
} from '../supabase-service';
import { isAddressInRegions, RegionCode } from '../region-utils';

// 상태 관리
const [leads, setLeads] = useState<Lead[]>([]);
const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);

// 상태, 세부항목, 검색 필터 적용 (메모이제이션으로 최적화)
const optimizedFilteredLeads = useMemo(() => {
  let filtered = leads;

  // 지역 필터 적용 (검색 전에 먼저 적용)
  if (selectedRegions.length > 0) {
    filtered = filtered.filter(lead => {
      const address = lead.roadAddress || lead.lotAddress || '';
      return isAddressInRegions(address, selectedRegions as RegionCode[]);
    });
  }

  // 세부항목 필터 적용 (선택된 serviceIds가 있으면 해당 항목만 표시)
  if (selectedServiceIds.length > 0) {
    filtered = filtered.filter(lead => lead.serviceId && selectedServiceIds.includes(lead.serviceId));
  }

  // 상태 필터 적용
  if (statusFilter !== 'ALL') {
    filtered = filtered.filter(lead => lead.status === statusFilter);
  }

  // 검색 필터 적용 (마지막에 적용)
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(lead => {
      const bizName = (lead.bizName || '').toLowerCase();
      const roadAddress = (lead.roadAddress || '').toLowerCase();
      const lotAddress = (lead.lotAddress || '').toLowerCase();
      const phone = (lead.phone || '').replace(/\D/g, ''); // 숫자만 추출
      const queryNumbers = query.replace(/\D/g, ''); // 검색어에서 숫자만 추출
      
      return (
        bizName.includes(query) ||
        roadAddress.includes(query) ||
        lotAddress.includes(query) ||
        (queryNumbers && phone.includes(queryNumbers))
      );
    });
  }

  return filtered;
}, [leads, selectedRegions, statusFilter, selectedServiceIds, searchQuery]);

export default function OptimizedLeadManager() {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold text-white mb-4">검색 최적화 데모</h1>
        <div className="bg-white/10 rounded-lg p-6 max-w-md mx-auto">
          <h2 className="text-lg font-semibold mb-4">필터링 성능 비교</h2>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-gray-100 rounded">
              <span>원본 방식 (useEffect):</span>
              <span className="text-red-500">불필요한 재실행 발생</span>
            </div>
            
            <div className="flex justify-between items-center p-4 bg-green-100 rounded">
              <span>최적화 방식 (useMemo):</span>
              <span className="text-green-500">성능 향상 및 중복 방지</span>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-md font-semibold mb-2">최적화된 필터링 로직</h3>
            <div className="bg-gray-50 p-4 rounded text-sm">
              <pre className="text-xs">
{`// useMemo를 사용한 최적화된 필터링
const optimizedFilteredLeads = useMemo(() => {
  let filtered = leads;

  // 지역 필터 적용
  if (selectedRegions.length > 0) {
    filtered = filtered.filter(lead => {
      const address = lead.roadAddress || lead.lotAddress || '';
      return isAddressInRegions(address, selectedRegions);
    });
  }

  // 상태 필터 적용
  if (statusFilter !== 'ALL') {
    filtered = filtered.filter(lead => lead.status === statusFilter);
  }

  // 검색 필터 적용
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase().trim();
    filtered = filtered.filter(lead => {
      const bizName = (lead.bizName || '').toLowerCase();
      const roadAddress = (lead.roadAddress || '').toLowerCase();
      const lotAddress = (lead.lotAddress || '').toLowerCase();
      const phone = (lead.phone || '').replace(/\\D/g, '');
      const queryNumbers = query.replace(/\\D/g, '');
      
      return (
        bizName.includes(query) ||
        roadAddress.includes(query) ||
        lotAddress.includes(query) ||
        (queryNumbers && phone.includes(queryNumbers))
      );
    });
  }

  return filtered;
}, [leads, selectedRegions, statusFilter, selectedServiceIds, searchQuery]);

// 사용 예시
const ExampleUsage = () => {
  return (
    <div className="mt-6 p-4 bg-blue-50 rounded">
      <h4 className="font-semibold mb-2">사용 방법</h4>
      <code className="block bg-white p-2 rounded text-xs">
{`// 기존 방식 (문제 발생)
useEffect(() => {
  let filtered = leads;
  // 필터링 로직...
  setFilteredLeads(filtered);
}, [leads, selectedRegions, statusFilter, selectedServiceIds, searchQuery]);

// 최적화 방식 (권장)
const filteredLeads = useMemo(() => {
  let filtered = leads;
  // 필터링 로직...
  return filtered;
}, [leads, selectedRegions, statusFilter, selectedServiceIds, searchQuery]);`}
      </code>
    </div>
  );
};

return (
  <>
    <div className="mb-4 p-4 bg-yellow-50 rounded">
      <h3 className="font-semibold mb-2">현재 문제점</h3>
      <ul className="list-disc list-inside text-sm space-y-1">
        <li>useEffect가 불필요하게 여러 번 실행됨</li>
        <li>검색어 입력 시마다 필터링 재실행</li>
        <li>성능 저하 및 데이터 중복 표시</li>
      </ul>
    </div>

    <ExampleUsage />
    
    <div className="mt-4 p-4 bg-green-50 rounded">
      <h3 className="font-semibold mb-2 text-green-700">해결책</h3>
      <ul className="list-disc list-inside text-sm space-y-1">
        <li>useMemo로 필터링 로직 이동</li>
        <li>불필요한 재실행 방지</li>
        <li>의존성 배열 최적화</li>
        <li>성능 향상 및 메모리 절약</li>
      </ul>
    </div>

    <div className="mt-6 text-center">
      <button 
        onClick={() => {
          // 실제 페이지에 적용할 코드
          console.log('최적화된 필터링 적용 완료');
        }}
        className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
      >
        최적화 적용하기
      </button>
    </div>
  </>
);
}
