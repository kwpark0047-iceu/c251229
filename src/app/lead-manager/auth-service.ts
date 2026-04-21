/**
 * 인증 관련 서비스
 * 사용자 정보, 조직 정보 조회
 */

import { createClient } from '@/lib/supabase/client'
export interface UserInfo {
  id: string;
  email: string;
  organizationId: string | null;
  organizationName: string | null;
  role: 'owner' | 'admin' | 'member' | null;
  inviteCode: string | null;
  permissions: UserPermissions;
  isApproved: boolean;
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

  // 조직 정보 조회 (멤버십이 없을 수 있으므로 maybeSingle 사용)
  const { data: memberData } = await supabase
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
    .maybeSingle()

  // organizations는 단일 객체로 반환됨 (single() 사용 시)
  const orgData = memberData?.organizations as unknown
  const org = orgData as { id: string; name: string; invite_code: string } | null

  // 프로필 정보 조회 (승인 여부, 슈퍼 어드민 여부, 등급 정보)
  let profile: any = null;
  try {
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('is_approved, is_super_admin, tier, trial_expires_at')
      .eq('id', user.id)
      .maybeSingle()
    
    if (!profileError) {
      profile = profileData;
    }
  } catch (e) {
    console.warn('Profiles table not found or inaccessible, using fallback roles.');
  }

  // kwpark0047@gmail.com 하드코딩 백업 (DB에 반영 전 보안용)
  const isSuperAdminAccount = user.email === 'kwpark0047@gmail.com'

  return {
    id: user.id,
    email: user.email || '',
    organizationId: org?.id || null,
    organizationName: org?.name || null,
    role: memberData?.role as UserInfo['role'] || null,
    inviteCode: org?.invite_code || null,
    permissions: { ...DEFAULT_PERMISSIONS, ...((memberData as any)?.permissions || {}) },
    isApproved: 
      user.email === 'kwpark0047@gmail.com' || 
      (profile ? 
        (profile.is_approved && (!profile.trial_expires_at || new Date(profile.trial_expires_at) > new Date())) :
        (['FREE', 'DEMO', 'MEDIA', 'SALES'].includes(user.user_metadata?.tier || ''))
      ),
    isSuperAdmin: !!(profile?.is_super_admin || isSuperAdminAccount),
    tier: (profile?.tier as UserInfo['tier']) || (user.user_metadata?.tier as UserInfo['tier']) || (isSuperAdminAccount ? 'MEDIA' : null),
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

  const { error } = await supabase.auth.signOut()

  if (error) {
    return { success: false, message: error.message }
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
export async function updateProfileStatus(
  userId: string,
  updates: { isApproved?: boolean; isSuperAdmin?: boolean; tier?: string }
): Promise<{ success: boolean; message: string }> {
  const supabase = createClient();
  const currentUser = await getCurrentUser();

  if (!currentUser?.isSuperAdmin) {
    return { success: false, message: '권한이 없습니다.' };
  }

  const payload: any = {};
  if (updates.isApproved !== undefined) payload.is_approved = updates.isApproved;
  if (updates.isSuperAdmin !== undefined) payload.is_super_admin = updates.isSuperAdmin;
  if (updates.tier !== undefined) payload.tier = updates.tier;
  payload.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from('profiles')
    .update(payload)
    .eq('id', userId);

  if (error) return { success: false, message: error.message };
  return { success: true, message: '상태가 업데이트되었습니다.' };
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

  // 1. 기존 멤버십 삭제
  await supabase
    .from('organization_members')
    .delete()
    .eq('user_id', userId);

  // 2. 새 조직이 지정된 경우 추가
  if (organizationId) {
    const { error } = await supabase
      .from('organization_members')
      .insert({
        user_id: userId,
        organization_id: organizationId,
        role: role
      });

    if (error) return { success: false, message: error.message };
  }

  return { success: true, message: '조직 정보가 업데이트되었습니다.' };
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
export async function updateUserTier(userId: string, targetEmail: string, tier: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('profiles')
      .update({ 
        tier,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) throw error;

    // 활동 로그 기록
    await logActivity('ADMIN_TIER_CHANGE', {
      target_user_id: userId,
      target_email: targetEmail,
      new_tier: tier,
      message: `관리자가 ${targetEmail}의 티어를 ${tier}(으)로 변경했습니다.`
    });

    return { success: true };
  } catch (err: any) {
    console.error('Tier update failed:', err);
    return { success: false, error: err.message };
  }
}

// ----------------------------------------------------------------------------
// SUPER ADMIN: 활동 로그(Audit Log) 및 통계 관련 로직 추가
// ----------------------------------------------------------------------------

export async function getAllUserLogs(limit = 100) {
  try {
    const supabase = createClient();
    const currentUser = await getCurrentUser();
    
    if (!currentUser?.isSuperAdmin) {
      return { success: false, message: '권한이 없습니다.', logs: [] };
    }

    // 통합 활동 로그(activity_logs) 조회
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

export async function getUserLogs(userId: string, limit = 50) {
  try {
    const supabase = createClient();
    const currentUser = await getCurrentUser();
    
    if (!currentUser?.isSuperAdmin) {
      return { success: false, message: '권한이 없습니다.', logs: [] };
    }

    // 특정 사용자의 통합 활동 로그 조회
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
 * [슈퍼 어드민 전용] 사용자 프로필 영구 삭제
 * @param userId - 삭제할 사용자의 ID
 */
export async function deleteUserProfile(userId: string): Promise<{ success: boolean; message: string }> {
  const supabase = createClient();
  const currentUser = await getCurrentUser();

  if (!currentUser?.isSuperAdmin) {
    return { success: false, message: '권한이 없습니다.' };
  }

  // 본인 계정 삭제 방지
  if (currentUser.id === userId) {
    return { success: false, message: '자신의 계정은 삭제할 수 없습니다.' };
  }

  const { error } = await supabase
    .from('profiles')
    .delete()
    .eq('id', userId);

  if (error) {
    console.error('Failed to delete profile:', error);
    return { success: false, message: error.message };
  }

  return { success: true, message: '사용자 프로필이 성공적으로 삭제되었습니다.' };
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
 * [슈퍼 어드민 전용] 알림 읽음 처리
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
 * [슈퍼 어드민 전용] 모든 알림 읽음 처리
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

