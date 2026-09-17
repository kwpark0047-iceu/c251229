import { describe, it, expect, vi, beforeEach } from 'vitest';
const DEFAULT_PERMISSIONS = { can_export: true, can_delete_lead: false, can_view_sensitive: false };

// --- Mocks -----------------------------------------------------------------

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/supabase/session-cleanup', () => ({
  resetSupabaseBrowserSession: vi.fn(),
}));

vi.mock('../../lib/email-service', () => ({
  sendEmail: vi.fn(),
}));

import { createClient } from '@/lib/supabase/client';
import { resetSupabaseBrowserSession } from '@/lib/supabase/session-cleanup';
import {
  getCurrentUser,
  getOrganizationId,
  signOut,
  getOrganizationMembers,
  updateMemberRole,
  removeMember,
  regenerateInviteCode,
  getUserRole,
  logActivity,
  updateMemberPermissions,
  checkPermission,
} from './auth-service';

// --- Helper: mock Supabase query builder -----------------------------------

interface BuilderOptions<T> {
  data: T[];
  count?: number | null;
  error?: unknown;
}

const createMockBuilder = <T = any>(options: BuilderOptions<T>) => {
  const { data, count = 1, error = null } = options;
  const result = { data, count, error };

  const builder: any = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue({
      data: Array.isArray(data) ? data[0] : data,
      error,
    }),
    maybeSingle: vi.fn().mockResolvedValue({
      data: Array.isArray(data) ? data[0] : data,
      error,
    }),
    in: vi.fn().mockResolvedValue({ data: null, error: null }),
    insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: (onfulfilled?: any, onrejected?: any) =>
      Promise.resolve(result).then(onfulfilled, onrejected),
  };

  builder.select.mockReturnValue(builder);
  builder.order.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.not.mockReturnValue(builder);
  builder.neq.mockReturnValue(builder);
  builder.or.mockReturnValue(builder);
  builder.limit.mockReturnValue(builder);
  builder.update.mockReturnValue(builder);
  builder.delete.mockReturnValue(builder);

  return builder;
};

// --- Fixtures ---------------------------------------------------------------

const SUPER_ADMIN_EMAIL = 'kwpark0047@gmail.com';

const memberRow = (overrides: Record<string, unknown> = {}) => ({
  role: 'member',
  organization_id: 'org-1',
  organizations: {
    id: 'org-1',
    name: '테스트 조직',
    invite_code: 'abc123',
  },
  ...overrides,
});

const profileRow = (overrides: Record<string, unknown> = {}) => ({
  is_approved: true,
  is_super_admin: false,
  tier: 'FREE',
  trial_expires_at: null,
  ...overrides,
});

const defaultUser = {
  id: 'user-1',
  email: 'user@example.com',
  user_metadata: {},
};

/** Configure supabase auth.getUser() + the two getCurrentUser queries. */
const mockGetCurrentUserFlow = ({
  user = defaultUser,
  authError = null,
  memberData = memberRow(),
  memberError = null,
  profileData = profileRow(),
  profileError = null,
}: {
  user?: Record<string, unknown> | null;
  authError?: unknown;
  memberData?: Record<string, unknown> | null;
  memberError?: unknown;
  profileData?: Record<string, unknown> | null;
  profileError?: unknown;
} = {}) => {
  const mockAuth = {
    getUser: vi.fn().mockResolvedValue({
      data: { user: user ?? null },
      error: authError,
    }),
  };
  const mockFrom = vi.fn().mockImplementation((table: string) => {
    if (table === 'organization_members') {
      return createMockBuilder({
        data: memberData ? [memberData] : [],
        error: memberError,
      });
    }
    if (table === 'profiles') {
      return createMockBuilder({
        data: profileData ? [profileData] : [],
        error: profileError,
      });
    }
    return createMockBuilder({ data: [] });
  });

  (createClient as any).mockReturnValue({ from: mockFrom, auth: mockAuth });
  return { mockAuth, mockFrom };
};

