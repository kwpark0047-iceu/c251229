/**
 * CRM 서비스 레이어 테스트
 * 통화 기록, 영업 진행상황 관리 기능 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock 데이터
const mockCallLogs = [
  {
    id: '1',
    leadId: 'lead-1',
    calledAt: new Date().toISOString(),
    outcome: 'INTERESTED',
    durationSeconds: 300,
    notes: '초기 상담 완료',
    nextAction: '제안서 발송',
    createdAt: new Date().toISOString(),
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

// Supabase 클라이언트 모킹
const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(() => ({
          data: mockCallLogs,
          error: null,
        })),
        single: vi.fn(() => ({
          data: mockCallLogs[0],
          error: null,
        })),
      })),
      in: vi.fn(() => ({
        data: mockProgressItems,
        error: null,
      })),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => ({
          data: mockCallLogs[0],
          error: null,
        })),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        data: mockCallLogs[0],
        error: null,
      })),
    })),
    upsert: vi.fn(() => ({
      error: null,
    })),
  })),
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
      const { getCRMStats } = await import('./crm-service');
      const stats = await getCRMStats();

      expect(stats).toHaveProperty('totalCalls');
      expect(stats).toHaveProperty('callsByOutcome');
      expect(stats).toHaveProperty('progressCounts');
    });
  });
});
