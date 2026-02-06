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
const createMockBuilder = (data: any = [], count: number | null = 1, error: any = null) => {
  const result = { data, count, error };
  const builder: any = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue(result),
    eq: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: Array.isArray(data) ? data[0] : data, error }),
    delete: vi.fn().mockReturnThis(),
    in: vi.fn().mockResolvedValue({ data: null, error: null }),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    // Thenable interface for await
    then: (onfulfilled?: ((value: any) => any) | null, onrejected?: ((reason: any) => any) | null) => {
      return Promise.resolve(result).then(onfulfilled, onrejected);
    }
  };

  // Circular reference for chaining
  builder.select.mockReturnValue(builder);
  builder.order.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.not.mockReturnValue(builder);
  builder.limit.mockReturnValue(builder);
  builder.delete.mockReturnValue(builder);
  builder.update.mockReturnValue(builder);

  return builder;
};

const defaultMockBuilder = createMockBuilder(mockLeadsData, 1, null);

const mockSupabaseClient = {
  from: vi.fn(() => defaultMockBuilder),
  auth: {
    getUser: vi.fn(() => Promise.resolve({ data: { user: { id: 'user-1', email: 'test@example.com' } }, error: null })),
  }
};

vi.mock('@/lib/supabase/utils', () => ({
  getSupabase: vi.fn(() => mockSupabaseClient),
}));

describe('Supabase 서비스 (supabase-service.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to default behavior
    mockSupabaseClient.from.mockReturnValue(defaultMockBuilder);
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
      const errorBuilder = createMockBuilder([], 0, { message: 'Database Connection Error', hint: '', details: '', code: '500' });
      mockSupabaseClient.from.mockReturnValue(errorBuilder);

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
      expect(mockSupabaseClient.from).toHaveBeenCalled();
    });
  });

  describe('deleteDuplicateLeadsFromDB', () => {
    it('중복 리드를 삭제할 수 있다', async () => {
      const mockAllLeads = [
        { id: '1', biz_name: '중복상점', road_address: '주소1', created_at: '2024-01-01' },
        { id: '2', biz_name: '중복상점', road_address: '주소1', created_at: '2024-01-02' },
      ];

      const builderWithData = createMockBuilder(mockAllLeads, null, null);
      mockSupabaseClient.from.mockReturnValueOnce(builderWithData);

      const { deleteDuplicateLeadsFromDB } = await import('./supabase-service');
      const result = await deleteDuplicateLeadsFromDB();

      expect(result.success).toBe(true);
      expect(result.removedCount).toBe(1);
    });
  });
});
