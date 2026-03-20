'use client';

import React, { useState, useEffect } from 'react';
import { 
  Users, Shield, CheckCircle, XCircle, Building, 
  Search, Filter, Activity,
  Settings, History, Download, FileText, Calendar,
  BarChart3, UserCheck, X, AlertCircle
} from 'lucide-react';
import { 
  getAllProfiles, 
  updateProfileStatus, 
  updateUserOrganization, 
  getAllOrganizations,
  getAllUserLogs,
  getUserLogs
} from '../../auth-service';

interface Profile {
  id: string;
  email: string;
  fullName: string | null;
  isApproved: boolean;
  isSuperAdmin: boolean;
  createdAt: string;
  membership: {
    role: string;
    organizationId: string;
    organizationName: string;
  } | null;
}

export default function SuperAdminDashboard() {
  const [activeTab, setActiveTab] = useState<'users' | 'logs'>('users');
  
  // Data States
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [allLogs, setAllLogs] = useState<any[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  
  // Filtering States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'APPROVED' | 'PENDING'>('ALL');
  
  // Modal States
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [showOrgModal, setShowOrgModal] = useState(false);
  
  // User Logs Modal
  const [showUserLogsModal, setShowUserLogsModal] = useState(false);
  const [selectedUserLogs, setSelectedUserLogs] = useState<any[]>([]);
  const [userLogsLoading, setUserLogsLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
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

  const filteredProfiles = profiles.filter(p => {
    const matchesSearch = p.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         (p.fullName || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || 
                         (statusFilter === 'APPROVED' && p.isApproved) || 
                         (statusFilter === 'PENDING' && !p.isApproved);
    return matchesSearch && matchesStatus;
  });

  // KPI Metrics
  const totalUsers = profiles.length;
  const pendingUsers = profiles.filter(p => !p.isApproved).length;
  const totalOrganizations = orgs.length;

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* 최고 관리자 헤더 */}
      <div className="bg-slate-900 px-8 py-8 text-white grid gap-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            <Shield className="w-7 h-7 text-indigo-400" />
            최고 관리자 대시보드 (Super Admin)
          </h1>
          <p className="text-slate-400 mt-2 text-sm">
            시스템 내 모든 사용자의 계정 승인, 조직 권한을 관리하고 활동 내역을 감사(Audit)합니다.
          </p>
        </div>

        {/* 핵심 KPI 카드 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl flex items-center gap-4">
            <div className="p-3 bg-blue-500/20 text-blue-400 rounded-lg">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-slate-400 text-sm font-medium">총 가입 회원</p>
              <h3 className="text-2xl font-bold">{totalUsers}명</h3>
            </div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl flex items-center gap-4">
            <div className="p-3 bg-amber-500/20 text-amber-400 rounded-lg">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-slate-400 text-sm font-medium">승인 대기 회원</p>
              <h3 className="text-2xl font-bold">{pendingUsers}명</h3>
            </div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 p-4 rounded-xl flex items-center gap-4">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <p className="text-slate-400 text-sm font-medium">등록된 조직</p>
              <h3 className="text-2xl font-bold">{totalOrganizations}개</h3>
            </div>
          </div>
        </div>
      </div>

      {/* 탭 네비게이션 */}
      <div className="bg-white border-b px-6 flex items-center gap-6 sticky top-0 z-10 shadow-sm">
        <button
          onClick={() => setActiveTab('users')}
          className={`py-4 px-2 font-semibold text-sm transition-all border-b-2 ${
            activeTab === 'users' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            회원 및 권한 관리
          </div>
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`py-4 px-2 font-semibold text-sm transition-all border-b-2 ${
            activeTab === 'logs' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            전체 감사 로그 (Audit)
          </div>
        </button>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'users' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* 검색 및 필터 바 */}
            <div className="flex items-center justify-between bg-white p-3 rounded-xl border shadow-sm">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="이메일, 이름 검색..."
                    className="pl-9 pr-4 py-2 border rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none w-64"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <select
                  className="px-3 py-2 border rounded-lg text-sm bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                >
                  <option value="ALL">전체 상태</option>
                  <option value="APPROVED">승인 완료</option>
                  <option value="PENDING">승인 대기</option>
                </select>
              </div>
              <button onClick={loadData} className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg">
                <Settings className="w-5 h-5" />
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : filteredProfiles.length > 0 ? (
              <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b text-slate-600 text-sm font-medium">
                      <th className="px-6 py-4">사용자</th>
                      <th className="px-6 py-4">소속 / 역할</th>
                      <th className="px-6 py-4">승인 상태</th>
                      <th className="px-6 py-4">가입일</th>
                      <th className="px-6 py-4 text-right">보안 액션</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-sm">
                    {filteredProfiles.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                              {(p.fullName || p.email)[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900">{p.fullName || '이름 없음'}</p>
                              <p className="text-xs text-slate-500">{p.email}</p>
                            </div>
                            {p.isSuperAdmin && (
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-bold">SUPER</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Building className="w-4 h-4 text-slate-400" />
                            <div>
                              <p className="text-slate-700 font-medium">
                                {p.membership?.organizationName || <span className="text-slate-400 italic">미소속</span>}
                              </p>
                              <p className="text-[10px] uppercase font-bold text-slate-500">
                                {p.membership?.role || '-'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {p.isApproved ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium border border-emerald-100">
                              <CheckCircle className="w-3 h-3" /> 승인됨
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium border border-amber-100">
                              <Filter className="w-3 h-3" /> 대기중
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-slate-500 text-xs font-medium">
                          {new Date(p.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            {/* 활동 로그 상세 보기 버튼 */}
                            <button
                              onClick={() => handleViewUserLogs(p)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                              title="사용자 활동 내역 조회"
                            >
                              <History className="w-4 h-4" />
                            </button>

                            <div className="h-4 w-px bg-slate-200 mx-1"></div>

                            {/* 권한 관리 / 승인 버튼 */}
                            <button
                              onClick={() => {
                                setSelectedProfile(p);
                                setShowOrgModal(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                              title="조직 및 권한 편집"
                            >
                              <Settings className="w-4 h-4" />
                            </button>
                            {!p.isApproved ? (
                              <button
                                onClick={() => handleApproval(p.id, true)}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                title="승인"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleApproval(p.id, false)}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                title="승인 취소"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-dashed p-20 flex flex-col items-center justify-center">
                <Search className="w-12 h-12 text-slate-200 mb-4" />
                <p className="text-slate-500 font-medium">조건에 맞는 회원이 없습니다.</p>
              </div>
            )}
          </div>
        )}

        {/* 전체 시스템 로그 (Audit) 탭 */}
        {activeTab === 'logs' && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <div className="bg-white p-4 rounded-xl border shadow-sm flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800">최근 시스템 활동 감사(Audit)</h3>
                <p className="text-sm text-slate-500">플랫폼 내 일어나는 제안서 열람, 다운로드 등의 주요 활동을 모니터링합니다.</p>
              </div>
              <button onClick={loadAllLogs} className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors">
                <Activity className="w-4 h-4" />
                전체 새로고침
              </button>
            </div>

            {logsLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              </div>
            ) : allLogs.length > 0 ? (
              <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                <div className="h-[600px] overflow-y-auto">
                  <table className="w-full text-left border-collapse text-sm">
                    <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                      <tr>
                        <th className="px-6 py-3 font-medium text-slate-600">유형</th>
                        <th className="px-6 py-3 font-medium text-slate-600">발생 일시</th>
                        <th className="px-6 py-3 font-medium text-slate-600">사용자</th>
                        <th className="px-6 py-3 font-medium text-slate-600">관련 문서 (제안서)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {allLogs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-50">
                          <td className="px-6 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold ${
                              log.action_type === 'DOWNLOAD' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                            }`}>
                              {log.action_type === 'DOWNLOAD' ? <Download className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                              {log.action_type}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-slate-600">
                            {new Date(log.created_at).toLocaleString()}
                          </td>
                          <td className="px-6 py-3 font-medium text-slate-800">
                            {log.user_email || '알 수 없음'}
                          </td>
                          <td className="px-6 py-3 text-slate-600 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-slate-400" />
                            {log.proposals?.title || '알 수 없는 문서'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-dashed p-20 flex flex-col items-center justify-center">
                <AlertCircle className="w-12 h-12 text-slate-200 mb-4" />
                <p className="text-slate-500 font-medium">활동 내역이 아직 없습니다.</p>
              </div>
            )}
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
