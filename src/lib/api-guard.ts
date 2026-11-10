/**
 * 공개 API 라우트 공통 방어 유틸
 * - escapeHtml: 이메일/HTML 템플릿에 사용자 입력을 넣을 때 인젝션 방지
 * - isSameOrigin: 브라우저 요청의 Origin 헤더가 현재 사이트와 다르면 거부 (CSRF 완화)
 * - createRateLimiter: IP(또는 임의 키) 단위 고정 윈도우 요청 제한
 *
 * 주의: 레이트 리밋 상태는 인스턴스(프로세스) 메모리에 저장됩니다.
 * 서버리스 환경에서는 인스턴스마다 카운트가 나뉘므로 완전한 차단 수단이 아니라 남용 완화용입니다.
 */

/** HTML 특수문자를 이스케이프합니다. null/undefined는 빈 문자열로 처리합니다. */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Origin 헤더가 있을 때 요청 URL의 origin과 같은지 확인합니다.
 * Origin 헤더가 없으면(서버 간 호출 등) 통과시킵니다.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

/** 요청자 식별 키 (x-forwarded-for의 첫 번째 값). 없으면 'unknown'. */
export function getClientKey(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  );
}

export interface RateLimiterOptions {
  windowMs: number;
  maxRequests: number;
  /** 추적할 최대 키 수. 초과 시 새 키는 제한 처리합니다(메모리 보호). */
  maxKeys?: number;
}

/**
 * 고정 윈도우 레이트 리미터를 생성합니다.
 * 반환 함수는 해당 키의 요청이 제한되어야 하면 true를 돌려줍니다.
 */
export function createRateLimiter({
  windowMs,
  maxRequests,
  maxKeys = 5000,
}: RateLimiterOptions) {
  const log = new Map<string, number[]>();

  return function isRateLimited(key: string, now = Date.now()): boolean {
    const windowStart = now - windowMs;
    for (const [k, times] of log) {
      if (!times.length || times[times.length - 1] <= windowStart)
        log.delete(k);
    }
    if (!log.has(key) && log.size >= maxKeys) return true;

    const recent = (log.get(key) ?? []).filter((t) => t > windowStart);
    if (recent.length >= maxRequests) {
      log.set(key, recent);
      return true;
    }
    recent.push(now);
    log.set(key, recent);
    return false;
  };
}
