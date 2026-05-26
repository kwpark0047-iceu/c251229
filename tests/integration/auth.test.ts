import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCurrentUser, getOrganizationId, signOut } from '../../src/app/lead-manager/auth-service';
import { createClient } from '@/lib/supabase/client';

// Mock Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn()
}));

// Mock Session Cleanup
vi.mock('@/lib/supabase/session-cleanup', () => ({
  resetSupabaseBrowserSession: vi.fn()
}));

describe('Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getCurrentUser', () => {
    it('returns null if there is no user or auth error', async () => {
      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: new Error('Auth Error') })
        }
      };
      (createClient as any).mockReturnValue(mockSupabase);

      const user = await getCurrentUser();
      expect(user).toBeNull();
    });

    it('returns user info correctly when data exists', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { tier: 'FREE' }
      };

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null })
        },
        from: vi.fn().mockImplementation((table) => {
          if (table === 'organization_members') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  role: 'member',
                  organization_id: 'org-1',
                  organizations: { id: 'org-1', name: 'Test Org', invite_code: 'abc' }
                }
              })
            };
          }
          if (table === 'profiles') {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  is_approved: true,
                  is_super_admin: false,
                  tier: 'FREE',
                  trial_expires_at: null
                }
              })
            };
          }
          return { select: vi.fn().mockReturnThis() };
        })
      };

      (createClient as any).mockReturnValue(mockSupabase);

      const user = await getCurrentUser();
      expect(user).not.toBeNull();
      expect(user?.id).toBe('user-123');
      expect(user?.email).toBe('test@example.com');
      expect(user?.organizationId).toBe('org-1');
      expect(user?.organizationName).toBe('Test Org');
      expect(user?.role).toBe('member');
      expect(user?.isApproved).toBe(true);
    });
  });

  describe('getOrganizationId', () => {
    it('returns organizationId from current user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        user_metadata: { tier: 'FREE' }
      };

      const mockSupabase = {
        auth: {
          getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null })
        },
        from: vi.fn().mockImplementation(() => ({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              organization_id: 'org-123',
              organizations: { id: 'org-123' }
            }
          })
        }))
      };

      (createClient as any).mockReturnValue(mockSupabase);

      const orgId = await getOrganizationId();
      expect(orgId).toBe('org-123');
    });
  });

  describe('signOut', () => {
    it('returns success on successful sign out', async () => {
      (createClient as any).mockReturnValue({});
      
      const result = await signOut();
      expect(result.success).toBe(true);
      expect(result.message).toBe('로그아웃되었습니다.');
    });
  });
});
