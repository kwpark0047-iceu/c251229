/**
 * API 함수 테스트
 * LocalData API, KRIC API 등 외부 API 연동 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch
global.fetch = vi.fn();

describe('API 함수', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('LocalData API', () => {
    it('사업자 인허가 데이터를 조회할 수 있다', async () => {
      const mockResponse = {
        data: [
          {
            bizesId: '1234567890',
            bizName: '테스트 상점',
            roadAddr: '서울시 강남구 테헤란로 123',
            bizType: '음식점',
            x: '200000',
            y: '500000',
          },
        ],
        totalCount: 1,
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { fetchBusinessData } = await import('./api');
      const result = await fetchBusinessData('음식점', '서울', 1, 10);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].bizName).toBe('테스트 상점');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('localdata.go.kr'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
    });

    it('API 호출 실패 시 에러를 반환한다', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const { fetchBusinessData } = await import('./api');

      await expect(fetchBusinessData('음식점', '서울')).rejects.toThrow();
    });

    it('Rate limiting을 위해 200ms 지연이 적용된다', async () => {
      const mockResponse = { data: [], totalCount: 0 };
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const startTime = Date.now();
      const { fetchBusinessData } = await import('./api');
      await fetchBusinessData('음식점', '서울');
      const endTime = Date.now();

      expect(endTime - startTime).toBeGreaterThan(150); // 최소 150ms 이상 지연
    });
  });

  describe('KRIC API', () => {
    it('역사 편의시설 정보를 조회할 수 있다', async () => {
      const mockResponse = {
        data: [
          {
            stationName: '강남역',
            lineNum: '2',
            facilities: ['엘리베이터', '에스컬레이터'],
            operatingHours: '05:00-24:00',
          },
        ],
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { fetchStationInfo } = await import('./api');
      const result = await fetchStationInfo('강남역');

      expect(result.data).toHaveLength(1);
      expect(result.data[0].stationName).toBe('강남역');
      expect(result.data[0].facilities).toContain('엘리베이터');
    });

    it('캐싱된 데이터가 있으면 API를 호출하지 않는다', async () => {
      // 첫 번째 호출
      const mockResponse = { data: [{ stationName: '강남역' }] };
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { fetchStationInfo } = await import('./api');
      await fetchStationInfo('강남역');

      // 두 번째 호출 (캐시된 데이터 사용)
      await fetchStationInfo('강남역');

      expect(fetch).toHaveBeenCalledTimes(1); // 한 번만 호출됨
    });
  });

  describe('제안서 생성 API', () => {
    it('AI 제안서를 생성할 수 있다', async () => {
      const mockResponse = {
        proposal: {
          title: '강남역 광고 제안서',
          content: '효과적인 광고 솔루션을 제안합니다...',
          price: 5000000,
          duration: '3개월',
        },
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { generateAIProposal } = await import('./api');
      const result = await generateAIProposal({
        leadId: 'lead-1',
        businessType: '음식점',
        targetAudience: '20-30대',
        budget: 5000000,
      });

      expect(result.proposal.title).toBe('강남역 광고 제안서');
      expect(result.proposal.price).toBe(5000000);
      expect(fetch).toHaveBeenCalledWith(
        '/api/ai-proposal',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('lead-1'),
        })
      );
    });
  });

  describe('이메일 발송 API', () => {
    it('제안서 이메일을 발송할 수 있다', async () => {
      const mockResponse = {
        success: true,
        messageId: 'msg-12345',
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { sendProposalEmail } = await import('./api');
      const result = await sendProposalEmail({
        to: 'client@example.com',
        subject: '광고 제안서',
        proposalId: 'proposal-1',
        template: 'standard',
      });

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('msg-12345');
      expect(fetch).toHaveBeenCalledWith(
        '/api/send-proposal',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('client@example.com'),
        })
      );
    });

    it('이메일 발송 실패 시 에러를 반환한다', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Invalid email address' }),
      });

      const { sendProposalEmail } = await import('./api');

      await expect(sendProposalEmail({
        to: 'invalid-email',
        subject: '테스트',
        proposalId: 'proposal-1',
      })).rejects.toThrow('Invalid email address');
    });
  });

  describe('데이터 백업 API', () => {
    it('데이터를 백업할 수 있다', async () => {
      const mockResponse = {
        success: true,
        backupId: 'backup-12345',
        downloadUrl: 'https://storage.example.com/backup.zip',
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { backupData } = await import('./api');
      const result = await backupData({
        organizationId: 'org-1',
        includeLeads: true,
        includeInventory: true,
      });

      expect(result.success).toBe(true);
      expect(result.backupId).toBe('backup-12345');
      expect(result.downloadUrl).toContain('backup.zip');
    });

    it('백업 데이터를 복원할 수 있다', async () => {
      const mockResponse = {
        success: true,
        restoredItems: {
          leads: 150,
          inventory: 45,
          callLogs: 89,
        },
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const { restoreData } = await import('./api');
      const result = await restoreData({
        backupId: 'backup-12345',
        organizationId: 'org-1',
      });

      expect(result.success).toBe(true);
      expect(result.restoredItems.leads).toBe(150);
      expect(result.restoredItems.inventory).toBe(45);
    });
  });
});
