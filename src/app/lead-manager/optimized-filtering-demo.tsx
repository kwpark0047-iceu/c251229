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
} from 'lucide-react';

import {
  Lead,
  LeadStatus,
  Settings,
  BusinessCategory,
  MainTab,
  STATUS_LABELS,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  CATEGORY_SERVICE_IDS
} from './types';
import {
  DEFAULT_SETTINGS,
  METRO_TAB_COLORS,
  REGION_OPTIONS,
} from './constants';
import { getPreviousMonth24th, formatDateDisplay, formatDistance, formatPhoneNumber } from './utils';

import { getCurrentUser, signOut } from './auth-service';
import {
  getLeads,
  saveLeads,
  updateLeadStatus,
  getSettings,
  saveSettings,
} from './supabase-service';
import { getProgressBatch } from './crm-service';
import { testAPIConnection, fetchAllLeads } from './api';
import { isAddressInRegions, RegionCode } from './region-utils';

// 상태 관리

// 상태, 세부항목, 검색 필터 적용 (메모이제이션으로 최적화)

export default function OptimizedLeadManager() {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const optimizedFilteredLeads = useMemo(() => {
    let filtered = leads;

    if (selectedRegions.length > 0) {
      filtered = filtered.filter(lead => {
        const address = lead.roadAddress || lead.lotAddress || '';
        return isAddressInRegions(address, selectedRegions as RegionCode[]);
      });
    }

    if (selectedServiceIds.length > 0) {
      filtered = filtered.filter(lead => lead.serviceId && selectedServiceIds.includes(lead.serviceId));
    }

    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(lead => lead.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(lead => {
        const bizName = (lead.bizName || '').toLowerCase();
        const roadAddress = (lead.roadAddress || '').toLowerCase();
        const lotAddress = (lead.lotAddress || '').toLowerCase();
        const phone = (lead.phone || '').replace(/\D/g, '');
        const queryNumbers = query.replace(/\D/g, '');

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

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold text-white mb-4">검색 최적화 데모</h1>
        <div className="bg-white/10 rounded-lg p-6 max-w-md mx-auto text-white">
          <h2 className="text-lg font-semibold mb-4">필터링 성능 비교</h2>

          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-gray-100 rounded text-gray-800">
              <span>원본 방식 (useEffect):</span>
              <span className="text-red-500 font-bold">불필요한 재실행 발생</span>
            </div>

            <div className="flex justify-between items-center p-4 bg-green-100 rounded text-gray-800">
              <span>최적화 방식 (useMemo):</span>
              <span className="text-green-600 font-bold">성능 향상 및 중복 방지</span>
            </div>
          </div>

          <div className="mt-8 p-4 bg-yellow-50 rounded text-yellow-900 text-left">
            <h3 className="font-bold mb-2">💡 해결책 요약</h3>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>useMemo로 필터링 로직 이동</li>
              <li>불필요한 컴포넌트 재실행 방지</li>
              <li>의존성 배열 최적화로 메모리 절약</li>
            </ul>
          </div>

          <div className="mt-6">
            <button
              onClick={() => router.push('/lead-manager')}
              className="w-full bg-blue-500 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-600 transition-all shadow-lg"
            >
              리드 관리로 돌아가기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
