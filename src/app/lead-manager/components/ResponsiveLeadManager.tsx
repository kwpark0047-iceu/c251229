/**
 * 반응형 리드 관리 대시보드
 * 모바일, 태블릿, 데스크톱 환경 최적화
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Lead, LeadStatus } from '../types';
import { 
  ResponsiveContainer, 
  ResponsiveGrid, 
  ResponsiveCard, 
  ResponsiveNav,
  ResponsiveSidebar,
  ResponsiveWrapper,
  ResponsiveText,
  useBreakpoint,
  useMediaQuery,
  responsive 
} from '@/app/shared/responsive';
import { 
  Search, 
  Filter, 
  LayoutGrid, 
  LayoutList, 
  Map, 
  Menu, 
  X,
  Plus,
  Download,
  Settings
} from 'lucide-react';

interface ResponsiveLeadManagerProps {
  leads: Lead[];
  selectedLeads: Set<string>;
  onSelectLead: (id: string) => void;
  onUpdateStatus: (id: string, status: LeadStatus) => void;
  onDeleteLead: (id: string) => void;
  onAddLead: () => void;
  onExportData: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: LeadStatus[];
  setStatusFilter: (statuses: LeadStatus[]) => void;
  viewMode: 'grid' | 'list' | 'map';
  setViewMode: (mode: 'grid' | 'list' | 'map') => void;
}

export default function ResponsiveLeadManager({
  leads,
  selectedLeads,
  onSelectLead,
  onUpdateStatus,
  onDeleteLead,
  onAddLead,
  onExportData,
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  viewMode,
  setViewMode,
}: ResponsiveLeadManagerProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  
  const breakpoint = useBreakpoint();
  const isMobile = useMediaQuery('(max-width: 768px)');
  const isTablet = useMediaQuery('(max-width: 1024px)');

  // 모바일에서는 사이드바 자동 닫기
  useEffect(() => {
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  }, [isMobile]);

  // 필터 패널 토글
  const toggleFilterPanel = () => {
    if (isMobile) {
      setIsFilterPanelOpen(!isFilterPanelOpen);
    }
  };

  // 리드 카드 컴포넌트
  const LeadCard = ({ lead }: { lead: Lead }) => (
    <ResponsiveCard
      className="hover:shadow-lg transition-shadow cursor-pointer"
      padding={{ sm: 'p-3', md: 'p-4', lg: 'p-6' }}
      onClick={() => onSelectLead(lead.id)}
    >
      <div className="space-y-2">
        <ResponsiveText
          size={{ sm: 'text-sm', md: 'text-base', lg: 'text-lg' }}
          weight="font-semibold"
          className="text-gray-900 truncate"
        >
          {lead.bizName}
        </ResponsiveText>
        
        <ResponsiveText
          size={{ sm: 'text-xs', md: 'text-sm' }}
          className="text-gray-600 truncate"
        >
          {lead.roadAddress}
        </ResponsiveText>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
            {lead.nearestStation}
          </span>
          <span className="text-xs text-gray-500">
            {lead.distance}m
          </span>
        </div>
        
        <select
          value={lead.status}
          onChange={(e) => {
            e.stopPropagation();
            onUpdateStatus(lead.id, e.target.value as LeadStatus);
          }}
          className="text-xs px-2 py-1 border rounded w-full sm:w-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <option value="NEW">신규</option>
          <option value="PROPOSAL_SENT">제안서 발송</option>
          <option value="CONTACTED">연락 완료</option>
          <option value="CONTRACTED">계약 완료</option>
        </select>
      </div>
    </ResponsiveCard>
  );

  // 필터 패널
  const FilterPanel = () => (
    <div className="space-y-4">
      <ResponsiveText size="text-lg" weight="font-semibold">
        필터
      </ResponsiveText>
      
      {/* 상태 필터 */}
      <div>
        <ResponsiveText size="text-sm" weight="font-medium" className="mb-2">
          상태
        </ResponsiveText>
        <div className="space-y-2">
          {['NEW', 'PROPOSAL_SENT', 'CONTACTED', 'CONTRACTED'].map((status) => (
            <label key={status} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={statusFilter.includes(status as LeadStatus)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setStatusFilter([...statusFilter, status as LeadStatus]);
                  } else {
                    setStatusFilter(statusFilter.filter(s => s !== status));
                  }
                }}
                className="rounded"
              />
              <span className="text-sm">
                {status === 'NEW' ? '신규' :
                 status === 'PROPOSAL_SENT' ? '제안서 발송' :
                 status === 'CONTACTED' ? '연락 완료' : '계약 완료'}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <ResponsiveContainer>
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              {/* 모바일 메뉴 버튼 */}
              <ResponsiveWrapper breakpoint="md">
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-2 rounded-lg hover:bg-gray-100"
                >
                  <Menu className="w-5 h-5" />
                </button>
              </ResponsiveWrapper>
              
              <ResponsiveText size={{ sm: 'text-lg', md: 'text-xl', lg: 'text-2xl' }} weight="font-bold">
                리드 관리
              </ResponsiveText>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* 검색 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={responsive.cls({
                    sm: 'pl-10 pr-4 py-2 text-sm w-32',
                    md: 'pl-10 pr-4 py-2 text-base w-48',
                    lg: 'pl-10 pr-4 py-2 text-base w-64'
                  })}
                />
              </div>
              
              {/* 액션 버튼 */}
              <ResponsiveWrapper breakpoint="lg">
                <button
                  onClick={onAddLead}
                  className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </ResponsiveWrapper>
              
              <ResponsiveWrapper breakpoint="md">
                <button
                  onClick={onExportData}
                  className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  <Download className="w-4 h-4" />
                </button>
              </ResponsiveWrapper>
            </div>
          </div>
          
          {/* 뷰 모드 전환 */}
          <div className="flex items-center justify-between py-2 border-t">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
              >
                <LayoutList className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`p-2 rounded ${viewMode === 'map' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
              >
                <Map className="w-4 h-4" />
              </button>
            </div>
            
            {/* 필터 버튼 (모바일) */}
            <ResponsiveWrapper breakpoint="md">
              <button
                onClick={toggleFilterPanel}
                className={`p-2 rounded ${isFilterPanelOpen ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100'}`}
              >
                <Filter className="w-4 h-4" />
              </button>
            </ResponsiveWrapper>
          </div>
        </ResponsiveContainer>
      </header>

      <div className="flex">
        {/* 사이드바 (데스크톱) */}
        <ResponsiveWrapper breakpoint="lg">
          <aside className="w-64 bg-white shadow-sm h-screen sticky top-0">
            <div className="p-4">
              <FilterPanel />
            </div>
          </aside>
        </ResponsiveWrapper>

        {/* 메인 콘텐츠 */}
        <main className="flex-1">
          <ResponsiveContainer>
            {/* 모바일 필터 패널 */}
            <ResponsiveWrapper breakpoint="md">
              {isFilterPanelOpen && (
                <div className="mb-4 p-4 bg-white rounded-lg shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <ResponsiveText size="text-lg" weight="font-semibold">
                      필터
                    </ResponsiveText>
                    <button
                      onClick={() => setIsFilterPanelOpen(false)}
                      className="p-1 rounded hover:bg-gray-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <FilterPanel />
                </div>
              )}
            </ResponsiveWrapper>

            {/* 통계 바 */}
            <div className="mb-6 p-4 bg-white rounded-lg shadow-sm">
              <ResponsiveGrid
                cols={{ sm: 2, md: 3, lg: 4 }}
                gap={{ sm: 3, md: 4 }}
              >
                <div className="text-center">
                  <ResponsiveText size="text-2xl" weight="font-bold" className="text-blue-600">
                    {leads.length}
                  </ResponsiveText>
                  <ResponsiveText size="text-sm" className="text-gray-600">
                    전체 리드
                  </ResponsiveText>
                </div>
                <div className="text-center">
                  <ResponsiveText size="text-2xl" weight="font-bold" className="text-green-600">
                    {leads.filter(l => l.status === 'NEW').length}
                  </ResponsiveText>
                  <ResponsiveText size="text-sm" className="text-gray-600">
                    신규
                  </ResponsiveText>
                </div>
                <div className="text-center">
                  <ResponsiveText size="text-2xl" weight="font-bold" className="text-yellow-600">
                    {leads.filter(l => l.status === 'PROPOSAL_SENT').length}
                  </ResponsiveText>
                  <ResponsiveText size="text-sm" className="text-gray-600">
                    제안서 발송
                  </ResponsiveText>
                </div>
                <div className="text-center">
                  <ResponsiveText size="text-2xl" weight="font-bold" className="text-purple-600">
                    {leads.filter(l => l.status === 'CONTRACTED').length}
                  </ResponsiveText>
                  <ResponsiveText size="text-sm" className="text-gray-600">
                    계약 완료
                  </ResponsiveText>
                </div>
              </ResponsiveGrid>
            </div>

            {/* 리드 목록 */}
            {viewMode === 'grid' && (
              <ResponsiveGrid
                cols={{ sm: 1, md: 2, lg: 3, xl: 4 }}
                gap={{ sm: 4, md: 6 }}
              >
                {leads.map((lead) => (
                  <LeadCard key={lead.id} lead={lead} />
                ))}
              </ResponsiveGrid>
            )}

            {viewMode === 'list' && (
              <div className="space-y-4">
                {leads.map((lead) => (
                  <ResponsiveCard key={lead.id} padding={{ sm: 'p-3', md: 'p-4' }}>
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      <div className="flex-1">
                        <ResponsiveText size="text-lg" weight="font-semibold">
                          {lead.bizName}
                        </ResponsiveText>
                        <ResponsiveText size="text-sm" className="text-gray-600">
                          {lead.roadAddress}
                        </ResponsiveText>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {lead.nearestStation}
                        </span>
                        <span className="text-sm text-gray-500">
                          {lead.distance}m
                        </span>
                        <select
                          value={lead.status}
                          onChange={(e) => onUpdateStatus(lead.id, e.target.value as LeadStatus)}
                          className="text-xs px-2 py-1 border rounded"
                        >
                          <option value="NEW">신규</option>
                          <option value="PROPOSAL_SENT">제안서 발송</option>
                          <option value="CONTACTED">연락 완료</option>
                          <option value="CONTRACTED">계약 완료</option>
                        </select>
                      </div>
                    </div>
                  </ResponsiveCard>
                ))}
              </div>
            )}

            {viewMode === 'map' && (
              <div className="h-96 lg:h-[600px] bg-gray-200 rounded-lg">
                <div className="flex items-center justify-center h-full">
                  <ResponsiveText size="text-lg" className="text-gray-600">
                    지도 뷰 (개발 중)
                  </ResponsiveText>
                </div>
              </div>
            )}

            {/* 플로팅 액션 버튼 (모바일) */}
            <ResponsiveWrapper breakpoint="md">
              <div className="fixed bottom-6 right-6 flex flex-col space-y-3">
                <button
                  onClick={onAddLead}
                  className="w-14 h-14 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 flex items-center justify-center"
                >
                  <Plus className="w-6 h-6" />
                </button>
                <button
                  onClick={onExportData}
                  className="w-14 h-14 bg-green-500 text-white rounded-full shadow-lg hover:bg-green-600 flex items-center justify-center"
                >
                  <Download className="w-6 h-6" />
                </button>
              </div>
            </ResponsiveWrapper>
          </ResponsiveContainer>
        </main>
      </div>

      {/* 모바일 사이드바 */}
      <ResponsiveSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        width={{ sm: '80vw', md: '400px' }}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-6">
            <ResponsiveText size="text-lg" weight="font-semibold">
              메뉴
            </ResponsiveText>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-1 rounded hover:bg-gray-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <nav className="space-y-2">
            <a href="#" className="block p-3 rounded-lg hover:bg-gray-100">
              <ResponsiveText size="text-base">대시보드</ResponsiveText>
            </a>
            <a href="#" className="block p-3 rounded-lg hover:bg-gray-100">
              <ResponsiveText size="text-base">리드 관리</ResponsiveText>
            </a>
            <a href="#" className="block p-3 rounded-lg hover:bg-gray-100">
              <ResponsiveText size="text-base">인벤토리</ResponsiveText>
            </a>
            <a href="#" className="block p-3 rounded-lg hover:bg-gray-100">
              <ResponsiveText size="text-base">통계</ResponsiveText>
            </a>
            <a href="#" className="block p-3 rounded-lg hover:bg-gray-100">
              <ResponsiveText size="text-base">설정</ResponsiveText>
            </a>
          </nav>
        </div>
      </ResponsiveSidebar>
    </div>
  );
}
