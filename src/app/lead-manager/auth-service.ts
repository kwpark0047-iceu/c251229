/**
 * 인증 관련 서비스
 * 사용자 정보, 조직 정보 조회
 */

import { createClient } from '@/lib/supabase/client'
import { resetSupabaseBrowserSession } from '@/lib/supabase/session-cleanup'
import { getAccountStatus, isAccountBlocked, type AccountStatus } from '@/lib/account-state'

export interface UserInfo {
  id: string;
  email: string;
  organizationId: string | null;
  organizationName: string | null;
  role: 'owner' | 'admin' | 'member' | null;
  inviteCode: string | null;
  permissions: UserPermissions;
  isApproved: boolean;
  accountStatus?: AccountStatus;
  isSuperAdmin: boolean;
  tier: 'FREE' | 'DEMO' | 'MEDIA' | 'SALES' | null;
  trialExpiresAt: string | null;
}

export interface UserPermissions {
  can_export: boolean;
  can_delete_lead: boolean;
  can_view_sensitive: boolean;
  [key: string]: boolean;
}

const DEFAULT_PERMISSIONS: UserPermissions = {
  can_export: true,
  can_delete_lead: false,
  can_view_sensitive: false,
};

/**
 * 현재 로그인한 사용자 정보 조회
 */
export async function getCurrentUser(): Promise<UserInfo | null> {
  const supabase = createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return null
  }

  // 타임아웃 처리를 위한 헬퍼 (3초 내 응답 없으면 중단)
  const timeoutPromise = (ms: number) => new Promise((_, reject) => setTimeout(() => reject(new Error('Auth Query Timeout')), ms));

  let memberData: any = null;
  let profile: any = null;

  try {
    const authData: any = await Promise.race([
      (async () => {
        // 조직 정보 조회
        const { data: member, error: memberError } = await supabase
          .from('organization_members')
          .select(`
            role,
            organization_id,
            organizations (
              id,
              name,
              invite_code
            )
          `)
.eq('user_id', user.id)
            .eq('is_active', true)
            .order('role', { ascending: false })
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();
            if (memberError) {
              console.warn('[Auth] Organization member retrieval failed:', memberError);
              return null;
            }
        
        // 프로필 정보 조회
        const { data: prof, error: profError } = await supabase
          .from('profiles')
.select('is_approved, is_super_admin, tier, trial_expires_at, account_status')
            .eq('id', user.id)
            .maybeSingle();
            if (profError) {
              console.warn('[Auth] Profile retrieval failed:', profError);
              return null;
            }
          
        return { member, prof };
      })(),
      timeoutPromise(3000)
    ]);
    
    if (!authData) return null;
    memberData = authData?.member;
    profile = authData?.prof;
  } catch (e) {
    console.warn('[Auth] Profile/Org retrieval timed out or failed:', e);
  }

  if (!profile) return null;
  const accountStatus = getAccountStatus({ accountStatus: profile.account_status, isApproved: profile.is_approved });
  const blocked = isAccountBlocked(accountStatus);
  const org = (blocked ? null : memberData?.organizations) as { id: string; name: string; invite_code: string } | null
  const isSuperAdminAccount = profile?.is_super_admin === true;

  return {
    id: user.id,
    email: user.email || '',
    organizationId: org?.id || null,
    organizationName: org?.name || null,
    role: blocked ? null : memberData?.role as UserInfo['role'] || null,
    inviteCode: org?.invite_code || null,
    permissions: blocked ? { can_export: false, can_delete_lead: false, can_view_sensitive: false }
      : { ...DEFAULT_PERMISSIONS, ...((memberData as any)?.permissions || {}) },
    accountStatus,
    isApproved: !blocked && (isSuperAdminAccount || Boolean(profile.is_approved &&
      (!profile.trial_expires_at || new Date(profile.trial_expires_at) > new Date()))),
    isSuperAdmin: !blocked && !!(profile?.is_super_admin || isSuperAdminAccount),
    tier: (profile?.tier as UserInfo['tier']) || null,
    trialExpiresAt: profile?.trial_expires_at || null,
  }
}

/**
 * 현재 사용자의 조직 ID 조회
 */
export async function getOrganizationId(): Promise<string | null> {
  const user = await getCurrentUser()
  return user?.organizationId || null
}

/**
 * 로그아웃
 */
