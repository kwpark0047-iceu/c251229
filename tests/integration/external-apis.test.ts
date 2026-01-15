/**
 * 외부 API 연동 통합 테스트
 * LocalData, KRIC, Resend 등 외부 서비스 연동 테스트
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';

// Mock fetch for testing
global.fetch = vi.fn();

describe('외부 API 연동 통합 테스트', () => {
  beforeAll(() => {
    // 테스트 환경 변수 설정
    process.env.LOCALDATA_API_KEY = 'test-localdata-key';
    process.env.KRIC_API_KEY = 'test-kric-key';
    process.env.RESEND_API_KEY = 'test-resend-key';
  });

  describe('LocalData API 연동', () => {
    it('사업자 인허가 데이터를 성공적으로 조회한다', async () => {
      // Mock LocalData API 응답
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
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
        }),
      });

      // 실제 API 호출 함수 테스트
      const { fetchBusinessData } = await import('../../src/app/lead-manager/api');
      const result = await fetchBusinessData('음식점', '서울', 1, 10);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].bizName).toBe('테스트 상점');
      expect(result.totalCount).toBe(1);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('localdata.go.kr'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': expect.stringContaining('test-localdata-key'),
          }),
        })
      );
    });

    it('API 호출 실패 시 에러를 적절히 처리한다', async () => {
      // Mock API 실패 응답
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({ error: 'Rate limit exceeded' }),
      });

      const { fetchBusinessData } = await import('../../src/app/lead-manager/api');

      await expect(fetchBusinessData('음식점', '서울')).rejects.toThrow();
    });

    it 'Rate limiting을 준수한다', async () => {
      // Mock 성공 응답
      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [], totalCount: 0 }),
      });

      const { fetchBusinessData } = await import('../../src/app/lead-manager/api');

      const startTime = Date.now();
      
      // 연속 호출
      await fetchBusinessData('음식점', '서울');
      await fetchBusinessData('카페', '서울');
      
      const endTime = Date.now();

      // 최소 200ms 이상의 지간 확인
      expect(endTime - startTime).toBeGreaterThan(150);
    });

    it '좌표 변환을 정확하게 수행한다', async () => {
      // Mock 응답
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              bizesId: '1234567890',
              bizName: '테스트 상점',
              roadAddr: '서울시 강남구 테헤란로 123',
              bizType: '음식점',
              x: '200000', // EPSG:5174 좌표
              y: '500000',
            },
          ],
          totalCount: 1,
        }),
      });

      const { fetchBusinessData } = await import('../../src/app/lead-manager/api');
      const result = await fetchBusinessData('음식점', '서울', 1, 10);

      expect(result.data[0]).toHaveProperty('lat');
      expect(result.data[0]).toHaveProperty('lng');
      expect(result.data[0].lat).toBeGreaterThan(37);
      expect(result.data[0].lng).toBeGreaterThan(126);
    });
  });

  describe('KRIC API 연동', () => {
    it('역사 편의시설 정보를 성공적으로 조회한다', async () => {
      // Mock KRIC API 응답
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              stationName: '강남역',
              lineNum: '2',
              facilities: ['엘리베이터', '에스컬레이터', '휠체어리프트'],
              operatingHours: '05:00-24:00',
              exitCount: 8,
            },
          ],
        }),
      });

      const { fetchStationInfo } = await import('../../src/app/lead-manager/api');
      const result = await fetchStationInfo('강남역');

      expect(result.data).toHaveLength(1);
      expect(result.data[0].stationName).toBe('강남역');
      expect(result.data[0].facilities).toContain('엘리베이터');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('kric.or.kr'),
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': expect.stringContaining('test-kric-key'),
          }),
        })
      );
    });

    it '캐싱이 동작한다', async () => {
      // Mock 응답
      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ stationName: '강남역', lineNum: '2' }],
        }),
      });

      const { fetchStationInfo } = await import('../../src/app/lead-manager/api');

      // 첫 번째 호출
      await fetchStationInfo('강남역');
      
      // 두 번째 호출 (캐시된 데이터 사용)
      await fetchStationInfo('강남역');

      // fetch는 한 번만 호출되어야 함
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it '캐시 만료 후 새로운 데이터를 가져온다', async () => {
      // Mock 응답
      (fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          data: [{ stationName: '강남역', lineNum: '2' }],
        }),
      });

      const { fetchStationInfo } = await import('../../src/app/lead-manager/api');

      // 첫 번째 호출
      await fetchStationInfo('강남역');

      // 캐시 만료 시간 시뮬레이션 (5분)
      vi.advanceTimersByTime(5 * 60 * 1000 + 1000);

      // 두 번째 호출 (캐시 만료로 새로운 호출)
      await fetchStationInfo('강남역');

      // fetch가 두 번 호출되어야 함
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('Resend API 연동', () => {
    it('이메일을 성공적으로 발송한다', async () => {
      // Mock Resend API 응답
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'email-12345',
          from: 'noreply@wemarket.kr',
          to: ['client@example.com'],
          subject: '광고 제안서 드립니다',
        }),
      });

      const emailData = {
        to: 'client@example.com',
        subject: '광고 제안서 드립니다',
        html: '<h1>제안서 내용</h1>',
        attachments: [
          {
            filename: 'proposal.pdf',
            content: Buffer.from('pdf content'),
          },
        ],
      };

      const result = await fetch('/api/send-proposal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData),
      });

      expect(result.ok).toBe(true);
      const response = await result.json();
      expect(response.success).toBe(true);
      expect(response.messageId).toBe('email-12345');
    });

    it '이메일 발송 실패 시 에러를 반환한다', async () => {
      // Mock Resend API 실패 응답
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Invalid email address',
        }),
      });

      const emailData = {
        to: 'invalid-email',
        subject: '테스트',
        html: '테스트 내용',
      };

      const result = await fetch('/api/send-proposal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData),
      });

      expect(result.ok).toBe(false);
      expect(result.status).toBe(400);
    });

    it '첨부파일이 있는 이메일을 발송할 수 있다', async () => {
      // Mock 성공 응답
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'email-with-attachment',
        }),
      });

      const emailData = {
        to: 'client@example.com',
        subject: '제안서 첨부',
        html: '<p>제안서를 첨부합니다.</p>',
        attachments: [
          {
            filename: 'proposal.pdf',
            content: Buffer.from('pdf content'),
            contentType: 'application/pdf',
          },
          {
            filename: 'image.jpg',
            content: Buffer.from('image content'),
            contentType: 'image/jpeg',
          },
        ],
      };

      const result = await fetch('/api/send-proposal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData),
      });

      expect(result.ok).toBe(true);
      const response = await result.json();
      expect(response.success).toBe(true);
    });
  });

  describe('AI 제안서 생성', () => {
    it('AI 제안서를 성공적으로 생성한다', async () => {
      // Mock AI API 응답
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          proposal: {
            title: '강남역 광고 제안서',
            content: '효과적인 광고 솔루션을 제안합니다...',
            price: 5000000,
            duration: '3개월',
            expectedReach: 100000,
            roi: 2.5,
          },
        }),
      });

      const proposalRequest = {
        leadId: 'lead-1',
        businessType: '음식점',
        targetAudience: '20-30대',
        budget: 5000000,
        duration: '3개월',
        preferredStations: ['강남역', '역삼역'],
      };

      const result = await fetch('/api/ai-proposal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(proposalRequest),
      });

      expect(result.ok).toBe(true);
      const response = await result.json();
      expect(response.proposal.title).toBe('강남역 광고 제안서');
      expect(response.proposal.price).toBe(5000000);
    });

    it 'AI 생성 실패 시 기본 템플릿을 반환한다', async () => {
      // Mock AI API 실패 응답
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'AI service unavailable' }),
      });

      const proposalRequest = {
        leadId: 'lead-1',
        businessType: '음식점',
        budget: 5000000,
      };

      const result = await fetch('/api/ai-proposal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(proposalRequest),
      });

      expect(result.ok).toBe(true);
      const response = await result.json();
      expect(response.proposal).toHaveProperty('title');
      expect(response.proposal).toHaveProperty('content');
      expect(response.proposal.title).toContain('기본');
    });
  });

  describe('API 재시도 로직', () => {
    it('일시적인 네트워크 오류 시 재시도한다', async () => {
      let callCount = 0;
      
      // Mock 첫 번째는 실패, 두 번째는 성공
      (fetch as any).mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 503,
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: [], totalCount: 0 }),
        });
      });

      const { fetchBusinessData } = await import('../../src/app/lead-manager/api');
      const result = await fetchBusinessData('음식점', '서울');

      expect(result).toBeTruthy();
      expect(callCount).toBe(2); // 재시도 포함 2번 호출
    });

    it '최대 재시도 횟수 초과 시 실패를 반환한다', async () => {
      // Mock 계속 실패
      (fetch as any).mockResolvedValue({
        ok: false,
        status: 503,
      });

      const { fetchBusinessData } = await import('../../src/app/lead-manager/api');

      await expect(fetchBusinessData('음식점', '서울')).rejects.toThrow();
    });
  });

  afterAll(() => {
    // 테스트 환경 변수 정리
    delete process.env.LOCALDATA_API_KEY;
    delete process.env.KRIC_API_KEY;
    delete process.env.RESEND_API_KEY;
    vi.clearAllMocks();
  });
});
