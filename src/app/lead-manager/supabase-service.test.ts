/**
 * Supabase 서비스 레이어 테스트 (Refactored)
 * 실제 DB 연결 없이 모의 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LeadStatus } from './types';

// Mock 데이터
const mockLeadsData = [
  {
    id: '1',
    biz_name: '테스트 상점',
    road_address: '서울시 강남구 테헤란로 123',
    status: 'NEW',
    category: 'FOOD',
    created_at: new Date().toISOString(),
  },
];

// Supabase 클라이언트 모킹
const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      order: vi.fn(() => ({
        range: vi.fn(() => Promise.resolve({ data: mockLeadsData, count: 1, error: null })),
      })),
      count: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ count: 1, error: null })),
        not: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      not: vi.fn(() => Promise.resolve({ data: [], error: null })),
    })),
    insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
    update: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    delete: vi.fn(() => ({
      in: vi.fn(() => Promise.resolve({ data: null, error: null })),
    })),
    auth: {
      getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'user-1', email: 'test@example.com' } }, error: null })),
    }
  })),
};

vi.mock('@/lib/supabase/utils', () => ({
  getSupabase: vi.fn(() => mockSupabaseClient),
}));

describe('Supabase 서비스 (supabase-service.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getLeads', () => {
    it('필터 없이 리드 목록을 조회할 수 있다', async () => {
      const { getLeads } = await import('./supabase-service');
      const result = await getLeads();

      expect(result.success).toBe(true);
      expect(result.leads).toHaveLength(1);
      expect(result.leads[0].bizName).toBe('테스트 상점');
    });

    it('DB 에러 발생 시 실패 정보를 반환한다', async () => {
      // @ts-ignore
      mockSupabaseClient.from().select().order().range.mockResolvedValueOnce({
        data: null,
        count: 0,
        error: { message: 'Database Connection Error' },
      });

      const { getLeads } = await import('./supabase-service');
      const result = await getLeads();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Database Connection Error');
    });
  });

  describe('updateLeadStatus', () => {
    it('리드 상태를 업데이트할 수 있다', async () => {
      const { updateLeadStatus } = await import('./supabase-service');
      const result = await updateLeadStatus('1', 'CONTACTED');

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.from().update).toHaveBeenCalled();
    });
  });

  describe('deleteDuplicateLeadsFromDB', () => {
    it('중복 리드를 삭제할 수 있다', async () => {
      const mockAllLeads = [
        { id: '1', biz_name: '중복상점', road_address: '주소1', created_at: '2024-01-01' },
        { id: '2', biz_name: '중복상점', road_address: '주소1', created_at: '2024-01-02' },
      ];

      // @ts-ignore
      mockSupabaseClient.from().select().order.mockResolvedValueOnce({
        data: mockAllLeads,
        error: null,
      });

      const { deleteDuplicateLeadsFromDB } = await import('./supabase-service');
      const result = await deleteDuplicateLeadsFromDB();

      expect(result.success).toBe(true);
      expect(result.removedCount).toBe(1);
      expect(mockSupabaseClient.from().delete).toHaveBeenCalled();
    });
  });
});