export async function signOut(): Promise<{ success: boolean; message: string }> {
  const supabase = createClient()

  try {
    await resetSupabaseBrowserSession(supabase)
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : '로그아웃 중 오류가 발생했습니다.',
    }
  }

  return { success: true, message: '로그아웃되었습니다.' }
}

/**
 * 조직 멤버 목록 조회
 */
export async function getOrganizationMembers(organizationId: string): Promise<{
  success: boolean
  members: { id: string; email: string; role: string; createdAt: string }[]
}> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('organization_members')
    .select(`
      id,
      role,
      created_at,
      user_id
    `)
    .eq('organization_id', organizationId)
    .eq('is_active', true)

  if (error) {
    return { success: false, members: [] }
  }

  // 사용자 이메일은 auth.users에서 직접 조회 불가하므로,
  // 실제 구현 시 별도 profiles 테이블 필요
  const members = (data || []).map((m: any) => ({
    id: m.id,
    email: m.user_id, // 실제로는 프로필 테이블에서 조회
    role: m.role,
    createdAt: m.created_at,
  }))

  return { success: true, members }
}

/**
 * 멤버 역할 변경 (owner, admin만 가능)
 */
export async function updateMemberRole(
  memberId: string,
  newRole: 'admin' | 'member'
): Promise<{ success: boolean; message: string }> {
  const supabase = createClient()

  const { error } = await supabase
    .from('organization_members')
    .update({ role: newRole })
    .eq('id', memberId)

  if (error) {
    return { success: false, message: error.message }
  }

  return { success: true, message: '역할이 변경되었습니다.' }
}

/**
 * 멤버 제거 (owner, admin만 가능)
 */
export async function removeMember(memberId: string): Promise<{ success: boolean; message: string }> {
  const supabase = createClient()

  const { error } = await supabase
    .from('organization_members')
    .delete()
    .eq('id', memberId)

  if (error) {
    return { success: false, message: error.message }
  }

  return { success: true, message: '멤버가 제거되었습니다.' }
}

/**
 * 조직 초대 코드 재생성 (owner만 가능)
 */
