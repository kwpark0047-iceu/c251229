/**
 * 리드 데이터 유틸리티 함수
 * 중복 체크를 위한 문자열 정규화 로직
 */

/**
 * 리드 키 정규화 함수
 * DB의 normalize_lead_key() 함수와 동일한 로직
 * - 앞뒤 공백 제거
 * - 연속 공백을 단일 공백으로
 * - 전각 공백을 반각 공백으로
 * - 소문자 변환
 */
export function normalizeLeadKey(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .replace(/\s+/g, ' ')      // 연속 공백 -> 단일 공백
    .replace(/[\u3000]/g, ' ') // 전각 공백 -> 반각 공백
    .trim()                     // 앞뒤 공백 제거
    .toLowerCase();             // 소문자 변환
}

/**
 * 리드 중복 체크용 키 생성
 * @param bizName - 상호명
 * @param roadAddress - 도로명 주소
 * @param bizId - 사업자등록번호 (선택)
 * @returns 정규화된 키 문자열
 */
export function createLeadKey(
  bizName: string | null | undefined,
  roadAddress: string | null | undefined,
  bizId?: string | null | undefined
): string {
  const baseKey = `${normalizeLeadKey(bizName)}||${normalizeLeadKey(roadAddress)}`;
  if (bizId) {
    return `${baseKey}||${normalizeLeadKey(bizId)}`;
  }
  return baseKey;
}
