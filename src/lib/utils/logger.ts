/**
 * 로거 유틸리티
 * 개발 환경에서만 로그 출력
 */

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * 개발 환경에서만 로그 출력
 */
export const logger = {
  log: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log(...args);
    }
  },
  error: (...args: unknown[]) => {
    // 에러는 항상 출력
    console.error(...args);
  },
  warn: (...args: unknown[]) => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },
  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log('[DEBUG]', ...args);
    }
  },
};
