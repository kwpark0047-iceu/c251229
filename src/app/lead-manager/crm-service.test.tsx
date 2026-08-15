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

// Supabase 클라이언트 모킹 (createMockBuilder 활용)
const createMockBuilder = (data: any = [], count: number | null = 1, error: any = null) => {
  const result = { data, count, error };
  const builder: any = {
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: Array.isArray(data) ? data[0] : data, error }),
    delete: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    // Thenable interface for await
    then: (onfulfilled?: ((value: any) => any) | null, onrejected?: ((reason: any) => any) | null) => {
      return Promise.resolve(result).then(onfulfilled, onrejected);
    }
  };

  builder.select.mockReturnValue(builder);
  builder.order.mockReturnValue(builder);
  builder.eq.mockReturnValue(builder);
  builder.not.mockReturnValue(builder);
  builder.neq.mockReturnValue(builder);
  builder.gte.mockReturnValue(builder);
  builder.lte.mockReturnValue(builder);
  builder.is.mockReturnValue(builder);
  builder.limit.mockReturnValue(builder);
  builder.delete.mockReturnValue(builder);
  builder.update.mockReturnValue(builder);
  builder.insert.mockReturnValue(builder);
  builder.upsert.mockReturnValue(builder);
  builder.in.mockReturnValue(builder);
  builder.range.mockReturnValue(builder);

  return builder;
};

let currentMockBuilder = createMockBuilder(mockCallLogs, mockCallLogs.length);

const mockSupabaseClient = {
  from: vi.fn(() => currentMockBuilder),
};

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

vi.mock('@/lib/supabase/utils', () => ({
  getSupabase: vi.fn(() => mockSupabaseClient),
}));

vi.mock('./auth-service', () => ({
  getOrganizationId: vi.fn(() => Promise.resolve('org-1')),
  logActivity: vi.fn(() => Promise.resolve()),
}));

describe('CRM 서비스', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentMockBuilder = createMockBuilder(mockCallLogs, mockCallLogs.length);
  });

  describe('통화 기록 관리', () => {
    it('리드별 통화 기록을 조회할 수 있다', async () => {
      currentMockBuilder = createMockBuilder(mockCallLogs, mockCallLogs.length);
      const { getCallLogs } = await import('./crm-service');
      const logs = await getCallLogs('lead-1');

      expect(logs).toHaveLength(1);
      expect(logs[0].leadId).toBe('lead-1');
      expect(logs[0].outcome).toBe('INTERESTED');
    }, 60000);

    it('새로운 통화 기록을 추가할 수 있다', async () => {
      currentMockBuilder = createMockBuilder([mockCallLogs[0]], 1);
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
      currentMockBuilder = createMockBuilder(mockProgressItems, mockProgressItems.length);
      const { getProgressBatch } = await import('./crm-service');
      const progressMap = await getProgressBatch(['lead-1']);

      const lead1Progress = progressMap.get('lead-1');
      expect(lead1Progress).toBeDefined();
      expect(lead1Progress).toHaveLength(1);
      expect(lead1Progress![0].step).toBe('PROPOSAL_SENT');
    });

    it('진행단계를 완료 처리할 수 있다', async () => {
      currentMockBuilder = createMockBuilder([], 0);
      const { updateProgress } = await import('./crm-service');
      const result = await updateProgress('lead-1', 'PROPOSAL_SENT', '제안서 발송 완료');

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('sales_progress');
    });
  });

  describe('CRM 통계', () => {
    it('CRM 통계를 계산할 수 있다', async () => {
      currentMockBuilder = createMockBuilder([], 10);
      const { getCRMStats } = await import('./crm-service');
      const stats = await getCRMStats();

      expect(stats).toHaveProperty('totalCalls');
      expect(stats).toHaveProperty('callsByOutcome');
      expect(stats).toHaveProperty('progressCounts');
    });

    it('확장 통계: 파이프라인 단계별 금액과 매출 지표를 계산한다', async () => {
      const mockLeads = [
        { id: 'l1', category: 'HEALTH', status: 'NEW' },
        { id: 'l2', category: 'FOOD', status: 'CONTACTED' },
        { id: 'l3', category: 'ANIMAL', status: 'CONTRACTED' },
      ];
      const mockProposals = [
        { id: 'p1', status: 'SENT', final_price: 100000, created_at: '2026-06-10T00:00:00Z' },
        { id: 'p2', status: 'VIEWED', final_price: 200000, created_at: '2026-06-20T00:00:00Z' },
        { id: 'p3', status: 'ACCEPTED', final_price: 300000, created_at: '2026-07-01T00:00:00Z' },
        { id: 'p4', status: 'DRAFT', final_price: 50000, created_at: '2026-07-05T00:00:00Z' },
      ];
      mockSupabaseClient.from
        .mockReturnValueOnce(createMockBuilder(mockLeads, mockLeads.length))
        .mockReturnValueOnce(createMockBuilder(mockProposals, mockProposals.length));

      const { getExtendedCRMStats } = await import('./crm-service');
      const stats = await getExtendedCRMStats();

      expect(stats.totalMetrics.totalLeads).toBe(3);
      expect(stats.totalMetrics.closingRate).toBeCloseTo(33.33, 1);
      expect(stats.revenueMetrics.totalProposalAmount).toBe(650000);
      expect(stats.revenueMetrics.contractedAmount).toBe(300000);
      const sentFunnel = stats.funnelData.find(f => f.stage === '제안 발송');
      const contractedFunnel = stats.funnelData.find(f => f.stage === '계약 성사');
      expect(sentFunnel?.amount).toBe(600000);
      expect(contractedFunnel?.amount).toBe(300000);
    }, 60000);
  });
});