beforeEach(() => {
  vi.clearAllMocks();
});

// --- getCurrentUser ----------------------------------------------------------

describe('getCurrentUser', () => {
  it('returns null when auth.getUser() fails', async () => {
    mockGetCurrentUserFlow({ authError: new Error('No session') });
    expect(await getCurrentUser()).toBeNull();
  });

  it('returns null when there is no user', async () => {
    mockGetCurrentUserFlow({ user: null });
    expect(await getCurrentUser()).toBeNull();
  });

  it('returns full user info on success', async () => {
    mockGetCurrentUserFlow();
    const user = await getCurrentUser();

    expect(user).not.toBeNull();
    expect(user!.id).toBe('user-1');
    expect(user!.email).toBe('user@example.com');
    expect(user!.organizationId).toBe('org-1');
    expect(user!.organizationName).toBe('테스트 조직');
    expect(user!.role).toBe('member');
    expect(user!.inviteCode).toBe('abc123');
    expect(user!.permissions).toEqual({ ...DEFAULT_PERMISSIONS });
    expect(user!.isApproved).toBe(true);
    expect(user!.isSuperAdmin).toBe(false);
    expect(user!.tier).toBe('FREE');
    expect(user!.trialExpiresAt).toBeNull();
  });

  it('maps owner role and nested organization data', async () => {
    mockGetCurrentUserFlow({
      memberData: memberRow({
        role: 'owner',
        organizations: { id: 'org-2', name: '대표 조직', invite_code: 'xyz789' },
      }),
    });
    const user = await getCurrentUser();

    expect(user!.role).toBe('owner');
    expect(user!.organizationId).toBe('org-2');
    expect(user!.organizationName).toBe('대표 조직');
    expect(user!.inviteCode).toBe('xyz789');
  });

  it('returns organizationId null when user has no membership', async () => {
    mockGetCurrentUserFlow({ memberData: null });
    const user = await getCurrentUser();

    expect(user!.role).toBeNull();
    expect(user!.organizationId).toBeNull();
    expect(user!.organizationName).toBeNull();
    expect(user!.inviteCode).toBeNull();
  });

  it('isApproved falls back to user_metadata tier when no profile row exists', async () => {
    mockGetCurrentUserFlow({
      profileData: null,
      user: {
        ...defaultUser,
        user_metadata: { tier: 'SALES' },
      },
    });
    const user = await getCurrentUser();
    expect(user!.isApproved).toBe(true);
    expect(user!.tier).toBe('SALES');
  });

  it('isApproved is false when profile is not approved, even with a tier', async () => {
    mockGetCurrentUserFlow({
      profileData: profileRow({ is_approved: false, tier: 'MEDIA' }),
    });
    const user = await getCurrentUser();
    expect(user!.isApproved).toBe(false);
    expect(user!.tier).toBe('MEDIA');
  });

  it('flags the fixed super admin email', async () => {
    mockGetCurrentUserFlow({ user: { ...defaultUser, email: SUPER_ADMIN_EMAIL } });
    const user = await getCurrentUser();
    expect(user!.isSuperAdmin).toBe(true);
  });

  it('returns null and warns when profile/org queries fail', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockGetCurrentUserFlow({
      memberError: new Error('boom'),
    });
    expect(await getCurrentUser()).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

// --- getOrganizationId --------------------------------------------------------

describe('getOrganizationId', () => {
  it('returns the organizationId of the current user', async () => {
    mockGetCurrentUserFlow();
    expect(await getOrganizationId()).toBe('org-1');
  });

  it('returns null when the current user has no organization', async () => {
    mockGetCurrentUserFlow({ user: null });
    expect(await getOrganizationId()).toBeNull();
  });
});

// --- signOut -----------------------------------------------------------------

describe('signOut', () => {
  it('clears the browser session and returns success', async () => {
    mockGetCurrentUserFlow();
    (resetSupabaseBrowserSession as any).mockResolvedValue(undefined);

    const result = await signOut();
    expect(resetSupabaseBrowserSession).toHaveBeenCalled();
    expect(result).toEqual({ success: true, message: '로그아웃되었습니다.' });
  });

  it('returns failure when session cleanup throws', async () => {
    mockGetCurrentUserFlow();
    (resetSupabaseBrowserSession as any).mockRejectedValue(new Error('nope'));

    const result = await signOut();
    expect(result).toEqual({
      success: false,
      message: 'nope',
    });
  });

  it('returns failure with default message for non-Error throws', async () => {
    mockGetCurrentUserFlow();
    (resetSupabaseBrowserSession as any).mockRejectedValue('string error');

    const result = await signOut();
    expect(result).toEqual({
      success: false,
      message: '로그아웃 중 오류가 발생했습니다.',
    });
  });
});

// --- getOrganizationMembers ----------------------------------------------------

describe('getOrganizationMembers', () => {
  it('lists members with email placeholder = user_id', async () => {
    const builder = createMockBuilder({
      data: [
        { id: 'm1', role: 'admin', created_at: '2025-01-01', user_id: 'u1' },
        { id: 'm2', role: 'member', created_at: '2025-01-02', user_id: 'u2' },
      ],
    });
    const mockFrom = vi.fn().mockReturnValue(builder);
    (createClient as any).mockReturnValue({ from: mockFrom, auth: {} });

    const result = await getOrganizationMembers('org-1');

    expect(mockFrom).toHaveBeenCalledWith('organization_members');
    expect(builder.eq).toHaveBeenCalledWith('organization_id', 'org-1');
    expect(result).toEqual({
      success: true,
      members: [
        { id: 'm1', email: 'u1', role: 'admin', createdAt: '2025-01-01' },
        { id: 'm2', email: 'u2', role: 'member', createdAt: '2025-01-02' },
      ],
    });
  });

  it('returns empty members on query error without message', async () => {
    const builder = createMockBuilder({ data: [], error: new Error('db down') });
    const mockFrom = vi.fn().mockReturnValue(builder);
    (createClient as any).mockReturnValue({ from: mockFrom, auth: {} });

    const result = await getOrganizationMembers('org-1');
    expect(result).toEqual({ success: false, members: [] });
  });

  it('handles null data as empty list', async () => {
    const builder = createMockBuilder({ data: [] });
    const mockFrom = vi.fn().mockReturnValue(builder);
    (createClient as any).mockReturnValue({ from: mockFrom, auth: {} });

    const result = await getOrganizationMembers('org-1');
    expect(result).toEqual({ success: true, members: [] });
  });
});

// --- updateMemberRole ----------------------------------------------------------

describe('updateMemberRole', () => {
  it('updates the role and returns success', async () => {
    const builder = createMockBuilder({ data: [] });
    const mockFrom = vi.fn().mockReturnValue(builder);
    (createClient as any).mockReturnValue({ from: mockFrom, auth: {} });

    const result = await updateMemberRole('m1', 'admin');

    expect(mockFrom).toHaveBeenCalledWith('organization_members');
    expect(builder.update).toHaveBeenCalledWith({ role: 'admin' });
    expect(builder.eq).toHaveBeenCalledWith('id', 'm1');
    expect(result).toEqual({ success: true, message: '역할이 변경되었습니다.' });
  });

  it('returns failure with error message on query error', async () => {
    const builder = createMockBuilder({ data: [], error: new Error('fk violated') });
    const mockFrom = vi.fn().mockReturnValue(builder);
    (createClient as any).mockReturnValue({ from: mockFrom, auth: {} });

    const result = await updateMemberRole('m1', 'admin');
    expect(result).toEqual({ success: false, message: 'fk violated' });
  });
});

// --- removeMember ---------------------------------------------------------------

describe('removeMember', () => {
  it('deletes the member and returns success', async () => {
    const builder = createMockBuilder({ data: [] });
    const mockFrom = vi.fn().mockReturnValue(builder);
    (createClient as any).mockReturnValue({ from: mockFrom, auth: {} });

    const result = await removeMember('m1');

    expect(mockFrom).toHaveBeenCalledWith('organization_members');
    expect(builder.delete).toHaveBeenCalled();
    expect(builder.eq).toHaveBeenCalledWith('id', 'm1');
    expect(result).toEqual({ success: true, message: '멤버가 제거되었습니다.' });
  });

  it('returns failure with error message on query error', async () => {
    const builder = createMockBuilder({ data: [], error: new Error('no row') });
    const mockFrom = vi.fn().mockReturnValue(builder);
    (createClient as any).mockReturnValue({ from: mockFrom, auth: {} });

    const result = await removeMember('m1');
    expect(result).toEqual({ success: false, message: 'no row' });
  });
});

// --- regenerateInviteCode ----------------------------------------------------------

describe('regenerateInviteCode', () => {
  it('generates a 12-char hex code from 6 random bytes and updates the org', async () => {
    const getRandomValuesSpy = vi
      .spyOn(crypto, 'getRandomValues')
      .mockImplementation((arr: any) => {
        arr.set([0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc]);
        return arr;
      });

    const builder = createMockBuilder({ data: [] });
    const mockFrom = vi.fn().mockReturnValue(builder);
    (createClient as any).mockReturnValue({ from: mockFrom, auth: {} });

    const result = await regenerateInviteCode('org-1');

    expect(mockFrom).toHaveBeenCalledWith('organizations');
    expect(builder.update).toHaveBeenCalledWith({ invite_code: '123456789abc' });
    expect(builder.eq).toHaveBeenCalledWith('id', 'org-1');
    expect(result).toEqual({
      success: true,
      inviteCode: '123456789abc',
      message: '초대 코드가 재생성되었습니다.',
    });

    getRandomValuesSpy.mockRestore();
  });

  it('returns failure with error message on query error', async () => {
    const getRandomValuesSpy = vi
      .spyOn(crypto, 'getRandomValues')
      .mockImplementation((arr: any) => {
        arr.set([0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc]);
        return arr;
      });

    const builder = createMockBuilder({ data: [], error: new Error('locked') });
    const mockFrom = vi.fn().mockReturnValue(builder);
    (createClient as any).mockReturnValue({ from: mockFrom, auth: {} });

    const result = await regenerateInviteCode('org-1');
    expect(result).toEqual({ success: false, message: 'locked' });

    getRandomValuesSpy.mockRestore();
  });
});

// --- getUserRole -------------------------------------------------------------------

describe('getUserRole', () => {
  it('returns the current user role', async () => {
    mockGetCurrentUserFlow();
    expect(await getUserRole()).toBe('member');
  });

  it('returns null when there is no user', async () => {
    mockGetCurrentUserFlow({ user: null });
    expect(await getUserRole()).toBeNull();
  });
});

// --- logActivity ---------------------------------------------------------------------

describe('logActivity', () => {
  it('inserts into activity_logs with client context in jsdom', async () => {
    const builder = createMockBuilder({ data: [memberRow()] });
    const mockFrom = vi.fn().mockReturnValue(builder);
    (createClient as any).mockReturnValue({ from: mockFrom, auth: { getUser: vi.fn().mockResolvedValue({ data: { user: defaultUser }, error: null }) } });

        await logActivity('LEAD_UPDATE', { note: 'hello' }, 'lead-9');

    expect(mockFrom).toHaveBeenCalledWith('activity_logs');
    const insertArg = builder.insert.mock.calls[0][0];
    expect(insertArg.user_id).toBe(defaultUser.id);
    expect(insertArg.user_email).toBe('user@example.com');
    expect(insertArg.organization_id).toBe('org-1');
    expect(insertArg.action_type).toBe('LEAD_UPDATE');
    expect(insertArg.entity_id).toBe('lead-9');
    expect(insertArg.details.note).toBe('hello');
    // jsdom has a window, so context is an object with URL and userAgent
    expect(insertArg.details.client_context).toMatchObject({
      url: expect.any(String),
      userAgent: expect.any(String),
    });
  });

  it('does not throw when insert fails; logs the error', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const builder = createMockBuilder({ data: [memberRow()] });
    vi.spyOn(builder, 'insert').mockRejectedValue(new Error('insert failed'));
    const mockFrom = vi.fn().mockReturnValue(builder);
    (createClient as any).mockReturnValue({ from: mockFrom, auth: { getUser: vi.fn().mockResolvedValue({ data: { user: defaultUser }, error: null }) } });

    await expect(logActivity('LEAD_UPDATE', {}, 'lead-9')).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});

// --- updateMemberPermissions ------------------------------------------------------------

describe('updateMemberPermissions', () => {
  it('rejects non-owner/admin users', async () => {
    mockGetCurrentUserFlow({ memberData: memberRow({ role: 'member' }) });
    const result = await updateMemberPermissions('m1', { can_export: true });
    expect(result).toEqual({ success: false, message: '권한이 없습니다.' });
  });

  it('merges permissions and updates the member row', async () => {
    mockGetCurrentUserFlow({ memberData: memberRow({ role: 'owner' }) });

    const memberBuilder = createMockBuilder({
      data: [{ role: 'owner', permissions: { can_export: false, can_delete_lead: true } }],
    });
    const mockFrom = vi.fn().mockImplementation((table: string) => {
      if (table === 'organization_members' && memberBuilder.single.mock.calls.length > 0 && memberBuilder.update.mock.calls.length === 0) {
        // first call (single) -> member lookup; second usage is update chain
      }
      return memberBuilder;
    });
	mockFrom.mockClear();
	(createClient as any).mockReturnValue({ from: mockFrom, auth: { getUser: vi.fn().mockResolvedValue({ data: { user: defaultUser }, error: null }) } });

    const result = await updateMemberPermissions('m1', { can_view_sensitive: true });

    expect(mockFrom).toHaveBeenCalledWith('organization_members');
    expect(result).toEqual({ success: true, message: '권한이 업데이트되었습니다.' });

    const updateCalls = memberBuilder.update.mock.calls;
    expect(updateCalls.length).toBeGreaterThan(0);
    // merged: existing + new
    expect(updateCalls[0][0]).toEqual({
      permissions: {
        can_export: false,
        can_delete_lead: true,
        can_view_sensitive: true,
      },
    });
    expect(memberBuilder.eq).toHaveBeenCalledWith('id', 'm1');
  });
});

// --- checkPermission -----------------------------------------------------------------------

describe('checkPermission', () => {
  it('returns false when there is no user', async () => {
    mockGetCurrentUserFlow({ user: null });
    expect(await checkPermission('can_export')).toBe(false);
  });

  it('returns true for owner', async () => {
    mockGetCurrentUserFlow({ user: defaultUser, memberData: memberRow({ role: 'owner' }) });
    expect(await checkPermission('can_delete_lead')).toBe(true);
  });

  it('returns true for admin regardless of permission map', async () => {
    mockGetCurrentUserFlow({
      user: defaultUser,
      memberData: memberRow({
        role: 'admin',
        permissions: { can_delete_lead: false },
      }),
    });
    expect(await checkPermission('can_delete_lead')).toBe(true);
  });

  it('delegates to permissions map for regular members', async () => {
    mockGetCurrentUserFlow({
      user: defaultUser,
      memberData: memberRow({
        role: 'member',
        permissions: { can_export: true, can_delete_lead: false },
      }),
    });
    expect(await checkPermission('can_export')).toBe(true);
    expect(await checkPermission('can_delete_lead')).toBe(false);
  });
});