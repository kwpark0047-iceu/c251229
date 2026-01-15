/**
 * Supabase 서비스 레이어 테스트
 * 실제 DB 연결 없이 모의 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Lead, LeadStatus } from './types';

// Mock 데이터
const mockLeads: Lead[] = [
  {
    id: '1',
    bizName: '테스트 상점',
    roadAddress: '서울시 강남구 테헤란로 123',
    bizType: '음식점',
    category: 'FOOD',
    status: 'NEW' as LeadStatus,
    nearestStation: '강남역',
    distance: 500,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    organizationId: 'org-1',
  },
  {
    id: '2',
    bizName: '테스트 병원',
    roadAddress: '서울시 서초구 강남대로 456',
    bizType: '병원',
    category: 'HEALTH',
    status: 'PROPOSAL_SENT' as LeadStatus,
    nearestStation: '교대역',
    distance: 300,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    organizationId: 'org-1',
  },
];

// Supabase 클라이언트 모킹
const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(() => ({
          data: mockLeads,
          error: null,
        })),
        in: vi.fn(() => ({
          order: vi.fn(() => ({
            data: mockLeads.filter(lead => ['NEW', 'PROPOSAL_SENT'].includes(lead.status)),
            error: null,
          })),
        })),
      })),
      ilike: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            data: mockLeads.filter(lead => lead.bizName.includes('테스트')),
            error: null,
          })),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => ({
          data: mockLeads[0],
          error: null,
        })),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        data: mockLeads[0],
        error: null,
      })),
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => ({
        data: mockLeads[0],
        error: null,
      })),
    })),
  })),
};

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => mockSupabaseClient),
}));

describe('Supabase 서비스', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('리드 관리', () => {
    it('모든 리드를 조회할 수 있다', async () => {
      // 실제 서비스 함수를 동적으로 import
      const { getLeads } = await import('./supabase-service');
      const leads = await getLeads('org-1');
      
      expect(leads).toHaveLength(2);
      expect(leads[0].bizName).toBe('테스트 상점');
      expect(leads[1].bizName).toBe('테스트 병원');
    });

    it('상태별로 리드를 필터링할 수 있다', async () => {
      const { getLeads } = await import('./supabase-service');
      const leads = await getLeads('org-1', ['NEW', 'PROPOSAL_SENT']);
      
      expect(leads).toHaveLength(2);
      expect(leads.every(lead => ['NEW', 'PROPOSAL_SENT'].includes(lead.status))).toBe(true);
    });

    it('검색어로 리드를 필터링할 수 있다', async () => {
      const { getLeads } = await import('./supabase-service');
      const leads = await getLeads('org-1', undefined, '테스트');
      
      expect(leads.length).toBeGreaterThan(0);
      expect(leads.every(lead => lead.bizName.includes('테스트'))).toBe(true);
    });

    it('새로운 리드를 저장할 수 있다', async () => {
      const newLead = {
        bizName: '새로운 상점',
        roadAddress: '서울시 송파구 올림픽로 789',
        bizType: '카페',
        category: 'FOOD' as const,
        status: 'NEW' as LeadStatus,
        nearestStation: '잠실역',
        distance: 200,
        organizationId: 'org-1',
      };

      const { saveLeads } = await import('./supabase-service');
      const result = await saveLeads([newLead]);
      
      expect(result.success).toBe(true);
      expect(mockSupabaseClient.from().insert).toHaveBeenCalled();
    });

    it('리드 상태를 업데이트할 수 있다', async () => {
      const { updateLeadStatus } = await import('./supabase-service');
      const result = await updateLeadStatus('1', 'CONTACTED');
      
      expect(result.success).toBe(true);
      expect(mockSupabaseClient.from().update).toHaveBeenCalledWith({
        status: 'CONTACTED',
        updated_at: expect.any(String),
      });
    });
  });

  describe('설정 관리', () => {
    it('설정을 조회할 수 있다', async () => {
      const mockSettings = {
        id: '1',
        organizationId: 'org-1',
        data: { theme: 'light', language: 'ko' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockSupabaseClient.from().select().eq().single.mockResolvedValueOnce({
        data: mockSettings,
        error: null,
      });

      const { getSettings } = await import('./supabase-service');
      const settings = await getSettings('org-1');
      
      expect(settings).toEqual(mockSettings.data);
    });

    it('설정을 저장할 수 있다', async () => {
      const newSettings = { theme: 'dark', language: 'en' };

      const { saveSettings } = await import('./supabase-service');
      const result = await saveSettings('org-1', newSettings);
      
      expect(result.success).toBe(true);
      expect(mockSupabaseClient.from().upsert).toHaveBeenCalledWith({
        organization_id: 'org-1',
        data: newSettings,
        updated_at: expect.any(String),
      });
    });
  });

  describe('통계', () => {
    it('리드 통계를 계산할 수 있다', async () => {
      const { getLeadStats } = await import('./supabase-service');
      const stats = await getLeadStats('org-1');
      
      expect(stats).toHaveProperty('total');
      expect(stats).toHaveProperty('byStatus');
      expect(stats).toHaveProperty('byCategory');
      expect(stats.total).toBe(2);
    });
  });
});
