'use client';

/**
 * 서울 지하철 광고 영업 시스템 (Lead Manager)
 * 메인 대시보드 페이지 - Neo-Seoul Transit Design
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Settings as SettingsIcon,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Map as MapIcon,
  Wifi,
  WifiOff,
  Download,
  Package,
  Users,
  Upload,
  Calendar,
  LogOut,
  Building2,
  Copy,
  Check,
  Train,
  Zap,
  FileImage,
  FileText,
  Search,
  X,
  Shield,
  Database,
  Star,
  Handshake,
} from 'lucide-react';

import { Lead, LeadStatus, ViewMode, Settings, STATUS_LABELS, BusinessCategory, CATEGORY_LABELS, CATEGORY_COLORS, CATEGORY_SERVICE_IDS, MainTab } from './types';
import { DEFAULT_SETTINGS, METRO_TAB_COLORS, SUBWAY_STATIONS } from './constants';
import { METRO_LINE_NAMES } from '@/lib/constants';
import { formatDateDisplay, getPreviousMonth24th } from './utils';
import { fetchAllLeads, testAPIConnection } from './api';
import { getLeads, saveLeads, updateLeadStatus, getSettings, saveSettings, mergeDuplicateLeadsInDB, deleteLeadsByIds } from './supabase-service';
import { getCurrentUser, signOut, UserInfo, logActivity } from './auth-service';
import { getProgressBatch, getLastContactDates } from './crm-service';
import { SalesProgress } from './types';
import { isAddressInRegions, RegionCode } from './region-utils';
import { removeDuplicateLeads, groupDuplicateLeads, mergeDuplicateLeads } from './deduplication-utils';

import GridView from './components/GridView';
import ListView from './components/ListView';
import SettingsModal from './components/SettingsModal';
import SyncProgressModal from './components/SyncProgressModal';
import DuplicateManager from './components/DuplicateManager';

// MapView를 dynamic 임포트 (SSR 방지)
import dynamic from 'next/dynamic';
const MapView = dynamic(() => import('./components/MapView'), { 
  ssr: false,
  loading: () => (
    <div className="bg-[#0b0c10] rounded-2xl border border-slate-800 h-[calc(100vh-280px)] md:h-[calc(100vh-320px)] min-h-[450px] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-t-blue-500 border-slate-700 animate-spin" />
        <p className="text-slate-400 font-medium">네오-서울 수송망 동기화 중...</p>
      </div>
    </div>
  )
});
import StatsDashboard from './components/StatsDashboard';
import InventoryTable from './components/inventory/InventoryTable';
import InventoryUploadModal from './components/inventory/InventoryUploadModal';
import BackupButton from './components/BackupButton';
import ThemeToggle from '@/components/ThemeToggle';
import { ScheduleCalendar, TaskBoard, TaskFormModal } from './components/schedule';
import ProposalsView from './components/ProposalsView';
import FloorPlansView from './components/FloorPlansView';
import ContractsView from './components/ContractsView';
import SuperAdminDashboard from './components/admin/SuperAdminDashboard';
import { TaskWithLead } from './types';
import CallbackNotification from './components/CallbackNotification';
import RoleGuard from '@/components/RoleGuard';
import DataSyncModal from './components/DataSyncModal';
import MobileNavBar from './components/MobileNavBar';
import BackgroundEffect from './components/BackgroundEffect';
import NotificationCenter from '@/components/NotificationCenter';
import { useNotification } from '@/context/NotificationContext';
import { createClient } from '@/lib/supabase/client';
import { resetSupabaseBrowserSession } from '@/lib/supabase/session-cleanup';
import './design.css';
import { applyThemeVariables, ThemeType, getCardClass } from './utils/design-tokens';

function getThreeMonthsDateRange() {
  const end = new Date();
  const start = new Date(end);
  start.setMonth(start.getMonth() - 3); // 인허가일 기준 3개월 단위 조회를 위한 기본값
  return { start, end };
}

function formatDateForLeadQuery(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function LeadManagerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL에서 탭 및 액션 정보 추출
  const initialTab = (searchParams.get('tab') as MainTab) || 'leads';
  const initialAction = searchParams.get('action');

  // 상태 관리
  const [leads, setLeads] = useState<Lead[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isFieldMode, setIsFieldMode] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const { showNotification } = useNotification();

  const handleMergeDuplicates = async (finalLeads: Lead[]) => {
    try {
      const groups = groupDuplicateLeads(leads);
      let mergedCount = 0;

      for (const group of groups) {
        const merged = mergeDuplicateLeads(group);
        const removeIds = group.filter(l => l.id !== merged.id).map(l => l.id);
        if (removeIds.length === 0) continue;

        const result = await mergeDuplicateLeadsInDB(merged.id, removeIds, merged, userInfo);
        if (!result.success) {
          showNotification('error', result.message);
          return;
        }
        mergedCount += 1;
      }

      const removedCount = Math.max(0, leads.length - finalLeads.length);
      setLeads(finalLeads);
      setTotalCount(prev => Math.max(0, prev - removedCount));
      showNotification('success', mergedCount > 0 ? `중복 리드 ${mergedCount}그룹 병합 완료` : '병합할 중복 리드가 없습니다.');
    } catch (error) {
      showNotification('error', error instanceof Error ? error.message : '중복 병합 중 오류가 발생했습니다.');
    }
  };

  const handleRemoveDuplicates = async (duplicateIds: string[]) => {
    if (!duplicateIds.length) {
      showNotification('info', '제거할 중복 리드가 없습니다.');
      return;
    }

    try {
      const result = await deleteLeadsByIds(duplicateIds, userInfo);
      if (!result.success) {
        showNotification('error', result.message);
        return;
      }
      setLeads(prev => prev.filter(l => !duplicateIds.includes(l.id)));
      setTotalCount(prev => Math.max(0, prev - duplicateIds.length));
      showNotification('success', result.message);
    } catch (error) {
      showNotification('error', error instanceof Error ? error.message : '중복 제거 중 오류가 발생했습니다.');
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!userInfo?.permissions?.can_delete_lead && !userInfo?.isSuperAdmin) {
      showNotification('error', '삭제 권한이 없습니다.');
      return;
    }

    if (!window.confirm('이 리드를 삭제하시겠습니까? 삭제한 리드는 복구할 수 없습니다.')) return;

    try {
      const result = await deleteLeadsByIds([leadId], userInfo);
      if (!result.success) {
        showNotification('error', result.message);
        return;
      }
      setLeads(prev => prev.filter(l => l.id !== leadId));
      setTotalCount(prev => Math.max(0, prev - 1));
      showNotification('success', result.message);
    } catch (error) {
      showNotification('error', error instanceof Error ? error.message : '리드 삭제 중 오류가 발생했습니다.');
    }
  };

  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 });
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'ALL'>('ALL');
  const [showUncontactedOnly, setShowUncontactedOnly] = useState(false);
  const [lastContactMap, setLastContactMap] = useState<Record<string, string>>({});
  const UNCONTACTED_DAYS = 7;
  const [categoryFilter, setCategoryFilter] = useState<BusinessCategory>('ALL');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [mainTab, setMainTab] = useState<MainTab>(initialTab);
  const [showInventoryUpload, setShowInventoryUpload] = useState(false);
  const [inventoryRefreshKey, setInventoryRefreshKey] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState<string>('');
  const [mapFocusLead, setMapFocusLead] = useState<Lead | null>(null);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0, status: '' });
  const [showDataSync, setShowDataSync] = useState(false);
  const [salesProgressMap, setSalesProgressMap] = useState<Map<string, SalesProgress[]>>(new Map());
  const [stationSuggestions, setStationSuggestions] = useState<typeof SUBWAY_STATIONS>([]);
  const [showStationSuggestions, setShowStationSuggestions] = useState(false);
  const [isDashboardExpanded, setIsDashboardExpanded] = useState(false);
  const [sortByScore, setSortByScore] = useState(false);

  // SOPO 모달 상태
  const [sopoModalOpen, setSopoModalOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // 스케줄 관련 상태
  const [scheduleView, setScheduleView] = useState<'calendar' | 'board'>('calendar');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskWithLead | null>(null);
  const [taskFormDefaultDate, setTaskFormDefaultDate] = useState<string | undefined>();
  const [scheduleRefreshKey, setScheduleRefreshKey] = useState(0);

  // 사용자 정보
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [copiedInviteCode, setCopiedInviteCode] = useState(false);
  const [onlineUsersCount, setOnlineUsersCount] = useState(0);

  // 날짜 범위 (기본값: 최근 6개월)
  const [dateRange, setDateRange] = useState(getThreeMonthsDateRange);

  // 선택된 지역
  const [selectedRegions, setSelectedRegions] = useState<string[]>(['6110000', '6410000']);

  const [isScrolled, setIsScrolled] = useState(false);
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const filterTimeoutRef = useRef<any>(null);

  // 스크롤 감지
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 단축키 설정
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const REGION_OPTIONS = [
    { code: '6110000', name: '서울', color: 'var(--metro-line1)' },
    { code: '6410000', name: '경기', color: 'var(--metro-line3)' },
  ];

  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const PAGE_SIZE = 50;

  // 초기 로딩 상태
  const [initialLoading, setInitialLoading] = useState(true);

  // 설정 로드
  const loadSettings = useCallback(async () => {
    const result = await getSettings();
    if (result.success) {
      setSettings(result.settings);
    }
  }, []);

  // DB에서 리드 로드
  const loadLeadsFromDB = useCallback(async (
    category?: BusinessCategory,
    regions?: string[],
    page: number = 1,
    search: string = '',
    user?: UserInfo | null
  ) => {
    setIsLoading(true);
    const currentUser = user !== undefined ? user : userInfo;
    
    try {
      const result = await getLeads({
        category: category || categoryFilter,
        regions: regions || selectedRegions,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        searchQuery: search || searchQuery,
        startDate: formatDateForLeadQuery(dateRange.start),
        endDate: formatDateForLeadQuery(dateRange.end),
        searchType: settings.searchType, // 인허가일 vs 최종수정일 기준 전달
        page: page,
        pageSize: PAGE_SIZE,
        userInfo: currentUser || undefined,
        serviceIds: selectedServiceIds.length > 0 ? selectedServiceIds : undefined
      });

      if (result.success) {
        setLeads(result.leads);
        setTotalCount(result.count || 0);
        setCurrentPage(page);

        if (result.leads.length > 0) {
          const leadIds = result.leads.map(l => l.id);
          const progressData = await getProgressBatch(leadIds);
          setSalesProgressMap(progressData);
          // 미접촉 판정용 마지막 통화 시각 조회
          getLastContactDates(leadIds).then(setLastContactMap);
        }
      } else {
        console.error('[LoadLeads] API Error:', result.message);
        showNotification('error', result.message || '데이터를 불러오지 못했습니다.');
      }
    } catch (error) {
      console.error('[LoadLeads] Exception:', error);
      showNotification('error', '데이터 로딩 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [categoryFilter, selectedRegions, statusFilter, searchQuery, dateRange, settings.searchType, showNotification, userInfo, selectedServiceIds]);

  // 설정 및 데이터 로드
  useEffect(() => {
    const init = async () => {
      setInitialLoading(true);

      let restoredCategory: BusinessCategory = 'ALL';
      let restoredRegions: string[] = ['6110000', '6410000'];

      try {
        if (typeof window !== 'undefined') {
          const savedCategory = localStorage.getItem('leadManager_categoryFilter');
          if (savedCategory) {
            restoredCategory = savedCategory as BusinessCategory;
            setCategoryFilter(restoredCategory);
          }

          const savedRegions = localStorage.getItem('leadManager_selectedRegions');
          if (savedRegions) {
            try {
              restoredRegions = JSON.parse(savedRegions);
              setSelectedRegions(restoredRegions);
            } catch (e) {
              console.error('Failed to parse saved regions:', e);
            }
          }

          const savedTheme = localStorage.getItem('leadManager_activeTheme') as ThemeType;
          if (savedTheme) {
            applyThemeVariables(savedTheme);
          }
        }

        console.log('[Init] Starting initialization...');
        const user = await getCurrentUser();
        setUserInfo(user);
        await loadSettings();
        
        // 복원된 값을 사용하여 즉시 로드 (사용자 정보 포함)
        await loadLeadsFromDB(restoredCategory, restoredRegions, 1, '', user);
      } catch (error) {
        console.error('[Init] Error during initialization:', error);
      } finally {
        setInitialLoading(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 로그아웃 처리
  const handleSignOut = async () => {
    try {
      // 1. 클라이언트 측 세션 정리 시도
      const supabase = createClient();
      await resetSupabaseBrowserSession(supabase);
      
      // 2. 서버 측 세션 파기 및 리다이렉트를 위해 전용 API 호출
      // 이 방식은 미들웨어의 파라미터 감지에만 의존하지 않고 확실하게 서버 세션을 종료합니다.
      window.location.href = '/api/auth/logout?redirect=1';
    } catch (e) {
      console.error('로그아웃 중 예외 발생:', e);
      // 오류 발생 시에도 강제 리다이렉트
      window.location.href = '/api/auth/logout?redirect=1';
    }
  };

  // 실시간 접속자
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase.channel('online-users', {
      config: { presence: { key: userInfo?.email || 'anonymous' } }
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setOnlineUsersCount(Object.keys(state).length);
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [userInfo]);

  const copyInviteCode = () => {
    if (userInfo?.inviteCode) {
      navigator.clipboard.writeText(userInfo.inviteCode);
      setCopiedInviteCode(true);
      setTimeout(() => setCopiedInviteCode(false), 2000);
      showNotification('info', '초대 코드가 복사되었습니다.');
    }
  };

  // 필터 변경 감지 및 저장 (디바운스 적용)
  useEffect(() => {
    if (!initialLoading && userInfo) {
      if (filterTimeoutRef.current) {
        clearTimeout(filterTimeoutRef.current);
      }
      filterTimeoutRef.current = setTimeout(() => {
        console.log('[Effect] Filters changed, reloading leads...', {
          categoryFilter,
          selectedRegions,
          statusFilter,
          searchQuery,
          hasUser: !!userInfo,
        });
        loadLeadsFromDB(categoryFilter, selectedRegions, currentPage, searchQuery);
      }, 300);
    }
    return () => {
      if (filterTimeoutRef.current) {
        clearTimeout(filterTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryFilter, selectedRegions, statusFilter, currentPage, searchQuery, dateRange, initialLoading, userInfo]);

// Removed duplicate filter effect; debounce logic above handles data fetching.


  const checkConnection = useCallback(async () => {
    const result = await testAPIConnection(settings);
    setIsConnected(result.success);
    showNotification(result.success ? 'success' : 'error', result.message);
  }, [settings, showNotification]);

  const refreshData = async () => {
    // Validate date range
    const now = new Date();
    let { start, end } = dateRange;
    // Clamp future dates
    if (start > now) start = now;
    if (end > now) end = now;
    // Ensure start <= end
    if (start > end) {
      const temp = start;
      start = end;
      end = temp;
    }
    setDateRange({ start, end });

    setShowSyncModal(true);
    setIsLoading(true);
    setLoadingProgress({ current: 0, total: 0 });
    setSyncProgress({ current: 0, total: 0, status: '설정된 기간의 데이터 동기화 준비 중...' });
    setLoadingStatus('설정된 기간의 데이터 동기화 준비 중...');

    try {
      const searchSettings: any = {
        ...settings,
        regionCodes: selectedRegions,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        serviceIds: selectedServiceIds.length > 0 ? selectedServiceIds : undefined,
        searchQuery: searchQuery.trim(),
      };

      const result = await fetchAllLeads(
        searchSettings,
        start,
        end,
        (current, total, status) => {
          setSyncProgress({ current, total, status: status || '' });
          setLoadingProgress({ current, total });
          if (status) setLoadingStatus(status);
        },
        categoryFilter,
        selectedServiceIds
      );

      if (result.success) {
        setLoadingStatus('데이터베이스 업데이트 완료!');
        await loadLeadsFromDB(categoryFilter, selectedRegions, 1, searchQuery);
        
        const regionNames = selectedRegions.map(code => REGION_OPTIONS.find(r => r.code === code)?.name || code).join('+');
        showNotification('success', `[${regionNames}/${CATEGORY_LABELS[categoryFilter]}] 신규 리드 ${result.leads.length}건이 동기화되었습니다.`);
      } else {
        const msg = result.message || '데이터 조회에 실패했습니다.';
        // API 키 미설정(503) 여부 확인 후 안내
        if (msg.includes('API 키') || msg.includes('503') || msg.includes('서버 설정 오류')) {
          showNotification('error', '⚠️ LocalData API 키가 설정되지 않았습니다. [설정] 버튼에서 API 키를 입력해주세요.');
          setIsSettingsOpen(true); // 설정 모달 자동 오픈
        } else {
          showNotification('error', msg);
        }
      }
    } catch (error) {
      const errMsg = (error as Error).message;
      if (errMsg.includes('API 키') || errMsg.includes('503')) {
        showNotification('error', '⚠️ API 키 설정이 필요합니다. [설정]에서 LocalData API 키를 입력해주세요.');
        setIsSettingsOpen(true);
      } else {
        showNotification('error', `오류: ${errMsg}`);
      }
    } finally {
      setIsLoading(false);
      setLoadingStatus('');
      setShowSyncModal(false);
    }
  };

  const filteredLeads = useMemo(() => {
    if (!leads.length) return [];
    const q = searchQuery.trim().toLowerCase();
    // DB와 동일한 로직: "역" 접미사 제거 후 역명 비교
    const stationQ = q.endsWith('역') ? q.slice(0, -1) : q;

    const filtered = leads.filter(lead => {
      if (categoryFilter !== 'ALL' && lead.category !== categoryFilter) return false;
      if (statusFilter !== 'ALL' && lead.status !== statusFilter) return false;
      if (showUncontactedOnly) {
        const cutoff = Date.now() - UNCONTACTED_DAYS * 24 * 60 * 60 * 1000;
        const lastContact = lastContactMap[lead.id];
        // 마지막 통화가 없거나 N일 이상 지난 리드만 유지
        if (lastContact && new Date(lastContact).getTime() >= cutoff) return false;
      }
      if (selectedServiceIds.length > 0 && !selectedServiceIds.includes(lead.serviceId || '')) return false;
      if (q) {
        const matchStation = (lead.nearestStation || '').toLowerCase().includes(stationQ);
        const matchLine = Array.isArray(lead.stationLines) && lead.stationLines.some(line => {
          const lineName = (METRO_LINE_NAMES[line] || '').toLowerCase();
          return lineName.includes(q) || q.includes(line.toLowerCase());
        });
        if (
          !lead.bizName?.toLowerCase().includes(q) &&
          !(lead.roadAddress || '').toLowerCase().includes(q) &&
          !(lead.phone || '').toLowerCase().includes(q) &&
          !(lead.medicalSubject || '').toLowerCase().includes(q) &&
          !(lead.serviceName || '').toLowerCase().includes(q) &&
          !matchStation &&
          !matchLine
        ) {
          return false;
        }
      }
      return true;
    });
    return filtered.sort((a, b) => {
      const dateA = a.licenseDate ? new Date(a.licenseDate).getTime() : 0;
      const dateB = b.licenseDate ? new Date(b.licenseDate).getTime() : 0;
      return dateB - dateA;
    });
  }, [leads, categoryFilter, statusFilter, selectedServiceIds, searchQuery, showUncontactedOnly, lastContactMap]);

  const handleStatusChange = async (leadId: string, newStatus: LeadStatus) => {
    const result = await updateLeadStatus(leadId, newStatus);
    if (result.success) {
      setLeads(prev => prev.map(lead => lead.id === leadId ? { ...lead, status: newStatus, assignedToName: newStatus === 'CONTACTED' ? result.assignedToName : lead.assignedToName, assignedAt: newStatus === 'CONTACTED' ? new Date().toISOString() : lead.assignedAt } : lead));
      showNotification('success', result.message);
    } else {
      showNotification('error', result.message);
    }
  };

  const handleSaveSettings = async (newSettings: Settings) => {
    setSettings(newSettings);
    await saveSettings(newSettings);
    setIsSettingsOpen(false);
    showNotification('success', '설정이 저장되었습니다.');
  };

  const moveDateByMonths = (months: number) => {
    setDateRange(prev => {
      const newStart = new Date(prev.start);
      newStart.setMonth(newStart.getMonth() + months);
      const newEnd = new Date(prev.end);
      newEnd.setMonth(newEnd.getMonth() + months);
      return { start: newStart, end: newEnd };
    });
  };

  const exportToCSV = () => {
    const headers = ['병원명', '주소', '전화번호', '진료과목', '인근역', '거리', '상태', '인허가일', '담당자', '이메일', '마지막 통화일', '메모'];
    const rows = filteredLeads.map(lead => [
      lead.bizName,
      lead.roadAddress || lead.lotAddress || '',
      lead.phone || '',
      lead.medicalSubject || '',
      lead.nearestStation || '',
      lead.stationDistance ? `${lead.stationDistance}m` : '',
      STATUS_LABELS[lead.status],
      lead.licenseDate || '',
      lead.assignedToName || '',
      lead.email || '',
      lastContactMap[lead.id] ? new Date(lastContactMap[lead.id]).toLocaleDateString('ko-KR') : '',
      lead.notes || ''
    ]);
    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `leads_${formatDateDisplay(new Date())}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setLoadingStatus('파일 업로드 및 처리 중...');
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/import-csv', {
        method: 'POST',
        body: formData,
      });
      
      const result = await response.json();
      if (result.success) {
        showNotification('success', `성공적으로 ${result.count}건의 활성 리드가 추가되었습니다.`);
        await loadLeadsFromDB(categoryFilter, selectedRegions, 1, searchQuery);
      } else {
        showNotification('error', `업로드 실패: ${result.message}`);
      }
    } catch (err: any) {
      showNotification('error', `업로드 오류: ${err.message}`);
    } finally {
      setIsLoading(false);
      setLoadingStatus('');
      if (e.target) e.target.value = ''; // 폼 초기화
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] relative overflow-x-hidden">
      <BackgroundEffect />
      <header className={`header-blur border-b border-[var(--glass-border)] sticky top-0 z-40 backdrop-blur-xl transition-all duration-300 ${isScrolled ? 'header-scrolled bg-[var(--bg-primary)]/95 h-14' : 'h-16 bg-[var(--bg-primary)]/80'}`}>
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3 group cursor-pointer" onClick={() => router.push('/')}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105 bg-gradient-to-br from-[var(--metro-line2)] to-[var(--metro-line4)] shadow-[0_4px_15px_rgba(60,181,74,0.25)]">
                <Train className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-[var(--text-primary)] leading-tight">지하철 광고</h1>
                <p className="text-[10px] text-[var(--text-muted)] font-medium tracking-wider uppercase">리드 매니저</p>
              </div>
            </div>

            <div className="flex gap-1 p-1 rounded-xl bg-[var(--bg-tertiary)]/80 border border-[var(--border-subtle)]">
              {[
                { key: 'leads' as MainTab, icon: Users, label: '리드' },
                { key: 'inventory' as MainTab, icon: Package, label: '인벤토리' },
                { key: 'schedule' as MainTab, icon: Calendar, label: '스케줄' },
                { key: 'proposals' as MainTab, icon: FileText, label: '제안서' },
                { key: 'floor-plans' as MainTab, icon: FileImage, label: '도면' },
                { key: 'contracts' as MainTab, icon: Handshake, label: '계약' },
                ...(userInfo?.isSuperAdmin ? [{ key: 'admin' as MainTab, icon: Shield, label: '관리' }] : []),
              ].map(({ key, icon: Icon, label }) => (
                <button
                  key={key}
                  onClick={() => setMainTab(key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${mainTab === key ? 'text-white shadow-[0_2px_10px_var(--tab-glow)] bg-[--tab-bg]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}`}
                  style={{
                    '--tab-bg': mainTab === key ? METRO_TAB_COLORS[key].active : 'transparent',
                    '--tab-glow': mainTab === key ? METRO_TAB_COLORS[key].glow : 'transparent',
                  } as React.CSSProperties}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-tertiary)]" title="실시간 활성 계정">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs text-[var(--text-muted)]">활성 계정</span>
                <span className="text-xs font-semibold text-[var(--text-primary)]">{onlineUsersCount}명</span>
              </div>
              <NotificationCenter />
              <ThemeToggle />
              <button onClick={() => setIsSettingsOpen(true)} className="p-2 rounded-lg hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors" title="설정">
                <SettingsIcon className="w-5 h-5" />
              </button>
              <div className="relative">
                <button onClick={() => setShowUserMenu(!showUserMenu)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[var(--bg-secondary)] transition-colors">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[--avatar-bg]" style={{ '--avatar-bg': 'linear-gradient(135deg, var(--metro-line7) 0%, var(--metro-line5) 100%)' } as React.CSSProperties}>
                    <span className="text-white text-sm font-bold">{userInfo?.email?.charAt(0).toUpperCase() || 'U'}</span>
                  </div>
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-[var(--glass-border)] py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200 bg-[--glass-bg] shadow-[--glass-shadow] backdrop-blur-[20px]" style={{ '--glass-bg': 'var(--glass-bg)', '--glass-shadow': '0 20px 40px rgba(0,0,0,0.4)' } as React.CSSProperties}>
                    <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{userInfo?.email}</p>
                      {userInfo?.organizationName && (
                        <div className="flex items-center gap-2 mt-1.5">
                          <Building2 className="w-3.5 h-3.5 text-[var(--metro-line4)]" />
                          <span className="text-xs text-[var(--text-secondary)]">{userInfo.organizationName}</span>
                          {userInfo.role === 'owner' && <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-[var(--metro-line5)] text-white">관리자</span>}
                        </div>
                      )}
                    </div>
                    {userInfo?.role === 'owner' && userInfo?.inviteCode && (
                      <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
                        <p className="text-[10px] text-[var(--text-muted)] mb-1.5 font-medium">팀 초대 코드</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-xs font-mono bg-[var(--bg-secondary)] text-[var(--metro-line2)] px-2.5 py-1.5 rounded-lg">{userInfo.inviteCode}</code>
                          <button onClick={copyInviteCode} className="p-1.5 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors">
                            {copiedInviteCode ? <Check className="w-3.5 h-3.5 text-[var(--metro-line2)]" /> : <Copy className="w-3.5 h-3.5 text-[var(--text-muted)]" />}
                          </button>
                        </div>
                      </div>
                    )}
                    <button onClick={handleSignOut} className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors">
                      <LogOut className="w-4 h-4" /> 로그아웃
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {mainTab === 'leads' && (
          <div className="border-t border-[var(--border-subtle)]/50 bg-[var(--bg-secondary)]/30">
            <div className="max-w-[1400px] mx-auto px-6 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-y-3 gap-x-4">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]">
                    <Calendar className="w-4 h-4 text-[var(--metro-line5)]" />
                    <input
                      type="date"
                      aria-label="시작 날짜"
                      title="시작 날짜"
                      value={dateRange.start.toISOString().split('T')[0]}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) return;
                        const newStart = new Date(val);
                        setDateRange((prev) => ({
                          start: newStart,
                          end: newStart > prev.end ? newStart : prev.end,
                        }));
                      }}
                      className="text-xs bg-transparent border-0 text-[var(--text-secondary)] w-24 focus:outline-none"
                    />
                    <span className="text-[var(--text-muted)] text-xs">~</span>
                    <input
                      type="date"
                      aria-label="종료 날짜"
                      title="종료 날짜"
                      value={dateRange.end.toISOString().split('T')[0]}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) return;
                        const newEnd = new Date(val);
                        setDateRange((prev) => ({
                          start: newEnd < prev.start ? newEnd : prev.start,
                          end: newEnd,
                        }));
                      }}
                      className="text-xs bg-transparent border-0 text-[var(--text-secondary)] w-24 focus:outline-none"
                    />                    <div className="flex border-l border-[var(--border-subtle)] pl-2 ml-1">
                      <button onClick={() => moveDateByMonths(-3)} title="이전 3개월 이동" aria-label="이전 3개월 이동" className="p-1 hover:bg-[var(--bg-secondary)] rounded transition-colors"><ChevronLeft className="w-3.5 h-3.5 text-[var(--text-muted)]" /></button>
                      <button onClick={() => moveDateByMonths(3)} title="다음 3개월 이동" aria-label="다음 3개월 이동" className="p-1 hover:bg-[var(--bg-secondary)] rounded transition-colors"><ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" /></button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {REGION_OPTIONS.map(region => (
                      <button key={region.code} onClick={() => setSelectedRegions(prev => prev.includes(region.code) ? (prev.length === 1 ? prev : prev.filter(c => c !== region.code)) : [...prev, region.code])} className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${selectedRegions.includes(region.code) ? 'text-white bg-[--region-color]' : 'text-[var(--text-muted)] bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] hover:text-[var(--text-secondary)]'}`} style={{ '--region-color': region.color } as React.CSSProperties}>{region.name}</button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-1 p-0.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]">
                  <button onClick={() => setIsFieldMode(!isFieldMode)} className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${isFieldMode ? 'bg-[var(--metro-line2)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}`} title="현장 모드"><Zap className="w-4 h-4" /></button>
                  <div className="w-px bg-[var(--border-subtle)] my-1" />
                  <button onClick={() => setSortByScore(!sortByScore)} className={`flex items-center justify-center w-8 h-8 rounded-lg transition-all ${sortByScore ? 'bg-[var(--metro-line5)] text-white shadow-sm' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'}`} title="리드 스코어 우선순위 정렬"><Star className="w-4 h-4" /></button>
                  <div className="w-px bg-[var(--border-subtle)] my-1" />
                  {[
                    { mode: 'grid' as ViewMode, icon: LayoutGrid, color: 'var(--metro-line2)', name: '그리드 보기' },
                    { mode: 'list' as ViewMode, icon: List, color: 'var(--metro-line4)', name: '목록 보기' },
                    { mode: 'map' as ViewMode, icon: MapIcon, color: 'var(--metro-line3)', name: '지도 보기' },
                  ].map(({ mode, icon: Icon, color, name }) => (
                    <button key={mode} onClick={() => setViewMode(mode)} title={name} aria-label={name} className={`p-2 rounded-md transition-all ${viewMode === mode ? 'text-white shadow bg-[--btn-color]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`} style={{ '--btn-color': color } as React.CSSProperties}><Icon className="w-4 h-4" /></button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={checkConnection} className={`p-2 rounded-lg transition-all ${isConnected === null ? 'text-[var(--text-muted)]' : isConnected ? 'text-[var(--metro-line2)] bg-[var(--metro-line2)]/10' : 'text-red-400 bg-red-500/10'}`} title="연결 상태">{isConnected ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}</button>
                  <button onClick={refreshData} disabled={isLoading} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-white text-xs font-medium transition-all hover:opacity-90 disabled:opacity-50 bg-[var(--metro-line2)]">
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} /> {isLoading ? `${loadingProgress.current}/${loadingProgress.total}` : '새로고침'}
                  </button>
                  <button
                    onClick={() => setShowDataSync(true)}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-white text-xs font-medium transition-all hover:opacity-90 disabled:opacity-50 bg-gradient-to-r from-[var(--metro-line3)] to-[var(--metro-line4)]"
                    title="경기도·서울 공공데이터 동기화"
                  >
                    <Database className="w-3.5 h-3.5" /> 공공데이터
                  </button>
                  <button onClick={exportToCSV} className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--metro-line5)] hover:bg-[var(--bg-secondary)] transition-colors" title="CSV 내보내기"><Download className="w-4 h-4" /></button>
                  <label className="cursor-pointer p-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--metro-line2)] hover:bg-[var(--bg-secondary)] transition-colors" title="CSV 데이터 업로드">
                    <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
                    <Upload className="w-4 h-4" />
                  </label>
                  <RoleGuard allowedRoles={['owner', 'admin']}><BackupButton /></RoleGuard>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      <CallbackNotification onLeadClick={(id) => console.log('Lead clicked:', id)} />

      {mainTab === 'leads' && (
        <>
          <div className="max-w-[1400px] mx-auto px-6 pt-6">
            <StatsDashboard leads={leads} isExpanded={isDashboardExpanded} onToggle={() => setIsDashboardExpanded(!isDashboardExpanded)} onStatusFilter={setStatusFilter} currentStatusFilter={statusFilter} />
          </div>
          <div className="bg-[var(--bg-secondary)]/30 border-b border-[var(--border-subtle)]/50">
            <div className="max-w-[1400px] mx-auto px-6 py-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="relative hidden sm:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="상호명, 주소, 강남역, 2호선, 전화번호..."
                      value={searchQuery}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSearchQuery(val);
                        const trimmed = val.trim();
                        if (trimmed.length >= 1) {
                          const stationQ = trimmed.endsWith('역') ? trimmed.slice(0, -1) : trimmed;
                          const matched = SUBWAY_STATIONS.filter(s =>
                            s.name.toLowerCase().includes(stationQ.toLowerCase()) ||
                            s.lines.some(l => (METRO_LINE_NAMES[l] || '').includes(trimmed))
                          ).slice(0, 8);
                          setStationSuggestions(matched);
                          setShowStationSuggestions(matched.length > 0);
                        } else {
                          setShowStationSuggestions(false);
                        }
                      }}
                      onFocus={() => {
                        if (stationSuggestions.length > 0) setShowStationSuggestions(true);
                      }}
                      onBlur={() => setTimeout(() => setShowStationSuggestions(false), 150)}
                      className="pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-tertiary)] text-sm focus:ring-2 focus:ring-[var(--metro-line2)] focus:border-transparent w-72 transition-all"
                    />
                    {showStationSuggestions && (
                      <div className="absolute top-full left-0 mt-1 w-72 bg-[var(--bg-card)] border border-[var(--border-subtle)] rounded-xl shadow-xl z-50 overflow-hidden">
                        <div className="px-3 py-1.5 text-[10px] text-[var(--text-muted)] border-b border-[var(--border-subtle)] font-medium">인근역 빠른 검색</div>
                        {stationSuggestions.map(station => (
                          <button
                            key={station.name}
                            onMouseDown={() => {
                              setSearchQuery(`${station.name}역`);
                              setShowStationSuggestions(false);
                            }}
                            className="w-full flex items-center justify-between px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors text-left"
                          >
                            <span>{station.name}역</span>
                            <span className="flex gap-1">
                              {station.lines.map(line => (
                                <span
                                  key={line}
                                  className="text-[10px] px-1.5 py-0.5 rounded text-white font-bold"
                                  style={{ backgroundColor: `var(--metro-line${line.match(/^\d$/) ? line : ''})` || '#888' }}
                                >
                                  {METRO_LINE_NAMES[line] || line}
                                </span>
                              ))}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {(Object.keys(CATEGORY_LABELS) as BusinessCategory[]).map(category => {
                      const colors = CATEGORY_COLORS[category];
                      const catColor = colors.bg.includes('red') ? 'var(--metro-line1)' : colors.bg.includes('amber') || colors.bg.includes('orange') ? 'var(--metro-line3)' : colors.bg.includes('purple') ? 'var(--metro-line5)' : colors.bg.includes('cyan') ? 'var(--metro-line4)' : colors.bg.includes('emerald') ? 'var(--metro-line2)' : colors.bg.includes('lime') ? 'var(--metro-line7)' : colors.bg.includes('pink') ? 'var(--metro-line8)' : colors.bg.includes('yellow') ? 'var(--metro-line9)' : colors.bg.includes('rose') ? 'var(--metro-line6)' : 'var(--metro-line9)';
        // noinspection CssInlineStyle
                      return <button key={category} onClick={() => { setCategoryFilter(category); setSelectedServiceIds([]); }} className={`px-3 py-1.5 text-xs rounded-lg transition-all font-medium ${categoryFilter === category ? 'text-white shadow-md bg-[--cat-color]' : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] border border-[var(--border-subtle)]'}`} style={{ '--cat-color': categoryFilter === category ? catColor : 'transparent' } as React.CSSProperties}>{category === 'ALL' ? '전체 업종' : CATEGORY_LABELS[category]}</button>;
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    {(['ALL', 'NEW', 'PROPOSAL_SENT', 'CONTACTED', 'CONTRACTED'] as const).map((status, idx) => {
                      const statusColors = ['var(--metro-line9)', 'var(--metro-line2)', 'var(--metro-line4)', 'var(--metro-line5)', 'var(--metro-line3)'];
        // noinspection CssInlineStyle
                      return <button key={status} onClick={() => setStatusFilter(status)} className={`px-3 py-1.5 text-xs rounded-lg transition-all font-medium ${statusFilter === status ? 'text-white shadow-md bg-[--status-color]' : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] border border-[var(--border-subtle)]'}`} style={{ '--status-color': statusFilter === status ? statusColors[idx] : 'transparent' } as React.CSSProperties}>{status === 'ALL' ? '전체 상태' : STATUS_LABELS[status]}</button>;
                    })}
                    <button onClick={() => setShowUncontactedOnly(prev => !prev)} className={`px-3 py-1.5 text-xs rounded-lg transition-all font-medium ${showUncontactedOnly ? 'text-white shadow-md bg-[var(--metro-line6)]' : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] border border-[var(--border-subtle)]'}`} title={`마지막 통화가 ${UNCONTACTED_DAYS}일 이상 지난 리드만 표시`}>
                      <Calendar className="w-3.5 h-3.5 inline mr-1" />미접촉 {UNCONTACTED_DAYS}일
                    </button>
                  </div>
                  <span className="text-sm font-semibold text-[var(--metro-line2)]">{totalCount.toLocaleString()}건 조회됨</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-[var(--text-muted)]">세부:</span>
                  <button onClick={() => setSelectedServiceIds([])} className={`px-2.5 py-1 text-[11px] rounded-md transition-all font-medium ${selectedServiceIds.length === 0 ? 'bg-[var(--metro-line2)] text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}>전체 서비스</button>
                  {CATEGORY_SERVICE_IDS[categoryFilter].map(service => {
                    const isSelected = selectedServiceIds.includes(service.id);
                    return <button key={service.id} onClick={() => setSelectedServiceIds(prev => isSelected ? prev.filter(id => id !== service.id) : [...prev, service.id])} className={`px-2.5 py-1 text-[11px] rounded-md transition-all font-medium ${isSelected ? 'bg-[var(--metro-line4)] text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'}`}>{service.name}</button>;
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <main className="max-w-[1400px] mx-auto px-6 py-8 pb-24 md:pb-8 relative z-10">
        {!userInfo?.isApproved ? (
          <div className={`rounded-3xl border border-amber-200 shadow-2xl p-12 text-center max-w-2xl mx-auto mt-20 animate-in fade-in slide-in-from-bottom-4 duration-500 ${getCardClass()}`}>
            <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-lg"><Shield className="w-10 h-10 animate-pulse" /></div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">승인 대기 중</h2>
            <p className="text-slate-600 mb-10 text-lg">관리자가 승인한 후 시스템을 이용하실 수 있습니다.</p>
            <div className="flex flex-col gap-4">
              <button onClick={() => window.location.reload()} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"><RefreshCw className="w-5 h-5" /> 새로고침</button>
              <button onClick={handleSignOut} className="px-8 py-4 text-slate-500 hover:bg-slate-100 rounded-2xl font-medium">다른 계정 로그인</button>
            </div>
          </div>
        ) : mainTab === 'leads' ? (
          <>
            {initialLoading ? (
              <div className="flex flex-col items-center justify-center py-24">
                <div id="loading-spinner" className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 animate-float bg-[--loading-bg] shadow-[--loading-glow]" style={{ '--loading-bg': 'linear-gradient(135deg, var(--metro-line2) 0%, var(--metro-line4) 100%)', '--loading-glow': '0 0 20px rgba(60, 181, 74, 0.4)' } as React.CSSProperties}><RefreshCw className="w-8 h-8 text-white" /></div>
                <p className="text-[var(--text-secondary)] font-medium">데이터 로딩 중...</p>
              </div>
            ) : isLoading ? (
              <div className="flex flex-col items-center justify-center py-24">
                <div id="loading-spinner" className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 bg-[--loading-bg] shadow-[--loading-glow]" style={{ '--loading-bg': 'linear-gradient(135deg, var(--metro-line4) 0%, var(--metro-line2) 100%)', '--loading-glow': '0 8px 30px rgba(50, 164, 206, 0.3)' } as React.CSSProperties}><RefreshCw className="w-8 h-8 text-white" /></div>
                <p className="text-[var(--text-secondary)] font-medium mb-2">{loadingStatus ? '공공데이터 동기화 중...' : '데이터를 불러오는 중...'}</p>
                {loadingStatus && <p className="text-sm text-[var(--metro-line2)] font-semibold">{loadingStatus}</p>}
                {loadingProgress.total > 0 && (
                  <div className="mt-4 w-64">
                    <div className="h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                      <div className="h-full bg-[var(--metro-line2)] transition-all duration-300" style={{ width: `${(loadingProgress.current / loadingProgress.total) * 100}%` }} />
                    </div>
                  </div>
                )}
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center">
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 bg-[var(--bg-tertiary)] border-2 border-dashed border-[var(--border-subtle)]"><List className="w-10 h-10 text-[var(--text-muted)]" /></div>
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3">데이터가 없습니다</h3>
                <button onClick={refreshData} className="metro-btn-primary flex items-center gap-2.5"><RefreshCw className="w-4 h-4" /> 데이터 가져오기</button>
              </div>
            ) : (
              <>
                {leads.length > 0 && (
                  <DuplicateManager leads={leads} onMergeDuplicates={handleMergeDuplicates} onRemoveDuplicates={handleRemoveDuplicates} />
                )}
{viewMode === 'grid' && <GridView leads={filteredLeads} onStatusChange={handleStatusChange} onDeleteLead={handleDeleteLead} searchQuery={searchQuery} onMapView={(l) => { setMapFocusLead(l); setViewMode('map'); }} salesProgressMap={salesProgressMap} isFieldMode={isFieldMode} currentPage={currentPage} totalCount={totalCount} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} onRefresh={() => loadLeadsFromDB(categoryFilter, selectedRegions, currentPage, searchQuery)} sortByScore={sortByScore} onSopoClick={async (lead) => {
    if (userInfo?.permissions?.can_export || userInfo?.isSuperAdmin) {
      setSelectedLead(lead);
      setSopoModalOpen(true);
    } else {
      showNotification('error', 'SOPO 조회 권한이 없습니다.');
    }
  }} />}
                  {viewMode === 'list' && <ListView leads={filteredLeads} onStatusChange={handleStatusChange} onDeleteLead={handleDeleteLead} searchQuery={searchQuery} onMapView={(l) => { setMapFocusLead(l); setViewMode('map'); }} salesProgressMap={salesProgressMap} currentPage={currentPage} totalCount={totalCount} pageSize={PAGE_SIZE} onPageChange={setCurrentPage} onRefresh={() => loadLeadsFromDB(categoryFilter, selectedRegions, currentPage, searchQuery)} sortByScore={sortByScore} onSopoClick={async (lead) => {
    if (userInfo?.permissions?.can_export || userInfo?.isSuperAdmin) {
      setSelectedLead(lead);
      setSopoModalOpen(true);
    } else {
      showNotification('error', 'SOPO 조회 권한이 없습니다.');
    }
  }} />}
                {viewMode === 'map' && <MapView leads={filteredLeads} onStatusChange={handleStatusChange} onListView={() => setViewMode('list')} focusLead={mapFocusLead} onFocusClear={() => setMapFocusLead(null)} />}
              </>
            )}
          </>
        ) : mainTab === 'inventory' ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <button onClick={() => setShowInventoryUpload(true)} className="flex items-center gap-2 px-4 py-2 bg-[var(--metro-line2)] text-white rounded-md hover:bg-[var(--metro-line2)]/80 transition-colors">
                <Upload className="w-4 h-4" /> 엑셀 업로드
              </button>
            </div>
            <InventoryTable key={inventoryRefreshKey} onRefresh={() => setInventoryRefreshKey(k => k + 1)} />
          </>
        ) : mainTab === 'schedule' ? (
          <div key={scheduleRefreshKey}>
            {scheduleView === 'calendar' ? (
              <ScheduleCalendar
                onDateSelect={setTaskFormDefaultDate}
                onEventClick={(e) => {
                  if (e.type === 'task') {
                    setSelectedTask({
                      id: e.id.replace('task-', ''),
                      taskType: e.taskType || 'OTHER',
                      title: e.title,
                      dueDate: e.date,
                      dueTime: e.time,
                      status: e.status || 'PENDING',
                      priority: e.priority || 'MEDIUM',
                      leadId: e.leadId,
                    } as TaskWithLead);
                    setShowTaskForm(true);
                  }
                }}
                onAddTask={(d) => {
                  setSelectedTask(null);
                  setTaskFormDefaultDate(d);
                  setShowTaskForm(true);
                }}
              />
            ) : (
              <TaskBoard onTaskClick={(t) => { setSelectedTask(t); setShowTaskForm(true); }} />
            )}
          </div>
        ) : mainTab === 'proposals' ? (
          <ProposalsView defaultOpenUpload={initialTab === 'proposals' && initialAction === 'upload'} />
        ) : mainTab === 'floor-plans' ? (
          <div className="-mx-6 -my-8 h-[calc(100vh-140px)]"><FloorPlansView /></div>
        ) : mainTab === 'contracts' ? (
          <ContractsView />
        ) : (
          <SuperAdminDashboard />
        )}
      </main>

      {showSyncModal && <SyncProgressModal current={syncProgress.current} total={syncProgress.total} status={syncProgress.status} onClose={() => setShowSyncModal(false)} />}
      {showInventoryUpload && <InventoryUploadModal onClose={() => setShowInventoryUpload(false)} onSuccess={() => { setInventoryRefreshKey(k => k + 1); showNotification('success', '업로드되었습니다.'); }} />}
      {isSettingsOpen && <SettingsModal settings={settings} onSave={handleSaveSettings} onClose={() => setIsSettingsOpen(false)} onDataChanged={() => loadLeadsFromDB()} />}
      {showTaskForm && <TaskFormModal task={selectedTask} defaultDate={taskFormDefaultDate} onSave={() => { setShowTaskForm(false); setSelectedTask(null); setScheduleRefreshKey(k => k + 1); showNotification('success', '업무가 저장되었습니다.'); }} onClose={() => { setShowTaskForm(false); setSelectedTask(null); }} />}
      {showDataSync && (
        <DataSyncModal
          onClose={() => setShowDataSync(false)}
          onSyncComplete={(saved) => {
            showNotification('success', `공공데이터 동기화 완료: ${saved.toLocaleString()}건이 저장되었습니다.`);
            loadLeadsFromDB(categoryFilter, selectedRegions, 1, searchQuery);
          }}
        />
      )}
      <MobileNavBar activeTab={mainTab} onTabChange={(t) => { setMainTab(t); if (viewMode === 'map') setViewMode('grid'); }} onViewModeChange={setViewMode} onSettingsClick={() => setIsSettingsOpen(true)} className="anchored-bottom" />
    </div>
  );
}

export default function LeadManagerPage() {
  return (
    <React.Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div></div>}>
      <LeadManagerContent />
    </React.Suspense>
  );
}
