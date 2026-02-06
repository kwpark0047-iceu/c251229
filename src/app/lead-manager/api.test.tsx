/**
 * API 함수 테스트
 * LocalData API 연동 및 재시도 로직 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchLocalDataAPI, testAPIConnection } from './api';
import { Settings } from './types';

// Mock global fetch
global.fetch = vi.fn();

describe('API 함수 (api.ts)', () => {
  const mockSettings: Settings = {
    apiKey: 'test-api-key',
    corsProxy: '',
    searchType: 'license_date',
    regionCode: '6110000',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  describe('fetchLocalDataAPI', () => {
    it('사업자 인허가 데이터를 조회할 수 있다', async () => {
      const mockResponse = {
        success: true,
        leads: [
          {
            bizName: '테스트 상점',
            roadAddress: '서울시 강남구 테헤란로 123',
            coordX: 200000,
            coordY: 500000,
          },
        ],
        totalCount: 1,
      };

      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await fetchLocalDataAPI(mockSettings, startDate, endDate);

      expect(result.success).toBe(true);
      expect(result.leads).toHaveLength(1);
      expect(result.leads[0].bizName).toBe('테스트 상점');
      expect(fetch).toHaveBeenCalledWith(
        '/api/localdata',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('6110000'),
        })
      );
    });

    it('API 호출 실패 시 에러 메시지를 반환하며 재시도한다', async () => {
      (fetch as any).mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'Fail' }),
      });

      const fetchPromise = fetchLocalDataAPI(mockSettings, new Date(), new Date());

      // 재시도 대기 시간 시뮬레이션
      await vi.runAllTimersAsync();

      const result = await fetchPromise;

      expect(result.success).toBe(false);
      expect(result.message).toContain('Internal Server Error');
      expect(fetch).toHaveBeenCalledTimes(3); // 최초 1회 + 재시도 2회
    });

    it('429 Rate Limit 시 재시도 후 성공 유무를 반환한다', async () => {
      (fetch as any)
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          json: async () => ({ error: 'Rate limit' }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, leads: [], totalCount: 0 }),
        });

      const fetchPromise = fetchLocalDataAPI(mockSettings, new Date(), new Date());

      await vi.runAllTimersAsync();

      const result = await fetchPromise;

      expect(result.success).toBe(true);
      expect(fetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('testAPIConnection', () => {
    it('API 연결 성공 시 성공 메시지를 반환한다', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, leads: [], totalCount: 0 }),
      });

      const result = await testAPIConnection(mockSettings);
      expect(result.success).toBe(true);
      expect(result.message).toBe('API 연결 성공');
    });

    it('API 연결 실패 시 실패 메시지를 반환한다', async () => {
      (fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => ({ error: 'Invalid key' }),
      });

      const result = await testAPIConnection(mockSettings);
      expect(result.success).toBe(false);
      expect(result.message).toContain('Invalid key');
    });
  });
});
