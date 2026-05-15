/**
 * 배열 관련 유틸리티 함수 모음
 */

/**
 * 배열을 지정된 크기로 분할합니다.
 * @param items 분할할 배열
 * @param size 청크 크기
 * @returns 분할된 2차원 배열
 */
export function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}
