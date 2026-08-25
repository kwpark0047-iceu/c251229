/**
 * CallOutcome 타입 엑스호브 가드
 * 모든 CallOutcome 경우를 안전하게 처리하도록 보장합니다.
 * 
 * 사용법:
 * - switch 문에서 기본 케이스(default) 대신 이 가드 함수를 사용
 * - if-else 체인에서 마지막 조건으로 사용
 * - 컴포넌트 렌더링 시 안전성 확보
 */

import { CallOutcome, CALL_OUTCOME_LABELS, CALL_OUTCOME_COLORS } from './types';

// 모든 CallOutcome 인스턴스를haustive하게 처리하는 switch 문 패턴
export function isNoAnswer(outcome: CallOutcome): outcome is 'NO_ANSWER' {
  return outcome === 'NO_ANSWER';
}

export function isRejected(outcome: CallOutcome): outcome is 'REJECTED' {
  return outcome === 'REJECTED';
}

export function isInterested(outcome: CallOutcome): outcome is 'INTERESTED' {
  return outcome === 'INTERESTED';
}

export function isCallbackRequested(outcome: CallOutcome): outcome is 'CALLBACK_REQUESTED' {
  return outcome === 'CALLBACK_REQUESTED';
}

export function isMeetingScheduled(outcome: CallOutcome): outcome is 'MEETING_SCHEDULED' {
  return outcome === 'MEETING_SCHEDULED';
}

export function isOther(outcome: CallOutcome): outcome is 'OTHER' {
  return outcome === 'OTHER';
}

/**
 * CallOutcome이 유효한 값인지 확인 (항상 true 반환하지만 타입 narrowing 보장)
 * @deprecated exhaustive check를 권장
 */
export function isValidCallOutcome(outcome: CallOutcome): outcome is CallOutcome {
  return true;
}

/**
 * CallOutcome에 대한 작업별 처리 매핑
 * 각 아웃컴에 대한 처리 로직을 중앙화
 */
export const CALL_OUTCOME_HANDLERS: Record<CallOutcome, () => string> = {
  NO_ANSWER: () => '부재중: 재전화 예약',
  REJECTED: () => '거절: 다음 연락 시 인센티브 제안',
  INTERESTED: () => '관심: 상세 설명 및 제안 진행',
  CALLBACK_REQUESTED: () => '콜백 요청: 지정한 시간 재연락',
  MEETING_SCHEDULED: () => '미팅 잡힘: 일정 확인 및 준비',
  OTHER: () => '기타: 맞춤형 후속 조치',
};

/**
 * CallOutcome 라벨 조회 (i18n 지원)
 */
export function getCallOutcomeLabel(outcome: CallOutcome): string {
  return CALL_OUTCOME_LABELS[outcome] || '알 수 없는 결과';
}

/**
 * CallOutcome 색상 테마 조회 (UI 사용)
 */
export function getCallOutcomeColor(outcome: CallOutcome): { bg: string; text: string } {
  return CALL_OUTCOME_COLORS[outcome] || { bg: 'bg-gray-100', text: 'text-gray-700' };
}

/**
 * CallOutcome에 따른 다음 액션 제안
 */
export function getNextAction(outcome: CallOutcome): string {
  return CALL_OUTCOME_HANDLERS[outcome]() || '확인 필요';
}

export default {
  isNoAnswer,
  isRejected,
  isInterested,
  isCallbackRequested,
  isMeetingScheduled,
  isOther,
  isValidCallOutcome,
  getCallOutcomeLabel,
  getCallOutcomeColor,
  getNextAction,
};