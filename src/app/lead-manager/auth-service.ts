/**
 * 인증 관련 서비스
 * 사용자 정보, 조직 정보 조회
 */

import { createClient } from '@/lib/supabase/client'

export interface UserInfo {
  id: string
  email: string
  organizationId: string | null
  organizationName: string | null
  role: 'owner' | 'admin' | 'member' | null
  inviteCode: string | null
}

/**
 * 현재 로그인한 사용자 정보 조회
 */
export async function getCurrentUser(): Promise<UserInfo | null> {
  const supabase = createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return null
  }

  // 조직 정보 조회
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
    .single()

  // organizations는 단일 객체로 반환됨 (single() 사용 시)
  const orgData = memberData?.organizations as unknown
  const org = orgData as { id: string; name: string; invite_code: string } | null

  return {
    id: user.id,
    email: user.email || '',
    organizationId: org?.id || null,
    organizationName: org?.name || null,
    role: memberData?.role as UserInfo['role'] || null,
    inviteCode: org?.invite_code || null,
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
  const members = (data || []).map(m => ({
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
