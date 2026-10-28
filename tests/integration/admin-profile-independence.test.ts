import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createClient } from '@/lib/supabase/client';
import { getCurrentUser } from '@/app/lead-manager/auth-service';
vi.mock('@/lib/supabase/client', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/supabase/session-cleanup', () => ({ resetSupabaseBrowserSession: vi.fn() }));

function setup(superAdmin: boolean, status = 'ACTIVE', profileError = false) {
  const profile = { is_super_admin: superAdmin, is_approved: false, account_status: status, tier: 'FREE', trial_expires_at: null };
  vi.mocked(createClient).mockReturnValue({
    auth: { getUser: async () => ({ data: { user: { id: 'synthetic', email: 'synthetic@example.com', user_metadata: { is_super_admin: true } } }, error: null }) },
    from: (table: string) => {
      const query = { select: () => query, eq: () => query, order: () => query, limit: () => query,
        maybeSingle: async () => table === 'profiles'
          ? { data: profileError ? null : profile, error: profileError ? { code: '42501' } : null }
          : { data: null, error: { code: '42703' } } };
      return query;
    },
  } as unknown as ReturnType<typeof createClient>);
}
beforeEach(() => vi.clearAllMocks());
describe('최고관리자 프로필과 조직 조회 분리', () => {
  it('조직 조회가 실패해도 DB에서 확인한 ACTIVE 최고관리자 프로필을 유지한다', async () => {
    setup(true);
    const user = await getCurrentUser();
    expect(user?.isSuperAdmin).toBe(true);
    expect(user?.isApproved).toBe(true);
    expect(user?.organizationId).toBeNull();
    expect(user?.role).toBeNull();
    expect(user?.permissions.can_export).toBe(false);
  });
  it('일반 회원은 조직 조회 실패를 권한 허용으로 바꾸지 않는다', async () => {
    setup(false);
    expect(await getCurrentUser()).toBeNull();
  });
  it('프로필을 확인하지 못하면 metadata의 관리자 주장을 신뢰하지 않는다', async () => {
    setup(true, 'ACTIVE', true);
    expect(await getCurrentUser()).toBeNull();
  });
  it.each(['SUSPENDED', 'ARCHIVED', 'PENDING'])('%s 상태는 최고관리자라도 승인하지 않는다', async status => {
    setup(true, status);
    const user = await getCurrentUser();
    expect(user?.isApproved ?? false).toBe(false);
    expect(user?.isSuperAdmin ?? false).toBe(false);
  });
});
