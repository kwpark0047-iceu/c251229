'use client';

import React, { useState, useEffect } from 'react';
import {
  Users, Shield, CheckCircle, XCircle, Building,
  ChevronRight, Search, Filter, MoreHorizontal,
  Mail, Settings, UserPlus, Trash2, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { PendingBadge } from './PendingBadge';
import MemberActionDialog, { type MemberAction } from './MemberActionDialog';
import { getRoleLabel } from './admin-labels';
import {
  getAllProfiles,
  updateProfileStatus,
  updateUserOrganization,
  getAllOrganizations
} from '../../auth-service';

interface Profile {
  id: string;
  email: string;
  fullName: string | null;
  isApproved: boolean;
  isSuperAdmin: boolean;
  tier: string | null;
  trialExpiresAt: string | null;
  createdAt: string;
  membership: {
    role: string;
    organizationId: string;
    organizationName: string;
  } | null;
}

export default function UserManagementView() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'APPROVED' | 'PENDING'>('ALL');
  const [tierFilter, setTierFilter] = useState<string>('ALL');
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [memberAction, setMemberAction] = useState<MemberAction | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const count = profiles.filter(p => !p.isApproved).length;
    setPendingCount(count);
  }, [profiles]);

  const handleApproval = (userId: string, isApproved: boolean) => {
    const profile = profiles.find(p => p.id === userId);
    if (profile) setMemberAction({ id: userId, email: profile.email, action: isApproved ? 'approve' : 'revoke' });
  };

  const handleTierChange = async (userId: string, tier: string) => {
    const result = await updateProfileStatus(userId, { tier });
    if (result.success) {
      toast.success('사용자 등급이 변경되었습니다.');
      loadData();
    } else {
      toast.error(result.message);
    }
  };

  const handleOrgUpdate = async (userId: string, orgId: string | null, role: any) => {
    const result = await updateUserOrganization(userId, orgId, role);
    if (result.success) {
      toast.success('조직 정보가 저장되었습니다.');
      setShowOrgModal(false);
      loadData();
    } else {
      toast.error(result.message);
    }
  };

  const filteredProfiles = profiles.filter(p => {
    // 최고관리자 본인은 목록에서 제외 (요청 사항: kwpark0047@gmail.com 이외)
    if (p.isSuperAdmin) return false;

    const matchesSearch = p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (p.fullName || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' ||
                         (statusFilter === 'APPROVED' && p.isApproved) ||
                         (statusFilter === 'PENDING' && !p.isApproved);
    const matchesTier = tierFilter === 'ALL' || p.tier === tierFilter;

    return matchesSearch && matchesStatus && matchesTier;
  });

  const getTierBadge = (tier: string | null) => {
    const tierConfig: Record<string, { label: string; class: string }> = {
      'FREE': { label: '일반', class: 'bg-slate-100 text-slate-700 border-slate-200' },
      'DEMO': { label: '체험', class: 'bg-blue-50 text-blue-700 border-blue-100' },
      'MEDIA': { label: '매체사', class: 'bg-purple-50 text-purple-700 border-purple-100' },
      'SALES': { label: '영업', class: 'bg-amber-50 text-amber-700 border-amber-100' },
    };
    const config = tierConfig[tier || ''] || { label: '미지정', class: 'bg-gray-100 text-gray-700 border-gray-200' };
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${config.class}`}>
        {config.label}
      </span>
    );
  };

  return (
    <><div className="flex flex-col h-full bg-slate-50">
      {loadError && <p role="alert" className="rounded-lg border border-rose-400 p-4 text-rose-600">{loadError}</p>}
      {/* 헤더 */}
      <div className="bg-white border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            전체 사용자 관리
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            시스템 이용 승인 및 조직/권한을 관리합니다. (슈퍼 어드민 전용)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              id="user-search"
              name="userSearch"
              type="text"
              placeholder="이메일, 이름 검색..."
              className="pl-9 pr-4 py-2 border rounded-lg text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'APPROVED' | 'PENDING')}
            className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">승인 상태 (전체)</option>
            <option value="APPROVED">승인 완료</option>
            <option value="PENDING">승인 대기</option>
          </select>
          <select
            value={tierFilter}
            onChange={(e) => setTierFilter(e.target.value as 'ALL' | 'FREE' | 'DEMO' | 'MEDIA' | 'SALES')}
            className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ALL">등급 필터 (전체)</option>
            <option value="FREE">일반</option>
            <option value="DEMO">체험</option>
            <option value="MEDIA">매체사</option>
            <option value="SALES">영업</option>
          </select>
          <div className="flex items-center gap-2">
            <PendingBadge count={pendingCount} />
            <button
              onClick={loadData}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1.5 border"
              title="데이터 새로고침"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="text-xs font-medium">새로고침</span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredProfiles.length > 0 ? (
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b text-slate-600 text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-4">사용자 정보</th>
                  <th className="px-6 py-4">서비스 등급</th>
                  <th className="px-6 py-4">소속 조직 / 역할</th>
                  <th className="px-6 py-4">승인 상태</th>
                  <th className="px-6 py-4">가입일시</th>
                  <th className="px-6 py-4">권한 제어</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {filteredProfiles.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                          {(p.fullName || p.email)[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900">{p.fullName || '이름 없음'}</p>
                          <p className="text-xs text-slate-500">{p.email}</p>
                        </div>
                        {p.isSuperAdmin && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-bold">최고관리자</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1.5">
                        {getTierBadge(p.tier)}
                        <select
                          title="사용자 서비스 등급 변경"
                          className="text-xs border-none bg-slate-100 rounded px-1 py-0.5 outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                          value={p.tier || ''}
                          onChange={(e) => handleTierChange(p.id, e.target.value)}
                        >
                          <option value="FREE">일반으로 변경</option>
                          <option value="" disabled>미지정</option>
                          <option value="DEMO">체험으로 변경</option>
                          <option value="MEDIA">매체사로 변경</option>
                          <option value="SALES">영업으로 변경</option>
                        </select>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-slate-900 font-medium">
                          {p.membership?.organizationName || '소속 없음'}
                        </span>
                        <span className="text-xs text-slate-400 uppercase font-bold">
                          {getRoleLabel(p.membership?.role)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {p.isApproved ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium border border-emerald-100">
                          <CheckCircle className="w-3 h-3" />
                          승인 완료
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-medium border border-amber-100">
                          <Filter className="w-3 h-3" />
                          승인 대기
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-500 whitespace-nowrap text-xs">
                      {new Date(p.createdAt).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {!p.isApproved ? (
                          <button
                            onClick={() => handleApproval(p.id, true)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="승인하기"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleApproval(p.id, false)}
                            className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors"
                            title="승인 취소"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedProfile(p);
                            setShowOrgModal(true);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="조직 및 역할 수정"
                        >
                          <Building className="w-4 h-4" />
                        </button>
                        <button onClick={() => setMemberAction({ id: p.id, email: p.email, action: 'delete' })}
                          title="회원 계정 삭제" className="rounded-lg p-1.5 text-rose-600 hover:bg-rose-50"><Trash2 className="w-4 h-4" /></button>
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
            <p className="text-slate-500 font-medium">검색된 사용자가 없습니다.</p>
          </div>
        )}
      </div>

      {/* 조직 및 역할 관리 모달 */}
      {showOrgModal && selectedProfile && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Building className="w-5 h-5 text-indigo-600" />
                조직 및 역할 수정
              </h3>
              <p className="text-sm text-slate-500 mt-1">{selectedProfile.email} 사용자의 소속을 변경합니다.</p>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleOrgUpdate(
                selectedProfile.id,
                formData.get('orgId') as string || null,
                formData.get('role') as any
              );
            }}>
              <div className="p-6 space-y-4 text-sm text-slate-700">
                <div className="space-y-1.5">
                  <label htmlFor="edit-org-id" className="font-semibold block">소속 조직</label>
                  <select
                    id="edit-org-id"
                    title="소속 조직 수정"
                    name="orgId"
                    className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                    defaultValue={selectedProfile.membership?.organizationId || ''}
                  >
                    <option value="">소속 없음</option>
                    {orgs.map(org => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="edit-role" className="font-semibold block">역할</label>
                  <select
                    id="edit-role"
                    title="멤버 역할 수정"
                    name="role"
                    className="w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                    defaultValue={selectedProfile.membership?.role || 'member'}
                  >
                    <option value="member">일반 회원</option>
                    <option value="admin">관리자</option>
                    <option value="owner">조직 소유자</option>
                  </select>
                </div>
              </div>
              <div className="p-6 bg-slate-50 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowOrgModal(false)}
                  className="flex-1 px-4 py-2 border rounded-xl hover:bg-white transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
                >
                  저장하기
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    {memberAction && <MemberActionDialog key={memberAction.id + memberAction.action} target={memberAction} onClose={() => setMemberAction(null)}
      onComplete={async message => { if (!await loadData()) throw new Error('목록 갱신 실패'); toast.success(message); }} />}
    </>
  );

  async function loadData() {
    setLoading(true);
    setLoadError('');
    try {
      const result = await getAllProfiles();
      if (!result.success) throw new Error('회원 목록을 불러오지 못했습니다. 권한과 연결 상태를 확인해주세요.');
      setProfiles(result.profiles);
      const orgs = await getAllOrganizations();
      setOrgs(orgs);
      return true;
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : '회원 정보를 불러오지 못했습니다.');
      console.error('사용자 데이터 로드 실패:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }
}
