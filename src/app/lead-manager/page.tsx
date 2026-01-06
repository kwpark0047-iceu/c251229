'use client';

/**
 * 서울 지하철 광고 영업 시스템 (Lead Manager)
 * 메인 대시보드 페이지 - Neo-Seoul Transit Design
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Settings as SettingsIcon,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Map,
  Wifi,
  WifiOff,
  Download,
  Filter,
  Package,
  Users,
  Upload,
  Home,
  Calendar,
  MapPin,
  LogOut,
  Building2,
  Copy,
  Check,
  Train,
  Zap,
  FileImage,
} from 'lucide-react';

import { Lead, LeadStatus, ViewMode, Settings, STATUS_LABELS, BusinessCategory, CATEGORY_LABELS, CATEGORY_COLORS, CATEGORY_SERVICE_IDS, ServiceIdInfo } from './types';
import { DEFAULT_SETTINGS } from './constants';
import { formatDateDisplay, getPreviousMonth24th } from './utils';
import { fetchAllLeads, testAPIConnection } from './api';
import { getLeads, saveLeads, updateLeadStatus, getSettings, saveSettings } from './supabase-service';
import { getCurrentUser, signOut, UserInfo } from './auth-service';

import GridView from './components/GridView';
import ListView from './components/ListView';
import MapView from './components/MapView';
import SettingsModal from './components/SettingsModal';
import StatsBar from './components/StatsBar';
import InventoryTable from './components/inventory/InventoryTable';
import InventoryUploadModal from './components/inventory/InventoryUploadModal';
import BackupButton from './components/BackupButton';
import ThemeToggle from '@/components/ThemeToggle';

type MainTab = 'leads' | 'inventory';

// 메트로 라인 색상 (탭용)
const METRO_TAB_COLORS = {
  leads: { active: 'var(--metro-line2)', glow: 'rgba(60, 181, 74, 0.3)' },
  inventory: { active: 'var(--metro-line4)', glow: 'rgba(50, 164, 206, 0.3)' },
};

export default function LeadManagerPage() {
  const router = useRouter();

  // 상태 관리
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [loadingProgress, setLoadingProgress] = useState({ current: 0, total: 0 });
  const [statusFilter, setStatusFilter] = useState<LeadStatus | 'ALL'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<BusinessCategory>('HEALTH');
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);  // 선택된 세부 서비스 ID들
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [mainTab, setMainTab] = useState<MainTab>('leads');
  const [showInventoryUpload, setShowInventoryUpload] = useState(false);
  const [inventoryRefreshKey, setInventoryRefreshKey] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState<string>('');
  const [mapFocusLead, setMapFocusLead] = useState<Lead | null>(null);  // 지도에서 포커스할 리드

  // 사용자 정보
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [copiedInviteCode, setCopiedInviteCode] = useState(false);

  // 날짜 범위 (기본: 전월 24일 ~ 오늘, LocalData API 제한)
  const [dateRange, setDateRange] = useState({
    start: getPreviousMonth24th(),
    end: new Date(),
  });

  // 선택된 지역 (서울, 경기도)
  const [selectedRegions, setSelectedRegions] = useState<string[]>(['6110000', '6410000']);

  // 지역 코드 매핑
  const REGION_OPTIONS = [
    { code: '6110000', name: '서울', color: 'var(--metro-line1)' },
    { code: '6410000', name: '경기', color: 'var(--metro-line3)' },
  ];

  // 초기 로딩 상태
  const [initialLoading, setInitialLoading] = useState(true);

  // 설정 및 데이터 로드
  useEffect(() => {
    const init = async () => {
      setInitialLoading(true);
      const user = await getCurrentUser();
      setUserInfo(user);
      await loadSettings();
      await loadLeadsFromDB();
      setInitialLoading(false);
    };
    init();
  }, []);

  // 로그아웃 처리
  const handleSignOut = async () => {
    const result = await signOut();
    if (result.success) {
      router.push('/auth');
      router.refresh();
    }
  };

  // 초대 코드 복사
  const copyInviteCode = () => {
    if (userInfo?.inviteCode) {
      navigator.clipboard.writeText(userInfo.inviteCode);
      setCopiedInviteCode(true);
      setTimeout(() => setCopiedInviteCode(false), 2000);
    }
  };

  // 업종 필터 변경 시 DB에서 다시 로드
  useEffect(() => {
    if (!initialLoading) {
      loadLeadsFromDB(categoryFilter);
    }
  }, [categoryFilter]);

  // 상태 및 세부항목 필터 적용 (클라이언트 사이드)
  useEffect(() => {
    let filtered = leads;

    // 세부항목 필터 적용 (선택된 serviceIds가 있으면 해당 항목만 표시)
    if (selectedServiceIds.length > 0) {
      filtered = filtered.filter(lead => lead.serviceId && selectedServiceIds.includes(lead.serviceId));
    }

    // 상태 필터 적용
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(lead => lead.status === statusFilter);
    }

    setFilteredLeads(filtered);
  }, [leads, statusFilter, selectedServiceIds]);

  // 설정 로드
  const loadSettings = async () => {
    const result = await getSettings();
    if (result.success) {
      setSettings(result.settings);
    }
  };

  // DB에서 리드 로드 (선택된 업종 필터 적용)
  const loadLeadsFromDB = async (category?: BusinessCategory) => {
    const result = await getLeads({
      category: category || categoryFilter,
    });
    if (result.success) {
      setLeads(result.leads);
    }
  };

  // API 연결 테스트
  const checkConnection = useCallback(async () => {
    const result = await testAPIConnection(settings);
    setIsConnected(result.success);
    showMessage(result.success ? 'success' : 'error', result.message);
  }, [settings]);

  // 데이터 새로고침 (API에서 가져오기)
  const refreshData = async () => {
    setIsLoading(true);
    setLoadingProgress({ current: 0, total: 0 });
    setLoadingStatus('');

    try {
      const searchSettings: Settings = {
        ...settings,
        regionCodes: selectedRegions,
      };

      const result = await fetchAllLeads(
        searchSettings,
        dateRange.start,
        dateRange.end,
        (current, total, status) => {
          setLoadingProgress({ current, total });
          if (status) setLoadingStatus(status);
        },
        categoryFilter,
        selectedServiceIds  // 선택된 세부항목 전달
      );

      if (result.success) {
        setLoadingStatus('DB에 저장 중...');
        const saveResult = await saveLeads(
          result.leads,
          (current, total, status) => {
            console.log(status);
            setLoadingProgress({ current, total });
          }
        );

        if (saveResult.success) {
          await loadLeadsFromDB();
          const regionNames = selectedRegions
            .map(code => REGION_OPTIONS.find(r => r.code === code)?.name || code)
            .join('+');
          // 선택된 세부항목 이름 표시
          const serviceNames = selectedServiceIds.length > 0
            ? CATEGORY_SERVICE_IDS[categoryFilter]
                .filter(s => selectedServiceIds.includes(s.id))
                .map(s => s.name)
                .join(', ')
            : '전체';
          showMessage(
            'success',
            `[${regionNames}/${CATEGORY_LABELS[categoryFilter]}/${serviceNames}] API에서 ${result.leads.length}건 조회. ${saveResult.message}`
          );
        } else {
          showMessage('error', saveResult.message);
        }
      } else {
        showMessage('error', result.message || '데이터 조회에 실패했습니다.');
      }
    } catch (error) {
      showMessage('error', `오류: ${(error as Error).message}`);
    } finally {
      setIsLoading(false);
      setLoadingStatus('');
    }
  };

  // 리드 상태 변경
  const handleStatusChange = async (leadId: string, newStatus: LeadStatus) => {
    const result = await updateLeadStatus(leadId, newStatus);

    if (result.success) {
      setLeads(prev =>
        prev.map(lead =>
          lead.id === leadId ? { ...lead, status: newStatus } : lead
        )
      );
      showMessage('success', '상태가 변경되었습니다.');
    } else {
      showMessage('error', result.message);
    }
  };

  // 설정 저장
  const handleSaveSettings = async (newSettings: Settings) => {
    setSettings(newSettings);
    await saveSettings(newSettings);
    setIsSettingsOpen(false);
    showMessage('success', '설정이 저장되었습니다.');
  };

  // 날짜 이동
  const moveDate = (days: number) => {
    setDateRange(prev => ({
      start: new Date(prev.start.getTime() + days * 24 * 60 * 60 * 1000),
      end: new Date(prev.end.getTime() + days * 24 * 60 * 60 * 1000),
    }));
  };

  // 메시지 표시
  const showMessage = (type: 'success' | 'error' | 'info', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // CSV 내보내기
  const exportToCSV = () => {
    const headers = ['병원명', '주소', '전화번호', '진료과목', '인근역', '거리', '상태', '인허가일'];
    const rows = filteredLeads.map(lead => [
      lead.bizName,
      lead.roadAddress || lead.lotAddress || '',
      lead.phone || '',
      lead.medicalSubject || '',
      lead.nearestStation || '',
      lead.stationDistance ? `${lead.stationDistance}m` : '',
      STATUS_LABELS[lead.status],
      lead.licenseDate || '',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `leads_${formatDateDisplay(new Date())}.csv`;
    link.click();
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] relative overflow-hidden">
      {/* 배경 효과 */}
      <div className="fixed inset-0 pointer-events-none">
        {/* 그라디언트 오브 */}
        <div
          className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full opacity-30"
          style={{
            background: 'radial-gradient(circle, var(--metro-line2) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
        <div
          className="absolute bottom-[-30%] left-[-10%] w-[800px] h-[800px] rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, var(--metro-line4) 0%, transparent 70%)',
            filter: 'blur(100px)',
          }}
        />

        {/* 메트로 패턴 */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(var(--border-subtle) 1px, transparent 1px),
              linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* 헤더 */}
      <header className="glass-card border-b border-[var(--glass-border)] sticky top-0 z-40 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto px-6">
          <div className="flex items-center justify-between h-18 py-3">
            {/* 로고 & 제목 */}
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-4 group">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center relative overflow-hidden transition-transform group-hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, var(--metro-line2) 0%, var(--metro-line4) 100%)',
                    boxShadow: '0 4px 20px rgba(60, 181, 74, 0.3)',
                  }}
                >
                  <Train className="w-6 h-6 text-white" />
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                    지하철 광고 영업
                  </h1>
                  <p className="text-xs text-[var(--text-muted)] font-medium tracking-wider uppercase">
                    Lead Manager System
                  </p>
                </div>
              </div>

              {/* 메인페이지 버튼 */}
              <button
                onClick={() => router.push('/')}
                className="p-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] transition-colors"
                title="메인페이지"
              >
                <Home className="w-5 h-5 text-[var(--text-muted)] hover:text-[var(--text-secondary)]" />
              </button>

              {/* 테마 토글 */}
              <ThemeToggle />

              {/* 메인 탭 */}
              <div className="flex gap-1 p-1 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]">
                <button
                  onClick={() => setMainTab('leads')}
                  className={`flex items-center gap-2.5 px-5 py-2.5 rounded-lg transition-all duration-300 text-sm font-semibold ${
                    mainTab === 'leads'
                      ? 'text-white shadow-lg'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                  }`}
                  style={mainTab === 'leads' ? {
                    background: METRO_TAB_COLORS.leads.active,
                    boxShadow: `0 4px 15px ${METRO_TAB_COLORS.leads.glow}`,
                  } : {}}
                >
                  <Users className="w-4 h-4" />
                  리드
                </button>
                <button
                  onClick={() => setMainTab('inventory')}
                  className={`flex items-center gap-2.5 px-5 py-2.5 rounded-lg transition-all duration-300 text-sm font-semibold ${
                    mainTab === 'inventory'
                      ? 'text-white shadow-lg'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                  }`}
                  style={mainTab === 'inventory' ? {
                    background: METRO_TAB_COLORS.inventory.active,
                    boxShadow: `0 4px 15px ${METRO_TAB_COLORS.inventory.glow}`,
                  } : {}}
                >
                  <Package className="w-4 h-4" />
                  인벤토리
                </button>
                <button
                  onClick={() => router.push('/floor-plans')}
                  className="flex items-center gap-2.5 px-5 py-2.5 rounded-lg transition-all duration-300 text-sm font-semibold text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
                >
                  <FileImage className="w-4 h-4" />
                  도면
                </button>
              </div>
            </div>

            {/* 날짜 & 지역 설정 */}
            <div className="flex items-center gap-4">
              {/* 날짜 범위 선택 */}
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]">
                <Calendar className="w-4 h-4 text-[var(--metro-line5)]" />
                <input
                  type="date"
                  value={dateRange.start.toISOString().split('T')[0]}
                  onChange={(e) => setDateRange(prev => ({
                    ...prev,
                    start: new Date(e.target.value)
                  }))}
                  className="metro-input !py-1 !px-2 !w-32 text-sm !bg-transparent !border-0"
                />
                <span className="text-[var(--text-muted)]">~</span>
                <input
                  type="date"
                  value={dateRange.end.toISOString().split('T')[0]}
                  onChange={(e) => setDateRange(prev => ({
                    ...prev,
                    end: new Date(e.target.value)
                  }))}
                  className="metro-input !py-1 !px-2 !w-32 text-sm !bg-transparent !border-0"
                />
                <div className="flex gap-1 ml-1 border-l border-[var(--border-subtle)] pl-2">
                  <button
                    onClick={() => moveDate(-30)}
                    className="p-1.5 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
                    title="30일 이전"
                  >
                    <ChevronLeft className="w-4 h-4 text-[var(--text-muted)]" />
                  </button>
                  <button
                    onClick={() => moveDate(30)}
                    className="p-1.5 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
                    title="30일 이후"
                  >
                    <ChevronRight className="w-4 h-4 text-[var(--text-muted)]" />
                  </button>
                </div>
              </div>

              {/* 지역 선택 */}
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]">
                <MapPin className="w-4 h-4 text-[var(--metro-line3)]" />
                {REGION_OPTIONS.map(region => (
                  <button
                    key={region.code}
                    onClick={() => {
                      setSelectedRegions(prev => {
                        if (prev.includes(region.code)) {
                          if (prev.length === 1) return prev;
                          return prev.filter(c => c !== region.code);
                        }
                        return [...prev, region.code];
                      });
                    }}
                    className={`px-4 py-1.5 text-sm font-semibold rounded-lg transition-all duration-300 ${
                      selectedRegions.includes(region.code)
                        ? 'text-white shadow-md'
                        : 'text-[var(--text-muted)] bg-[var(--bg-secondary)] hover:text-[var(--text-secondary)] border border-[var(--border-subtle)]'
                    }`}
                    style={selectedRegions.includes(region.code) ? {
                      background: region.color,
                      boxShadow: `0 2px 10px ${region.color}40`,
                    } : {}}
                  >
                    {region.name}
                  </button>
                ))}
              </div>
            </div>

            {/* 우측 컨트롤 */}
            <div className="flex items-center gap-3">
              {/* 연결 상태 */}
              <button
                onClick={checkConnection}
                className={`p-2.5 rounded-xl transition-all duration-300 border ${
                  isConnected === null
                    ? 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] border-[var(--border-subtle)]'
                    : isConnected
                    ? 'bg-[var(--metro-line2)]/20 text-[var(--metro-line2)] border-[var(--metro-line2)]/30'
                    : 'bg-red-500/20 text-red-400 border-red-500/30'
                }`}
                title="API 연결 상태"
              >
                {isConnected ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
              </button>

              {/* 뷰 모드 전환 */}
              <div className="flex gap-1 p-1 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]">
                {[
                  { mode: 'grid' as ViewMode, icon: LayoutGrid, color: 'var(--metro-line2)' },
                  { mode: 'list' as ViewMode, icon: List, color: 'var(--metro-line4)' },
                  { mode: 'map' as ViewMode, icon: Map, color: 'var(--metro-line3)' },
                ].map(({ mode, icon: Icon, color }) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`p-2.5 rounded-lg transition-all duration-300 ${
                      viewMode === mode
                        ? 'text-white shadow-md'
                        : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
                    }`}
                    style={viewMode === mode ? {
                      background: color,
                      boxShadow: `0 2px 10px ${color}40`,
                    } : {}}
                  >
                    <Icon className="w-5 h-5" />
                  </button>
                ))}
              </div>

              {/* 새로고침 */}
              <button
                onClick={refreshData}
                disabled={isLoading}
                className="metro-btn-primary flex items-center gap-2.5 !px-5"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline font-semibold">
                  {isLoading
                    ? `${loadingProgress.current}/${loadingProgress.total}`
                    : '새로고침'}
                </span>
              </button>

              {/* 내보내기 */}
              <button
                onClick={exportToCSV}
                className="p-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] hover:border-[var(--metro-line5)] hover:text-[var(--metro-line5)] text-[var(--text-muted)] transition-all duration-300"
                title="CSV 내보내기"
              >
                <Download className="w-5 h-5" />
              </button>

              {/* 데이터 백업/복원 */}
              <BackupButton />

              {/* 설정 */}
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] hover:border-[var(--text-muted)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-all duration-300"
              >
                <SettingsIcon className="w-5 h-5" />
              </button>

              {/* 사용자 메뉴 */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-3 px-4 py-2 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] hover:border-[var(--metro-line7)] transition-all duration-300"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, var(--metro-line7) 0%, var(--metro-line5) 100%)',
                    }}
                  >
                    <span className="text-white text-sm font-bold">
                      {userInfo?.email?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-[var(--text-secondary)] hidden lg:inline max-w-[100px] truncate">
                    {userInfo?.email?.split('@')[0] || '사용자'}
                  </span>
                </button>

                {/* 드롭다운 메뉴 */}
                {showUserMenu && (
                  <div
                    className="absolute right-0 top-full mt-3 w-80 rounded-xl border border-[var(--glass-border)] py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200"
                    style={{
                      background: 'var(--glass-bg)',
                      backdropFilter: 'blur(20px)',
                      boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
                    }}
                  >
                    {/* 사용자 정보 */}
                    <div className="px-5 py-4 border-b border-[var(--border-subtle)]">
                      <p className="text-sm font-semibold text-[var(--text-primary)]">{userInfo?.email}</p>
                      {userInfo?.organizationName && (
                        <div className="flex items-center gap-2 mt-2">
                          <Building2 className="w-4 h-4 text-[var(--metro-line4)]" />
                          <span className="text-sm text-[var(--text-secondary)]">{userInfo.organizationName}</span>
                          {userInfo.role === 'owner' && (
                            <span
                              className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{
                                background: 'var(--metro-line5)',
                                color: 'white',
                              }}
                            >
                              관리자
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 초대 코드 (owner만) */}
                    {userInfo?.role === 'owner' && userInfo?.inviteCode && (
                      <div className="px-5 py-4 border-b border-[var(--border-subtle)]">
                        <p className="text-xs text-[var(--text-muted)] mb-2 font-medium">팀 초대 코드</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-sm font-mono bg-[var(--bg-secondary)] text-[var(--metro-line2)] px-3 py-2 rounded-lg border border-[var(--border-subtle)]">
                            {userInfo.inviteCode}
                          </code>
                          <button
                            onClick={copyInviteCode}
                            className="p-2 hover:bg-[var(--bg-secondary)] rounded-lg transition-colors"
                            title="복사"
                          >
                            {copiedInviteCode ? (
                              <Check className="w-4 h-4 text-[var(--metro-line2)]" />
                            ) : (
                              <Copy className="w-4 h-4 text-[var(--text-muted)]" />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* 로그아웃 */}
                    <button
                      onClick={handleSignOut}
                      className="w-full px-5 py-3 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-3 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      로그아웃
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 메시지 토스트 */}
      {message && (
        <div
          className="fixed top-24 right-6 z-50 px-5 py-4 rounded-xl shadow-2xl animate-in slide-in-from-right duration-300 border"
          style={{
            background: message.type === 'success'
              ? 'linear-gradient(135deg, rgba(60, 181, 74, 0.9) 0%, rgba(60, 181, 74, 0.7) 100%)'
              : message.type === 'error'
              ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.9) 0%, rgba(239, 68, 68, 0.7) 100%)'
              : 'linear-gradient(135deg, rgba(50, 164, 206, 0.9) 0%, rgba(50, 164, 206, 0.7) 100%)',
            backdropFilter: 'blur(10px)',
            borderColor: message.type === 'success' ? 'var(--metro-line2)' : message.type === 'error' ? '#ef4444' : 'var(--metro-line4)',
          }}
        >
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-white" />
            <span className="text-white font-medium">{message.text}</span>
          </div>
        </div>
      )}

      {/* 리드 탭일 때만 통계 바 및 필터 바 표시 */}
      {mainTab === 'leads' && (
        <>
          {/* 통계 바 */}
          <StatsBar leads={leads} />

          {/* 필터 바 */}
          <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 backdrop-blur-sm">
            <div className="max-w-[1600px] mx-auto px-6 py-4 space-y-4">
              {/* 상단: 업종 카테고리 + 상태 필터 */}
              <div className="flex flex-wrap items-center gap-6">
                {/* 업종 카테고리 필터 */}
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-[var(--text-secondary)]">업종</span>
                  <div className="flex gap-2">
                    {(['HEALTH', 'ANIMAL', 'FOOD', 'CULTURE', 'LIVING', 'ENVIRONMENT', 'OTHER'] as BusinessCategory[]).map(category => {
                      const colors = CATEGORY_COLORS[category];
                      const count = leads.filter(l => l.category === category).length;
                      const getCategoryColor = () => {
                        if (colors.bg.includes('red')) return 'var(--metro-line1)';
                        if (colors.bg.includes('amber')) return 'var(--metro-line3)';
                        if (colors.bg.includes('orange')) return 'var(--metro-line3)';
                        if (colors.bg.includes('purple')) return 'var(--metro-line5)';
                        if (colors.bg.includes('cyan')) return 'var(--metro-line4)';
                        if (colors.bg.includes('emerald')) return 'var(--metro-line2)';
                        return 'var(--metro-line9)';
                      };
                      return (
                        <button
                          key={category}
                          onClick={() => {
                            setCategoryFilter(category);
                            setSelectedServiceIds([]);  // 카테고리 변경 시 세부항목 초기화
                          }}
                          className={`px-4 py-2 text-sm rounded-lg transition-all duration-300 font-medium border ${
                            categoryFilter === category
                              ? 'text-white shadow-md border-transparent'
                              : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--text-muted)]'
                          }`}
                          style={categoryFilter === category ? {
                            background: getCategoryColor(),
                            boxShadow: `0 2px 10px ${getCategoryColor()}40`,
                          } : {}}
                        >
                          {CATEGORY_LABELS[category]}
                          {count > 0 && (
                            <span className="ml-1.5 opacity-75">({count})</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 구분선 */}
                <div className="h-8 w-px bg-[var(--border-subtle)]" />

                {/* 상태 필터 */}
                <div className="flex items-center gap-3">
                  <Filter className="w-4 h-4 text-[var(--metro-line4)]" />
                  <div className="flex gap-2">
                    {(['ALL', 'NEW', 'PROPOSAL_SENT', 'CONTACTED', 'CONTRACTED'] as const).map((status, idx) => {
                      const statusColors = ['var(--metro-line9)', 'var(--metro-line2)', 'var(--metro-line4)', 'var(--metro-line5)', 'var(--metro-line3)'];
                      return (
                        <button
                          key={status}
                          onClick={() => setStatusFilter(status)}
                          className={`px-4 py-2 text-sm rounded-lg transition-all duration-300 font-medium border ${
                            statusFilter === status
                              ? 'text-white shadow-md border-transparent'
                              : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--text-muted)]'
                          }`}
                          style={statusFilter === status ? {
                            background: statusColors[idx],
                            boxShadow: `0 2px 10px ${statusColors[idx]}40`,
                          } : {}}
                        >
                          {status === 'ALL' ? '전체' : STATUS_LABELS[status]}
                          {status !== 'ALL' && (
                            <span className="ml-1.5 opacity-75">
                              ({leads.filter(l => l.status === status).length})
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <span className="ml-auto text-sm font-semibold text-[var(--metro-line2)]">
                  총 {filteredLeads.length}건
                </span>
              </div>

              {/* 하단: 세부항목 선택 */}
              <div className="flex items-center gap-3 pt-2 border-t border-[var(--border-subtle)]">
                <span className="text-sm font-semibold text-[var(--text-muted)]">세부항목</span>
                <div className="flex flex-wrap gap-2">
                  {/* 전체 선택 버튼 */}
                  <button
                    onClick={() => setSelectedServiceIds([])}
                    className={`px-3 py-1.5 text-xs rounded-lg transition-all duration-300 font-medium border ${
                      selectedServiceIds.length === 0
                        ? 'bg-[var(--metro-line2)] text-white border-transparent shadow-md'
                        : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] border-[var(--border-subtle)]'
                    }`}
                  >
                    전체
                  </button>
                  {/* 개별 서비스 버튼 */}
                  {CATEGORY_SERVICE_IDS[categoryFilter].map(service => {
                    const isSelected = selectedServiceIds.includes(service.id);
                    const serviceCount = leads.filter(l => l.serviceId === service.id).length;
                    return (
                      <button
                        key={service.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedServiceIds(prev => prev.filter(id => id !== service.id));
                          } else {
                            setSelectedServiceIds(prev => [...prev, service.id]);
                          }
                        }}
                        className={`px-3 py-1.5 text-xs rounded-lg transition-all duration-300 font-medium border ${
                          isSelected
                            ? 'bg-[var(--metro-line4)] text-white border-transparent shadow-md'
                            : 'bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] border-[var(--border-subtle)] hover:border-[var(--metro-line4)]'
                        }`}
                      >
                        {service.name}
                        {serviceCount > 0 && (
                          <span className="ml-1 opacity-75">({serviceCount})</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 인벤토리 탭일 때 업로드 버튼 바 */}
      {mainTab === 'inventory' && (
        <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 backdrop-blur-sm">
          <div className="max-w-[1600px] mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">광고매체 인벤토리</h2>
              <button
                onClick={() => setShowInventoryUpload(true)}
                className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-white font-semibold transition-all duration-300 hover:scale-105"
                style={{
                  background: 'var(--metro-line2)',
                  boxShadow: '0 4px 15px rgba(60, 181, 74, 0.3)',
                }}
              >
                <Upload className="w-4 h-4" />
                엑셀 업로드
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 메인 컨텐츠 */}
      <main className="max-w-[1600px] mx-auto px-6 py-8 relative z-10">
        {mainTab === 'leads' ? (
          // 리드 뷰
          initialLoading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
                style={{
                  background: 'linear-gradient(135deg, var(--metro-line2) 0%, var(--metro-line4) 100%)',
                  boxShadow: '0 8px 30px rgba(60, 181, 74, 0.3)',
                }}
              >
                <RefreshCw className="w-8 h-8 text-white animate-spin" />
              </div>
              <p className="text-[var(--text-secondary)] font-medium">Supabase에서 데이터를 불러오는 중...</p>
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 relative"
                style={{
                  background: 'linear-gradient(135deg, var(--metro-line4) 0%, var(--metro-line2) 100%)',
                  boxShadow: '0 8px 30px rgba(50, 164, 206, 0.3)',
                }}
              >
                <RefreshCw className="w-8 h-8 text-white animate-spin" />
              </div>
              <p className="text-[var(--text-secondary)] font-medium mb-2">
                [{CATEGORY_LABELS[categoryFilter]}] LocalData API에서 데이터를 가져오는 중...
              </p>
              {loadingStatus && (
                <p className="text-sm text-[var(--metro-line2)] font-semibold">{loadingStatus}</p>
              )}
              {loadingProgress.total > 0 && (
                <div className="mt-4 w-64">
                  <div className="h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${(loadingProgress.current / loadingProgress.total) * 100}%`,
                        background: 'linear-gradient(90deg, var(--metro-line2), var(--metro-line4))',
                      }}
                    />
                  </div>
                  <p className="text-xs text-[var(--text-muted)] mt-2 text-center">
                    {loadingProgress.current} / {loadingProgress.total}
                  </p>
                </div>
              )}
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '2px dashed var(--border-subtle)',
                }}
              >
                <List className="w-10 h-10 text-[var(--text-muted)]" />
              </div>
              <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3">저장된 데이터가 없습니다</h3>
              <p className="text-[var(--text-muted)] mb-6 max-w-md">
                새로고침 버튼을 눌러 LocalData API에서 데이터를 가져오세요.
              </p>
              <button
                onClick={refreshData}
                className="metro-btn-primary flex items-center gap-2.5"
              >
                <RefreshCw className="w-4 h-4" />
                API에서 데이터 가져오기
              </button>
            </div>
          ) : (
            <>
              {viewMode === 'grid' && (
                <GridView
                  leads={filteredLeads}
                  onStatusChange={handleStatusChange}
                  searchQuery={searchQuery}
                  onMapView={(lead) => {
                    setMapFocusLead(lead);
                    setViewMode('map');
                  }}
                />
              )}
              {viewMode === 'list' && (
                <ListView
                  leads={filteredLeads}
                  onStatusChange={handleStatusChange}
                  searchQuery={searchQuery}
                  onMapView={(lead) => {
                    setMapFocusLead(lead);
                    setViewMode('map');
                  }}
                />
              )}
              {viewMode === 'map' && (
                <MapView
                  leads={filteredLeads}
                  onStatusChange={handleStatusChange}
                  onListView={() => setViewMode('list')}
                  focusLead={mapFocusLead}
                  onFocusClear={() => setMapFocusLead(null)}
                />
              )}
            </>
          )
        ) : (
          // 인벤토리 뷰
          <InventoryTable
            key={inventoryRefreshKey}
            onRefresh={() => setInventoryRefreshKey(k => k + 1)}
          />
        )}
      </main>

      {/* 인벤토리 업로드 모달 */}
      {showInventoryUpload && (
        <InventoryUploadModal
          onClose={() => setShowInventoryUpload(false)}
          onSuccess={() => {
            setInventoryRefreshKey(k => k + 1);
            showMessage('success', '인벤토리가 업로드되었습니다.');
          }}
        />
      )}

      {/* 설정 모달 */}
      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setIsSettingsOpen(false)}
        />
      )}
    </div>
  );
}
