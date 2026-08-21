/**
 * API 함수 테스트
 * 서울 오픈데이터 포털 API 연동 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { testAPIConnection } from './api';
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
    vi.resetAllMocks();
    vi.useFakeTimers();
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
