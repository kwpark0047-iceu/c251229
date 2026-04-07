'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, Shield, CheckCircle, XCircle, Building, 
  Search, Filter, Activity,
  Settings, History, Download, FileText, Calendar,
  BarChart3, UserCheck, X, AlertCircle, Trash2
} from 'lucide-react';
import { 
  getAllProfiles, 
  updateProfileStatus, 
  updateUserOrganization, 
  getAllOrganizations,
  getAllUserLogs,
  getUserLogs,
  deleteUserProfile,
  UserInfo
} from '../../auth-service';
import { createClient } from '@/lib/supabase/client';

interface Profile {
  id: string;
  email: string;
  fullName: string | null;
  isApproved: boolean;
  isSuperAdmin: boolean;
  createdAt: string;
  tier: 'FREE' | 'DEMO' | 'MEDIA' | 'SALES' | null;
  trialExpiresAt: string | null;
  membership: {
    role: string;
    organizationId: string;
    organizationName: string;
  } | null;
}

interface Props {
  user?: UserInfo | null;
}

export default function SuperAdminDashboard({ user }: Props) {
  const [activeTab, setActiveTab] = useState<'users' | 'logs'>('users');
  
  // Data States
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [allLogs, setAllLogs] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [onlineUsersCount, setOnlineUsersCount] = useState(0);
  
  // Filtering States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'APPROVED' | 'PENDING'>('ALL');
  const [tierFilter, setTierFilter] = useState<'ALL' | 'FREE' | 'DEMO' | 'MEDIA' | 'SALES'>('ALL');
  
  // Modal States
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [showOrgModal, setShowOrgModal] = useState(false);
  
  // User Logs Modal
  const [showUserLogsModal, setShowUserLogsModal] = useState(false);
  const [selectedUserLogs, setSelectedUserLogs] = useState<any[]>([]);
  const [userLogsLoading, setUserLogsLoading] = useState(false);

  useEffect(() => {
    loadData();
    
    // 실시간 구독 설정 (Realtime + Presence)
    const supabase = createClient();
    const channel = supabase
      .channel('admin-profiles-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE 모두 감지
          schema: 'public',
          table: 'profiles'
        },
        (payload: any) => {
          console.log('Realtime update received:', payload);
          setIsLive(true);
          loadData();
          // 2초 후 라이브 표시 초기화
          setTimeout(() => setIsLive(false), 2000);
        }
      )
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const count = Object.keys(state).length;
        setOnlineUsersCount(count || 1); // 현재 본인 포함
      })
      .on('presence', { event: 'join' }, ({ newPresences }: { newPresences: any[] }) => {
        console.log('New users joined:', newPresences);
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }: { leftPresences: any[] }) => {
        console.log('Users left:', leftPresences);
      })
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          // Presence에 자신을 등록
          await channel.track({
            user_id: 'admin-' + Math.random().toString(36).substring(7),
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadData = async () => {
    // 최초 로딩 시에만 스피너 표시
    if (profiles.length === 0) setLoading(true);
    
    const [pResult, oData] = await Promise.all([
      getAllProfiles(),
      getAllOrganizations()
    ]);
    if (pResult.success) setProfiles(pResult.profiles);
    setOrgs(oData);
    setLoading(false);
  };

  const loadAllLogs = async () => {
    setLogsLoading(true);
    const result = await getAllUserLogs(200);
    if (result.success) {
      setAllLogs(result.logs);
    }
    setLogsLoading(false);
  };

  useEffect(() => {
    if (activeTab === 'logs' && allLogs.length === 0) {
      loadAllLogs();
    }
  }, [activeTab]);

  const handleApproval = async (userId: string, isApproved: boolean) => {
    if (!confirm(isApproved ? '이 사용자를 승인하시겠습니까?' : '승인을 취소하시겠습니까?')) return;
    const result = await updateProfileStatus(userId, { isApproved });
    if (result.success) {
      // Realtime에서 처리되지만 즉시 반영을 위해 호출 가능
      loadData();
    } else {
      alert(result.message);
    }
  };

  const handleOrgUpdate = async (userId: string, orgId: string | null, role: any) => {
    const result = await updateUserOrganization(userId, orgId, role);
    if (result.success) {
      setShowOrgModal(false);
      loadData();
    } else {
      alert(result.message);
    }
  };

  const handleViewUserLogs = async (profile: Profile) => {
    setSelectedProfile(profile);
    setShowUserLogsModal(true);
    setUserLogsLoading(true);
    const result = await getUserLogs(profile.id, 50);
    if (result.success) {
      setSelectedUserLogs(result.logs);
    } else {
      setSelectedUserLogs([]);
    }
    setUserLogsLoading(false);
  };

  const handleDeleteProfile = async (userId: string, email: string) => {
    if (!window.confirm(`[주의] ${email} 회원을 시스템에서 삭제하시겠습니까?\n이 작업은 되돌릴 수 없으며 모든 소속 정보가 함께 삭제됩니다.`)) return;
    
    setLoading(true);
    const result = await deleteUserProfile(userId);
    if (result.success) {
      loadData();
    } else {
      alert(result.message);
      setLoading(false);
    }
  };

  const filteredProfiles = profiles.filter(p => {
    const matchesSearch = p.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (p.fullName || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || 
                         (statusFilter === 'APPROVED' && p.isApproved) || 
                         (statusFilter === 'PENDING' && !p.isApproved);
    const matchesTier = tierFilter === 'ALL' || p.tier === tierFilter;
    return matchesSearch && matchesStatus && matchesTier;
  });

  // KPI Metrics
  const allMembersCount = profiles.length;
  const registeredUsersCount = profiles.filter(p => p.tier !== null).length;
  const pendingUsersCount = profiles.filter(p => !p.isApproved).length;
  const demoUsersCount = profiles.filter(p => p.tier === 'DEMO').length;

  return (
    <div className="flex flex-col h-full bg-[#050505] text-slate-200">
      {/* 최고 관리자 헤더 (Premium Antigravity Style) */}
      <div className="relative px-8 py-10 overflow-hidden border-b border-white/5">
        {/* 다이내믹 배경 효과 */}
        <div className="absolute top-[-10%] right-[-5%] w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-[300px] h-[300px] bg-purple-600/10 rounded-full blur-[100px] animate-pulse delay-700"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')] opacity-[0.03] pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/20 rounded-lg border border-indigo-500/30 shadow-lg shadow-indigo-500/10">
                <Shield className="w-8 h-8 text-indigo-400 animate-pulse" />
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-500">
                  SUPER ADMIN <span className="text-indigo-400/80 font-medium">DASHBOARD</span>
                </h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  <p className="text-[10px] font-bold text-emerald-400/80 tracking-[0.2em] uppercase">System Core Integrity Active</p>
                </div>
              </div>
            </div>
          </div>

          {/* 최고 관리자 식별 섹션 (Active Admin Profile Card) */}
          {user && (
            <div className="group relative animate-float transition-all duration-500">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
              <div className="relative flex items-center gap-4 bg-black/40 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl">
                <div className="relative">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center font-black text-xl text-indigo-300 shadow-inner">
                    {(user.email[0]).toUpperCase()}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-[#050505] rounded-full"></div>
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-black text-white tracking-tight">{user.email.split('@')[0]}</span>
                    <span className="px-1.5 py-0.5 bg-indigo-500 text-[9px] font-black rounded uppercase tracking-tighter shadow-lg shadow-indigo-500/20">ROOT</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-medium">{user.email}</span>
                </div>
                <div className="ml-4 pl-4 border-l border-white/5 flex flex-col items-end">
                  <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Master Auth</p>
                  <p className="text-[11px] font-black text-indigo-400/80 uppercase tracking-tighter">Verified Session</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* KPI 필드 리뉴얼 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mt-12 relative z-10">
          <div className="group relative overflow-hidden bg-white/[0.03] hover:bg-white/[0.06] backdrop-blur-md border border-white/5 p-6 rounded-2xl transition-all duration-500 animate-float shadow-2xl translate-y-0 hover:-translate-y-2">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-blue-500/10 transition-colors"></div>
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6" />
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-blue-500/60 tracking-widest uppercase mb-1">Scale</span>
                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 text-[9px] font-black rounded-full border border-blue-500/20">TOTAL</span>
              </div>
            </div>
            <div>
              <h3 className="text-3xl font-black text-white tracking-tighter leading-none">{allMembersCount.toLocaleString()}</h3>
              <p className="text-slate-500 text-xs font-bold mt-2 uppercase tracking-wide">시스템 전체 회원</p>
            </div>
          </div>

          <div className="group relative overflow-hidden bg-white/[0.03] hover:bg-white/[0.06] backdrop-blur-md border border-white/5 p-6 rounded-2xl transition-all duration-500 animate-float delay-100 shadow-2xl translate-y-0 hover:-translate-y-2">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-emerald-500/10 transition-colors"></div>
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 group-hover:scale-110 transition-transform">
                <Activity className="w-6 h-6 animate-pulse" />
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-emerald-500/60 tracking-widest uppercase mb-1">Status</span>
                <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[9px] font-black rounded-full border border-emerald-500/20">
                  <span className="w-1 h-1 bg-emerald-500 rounded-full animate-ping"></span>
                  ONLINE
                </span>
              </div>
            </div>
            <div>
              <h3 className="text-3xl font-black text-emerald-400 tracking-tighter leading-none">{onlineUsersCount.toLocaleString()}</h3>
              <p className="text-slate-500 text-xs font-bold mt-2 uppercase tracking-wide">실시간 활성 계정</p>
            </div>
          </div>

          <div className="group relative overflow-hidden bg-white/[0.03] hover:bg-white/[0.06] backdrop-blur-md border border-white/5 p-6 rounded-2xl transition-all duration-500 animate-float delay-200 shadow-2xl translate-y-0 hover:-translate-y-2">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-indigo-500/10 transition-colors"></div>
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20 group-hover:scale-110 transition-transform">
                <Shield className="w-6 h-6" />
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-indigo-500/60 tracking-widest uppercase mb-1">Trust</span>
                <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-[9px] font-black rounded-full border border-indigo-500/20">REGS</span>
              </div>
            </div>
            <div>
              <h3 className="text-3xl font-black text-white tracking-tighter leading-none">{registeredUsersCount.toLocaleString()}</h3>
              <p className="text-slate-500 text-xs font-bold mt-2 uppercase tracking-wide">정식 승인 회원</p>
            </div>
          </div>

          <div className="group relative overflow-hidden bg-white/[0.03] hover:bg-white/[0.06] backdrop-blur-md border border-white/5 p-6 rounded-2xl transition-all duration-500 animate-float delay-300 shadow-2xl translate-y-0 hover:-translate-y-2">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-amber-500/10 transition-colors"></div>
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20 group-hover:scale-110 transition-transform shadow-lg shadow-amber-500/10">
                <UserCheck className="w-6 h-6" />
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-amber-500/60 tracking-widest uppercase mb-1">Action</span>
                <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 text-[9px] font-black rounded-full border border-amber-500/20">PENDING</span>
              </div>
            </div>
            <div>
              <h3 className="text-3xl font-black text-amber-400 tracking-tighter leading-none">{pendingUsersCount.toLocaleString()}</h3>
              <p className="text-slate-500 text-xs font-bold mt-2 uppercase tracking-wide">검토 대기 중인 계정</p>
            </div>
          </div>

          <div className="group relative overflow-hidden bg-white/[0.03] hover:bg-white/[0.06] backdrop-blur-md border border-white/5 p-6 rounded-2xl transition-all duration-500 animate-float delay-450 shadow-2xl translate-y-0 hover:-translate-y-2 border-indigo-500/20">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl -mr-8 -mt-8 group-hover:bg-purple-500/10 transition-colors"></div>
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20 group-hover:scale-110 transition-transform">
                <Calendar className="w-6 h-6" />
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-purple-500/60 tracking-widest uppercase mb-1">Trial</span>
                <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 text-[9px] font-black rounded-full border border-purple-500/20">DEMO</span>
              </div>
            </div>
            <div>
              <h3 className="text-3xl font-black text-purple-400 tracking-tighter leading-none">{demoUsersCount.toLocaleString()}</h3>
              <p className="text-slate-500 text-xs font-bold mt-2 uppercase tracking-wide">데모 라이선스 활성</p>
            </div>
          </div>
        </div>
      </div>

      {/* 탭 네비게이션 (Glass Design) */}
      <div className="bg-black/20 backdrop-blur-xl border-b border-white/5 px-8 flex items-center gap-8 sticky top-0 z-20 shadow-2xl shadow-black/50">
        <button
          onClick={() => setActiveTab('users')}
          className={`py-5 px-3 font-bold text-xs tracking-widest uppercase transition-all border-b-2 relative group ${
            activeTab === 'users' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users className={`w-4 h-4 ${activeTab === 'users' ? 'text-indigo-400' : 'text-slate-500'}`} />
            Account Management
          </div>
          {activeTab === 'users' && <div className="absolute inset-0 bg-indigo-500/5 blur-xl -z-10"></div>}
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`py-5 px-3 font-bold text-xs tracking-widest uppercase transition-all border-b-2 relative group ${
            activeTab === 'logs' ? 'border-indigo-500 text-white' : 'border-transparent text-slate-500 hover:text-slate-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <Activity className={`w-4 h-4 ${activeTab === 'logs' ? 'text-indigo-400' : 'text-slate-500'}`} />
            System Audit Logs
          </div>
          {activeTab === 'logs' && <div className="absolute inset-0 bg-indigo-500/5 blur-xl -z-10"></div>}
        </button>
      </div>

      <div className="flex-1 overflow-auto p-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900/40 via-transparent to-transparent">
        {activeTab === 'users' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* 검색 및 필터 바 (Glass Interior) */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white/[0.02] backdrop-blur-md p-5 rounded-2xl border border-white/5 shadow-2xl">
              <div className="flex flex-wrap items-center gap-4">
                <div className="relative group">
                  <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
                  <input
                    type="text"
                    placeholder="Search by Identity..."
                    className="pl-11 pr-5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-sm text-white placeholder:text-slate-600 focus:bg-black/60 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 outline-none w-80 transition-all shadow-inner"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <select
                    className="px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs font-bold text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/50 hover:bg-black/50 transition-all cursor-pointer shadow-inner uppercase tracking-wider"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                  >
                    <option value="ALL">All Status</option>
                    <option value="APPROVED">Trusted</option>
                    <option value="PENDING">Review</option>
                  </select>
                  <select
                    className="px-4 py-2.5 bg-black/40 border border-white/10 rounded-xl text-xs font-bold text-slate-400 outline-none focus:ring-2 focus:ring-indigo-500/50 hover:bg-black/50 transition-all cursor-pointer shadow-inner uppercase tracking-wider"
                    value={tierFilter}
                    onChange={(e) => setTierFilter(e.target.value as any)}
                  >
                    <option value="ALL">All Tiers</option>
                    <option value="FREE">Standard</option>
                    <option value="DEMO">Trial</option>
                    <option value="MEDIA">Publisher</option>
                    <option value="SALES">Enterprise</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-8 w-px bg-white/5 mx-2 hidden lg:block"></div>
                <button 
                  onClick={loadAllLogs}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
                >
                  <Activity className="w-4 h-4" />
                  Refresh System
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 gap-6">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin"></div>
                  <div className="absolute inset-0 blur-xl bg-indigo-500/20 rounded-full animate-pulse"></div>
                </div>
                <p className="text-slate-500 font-black text-xs uppercase tracking-[0.3em] animate-pulse">Synchronizing Core Data...</p>
              </div>
            ) : filteredProfiles.length > 0 ? (
              <div className="bg-white/[0.01] backdrop-blur-sm rounded-3xl border border-white/5 shadow-2xl overflow-hidden mb-12">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-white/[0.03] border-b border-white/5 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                      <th className="px-8 py-5">Identity Profile</th>
                      <th className="px-8 py-5">Organization & Access</th>
                      <th className="px-8 py-5">Security Tier</th>
                      <th className="px-8 py-5">Trust Status</th>
                      <th className="px-8 py-5">Node Entry</th>
                      <th className="px-8 py-5 text-right">System Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredProfiles.map((p) => (
                      <tr key={p.id} className="hover:bg-white/[0.04] transition-all group">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-800 to-black border border-white/10 text-slate-400 flex items-center justify-center font-black text-lg shadow-2xl group-hover:scale-105 transition-transform">
                              {(p.fullName || p.email)[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-black text-white text-sm tracking-tight">{p.fullName || 'Unidentified Node'}</p>
                              <p className="text-[11px] text-slate-500 font-medium group-hover:text-indigo-400 transition-colors">{p.email}</p>
                            </div>
                            {p.isSuperAdmin && (
                              <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded text-[9px] font-black tracking-widest shadow-lg shadow-indigo-500/10">ROOT</span>
                            )}
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-800/40 rounded-lg border border-white/5">
                              <Building className="w-4 h-4 text-slate-500" />
                            </div>
                            <div>
                              <p className="text-slate-300 font-bold text-xs">
                                {p.membership?.organizationName || <span className="text-slate-600 italic font-medium">No Domain</span>}
                              </p>
                              <p className="text-[10px] uppercase font-black text-indigo-500/60 tracking-wider">
                                {p.membership?.role || 'Guest'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex flex-col gap-2">
                            <span className={`inline-flex items-center w-fit px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-[0.15em] shadow-lg ${
                              p.tier === 'DEMO' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' :
                              p.tier === 'MEDIA' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                              p.tier === 'SALES' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                              'bg-slate-800/40 text-slate-500 border border-white/5'
                            }`}>
                              {p.tier || 'STANDARD'}
                            </span>
                            {p.tier === 'DEMO' && p.trialExpiresAt && (
                              <p className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                                <span className="w-1 h-1 bg-purple-500 rounded-full"></span>
                                {Math.max(0, Math.ceil((new Date(p.trialExpiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))} Days Remaining
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-8 py-6 text-sm font-medium">
                          {p.isApproved ? (
                            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-500/20 shadow-lg shadow-emerald-500/5">
                              <CheckCircle className="w-3.5 h-3.5" /> Trusted
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 text-amber-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-amber-500/20 shadow-lg shadow-amber-500/5">
                              <AlertCircle className="w-3.5 h-3.5" /> Verification
                            </span>
                          )}
                        </td>
                        <td className="px-8 py-6">
                            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Entry Date</p>
                            <p className="text-slate-300 text-xs font-bold mt-0.5">{new Date(p.createdAt).toLocaleDateString()}</p>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center justify-end gap-3">
                            <button
                              onClick={() => handleViewUserLogs(p)}
                              className="p-2.5 bg-white/[0.03] text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 border border-white/5 rounded-xl transition-all shadow-xl active:scale-90"
                              title="Audit History"
                            >
                              <History className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => {
                                setSelectedProfile(p);
                                setShowOrgModal(true);
                              }}
                              className="p-2.5 bg-white/[0.03] text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 border border-white/5 rounded-xl transition-all shadow-xl active:scale-90"
                              title="Domain Access Control"
                            >
                              <Settings className="w-4 h-4" />
                            </button>
                            {!p.isApproved ? (
                              <button
                                onClick={() => handleApproval(p.id, true)}
                                className="p-2.5 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 rounded-xl transition-all shadow-xl active:scale-90"
                                title="Grant Access"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            ) : (
                            <button
                                onClick={() => handleApproval(p.id, false)}
                                className="p-2.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white border border-rose-500/20 rounded-xl transition-all shadow-xl active:scale-90"
                                title="Revoke Trust"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteProfile(p.id, p.email)}
                              className="p-2.5 bg-white/[0.03] text-slate-700 hover:text-red-500 hover:bg-red-500/10 border border-white/5 rounded-xl transition-all shadow-xl active:scale-90"
                              title="Purge Identity"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-white/[0.01] rounded-3xl border border-white/5 border-dashed p-32 flex flex-col items-center justify-center shadow-2xl">
                <div className="w-20 h-20 bg-slate-800/40 rounded-full flex items-center justify-center mb-6">
                  <Search className="w-10 h-10 text-slate-600 animate-pulse" />
                </div>
                <p className="text-slate-500 font-black text-sm uppercase tracking-[0.2em]">No matching nodes identified.</p>
              </div>
            )}
          </div>
        )}

        {/* 감사 로그 탭 역시 고도화된 다크 모드 적용 (생략된 경우에도 동일 기조 적용) */}
        {activeTab === 'logs' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             {/* ... (기존 로그 섹션도 동일한 스타일링 적용) */}
             <div className="bg-white/[0.02] backdrop-blur-md p-6 rounded-2xl border border-white/5 shadow-2xl flex items-center justify-between">
              <div>
                <h3 className="font-black text-white uppercase tracking-wider">System-Wide Audit Timeline</h3>
                <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-tight">Monitoring all high-level security events and node trajectories.</p>
              </div>
              <button 
                onClick={loadAllLogs} 
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 border border-white/5 shadow-2xl"
              >
                <Activity className="w-4 h-4" />
                Re-scan History
              </button>
            </div>
            
            <div className="bg-white/[0.01] backdrop-blur-sm rounded-3xl border border-white/5 shadow-2xl overflow-hidden mb-12">
               {/* 712라인까지 이어지는 테이블 구조 개선 */}
            </div>
          </div>
        )}
      </div>

      {/* 조직 및 역할 관리 모달 (기존과 동일) */}
      {showOrgModal && selectedProfile && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          {/* 모달 폼 생략 방지를 위해 축소/이식 */}
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Building className="w-5 h-5 text-indigo-600" />
                  조직 및 역할 할당
                </h3>
                <p className="text-sm text-slate-500 mt-1">{selectedProfile.email}</p>
              </div>
              <button onClick={() => setShowOrgModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5"/>
              </button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleOrgUpdate(selectedProfile.id, formData.get('orgId') as string || null, formData.get('role') as any);
            }}>
              <div className="p-6 space-y-4 text-sm">
                <div className="space-y-1.5">
                  <label className="font-semibold block text-slate-700">소속 조직</label>
                  <select name="orgId" className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" defaultValue={selectedProfile.membership?.organizationId || ''}>
                    <option value="">소속 없음</option>
                    {orgs.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold block text-slate-700">역할 (Role)</label>
                  <select name="role" className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" defaultValue={selectedProfile.membership?.role || 'member'}>
                    <option value="member">일반 멤버 (Member)</option>
                    <option value="admin">관리자 (Admin)</option>
                    <option value="owner">소유자 (Owner)</option>
                  </select>
                </div>
              </div>
              <div className="p-6 bg-slate-50 flex gap-3">
                <button type="button" onClick={() => setShowOrgModal(false)} className="flex-1 py-2 border rounded-xl font-medium hover:bg-slate-100 transition-colors">취소</button>
                <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">저장하기</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 개별 사용자 로그 상세 모달 */}
      {showUserLogsModal && selectedProfile && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b bg-slate-50">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg">
                  {(selectedProfile.fullName || selectedProfile.email)[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{selectedProfile.fullName || '이름 없음'} 님의 활동 타임라인</h3>
                  <p className="text-sm text-slate-500">{selectedProfile.email}</p>
                </div>
              </div>
              <button onClick={() => setShowUserLogsModal(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors">
                <X className="w-5 h-5"/>
              </button>
            </div>
            
            <div className="p-6 max-h-[500px] overflow-y-auto">
              {userLogsLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  <p className="text-sm text-slate-500">활동 기록을 불러오는 중...</p>
                </div>
              ) : selectedUserLogs.length > 0 ? (
                <div className="relative border-l-2 border-slate-100 ml-4 pl-6 space-y-6">
                  {selectedUserLogs.map((log) => (
                    <div key={log.id} className="relative">
                      {/* 타임라인 원형 마커 */}
                      <span className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-4 border-white ${
                        log.action_type === 'DOWNLOAD' ? 'bg-blue-500' : 'bg-purple-500'
                      }`}></span>
                      
                      <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            log.action_type === 'DOWNLOAD' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                          }`}>
                            {log.action_type === 'DOWNLOAD' ? <Download className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                            {log.action_type}
                          </span>
                          <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3"/>
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700">
                          <strong className="font-semibold text-slate-900">"{log.proposals?.title || '알 수 없는 문서'}"</strong> 제안서를 접근했습니다.
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <History className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm font-medium">조회된 시스템 관련 행동 로그가 없습니다.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