export async function regenerateInviteCode(organizationId: string): Promise<{
  success: boolean
  inviteCode?: string
  message: string
}> {
  const supabase = createClient()

  // 새 초대 코드 생성 (12자 16진수)
  const newCode = Array.from(crypto.getRandomValues(new Uint8Array(6)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  const { error } = await supabase
    .from('organizations')
    .update({ invite_code: newCode })
    .eq('id', organizationId)

  if (error) {
    return { success: false, message: error.message }
  }

  return { success: true, inviteCode: newCode, message: '초대 코드가 재생성되었습니다.' }
}

/**
 * 현재 사용자의 역할 조회
 */
export async function getUserRole(): Promise<UserInfo['role'] | null> {
  const user = await getCurrentUser()
  return user?.role || null
}

/**
 * 활동 로그 기록
 */
export async function logActivity(
  actionType: string,
  details?: Record<string, any>,
  entityId?: string
): Promise<void> {
  try {
    const user = await getCurrentUser();
    if (!user) return; // 사용자 정보가 없으면 기록 건너뜀

    const supabase = createClient();
    
    // 기본 클라이언트 메타데이터 보강
    const enrichedDetails = {
      ...details,
      client_context: typeof window !== 'undefined' ? {
        userAgent: window.navigator.userAgent,
        url: window.location.href,
        timestamp: new Date().toISOString()
      } : 'server'
    };

    await supabase.from('activity_logs').insert({
      user_id: user.id,
      user_email: user.email,
      organization_id: user.organizationId, // 조직이 없어도 기록 (null 가능)
      action_type: actionType,
      entity_id: entityId,
      details: enrichedDetails,
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

/**
 * 멤버 권한 업데이트 (owner, admin만 가능)
 */
export async function updateMemberPermissions(
  memberId: string,
  permissions: Partial<UserPermissions>
): Promise<{ success: boolean; message: string }> {
  const supabase = createClient();
  const currentUser = await getCurrentUser();

  if (!currentUser || (currentUser.role !== 'owner' && currentUser.role !== 'admin')) {
    return { success: false, message: '권한이 없습니다.' };
  }

  // 기존 권한 조회
  const { data: memberData } = await supabase
    .from('organization_members')
    .select('permissions')
    .eq('id', memberId)
    .single();

  const currentPermissions = (memberData?.permissions as UserPermissions) || DEFAULT_PERMISSIONS;
  const newPermissions = { ...currentPermissions, ...permissions };

  const { error } = await supabase
    .from('organization_members')
    .update({ permissions: newPermissions })
    .eq('id', memberId);

  if (error) {
    return { success: false, message: error.message };
  }

  return { success: true, message: '권한이 업데이트되었습니다.' };
}

/**
 * 권한 확인 헬퍼
 */
export async function checkPermission(permission: keyof UserPermissions): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  // Owner와 Admin은 모든 권한을 가짐 (또는 명시적 권한 체크를 원하면 이 조건 제거)
  if (user.role === 'owner' || user.role === 'admin') return true;

  return !!user.permissions[permission];
}

/**
 * [슈퍼 어드민 전용] 전체 사용자 프로필 목록 조회
 */
export async function getAllProfiles(): Promise<{
  success: boolean;
  profiles: any[];
}> {
  const supabase = createClient();
  const user = await getCurrentUser();

  if (!user?.isSuperAdmin) {
    return { success: false, profiles: [] };
  }

  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      email,
      full_name,
      is_approved,
      account_status,
      archived_at,
      archived_reason,
      is_super_admin,
      tier,
      trial_expires_at,
      created_at,
      organization_members (
        role,
        organization_id,
        organizations (
          id,
          name
        )
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to fetch profiles:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
    return { success: false, profiles: [] };
  }

  console.log(`[SuperAdmin] Successfully fetched ${data?.length || 0} profiles.`);

  // 데이터 평탄화 (멤버 정보가 여러 개일 수 있으나 보통 1개)
  const expandedProfiles = (data || []).map((p: any) => ({
    id: p.id,
    email: p.email,
    fullName: p.full_name,
    isApproved: p.is_approved,
    accountStatus: getAccountStatus({ accountStatus: p.account_status, isApproved: p.is_approved }),
    archivedAt: p.archived_at,
    archivedReason: p.archived_reason,
    isSuperAdmin: p.is_super_admin,
    createdAt: p.created_at,
    tier: p.tier,
    trialExpiresAt: p.trial_expires_at,
    membership: p.organization_members?.[0] ? {
      role: p.organization_members[0].role,
      organizationId: p.organization_members[0].organization_id,
      organizationName: p.organization_members[0].organizations?.name
    } : null
  }));

  return { success: true, profiles: expandedProfiles };
}

/**
 * [슈퍼 어드민 전용] 사용자 승인 및 권한 상태 업데이트
 */
export interface MemberActionResult {
  success: boolean;
  message: string;
  warnings?: string[];
}

async function requestMemberAction(userId: string, method: 'PATCH' | 'DELETE' | 'POST', body: object): Promise<MemberActionResult> {
  try {
    const response = await fetch('/api/admin/users/' + encodeURIComponent(userId), {
      method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const result = await response.json();
    return { success: response.ok && result?.success === true,
      message: typeof result?.message === 'string' ? result.message : '요청을 처리하지 못했습니다.',
      warnings: Array.isArray(result?.warnings) ? result.warnings.filter((value: unknown): value is string => typeof value === 'string' && value.trim().length > 0) : [] };
  } catch {
    return { success: false, message: '서버에 연결하지 못했습니다. 목록을 새로고침해 처리 결과를 확인해주세요.' };
  }
}

export async function updateProfileStatus(
  userId: string,
  updates: { isApproved?: boolean; isSuperAdmin?: boolean; tier?: string; restore?: boolean }
): Promise<MemberActionResult> {
  if (updates.isSuperAdmin !== undefined) return { success: false, message: '최고관리자 권한은 이 화면에서 변경할 수 없습니다.' };
  return requestMemberAction(userId, 'PATCH', updates);
}

/**
 * [슈퍼 어드민 전용] 사용자 조직 및 역할 강제 변경
 */
export async function updateUserOrganization(
  userId: string,
  organizationId: string | null,
  role: 'owner' | 'admin' | 'member' = 'member'
): Promise<{ success: boolean; message: string }> {
  const supabase = createClient();
  const currentUser = await getCurrentUser();

  if (!currentUser?.isSuperAdmin) {
    return { success: false, message: '권한이 없습니다.' };
  }

  // 1. 역할 값 검증
  if (!['owner', 'admin', 'member'].includes(role)) {
    return { success: false, message: '올바르지 않은 역할입니다.' };
  }

  // 2. 기존 멤버십 조회
  const { data: existingMembership, error: selectError } = await supabase
    .from('organization_members')
    .select('id, organization_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (selectError) {
    console.error('[auth-service] updateUserOrganization 멤버십 조회 실패:', selectError);
    return { success: false, message: selectError.message };
  }

  // 3. 소속 해제: 기존 멤버십 삭제만 수행
  if (!organizationId) {
    if (existingMembership) {
      const { error: deleteError } = await supabase
        .from('organization_members')
        .delete()
        .eq('user_id', userId);

      if (deleteError) {
        console.error('[auth-service] updateUserOrganization 멤버십 삭제 실패:', deleteError);
        return { success: false, message: deleteError.message };
      }
    }
    return { success: true, message: '조직 정보가 업데이트되었습니다.' };
  }

  // 4. 조직 지정: 기존 멤버십 UPDATE, 신규는 INSERT
  if (existingMembership) {
    const { error: updateError } = await supabase
      .from('organization_members')
      .update({ organization_id: organizationId, role, is_active: true })
      .eq('id', existingMembership.id);

    if (updateError) {
      console.error('[auth-service] updateUserOrganization 멤버십 변경 실패:', updateError);
      return { success: false, message: updateError.message };
    }
  } else {
    const { error: insertError } = await supabase
      .from('organization_members')
      .insert({
        user_id: userId,
        organization_id: organizationId,
        role: role
      });

    if (insertError) {
      console.error('[auth-service] updateUserOrganization 멤버십 추가 실패:', insertError);
      return { success: false, message: insertError.message };
    }
  }

  // 5. 조직 변경 이력 기록 (ROLE_CHANGE)
  const { data: emailData } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .single();
  const userEmail = emailData?.email ?? '';
  if (userEmail) {
    const { error: approvalError } = await supabase
      .from('approval_history')
      .insert({ user_id: userId, user_email: userEmail, action_type: 'ROLE_CHANGE', organization_id: organizationId });
    if (approvalError) {
      console.error('조직 변경 이력 기록 실패:', approvalError);
      return { success: false, message: '조직 변경 이력 기록에 실패했습니다.' };
    }
  }

  return { success: true, message: '조직 정보가 업데이트되었습니다.' };
}

/**
 * [슈퍼 어드민 전용] 조직 생성
 */
export async function createOrganization(name: string): Promise<{
  success: boolean;
  message: string;
  organizationId?: string;
}> {
  const supabase = createClient();
  const currentUser = await getCurrentUser();

  if (!currentUser?.isSuperAdmin) {
    return { success: false, message: '권한이 없습니다.' };
  }

  const trimmedName = name.trim();
  if (!trimmedName) {
    return { success: false, message: '조직 이름을 입력해 주세요.' };
  }
  if (trimmedName.length > 50) {
    return { success: false, message: '조직 이름은 50자 이하여야 합니다.' };
  }

  // 1. 조직 생성 (invite_code 생성 후 함께 저장 - DB 트리거와 동일한 방식)
  const inviteCode = Array.from(crypto.getRandomValues(new Uint8Array(6)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({ name: trimmedName, invite_code: inviteCode })
    .select('id, name, invite_code')
    .single();

  if (orgError || !org) {
    console.error('[auth-service] createOrganization 조직 생성 실패:', orgError);
    return { success: false, message: orgError?.message || '조직 생성에 실패했습니다.' };
  }

  // 2. 생성자를 owner 멤버십으로 추가 (RLS: 본인 멤버십 INSERT 허용)
  const { error: memberError } = await supabase
    .from('organization_members')
    .insert({
      organization_id: org.id,
      user_id: currentUser.id,
      role: 'owner'
    });

  if (memberError) {
    console.error('[auth-service] createOrganization 멤버십 추가 실패:', memberError);
    // 멤버십 추가 실패 시 생성된 조직 정리 시도 (실패해도 무방)
    await supabase.from('organizations').delete().eq('id', org.id);
    return { success: false, message: memberError.message };
  }

  return { success: true, message: '조직이 생성되었습니다.', organizationId: org.id };
}

/**
 * 전체 조직 목록 조회
 */
export async function getAllOrganizations(): Promise<any[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from('organizations')
    .select('id, name')
    .order('name');
  return data || [];
}

/**
 * 사용자의 서비스 티어 업데이트 (Super Admin 전용)
 */
export async function updateUserTier(userId: string, _targetEmail: string, tier: string): Promise<{ success: boolean; error?: string }> {
  const result = await updateProfileStatus(userId, { tier });
  return result.success ? { success: true } : { success: false, error: result.message };
}



export async function getAllUserLogs(limit = 100) {
  try {
    const supabase = createClient();
    const currentUser = await getCurrentUser();
    
    if (!currentUser?.isSuperAdmin) {
      return { success: false, message: '권한이 없습니다.', logs: [] };
    }

    const { data: logs, error } = await supabase
      .from('activity_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return { success: true, logs: logs || [] };
  } catch (error: any) {
    console.error('Error fetching all logs:', error);
    return { success: false, message: error.message, logs: [] };
  }
}

/**
 * 특정 사용자의 활동 로그 조회
 */
export async function getUserLogs(userId: string, limit = 50) {
  try {
    const supabase = createClient();
    const currentUser = await getCurrentUser();
    
    if (!currentUser?.isSuperAdmin) {
      return { success: false, message: '권한이 없습니다.', logs: [] };
    }

    const { data: logs, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return { success: true, logs: logs || [] };
  } catch (error: any) {
    console.error('Error fetching logs for user:', error);
    return { success: false, message: error.message, logs: [] };
  }
}

/**
 * [슈퍼 어드민 전용] 사용자 권한 차단 및 보관
 */
export async function deleteUserProfile(userId: string, confirmationEmail: string, archiveReason?: string): Promise<MemberActionResult> {
  return requestMemberAction(userId, 'DELETE', { confirmationEmail, ...(archiveReason ? { archiveReason } : {}) });
}

/**
 * [슈퍼 어드민 전용] 관리자 알림 목록 조회
 */
export async function getAdminNotifications(limit = 20): Promise<{
  success: boolean;
  notifications: any[];
}> {
  const supabase = createClient();
  const currentUser = await getCurrentUser();

  if (!currentUser?.isSuperAdmin) {
    return { success: false, notifications: [] };
  }

  const { data, error } = await supabase
    .from('admin_notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Failed to fetch notifications:', error);
    return { success: false, notifications: [] };
  }

  return { success: true, notifications: data || [] };
}

/**

 * [슈퍼 어드민 전용] 새로운 회원 가입 환영 이메일 발송
 */
export async function sendNewMemberWelcomeEmail(userId: string): Promise<{ success: boolean; message: string; data?: unknown }> {
  return requestMemberAction(userId, 'POST', {});
}

/**
 * [슈퍼 어드민 전용] 승인된 회원에게 환영 이메일 재전송
 */
 export async function sendWelcomeEmailResend(userId: string, _email: string): Promise<{ success: boolean; message: string; data?: unknown }> {
  return requestMemberAction(userId, 'POST', {});
}

/**
 * [슈퍼 어드민 전용] 새로운 회원 가입 알림 생성
 */
export async function createNewMemberNotification(userId: string, email: string, fullName: string): Promise<{ success: boolean; message: string }> {
  const supabase = createClient();
  const currentUser = await getCurrentUser();

  if (!currentUser?.isSuperAdmin) {
    return { success: false, message: '권한이 없습니다.' };
  }

  const { error } = await supabase
    .from('admin_notifications')
    .insert({
      user_id: userId,
      email: email,
      full_name: fullName,
      is_read: false,
      created_at: new Date().toISOString(),
      type: 'new_member_signup'
    });

  if (error) {
    console.error('[auth-service] 새 회원 가입 알림 생성 실패:', error);
    return { success: false, message: error.message };
  }

  return { success: true, message: '새 회원 가입 알림이 생성되었습니다.' };
}

/**
 * 알림 읽음 처리
 */
export async function markNotificationAsRead(notificationId: string): Promise<{ success: boolean }> {
  const supabase = createClient();
  const { error } = await supabase
    .from('admin_notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  if (error) return { success: false };
  return { success: true };
}

/**
 * 모든 알림 읽음 처리
 */
export async function markAllNotificationsAsRead(): Promise<{ success: boolean }> {
  const supabase = createClient();
  const currentUser = await getCurrentUser();
  if (!currentUser) return { success: false };

  const { error } = await supabase
    .from('admin_notifications')
    .update({ is_read: true })
    .eq('is_read', false);

  if (error) return { success: false };
  return { success: true };
}
