/**
 * Lead 상태 전이 검증 라이브러리
 * 리드 상태 흐름: NEW → PROPOSAL_SENT → CONTACTED → CONTRACTED
 * 
 * [목적]
 * - 부적절한 상태 전이로 인한 데이터 불일치 방지
 * - API 레벨에서即時 피드백 제공
 * - 백오피스 작업 시 상태 전이 가이드라인 제공
 * 
 * [사용 예시]
 * import { validateStatusTransition } from './lead-status-validator'
 * 
 * const result = validateStatusTransition('NEW', 'PROPOSAL_SENT')
 * // { valid: true }
 * 
 * const result2 = validateStatusTransition('CONTRACTED', 'NEW')
 * // { valid: false, reason: 'CONTRACTED from NEW is not allowed' }
 */
export type LeadStatus = 'NEW' | 'PROPOSAL_SENT' | 'CONTACTED' | 'CONTRACTED'

// 유효한 상태 전이 매핑
export const VALID_TRANSITIONS: Record<LeadStatus, LeadStatus[]> = {
  NEW: ['PROPOSAL_SENT'],
  PROPOSAL_SENT: ['CONTACTED'],
  CONTACTED: ['CONTRACTED'],
  CONTRACTED: [] // 최종 상태이며 전이 불가
}

/**
 * 리드 상태 전이 검증
 * @param from 현재 상태
 * @param to 전환할 목표 상태
 * @returns { valid: boolean, reason?: string } 검증 결과
 */
export function validateStatusTransition(
  from: LeadStatus,
  to: LeadStatus
): { valid: boolean; reason?: string } {
  const allowed = VALID_TRANSITIONS[from]

  if (!allowed) {
    return { valid: false, reason: `알 수 없는 현재 상태: ${from}` }
  }

  if (allowed.includes(to)) {
    return { valid: true }
  }

  // 역방향 또는 건너 뛰기 시도 감지
  const reason = `${from} from ${to} is not allowed. ` +
    `Valid transitions from ${from}: ${allowed.join(', ')}.`

  return { valid: false, reason }
}

/**
 * 다음 허용된 상태들 조회
 * @param from 현재 상태
 * @returns 허용된 다음 상태 배열
 */
export function getAllowedNextStates(from: LeadStatus): LeadStatus[] {
  return VALID_TRANSITIONS[from] || []
}

/**
 * 리드 상태가 최종 상태(CONTRACTED)인지 확인
 * @param status 확인할 상태
 * @returns 최종 상태 여부
 */
export function isFinalStatus(status: LeadStatus): boolean {
  return status === 'CONTRACTED'
}

/**
 * 리드 상태가 초기 상태(NEW)인지 확인
 * @param status 확인할 상태
 * @returns 초기 상태 여부
 */
export function isInitialStatus(status: LeadStatus): boolean {
  return status === 'NEW'
}

/**
 * 상태 변경 가능성 점수 계산 (0-100)
 * - 최근 상태 변경으로부터 경과된 시간, 비즈니스 로직 고려
 * @param from 현재 상태
 * @param to 목표 상태
 * @returns 가능성 점수 (높을수록 가능성 높음)
 */
export function getTransitionScore(from: LeadStatus, to: LeadStatus): number {
  const baseScores: Record<string, number> = {
    'NEW_PROPOSAL_SENT': 95,
    'PROPOSAL_SENT_CONTACTED': 90,
    'CONTACTED_CONTRACTED': 85,
    'CONTRACTED_*': 0,
  }

  const key = `${from}_${to}`
  if (baseScores[key] !== undefined) {
    return baseScores[key]
  }

  // 유효하지 않은 전이
  return 0
}

/**
 * 현재 상태에서 도달할 수 있는 최단 전이 경로 계산
 * @param target 목표 상태 (CONTRACTED 등)
 * @returns 최단 경로 배열
 */
export function getShortestPathTo(target: LeadStatus): Array<LeadStatus> {
  const allStates: LeadStatus[] = ['NEW', 'PROPOSAL_SENT', 'CONTACTED', 'CONTRACTED']
  const targetIndex = allStates.indexOf(target)

  if (targetIndex === -1) {
    return []
  }

  // NEW에서 target까지의 최단 경로 (직선 전이)
  return allStates.slice(0, targetIndex + 1)
}

export default {
  validateStatusTransition,
  getAllowedNextStates,
  isFinalStatus,
  isInitialStatus,
  getTransitionScore,
  getShortestPathTo,
}