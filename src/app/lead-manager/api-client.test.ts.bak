/**
 * API 클라이언트 유닛 테스트
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { safeFetch, ApiError } from './api-client';

// Mock global fetch
global.fetch = vi.fn();

describe('api-client (safeFetch)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    it('성공적인 요청은 데이터를 즉시 반환한다', async () => {
        const mockData = { success: true, data: 'test' };
        (fetch as any).mockResolvedValueOnce({
            ok: true,
            json: async () => mockData,
        });

        const result = await safeFetch('https://api.example.com');
        expect(result).toEqual(mockData);
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('429 에러 발생 시 지정된 횟수만큼 재시도한다', async () => {
        const mockError = { error: 'Too Many Requests' };
        (fetch as any)
            .mockResolvedValueOnce({
                ok: false,
                status: 429,
                statusText: 'Too Many Requests',
                json: async () => mockError,
            })
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true }),
            });

        const fetchPromise = safeFetch('https://api.example.com', {
            maxRetries: 1,
            initialDelay: 100,
        });

        // 재시도 대기 시간 시뮬레이션
        await vi.runAllTimersAsync();

        const result = await fetchPromise;
        expect(result.success).toBe(true);
        expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('500 에러 발생 시 재시도하고 최종 실패를 보고한다', async () => {
        (fetch as any).mockResolvedValue({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            json: async () => ({ error: 'Fail' }),
        });

        const fetchPromise = safeFetch('https://api.example.com', {
            maxRetries: 2,
            initialDelay: 100,
        });

        // 재시도 대기 시간 시뮬레이션 (2회)
        await vi.runAllTimersAsync();

        await expect(fetchPromise).rejects.toThrow(ApiError);
        expect(fetch).toHaveBeenCalledTimes(3); // 최초 1회 + 재시도 2회
    });

    it('400 에러와 같이 재시도 가치가 없는 에러는 즉시 실패한다', async () => {
        (fetch as any).mockResolvedValueOnce({
            ok: false,
            status: 400,
            statusText: 'Bad Request',
            json: async () => ({ error: 'Invalid input' }),
        });

        await expect(safeFetch('https://api.example.com')).rejects.toThrow(ApiError);
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('네트워크 장애(TypeError) 시 재시도한다', async () => {
        (fetch as any)
            .mockRejectedValueOnce(new TypeError('Network Error'))
            .mockResolvedValueOnce({
                ok: true,
                json: async () => ({ success: true }),
            });

        const fetchPromise = safeFetch('https://api.example.com', {
            maxRetries: 1,
            initialDelay: 100,
        });

        await vi.runAllTimersAsync();

        const result = await fetchPromise;
        expect(result.success).toBe(true);
        expect(fetch).toHaveBeenCalledTimes(2);
    });
});
