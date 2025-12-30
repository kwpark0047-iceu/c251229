'use client';

/**
 * 서울 지하철 광고 영업 시스템 (Lead Manager)
 * 메인 대시보드 페이지
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
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
} from 'lucide-react';

import { Lead, LeadStatus, ViewMode, Settings, STATUS_LABELS, BusinessCategory, CATEGORY_LABELS, CATEGORY_COLORS } from './types';
import { DEFAULT_SETTINGS } from './constants';
import { formatDateDisplay, getPreviousMonth24th } from './utils';
import { fetchAllLeads, testAPIConnection } from './api';
import { getLeads, saveLeads, updateLeadStatus, getSettings, saveSettings } from './supabase-service';

import GridView from './components/GridView';
import ListView from './components/ListView';
import MapView from './components/MapView';
import SettingsModal from './components/SettingsModal';
import StatsBar from './components/StatsBar';
import InventoryTable from './components/inventory/InventoryTable';
import InventoryUploadModal from './components/inventory/InventoryUploadModal';

type MainTab = 'leads' | 'inventory';

export default function LeadManagerPage() {
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
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [mainTab, setMainTab] = useState<MainTab>('leads');
  const [showInventoryUpload, setShowInventoryUpload] = useState(false);
  const [inventoryRefreshKey, setInventoryRefreshKey] = useState(0);
  const [loadingStatus, setLoadingStatus] = useState<string>('');

  // 날짜 범위 (기본: 전월 24일 ~ 오늘, LocalData API 제한)
  const [dateRange, setDateRange] = useState({
    start: getPreviousMonth24th(),
    end: new Date(),
  });

  // 초기 로딩 상태
  const [initialLoading, setInitialLoading] = useState(true);

  // 설정 및 데이터 로드
  useEffect(() => {
    const init = async () => {
      setInitialLoading(true);
      await loadSettings();
      await loadLeadsFromDB();
      setInitialLoading(false);
    };
    init();
  }, []);

  // 필터 적용
  useEffect(() => {
    let filtered = leads;

    // 카테고리 필터 적용 (선택된 카테고리만)
    filtered = filtered.filter(lead => lead.category === categoryFilter);

    // 상태 필터 적용
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter(lead => lead.status === statusFilter);
    }

    setFilteredLeads(filtered);
  }, [leads, statusFilter, categoryFilter]);

  // 설정 로드
  const loadSettings = async () => {
    const result = await getSettings();
    if (result.success) {
      setSettings(result.settings);
    }
  };

  // DB에서 리드 로드
  const loadLeadsFromDB = async () => {
    const result = await getLeads();
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
      const result = await fetchAllLeads(
        settings,
        dateRange.start,
        dateRange.end,
        (current, total, status) => {
          setLoadingProgress({ current, total });
          if (status) setLoadingStatus(status);
        },
        categoryFilter
      );

      if (result.success) {
        // DB에 신규 데이터만 저장
        setLoadingStatus('DB에 저장 중...');
        const saveResult = await saveLeads(
          result.leads,
          (current, total, status) => {
            console.log(status);
            setLoadingProgress({ current, total });
          }
        );

        if (saveResult.success) {
          // DB에서 다시 로드하여 최신 상태 반영
          await loadLeadsFromDB();
          showMessage(
            'success',
            `[${CATEGORY_LABELS[categoryFilter]}] API에서 ${result.leads.length}건 조회. ${saveResult.message}`
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
    <div className="min-h-screen bg-slate-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* 로고 & 제목 */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">LM</span>
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-slate-800">지하철 광고 영업</h1>
                  <p className="text-xs text-slate-500">Lead Manager</p>
                </div>
              </div>

              {/* 메인 탭 */}
              <div className="flex bg-slate-100 rounded-lg p-1">
                <button
                  onClick={() => setMainTab('leads')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-md transition-colors text-sm font-medium ${
                    mainTab === 'leads'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  리드
                </button>
                <button
                  onClick={() => setMainTab('inventory')}
                  className={`flex items-center gap-2 px-4 py-1.5 rounded-md transition-colors text-sm font-medium ${
                    mainTab === 'inventory'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Package className="w-4 h-4" />
                  인벤토리
                </button>
              </div>
            </div>

            {/* 날짜 네비게이션 */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => moveDate(-30)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-slate-600" />
              </button>
              <div className="text-sm font-medium text-slate-700 min-w-[200px] text-center">
                {formatDateDisplay(dateRange.start)} ~ {formatDateDisplay(dateRange.end)}
              </div>
              <button
                onClick={() => moveDate(30)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            {/* 우측 컨트롤 */}
            <div className="flex items-center gap-2">
              {/* 연결 상태 */}
              <button
                onClick={checkConnection}
                className={`p-2 rounded-lg transition-colors ${
                  isConnected === null
                    ? 'bg-slate-100 text-slate-500'
                    : isConnected
                    ? 'bg-green-100 text-green-600'
                    : 'bg-red-100 text-red-600'
                }`}
                title="API 연결 상태"
              >
                {isConnected ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
              </button>

              {/* 뷰 모드 전환 */}
              <div className="flex bg-slate-100 rounded-lg p-1">
                {[
                  { mode: 'grid' as ViewMode, icon: LayoutGrid },
                  { mode: 'list' as ViewMode, icon: List },
                  { mode: 'map' as ViewMode, icon: Map },
                ].map(({ mode, icon: Icon }) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === mode
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </button>
                ))}
              </div>

              {/* 새로고침 */}
              <button
                onClick={refreshData}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">
                  {isLoading
                    ? `${loadingProgress.current}/${loadingProgress.total}`
                    : '새로고침'}
                </span>
              </button>

              {/* 내보내기 */}
              <button
                onClick={exportToCSV}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                title="CSV 내보내기"
              >
                <Download className="w-5 h-5 text-slate-600" />
              </button>

              {/* 설정 */}
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <SettingsIcon className="w-5 h-5 text-slate-600" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 메시지 토스트 */}
      {message && (
        <div
          className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${
            message.type === 'success'
              ? 'bg-green-500 text-white'
              : message.type === 'error'
              ? 'bg-red-500 text-white'
              : 'bg-blue-500 text-white'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* 리드 탭일 때만 통계 바 및 필터 바 표시 */}
      {mainTab === 'leads' && (
        <>
          {/* 통계 바 */}
          <StatsBar leads={leads} />

          {/* 필터 바 */}
          <div className="bg-white border-b border-slate-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
              <div className="flex flex-wrap items-center gap-4">
                {/* 업종 카테고리 필터 */}
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-600">업종:</span>
                  <div className="flex gap-1">
                    {(['HEALTH', 'ANIMAL', 'FOOD', 'CULTURE', 'LIVING', 'ENVIRONMENT', 'OTHER'] as BusinessCategory[]).map(category => {
                      const colors = CATEGORY_COLORS[category];
                      const count = leads.filter(l => l.category === category).length;
                      return (
                        <button
                          key={category}
                          onClick={() => setCategoryFilter(category)}
                          className={`px-3 py-1 text-sm rounded-full transition-colors ${
                            categoryFilter === category
                              ? `${colors.bg} ${colors.text} ${colors.border} border`
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {CATEGORY_LABELS[category]}
                          {count > 0 && <span className="ml-1">({count})</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 구분선 */}
                <div className="h-6 w-px bg-slate-300" />

                {/* 상태 필터 */}
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-500" />
                  <div className="flex gap-1">
                    {(['ALL', 'NEW', 'PROPOSAL_SENT', 'CONTACTED', 'CONTRACTED'] as const).map(status => (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-3 py-1 text-sm rounded-full transition-colors ${
                          statusFilter === status
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {status === 'ALL' ? '전체' : STATUS_LABELS[status]}
                        {status !== 'ALL' && (
                          <span className="ml-1">
                            ({leads.filter(l => l.status === status).length})
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <span className="ml-auto text-sm text-slate-500">
                  총 {filteredLeads.length}건
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 인벤토리 탭일 때 업로드 버튼 바 */}
      {mainTab === 'inventory' && (
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-800">광고매체 인벤토리</h2>
              <button
                onClick={() => setShowInventoryUpload(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Upload className="w-4 h-4" />
                엑셀 업로드
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {mainTab === 'leads' ? (
          // 리드 뷰
          initialLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-4" />
              <p className="text-slate-600">Supabase에서 데이터를 불러오는 중...</p>
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-4" />
              <p className="text-slate-600">
                [{CATEGORY_LABELS[categoryFilter]}] LocalData API에서 데이터를 가져오는 중...
              </p>
              {loadingStatus && (
                <p className="text-sm text-blue-600 mt-2 font-medium">{loadingStatus}</p>
              )}
              {loadingProgress.total > 0 && (
                <p className="text-sm text-slate-500 mt-1">
                  {loadingProgress.current} / {loadingProgress.total}
                </p>
              )}
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <List className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-700 mb-2">저장된 데이터가 없습니다</h3>
              <p className="text-slate-500 mb-4">
                새로고침 버튼을 눌러 LocalData API에서 데이터를 가져오세요.
              </p>
              <button
                onClick={refreshData}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                API에서 데이터 가져오기
              </button>
            </div>
          ) : (
            <>
              {viewMode === 'grid' && (
                <GridView leads={filteredLeads} onStatusChange={handleStatusChange} />
              )}
              {viewMode === 'list' && (
                <ListView leads={filteredLeads} onStatusChange={handleStatusChange} />
              )}
              {viewMode === 'map' && (
                <MapView leads={filteredLeads} onStatusChange={handleStatusChange} />
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
