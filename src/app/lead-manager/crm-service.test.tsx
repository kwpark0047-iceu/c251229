/**
 * CRM 서비스 레이어 테스트
 * 통화 기록, 영업 진행상황 관리 기능 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock 데이터
const mockCallLogs = [
  {
    id: '1',
    lead_id: 'lead-1',
    called_at: new Date().toISOString(),
    outcome: 'INTERESTED',
    duration_seconds: 300,
    notes: '초기 상담 완료',
    next_action: '제안서 발송',
    created_at: new Date().toISOString(),
  },
];

const mockProgressItems = [
  {
    id: '1',
    lead_id: 'lead-1',
    step: 'PROPOSAL_SENT',
    completed_at: new Date().toISOString(),
    notes: '초기 연락 완료',
    organization_id: 'org-1',
  },
];

// Supabase 클라이언트 모킹 보완
const mockSupabaseClient = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  range: vi.fn().mockReturnThis(),
  not: vi.fn().mockReturnThis(),
  gte: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  is: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  single: vi.fn().mockReturnThis(),
  // then 메서드를 통해 await 시 결과 반환
  then: vi.fn().mockImplementation((onfulfilled) => {
    return Promise.resolve({ data: mockCallLogs, count: mockCallLogs.length, error: null }).then(onfulfilled);
  }),
};

// 특정 시나리오를 위한 수동 해결 기능 (필요한 경우)
const setMockResponse = (data: any, count: number = 0, error: any = null) => {
  (mockSupabaseClient.then as any).mockImplementationOnce((onfulfilled: any) => {
    return Promise.resolve({ data, count, error }).then(onfulfilled);
  });
};

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

vi.mock('@/lib/supabase/utils', () => ({
  getSupabase: vi.fn(() => mockSupabaseClient),
}));

vi.mock('./auth-service', () => ({
  getOrganizationId: vi.fn(() => Promise.resolve('org-1')),
}));

describe('CRM 서비스', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('통화 기록 관리', () => {
    it('리드별 통화 기록을 조회할 수 있다', async () => {
      const { getCallLogs } = await import('./crm-service');
      const logs = await getCallLogs('lead-1');

      expect(logs).toHaveLength(1);
      expect(logs[0].leadId).toBe('lead-1');
      expect(logs[0].outcome).toBe('INTERESTED');
    });

    it('새로운 통화 기록을 추가할 수 있다', async () => {
      const { logCall } = await import('./crm-service');
      const result = await logCall('lead-3', 'INTERESTED', {
        durationSeconds: 450,
        notes: '추가 상담',
        nextAction: '재연락',
      });

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('call_logs');
    });
  });

  describe('영업 진행상황 관리', () => {
    it('리드별 진행상황을 조회할 수 있다', async () => {
      // 진행 상황 조회를 위한 특수 모킹
      setMockResponse(mockProgressItems);
      
      const { getProgressBatch } = await import('./crm-service');
      const progressMap = await getProgressBatch(['lead-1']);

      const lead1Progress = progressMap.get('lead-1');
      expect(lead1Progress).toBeDefined();
      expect(lead1Progress).toHaveLength(1);
      expect(lead1Progress![0].step).toBe('PROPOSAL_SENT');
    });

    it('진행단계를 완료 처리할 수 있다', async () => {
      const { updateProgress } = await import('./crm-service');
      const result = await updateProgress('lead-1', 'PROPOSAL_SENT', '제안서 발송 완료');

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('sales_progress');
    });
  });

  describe('CRM 통계', () => {
    it('CRM 통계를 계산할 수 있다', async () => {
      // 통계 조회를 위한 반복적인 카운트 응답 설정
      (mockSupabaseClient.then as any).mockImplementation((onfulfilled: any) => {
        return Promise.resolve({ count: 10, error: null }).then(onfulfilled);
      });
      
      const { getCRMStats } = await import('./crm-service');
      const stats = await getCRMStats();

      expect(stats).toHaveProperty('totalCalls');
      expect(stats).toHaveProperty('callsByOutcome');
      expect(stats).toHaveProperty('progressCounts');
    });
  });
});
