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

  // 리드 카드 컴포넌트 (Premium Antigravity Style)
  const LeadCard = ({ lead }: { lead: Lead }) => (
    <div
      onClick={() => onSelectLead(lead.id)}
      className="group relative animate-float-subtle transition-all duration-500 cursor-pointer"
    >
      {/* 카드 글로우 효과 */}
      <div className="absolute -inset-0.5 bg-gradient-to-br from-indigo-500/20 to-purple-600/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
      
      <div className="relative bg-white/[0.03] backdrop-blur-xl border border-white/5 p-5 rounded-2xl shadow-2xl hover:bg-white/[0.06] hover:border-white/10 transition-all flex flex-col h-full">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h3 className="text-white font-black text-lg tracking-tight group-hover:text-indigo-400 transition-colors truncate">
              {lead.bizName}
            </h3>
            <p className="text-slate-500 text-xs font-medium mt-1 truncate">
              {lead.roadAddress}
            </p>
          </div>
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
            <Map className="w-4 h-4" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-black/40 border border-white/5 p-2 rounded-xl text-center">
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Station</p>
            <p className="text-[11px] font-bold text-slate-300 truncate">{lead.nearestStation}</p>
          </div>
          <div className="bg-black/40 border border-white/5 p-2 rounded-xl text-center">
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Distance</p>
            <p className="text-[11px] font-bold text-indigo-400">{lead.distance}m</p>
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
          <div className="relative">
            <select
              value={lead.status}
              onChange={(e) => {
                e.stopPropagation();
                onUpdateStatus(lead.id, e.target.value as LeadStatus);
              }}
              title="노드 상태 선택"
              className="appearance-none bg-black/60 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 pr-8 rounded-lg border border-white/10 focus:ring-2 focus:ring-indigo-500/50 outline-none cursor-pointer hover:bg-black/80 transition-all"
              onClick={(e) => e.stopPropagation()}
            >
              <option value="NEW">New Node</option>
              <option value="PROPOSAL_SENT">Proposal</option>
              <option value="CONTACTED">Active</option>
              <option value="CONTRACTED">Synced</option>
            </select>
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
              <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[4px] border-t-slate-400"></div>
            </div>
          </div>

          <span className={`w-2 h-2 rounded-full shadow-[0_0_8px] ${
            lead.status === 'NEW' ? 'bg-blue-500 shadow-blue-500/50' :
            lead.status === 'CONTRACTED' ? 'bg-emerald-500 shadow-emerald-500/50 animate-pulse' :
            'bg-indigo-500 shadow-indigo-500/50'
          }`}></span>
        </div>
      </div>
    </div>
  );

  // 필터 패널
  const FilterPanel = () => (
    <div className="space-y-4">
      <ResponsiveText size={{ sm: 'text-lg' }} weight={{ sm: 'font-semibold' }}>
        필터
      </ResponsiveText>

      {/* 상태 필터 */}
      <div>
        <ResponsiveText size={{ sm: 'text-sm' }} weight={{ sm: 'font-medium' }} className="mb-2">
          상태
        </ResponsiveText>
        <div className="space-y-2">
          {['NEW', 'PROPOSAL_SENT', 'CONTACTED', 'CONTRACTED'].map((status) => (
            <label key={status} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={statusFilter.includes(status as LeadStatus)}
                aria-label={`${status === 'NEW' ? '신규' : status === 'PROPOSAL_SENT' ? '제안서 발송' : status === 'CONTACTED' ? '연락 완료' : '계약 완료'} 필터`}
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
    <div className="min-h-screen bg-[#050505] text-slate-300 selection:bg-indigo-500/30">
      {/* 헤더 (Antigravity Glass Style) */}
      <header className="bg-black/20 backdrop-blur-2xl border-b border-white/5 sticky top-0 z-40 text-white">
        <ResponsiveContainer>
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-6">
              {/* 모바일 메뉴 버튼 */}
              <ResponsiveWrapper breakpoint="md">
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-2.5 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] transition-all text-slate-400 active:scale-90"
                  title="메뉴 열기"
                >
                  <Menu className="w-5 h-5" />
                </button>
              </ResponsiveWrapper>

              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
                  <LayoutGrid className="text-white w-5 h-5" />
                </div>
                <h1 className="text-2xl font-black tracking-tight text-white uppercase sm:block hidden">
                  Node <span className="text-indigo-400">Flow</span>
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* 검색 */}
              <div className="relative group sm:block hidden">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                <input
                  type="text"
                  placeholder="Scan Nodes..."
                  aria-label="노드 검색"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-11 pr-5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-600 focus:bg-black/60 focus:ring-2 focus:ring-indigo-500/50 outline-none w-64 transition-all shadow-inner"
                />
              </div>

              {/* 액션 버튼 */}
              <div className="flex items-center gap-2">
                <ResponsiveWrapper breakpoint="lg">
                  <button
                    onClick={onAddLead}
                    className="p-2.5 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                    title="Add Node"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                </ResponsiveWrapper>

                <ResponsiveWrapper breakpoint="md">
                  <button
                    onClick={onExportData}
                    className="p-2.5 bg-slate-800 text-slate-300 rounded-xl hover:bg-slate-700 transition-all border border-white/5 active:scale-95"
                    title="Export Sequence"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                </ResponsiveWrapper>
              </div>
            </div>
          </div>

          {/* 뷰 모드 전환 및 서브 액션 */}
          <div className="flex items-center justify-between py-3 border-t border-white/5">
            <div className="flex items-center gap-2 bg-black/40 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                  viewMode === 'grid' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-300'
                }`}
                aria-label="그리드 뷰"
                title="그리드 뷰"
                aria-pressed={viewMode === 'grid' ? "true" : "false"}
              >
                <LayoutGrid className="w-4 h-4" />
                Grid
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                  viewMode === 'list' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-300'
                }`}
                aria-label="리스트 뷰"
                title="리스트 뷰"
                aria-pressed={viewMode === 'list' ? "true" : "false"}
              >
                <LayoutList className="w-4 h-4" />
                List
              </button>
              <button
                onClick={() => setViewMode('map')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                  viewMode === 'map' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-slate-300'
                }`}
                aria-label="지도 뷰"
                title="지도 뷰"
                aria-pressed={viewMode === 'map' ? "true" : "false"}
              >
                <Map className="w-4 h-4" />
                Map
              </button>
            </div>

            {/* 필터 버튼 (모바일) */}
            <ResponsiveWrapper breakpoint="md">
              <button
                onClick={toggleFilterPanel}
                className={`p-2.5 rounded-xl border transition-all ${
                  isFilterPanelOpen ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400' : 'bg-black/40 border-white/10 text-slate-400'
                }`}
                title="필터 패널 토글"
              >
                <Filter className="w-4 h-4" />
              </button>
            </ResponsiveWrapper>
          </div>
        </ResponsiveContainer>
      </header>

      <div className="flex">
        {/* 사이드바 (데스크톱 - Glass Style) */}
        <ResponsiveWrapper breakpoint="lg">
          <aside className="w-72 bg-black/10 backdrop-blur-3xl border-r border-white/5 h-[calc(100-80px)] sticky top-[80px]">
            <div className="p-8">
              <FilterPanel />
            </div>
          </aside>
        </ResponsiveWrapper>

        {/* 메인 콘텐츠 */}
        <main className="flex-1">
          <ResponsiveContainer>
            {/* 모바일 필터 패널 (Premium Glass Panel) */}
            <ResponsiveWrapper breakpoint="md">
              {isFilterPanelOpen && (
                <div className="mb-6 p-6 bg-white/[0.03] backdrop-blur-2xl rounded-2xl border border-white/5 shadow-2xl animate-float-subtle">
                  <div className="flex items-center justify-between mb-6">
                    <ResponsiveText size={{ sm: 'text-lg' }} weight={{ sm: 'font-black' }} className="text-white uppercase tracking-tight">
                      Filter Node
                    </ResponsiveText>
                    <button
                      onClick={() => setIsFilterPanelOpen(false)}
                      className="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-slate-400 hover:text-white transition-all shadow-lg"
                      title="필터 패널 닫기"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <FilterPanel />
                </div>
              )}
            </ResponsiveWrapper>

            {/* 통계 바 (Premium Analytics Card) */}
            <div className="mb-10 relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-3xl blur-2xl opacity-50"></div>
              <div className="relative bg-white/[0.02] backdrop-blur-2xl border border-white/5 p-8 rounded-3xl shadow-2xl">
                <ResponsiveGrid
                  cols={{ sm: 2, md: 4 }}
                  gap={{ sm: 6, md: 8 }}
                >
                  <div className="flex flex-col items-center border-r border-white/5 last:border-0">
                    <ResponsiveText size={{ sm: 'text-3xl' }} weight={{ sm: 'font-black' }} className="text-white tracking-tighter">
                      {leads.length}
                    </ResponsiveText>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">Total Nodes</p>
                  </div>
                  <div className="flex flex-col items-center border-r border-white/5 last:border-0">
                    <ResponsiveText size={{ sm: 'text-3xl' }} weight={{ sm: 'font-black' }} className="text-blue-400 tracking-tighter">
                      {leads.filter(l => l.status === 'NEW').length}
                    </ResponsiveText>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">Discovery</p>
                  </div>
                  <div className="flex flex-col items-center border-r border-white/5 last:border-0">
                    <ResponsiveText size={{ sm: 'text-3xl' }} weight={{ sm: 'font-black' }} className="text-indigo-400 tracking-tighter">
                      {leads.filter(l => l.status === 'PROPOSAL_SENT').length}
                    </ResponsiveText>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">Transmitting</p>
                  </div>
                  <div className="flex flex-col items-center border-r border-white/5 last:border-0">
                    <ResponsiveText size={{ sm: 'text-3xl' }} weight={{ sm: 'font-black' }} className="text-emerald-400 tracking-tighter">
                      {leads.filter(l => l.status === 'CONTRACTED').length}
                    </ResponsiveText>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-1">Integrated</p>
                  </div>
                </ResponsiveGrid>
              </div>
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
                  <div
                    key={lead.id}
                    onClick={() => onSelectLead(lead.id)}
                    className="group relative bg-white/[0.03] backdrop-blur-xl border border-white/5 p-4 rounded-2xl hover:bg-white/[0.06] hover:border-white/10 transition-all cursor-pointer flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
                  >
                    <div className="flex-1">
                      <ResponsiveText size={{ sm: 'text-lg' }} weight={{ sm: 'font-black' }} className="text-white group-hover:text-indigo-400 transition-colors">
                        {lead.bizName}
                      </ResponsiveText>
                      <ResponsiveText size={{ sm: 'text-sm' }} className="text-slate-500 font-medium">
                        {lead.roadAddress}
                      </ResponsiveText>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-500/10 text-indigo-400 px-3 py-1 rounded-lg border border-indigo-500/20">
                        {lead.nearestStation}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                        {lead.distance}m
                      </span>
                      <div className="relative">
                        <select
                          value={lead.status}
                          onChange={(e) => {
                            e.stopPropagation();
                            onUpdateStatus(lead.id, e.target.value as LeadStatus);
                          }}
                          title="노드 상태 선택"
                          className="appearance-none bg-black/60 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 pr-8 rounded-lg border border-white/10 focus:ring-2 focus:ring-indigo-500/50 outline-none cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="NEW">New Node</option>
                          <option value="PROPOSAL_SENT">Proposal</option>
                          <option value="CONTACTED">Active</option>
                          <option value="CONTRACTED">Synced</option>
                        </select>
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                          <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-[4px] border-t-slate-400"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {viewMode === 'map' && (
              <div className="h-96 lg:h-[600px] bg-black/40 border border-white/5 rounded-3xl overflow-hidden shadow-2xl flex items-center justify-center relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent"></div>
                <div className="text-center relative z-10">
                  <div className="w-16 h-16 bg-white/[0.03] rounded-2xl border border-white/5 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                    <Map className="w-8 h-8 text-indigo-400 opacity-50" />
                  </div>
                  <ResponsiveText size={{ sm: 'text-lg' }} weight={{ sm: 'font-black' }} className="text-slate-500 uppercase tracking-widest">
                    Initializing Geo-Sync
                  </ResponsiveText>
                  <p className="text-xs text-slate-600 mt-2">Map Engine under stabilization...</p>
                </div>
              </div>
            )}

            {/* 플로팅 액션 버튼 (Mobile Antigravity FAB) */}
            <ResponsiveWrapper breakpoint="md">
              <div className="fixed bottom-8 right-8 flex flex-col space-y-4 z-50">
                <button
                  onClick={onAddLead}
                  className="w-16 h-16 bg-indigo-500 text-white rounded-2xl shadow-2xl shadow-indigo-500/40 hover:bg-indigo-600 flex items-center justify-center animate-float group transition-transform active:scale-90"
                  title="새로운 노드 추가"
                >
                  <Plus className="w-8 h-8 group-hover:rotate-90 transition-transform duration-500" />
                </button>
                <button
                  onClick={onExportData}
                  className="w-14 h-14 bg-slate-800 text-slate-300 rounded-2xl shadow-2xl border border-white/10 hover:bg-slate-700 flex items-center justify-center animate-float delay-300 transition-transform active:scale-90"
                  title="데이터 내보내기"
                >
                  <Download className="w-6 h-6" />
                </button>
              </div>
            </ResponsiveWrapper>
          </ResponsiveContainer>
        </main>
      </div>

      {/* 모바일 사이드바 (Premium Glass Sidebar) */}
      <ResponsiveSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        width={{ sm: '80vw', md: '400px' }}
        className="bg-black/90 backdrop-blur-2xl border-l border-white/5"
      >
        <div className="p-8 h-full flex flex-col">
          <div className="flex items-center justify-between mb-10 border-b border-white/5 pb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
                <LayoutGrid className="text-white w-4 h-4" />
              </div>
              <span className="text-xl font-black text-white uppercase tracking-tight">Menu</span>
            </div>
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="p-2 rounded-xl bg-white/[0.03] border border-white/5 text-slate-400 hover:text-white transition-all"
              title="사이드바 닫기"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="space-y-4 flex-1">
            {[
              { label: 'Dashboard', icon: LayoutGrid },
              { label: 'Node Flow', icon: LayoutList, active: true },
              { label: 'Inventory', icon: Map },
              { label: 'Analytics', icon: Download },
              { label: 'System Settings', icon: Settings }
            ].map((item, idx) => (
              <button 
                key={idx} 
                className={`flex items-center w-full gap-4 p-4 rounded-2xl transition-all group ${
                  item.active 
                  ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' 
                  : 'bg-white/[0.02] border border-white/5 text-slate-400 hover:bg-white/[0.05] hover:text-white'
                }`}
                title={item.label}
              >
                <item.icon className={`w-5 h-5 ${item.active ? 'text-white' : 'text-slate-500 group-hover:text-indigo-400 transition-colors'}`} />
                <span className="text-sm font-black uppercase tracking-widest">{item.label}</span>
              </button>
            ))}
          </nav>
          
          <div className="mt-auto border-t border-white/5 pt-6">
            <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">System Version</p>
              <p className="text-xs text-slate-400">Ver 2.0.5 Anti-G Edition</p>
            </div>
          </div>
        </div>
      </ResponsiveSidebar>
    </div>
  );
}
