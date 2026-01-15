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
    userId: 'user-1',
    callType: 'INCOMING',
    duration: 300,
    summary: '초기 상담 완료',
    nextAction: '제안서 발송',
    createdAt: new Date().toISOString(),
    organizationId: 'org-1',
  },
  {
    id: '2',
    leadId: 'lead-2',
    userId: 'user-1',
    callType: 'OUTGOING',
    duration: 600,
    summary: '가격 협상 진행',
    nextAction: '계약서 발송',
    createdAt: new Date().toISOString(),
    organizationId: 'org-1',
  },
];

const mockProgressItems = [
  {
    id: '1',
    leadId: 'lead-1',
    step: 'INITIAL_CONTACT',
    status: 'COMPLETED',
    completedAt: new Date().toISOString(),
    notes: '초기 연락 완료',
    organizationId: 'org-1',
  },
  {
    id: '2',
    leadId: 'lead-1',
    step: 'PROPOSAL_SENT',
    status: 'PENDING',
    completedAt: null,
    notes: '제안서 발송 대기',
    organizationId: 'org-1',
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
  })),
};

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

describe('CRM 서비스', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('통화 기록 관리', () => {
    it('리드별 통화 기록을 조회할 수 있다', async () => {
      const { getCallLogs } = await import('./crm-service');
      const logs = await getCallLogs('lead-1', 'org-1');
      
      expect(logs).toHaveLength(1);
      expect(logs[0].leadId).toBe('lead-1');
      expect(logs[0].callType).toBe('INCOMING');
    });

    it('새로운 통화 기록을 추가할 수 있다', async () => {
      const newCallLog = {
        leadId: 'lead-3',
        userId: 'user-1',
        callType: 'OUTGOING',
        duration: 450,
        summary: '추가 상담',
        nextAction: '재연락',
        organizationId: 'org-1',
      };

      const { addCallLog } = await import('./crm-service');
      const result = await addCallLog(newCallLog);
      
      expect(result.success).toBe(true);
      expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith(newCallLog);
    });

    it('통화 기록을 수정할 수 있다', async () => {
      const updates = {
        summary: '수정된 요약',
        nextAction: '수정된 다음 단계',
      };

      const { updateCallLog } = await import('./crm-service');
      const result = await updateCallLog('1', updates);
      
      expect(result.success).toBe(true);
      expect(mockSupabaseClient.from().update).toHaveBeenCalledWith(
        expect.objectContaining(updates)
      );
    });
  });

  describe('영업 진행상황 관리', () => {
    it('리드별 진행상황을 조회할 수 있다', async () => {
      mockSupabaseClient.from().select().eq().order.mockResolvedValueOnce({
        data: mockProgressItems,
        error: null,
      });

      const { getProgressBatch } = await import('./crm-service');
      const progress = await getProgressBatch(['lead-1'], 'org-1');
      
      expect(progress['lead-1']).toHaveLength(2);
      expect(progress['lead-1'][0].step).toBe('INITIAL_CONTACT');
      expect(progress['lead-1'][0].status).toBe('COMPLETED');
    });

    it('진행단계를 완료 처리할 수 있다', async () => {
      const { updateProgressStep } = await import('./crm-service');
      const result = await updateProgressStep('2', 'COMPLETED', '제안서 발송 완료');
      
      expect(result.success).toBe(true);
      expect(mockSupabaseClient.from().update).toHaveBeenCalledWith({
        status: 'COMPLETED',
        completedAt: expect.any(String),
        notes: '제안서 발송 완료',
      });
    });

    it('새로운 진행단계를 추가할 수 있다', async () => {
      const newProgress = {
        leadId: 'lead-2',
        step: 'CONTRACT_SIGNED',
        status: 'PENDING',
        notes: '계약 체결 대기',
        organizationId: 'org-1',
      };

      const { addProgressStep } = await import('./crm-service');
      const result = await addProgressStep(newProgress);
      
      expect(result.success).toBe(true);
      expect(mockSupabaseClient.from().insert).toHaveBeenCalledWith(newProgress);
    });
  });

  describe('CRM 통계', () => {
    it('통화 통계를 계산할 수 있다', async () => {
      const { getCallStats } = await import('./crm-service');
      const stats = await getCallStats('org-1');
      
      expect(stats).toHaveProperty('totalCalls');
      expect(stats).toHaveProperty('avgDuration');
      expect(stats).toHaveProperty('callsByType');
      expect(stats.totalCalls).toBe(2);
    });

    it '진행률 통계를 계산할 수 있다', async () => {
      mockSupabaseClient.from().select().eq().mockResolvedValueOnce({
        data: mockProgressItems,
        error: null,
      });

      const { getProgressStats } = await import('./crm-service');
      const stats = await getProgressStats('org-1');
      
      expect(stats).toHaveProperty('totalSteps');
      expect(stats).toHaveProperty('completedSteps');
      expect(stats).toHaveProperty('completionRate');
    });
  });
});
