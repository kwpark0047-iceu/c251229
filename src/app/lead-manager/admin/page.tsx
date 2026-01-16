'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
    getCurrentUser,
    getOrganizationMembers,
    updateMemberPermissions,
    updateMemberRole,
    UserInfo,
    UserPermissions
} from '../auth-service';
import RoleGuard from '@/components/RoleGuard';

interface ActivityLog {
    id: string;
    user_email: string;
    action_type: string;
    details: any;
    created_at: string;
}

interface MemberWithPermissions {
    id: string;
    email: string;
    role: string;
    createdAt: string;
    permissions?: UserPermissions;
}

export default function AdminDashboardPage() {
    const router = useRouter();
    const [currentUser, setCurrentUser] = useState<UserInfo | null>(null);
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [members, setMembers] = useState<MemberWithPermissions[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [systemStatus, setSystemStatus] = useState<'healthy' | 'issue'>('healthy');

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        setIsLoading(true);
        try {
            const user = await getCurrentUser();
            setCurrentUser(user);

            if (!user || !user.organizationId) return;

            const supabase = createClient();

            // 1. Load Logs
            const { data: logData } = await supabase
                .from('activity_logs')
                .select('*')
                .eq('organization_id', user.organizationId)
                .order('created_at', { ascending: false })
                .limit(50);
            setLogs(logData as ActivityLog[] || []);

            // 2. Load Members (with permissions)
            const { data: memberData } = await supabase
                .from('organization_members')
                .select('id, user_id, role, created_at, permissions')
                .eq('organization_id', user.organizationId);

            // Map member data (need to resolve emails separately or join profiles in real app)
            // For now, we assume user_id is the key or we fetch profiles. 
            // Simplified: Just showing ID/Role/Permissions
            setMembers((memberData || []).map((m: any) => ({
                id: m.id,
                email: m.user_id, // In a real app, join with profiles table
                role: m.role,
                createdAt: m.created_at,
                permissions: m.permissions || { can_export: true, can_delete_lead: false, can_view_sensitive: false }
            })));

            // 3. System Check (Simulated)
            // Check DB connection success by virtue of previous queries succeeded
            setSystemStatus('healthy');

        } catch (error) {
            console.error('Failed to load dashboard:', error);
            setSystemStatus('issue');
        } finally {
            setIsLoading(false);
        }
    };

    const handeTogglePermission = async (memberId: string, permission: keyof UserPermissions, currentValue: boolean) => {
        try {
            const updates = { [permission]: !currentValue };
            const result = await updateMemberPermissions(memberId, updates);

            if (result.success) {
                // Update local state
                setMembers(prev => prev.map(m =>
                    m.id === memberId
                        ? { ...m, permissions: { ...m.permissions!, ...updates } }
                        : m
                ));
            } else {
                alert('권한 수정 실패: ' + result.message);
            }
        } catch (e) {
            alert('오류 발생');
        }
    };

    const handleRoleChange = async (memberId: string, currentRole: string) => {
        const newRole = currentRole === 'admin' ? 'member' : 'admin';
        if (!confirm(`정말 사용자 역할을 ${newRole}(으)로 변경하시겠습니까?`)) return;

        const result = await updateMemberRole(memberId, newRole);
        if (result.success) {
            setMembers(prev => prev.map(m => m.id === memberId ? { ...m, role: newRole } : m));
        } else {
            alert('역할 변경 실패: ' + result.message);
        }
    };

    return (
        <RoleGuard allowedRoles={['owner', 'admin']}>
            <div className="min-h-screen bg-slate-50 p-4 md:p-8">
                <header className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">관리자 대시보드</h1>
                        <p className="text-slate-600">시스템 현황 및 사용자 권한 관리</p>
                    </div>
                    <button
                        onClick={() => router.back()}
                        className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50"
                    >
                        돌아가기
                    </button>
                </header>

                {/* System Health */}
                <section className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className={`p-6 rounded-xl border ${systemStatus === 'healthy' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                        <h3 className="font-semibold text-lg mb-2">시스템 상태</h3>
                        <div className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full ${systemStatus === 'healthy' ? 'bg-green-500' : 'bg-red-500'}`} />
                            <span className={systemStatus === 'healthy' ? 'text-green-700' : 'text-red-700'}>
                                {systemStatus === 'healthy' ? '정상 작동 중' : '문제 발생'}
                            </span>
                        </div>
                    </div>

                    <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="font-semibold text-lg text-slate-800 mb-2">총 사용자</h3>
                        <p className="text-3xl font-bold text-blue-600">{members.length}명</p>
                    </div>

                    <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="font-semibold text-lg text-slate-800 mb-2">오늘 활동 로그</h3>
                        <p className="text-3xl font-bold text-slate-600">
                            {logs.filter(l => new Date(l.created_at).toDateString() === new Date().toDateString()).length}건
                        </p>
                    </div>
                </section>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* User Management */}
                    <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                        <h2 className="text-xl font-bold text-slate-800 mb-4">사용자 관리</h2>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 text-slate-500 text-sm">
                                        <th className="pb-3 font-medium">사용자 (ID)</th>
                                        <th className="pb-3 font-medium">역할</th>
                                        <th className="pb-3 font-medium">기능 제한 (On/Off)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {members.map(member => (
                                        <tr key={member.id} className="text-sm">
                                            <td className="py-3 text-slate-700 font-mono text-xs" title={member.id}>
                                                {member.id.substring(0, 8)}...
                                            </td>
                                            <td className="py-3">
                                                <button
                                                    onClick={() => handleRoleChange(member.id, member.role)}
                                                    className={`px-2 py-1 rounded text-xs font-semibold ${member.role === 'admin' || member.role === 'owner'
                                                            ? 'bg-purple-100 text-purple-700'
                                                            : 'bg-slate-100 text-slate-600'
                                                        }`}
                                                >
                                                    {member.role.toUpperCase()}
                                                </button>
                                            </td>
                                            <td className="py-3 space-y-2">
                                                {member.role !== 'owner' && (
                                                    <>
                                                        <div className="flex items-center justify-between gap-4">
                                                            <span className="text-slate-600">엑셀 다운로드</span>
                                                            <Toggle
                                                                checked={member.permissions?.can_export ?? true}
                                                                onChange={() => handeTogglePermission(member.id, 'can_export', member.permissions?.can_export ?? true)}
                                                            />
                                                        </div>
                                                        <div className="flex items-center justify-between gap-4">
                                                            <span className="text-slate-600">리드 삭제</span>
                                                            <Toggle
                                                                checked={member.permissions?.can_delete_lead ?? false}
                                                                onChange={() => handeTogglePermission(member.id, 'can_delete_lead', member.permissions?.can_delete_lead ?? false)}
                                                            />
                                                        </div>
                                                        {/* Add more toggles as needed */}
                                                    </>
                                                )}
                                                {member.role === 'owner' && <span className="text-xs text-slate-400">모든 권한 보유</span>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Activity Feed */}
                    <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 overflow-hidden flex flex-col max-h-[600px]">
                        <h2 className="text-xl font-bold text-slate-800 mb-4">활동 로그 (최근 50건)</h2>
                        <div className="overflow-y-auto flex-1 space-y-4 pr-2">
                            {logs.length === 0 ? (
                                <p className="text-center text-slate-500 py-8">기록된 활동이 없습니다.</p>
                            ) : (
                                logs.map(log => (
                                    <div key={log.id} className="flex gap-3 items-start p-3 bg-slate-50 rounded-lg">
                                        <div className="mt-1 min-w-[6px] h-[6px] rounded-full bg-blue-500" />
                                        <div>
                                            <p className="text-sm font-semibold text-slate-800">
                                                {log.action_type}
                                            </p>
                                            <p className="text-xs text-slate-500 mb-1">
                                                {new Date(log.created_at).toLocaleString()} - {log.user_email}
                                            </p>
                                            {log.details && Object.keys(log.details).length > 0 && (
                                                <pre className="text-[10px] text-slate-500 bg-slate-100 p-1 rounded overflow-x-auto">
                                                    {JSON.stringify(log.details, null, 2)}
                                                </pre>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </RoleGuard>
    );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
    return (
        <button
            onClick={onChange}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${checked ? 'bg-blue-600' : 'bg-slate-200'
                }`}
        >
            <span
                className={`${checked ? 'translate-x-5' : 'translate-x-1'
                    } inline-block h-3 w-3 transform rounded-full bg-white transition-transform`}
            />
        </button>
    );
}
