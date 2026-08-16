/**
 * 서울 지하철 광고 영업 시스템 - 공통 API 클라이언트
 * 지수 백오프(Exponential Backoff) 기반의 재시도 로직 및 표준화된 에러 핸들링 제공
 */

export interface RequestOptions extends RequestInit {
    maxRetries?: number;
    initialDelay?: number;
    backoffFactor?: number;
    maxDelay?: number;  // 백오프 지연 상한 (ms)
    timeout?: number;   // 요청 타임아웃 (ms)
}

export class ApiError extends Error {
    status?: number;
    statusText?: string;
    data?: any;

    constructor(message: string, options: { status?: number; statusText?: string; data?: any } = {}) {
        super(message);
        this.name = 'ApiError';
        this.status = options.status;
        this.statusText = options.statusText;
        this.data = options.data;
    }
}

/**
 * 지수 백오프를 사용한 fetch 래퍼
 */
export async function safeFetch<T = any>(
    url: string,
    options: RequestOptions = {}
): Promise<T> {
    const {
        maxRetries = 3,
        initialDelay = 500,
        backoffFactor = 2,
        maxDelay = 8000,
        timeout,
        ...fetchOptions
    } = options;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            if (attempt > 0) {
                // 지수 백오프 + 상한(maxDelay) + jitter(±20%)로 동시 재시도 충돌 완화
                const baseDelay = Math.min(initialDelay * Math.pow(backoffFactor, attempt - 1), maxDelay);
                const delay = Math.round(baseDelay * (0.8 + Math.random() * 0.4));
                const lastStatus = lastError instanceof ApiError ? lastError.status : 'network';
                console.warn(`[API] Retry attempt ${attempt}/${maxRetries} after ${delay}ms delay... (status: ${lastStatus})`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            // 타임아웃 옵션: 기존 signal과 병합 (각 시도마다 새 타임아웃 적용)
            if (timeout) {
                const timeoutSignal = AbortSignal.timeout(timeout);
                fetchOptions.signal = fetchOptions.signal
                    ? AbortSignal.any([fetchOptions.signal, timeoutSignal])
                    : timeoutSignal;
            }

            const response = await globalThis.fetch(url, fetchOptions);

            if (response.ok) {
                return await response.json();
            }

            // 429(Rate Limit) 또는 5xx(Server Error)의 경우 재시도 가치가 있음
            if (response.status === 429 || (response.status >= 500 && response.status < 600)) {
                let errorData;
                try {
                    errorData = await response.json();
                } catch {
                    errorData = null;
                }

                throw new ApiError(`Request failed with status ${response.status}${response.statusText ? `: ${response.statusText}` : ''}`, {
                    status: response.status,
                    statusText: response.statusText,
                    data: errorData
                });
            }

            // 그 외 4xx 에러 등은 재시도하지 않음
            let errorData;
            try {
                errorData = await response.json();
            } catch {
                errorData = null;
            }

            throw new ApiError(errorData?.message || errorData?.error || `API Error: ${response.status}`, {
                status: response.status,
                statusText: response.statusText,
                data: errorData
            });

        } catch (error) {
            lastError = error as Error;

            // ApiError가 아니고 status가 429나 5xx가 아닌 경우 (즉, 네트워크 단절 등) 재시도 시도
            if (error instanceof ApiError) {
                if (error.status !== 429 && !(error.status! >= 500 && error.status! < 600)) {
                    throw error; // 재시도 없이 즉시 실패
                }
            }

            if (attempt === maxRetries) {
                const failStatus = error instanceof ApiError ? error.status : 'network';
                console.error(`[API] Final failure after ${maxRetries} retries (status: ${failStatus}):`, error);
                throw error;
            }
        }
    }

    throw lastError || new Error('Unknown error in safeFetch');
}
