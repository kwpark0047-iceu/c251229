import { describe, it, expect } from 'vitest';
import {
  validateStatusTransition,
  getAllowedNextStates,
  isFinalStatus,
  isInitialStatus,
  getTransitionScore,
  getShortestPathTo,
  type LeadStatus,
} from './lead-status-validator';

describe('validateStatusTransition', () => {
  it('유효한 전이(NEW → PROPOSAL_SENT)를 허용한다', () => {
    const result = validateStatusTransition('NEW', 'PROPOSAL_SENT');
    expect(result).toEqual({ valid: true });
  });

  it('유효한 전이(PROPOSAL_SENT → CONTACTED)를 허용한다', () => {
    expect(validateStatusTransition('PROPOSAL_SENT', 'CONTACTED')).toEqual({
      valid: true,
    });
  });

  it('유효한 전이(CONTACTED → CONTRACTED)를 허용한다', () => {
    expect(validateStatusTransition('CONTACTED', 'CONTRACTED')).toEqual({
      valid: true,
    });
  });

  it('역방향 전이(CONTRACTED → NEW)를 거부한다', () => {
    const result = validateStatusTransition('CONTRACTED', 'NEW');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe(
      'CONTRACTED from NEW is not allowed. Valid transitions from CONTRACTED: .',
    );
  });

  it('단계 건너뛰기(NEW → CONTACTED)를 거부한다', () => {
    const result = validateStatusTransition('NEW', 'CONTACTED');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe(
      'NEW from CONTACTED is not allowed. Valid transitions from NEW: PROPOSAL_SENT.',
    );
  });

  it('동일 상태 전이(NEW → NEW)를 거부한다', () => {
    const result = validateStatusTransition('NEW', 'NEW');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe(
      'NEW from NEW is not allowed. Valid transitions from NEW: PROPOSAL_SENT.',
    );
  });

  it('최종 상태(CONTRACTED)에서의 추가 전이를 거부한다', () => {
    const result = validateStatusTransition('CONTRACTED', 'CONTRACTED');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe(
      'CONTRACTED from CONTRACTED is not allowed. Valid transitions from CONTRACTED: .',
    );
  });

  it('알 수 없는 from 상태를 거부한다', () => {
    const result = validateStatusTransition('UNKNOWN' as LeadStatus, 'NEW');
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('알 수 없는 현재 상태: UNKNOWN');
  });

  it('알 수 없는 to 상태를 거부한다', () => {
    const result = validateStatusTransition('NEW', 'UNKNOWN' as LeadStatus);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe(
      'NEW from UNKNOWN is not allowed. Valid transitions from NEW: PROPOSAL_SENT.',
    );
  });
});

describe('getAllowedNextStates', () => {
  it('NEW 상태의 허용된 다음 상태를 반환한다', () => {
    expect(getAllowedNextStates('NEW')).toEqual(['PROPOSAL_SENT']);
  });

  it('PROPOSAL_SENT 상태의 허용된 다음 상태를 반환한다', () => {
    expect(getAllowedNextStates('PROPOSAL_SENT')).toEqual(['CONTACTED']);
  });

  it('CONTACTED 상태의 허용된 다음 상태를 반환한다', () => {
    expect(getAllowedNextStates('CONTACTED')).toEqual(['CONTRACTED']);
  });

  it('CONTRACTED 상태는 다음 상태가 없다', () => {
    expect(getAllowedNextStates('CONTRACTED')).toEqual([]);
  });

  it('알 수 없는 상태는 빈 배열을 반환한다', () => {
    expect(getAllowedNextStates('UNKNOWN' as LeadStatus)).toEqual([]);
  });
});

describe('isFinalStatus', () => {
  it('CONTRACTED를 최종 상태로 판정한다', () => {
    expect(isFinalStatus('CONTRACTED')).toBe(true);
  });

  it('그 외 상태는 최종 상태가 아니다', () => {
    expect(isFinalStatus('NEW')).toBe(false);
    expect(isFinalStatus('PROPOSAL_SENT')).toBe(false);
    expect(isFinalStatus('CONTACTED')).toBe(false);
    expect(isFinalStatus('UNKNOWN' as LeadStatus)).toBe(false);
  });
});

describe('isInitialStatus', () => {
  it('NEW를 초기 상태로 판정한다', () => {
    expect(isInitialStatus('NEW')).toBe(true);
  });

  it('그 외 상태는 초기 상태가 아니다', () => {
    expect(isInitialStatus('PROPOSAL_SENT')).toBe(false);
    expect(isInitialStatus('CONTACTED')).toBe(false);
    expect(isInitialStatus('CONTRACTED')).toBe(false);
    expect(isInitialStatus('UNKNOWN' as LeadStatus)).toBe(false);
  });
});

describe('getTransitionScore', () => {
  it('NEW → PROPOSAL_SENT 점수는 95다', () => {
    expect(getTransitionScore('NEW', 'PROPOSAL_SENT')).toBe(95);
  });

  it('PROPOSAL_SENT → CONTACTED 점수는 90이다', () => {
    expect(getTransitionScore('PROPOSAL_SENT', 'CONTACTED')).toBe(90);
  });

  it('CONTACTED → CONTRACTED 점수는 85다', () => {
    expect(getTransitionScore('CONTACTED', 'CONTRACTED')).toBe(85);
  });

  it('정의되지 않은 전이 조합의 점수는 0이다', () => {
    expect(getTransitionScore('NEW', 'CONTACTED')).toBe(0);
    expect(getTransitionScore('CONTRACTED', 'NEW')).toBe(0);
    expect(getTransitionScore('UNKNOWN' as LeadStatus, 'NEW')).toBe(0);
  });
});

describe('getShortestPathTo', () => {
  it('CONTRACTED까지의 최단 경로를 반환한다', () => {
    expect(getShortestPathTo('CONTRACTED')).toEqual([
      'NEW',
      'PROPOSAL_SENT',
      'CONTACTED',
      'CONTRACTED',
    ]);
  });

  it('NEW까지의 경로는 NEW 하나다', () => {
    expect(getShortestPathTo('NEW')).toEqual(['NEW']);
  });

  it('CONTACTED까지의 경로를 반환한다', () => {
    expect(getShortestPathTo('CONTACTED')).toEqual([
      'NEW',
      'PROPOSAL_SENT',
      'CONTACTED',
    ]);
  });

  it('알 수 없는 상태는 빈 배열을 반환한다', () => {
    expect(getShortestPathTo('UNKNOWN' as LeadStatus)).toEqual([]);
  });
});