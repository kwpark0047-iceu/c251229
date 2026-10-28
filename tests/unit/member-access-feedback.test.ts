import { describe, expect, it } from 'vitest';
import { memberAccessFeedback } from '@/app/lead-manager/member-access-feedback';

describe('회원 정보 상태 안내', () => {
  it('조회 중 또는 조회 실패를 승인 대기로 표시하지 않는다', () => {
    expect(memberAccessFeedback(null, true).title).toBe('계정 정보 확인 중');
    expect(memberAccessFeedback(null, false).title).toBe('계정 정보 조회 실패');
  });
  it('실제로 확인된 PENDING에만 승인 대기 안내를 표시한다', () => {
    expect(memberAccessFeedback({ accountStatus: 'PENDING' }, false).title).toBe('승인 대기 중');
    expect(memberAccessFeedback({ accountStatus: 'ACTIVE' }, false).title).not.toBe('승인 대기 중');
  });
});
