import { describe, expect, it } from 'vitest';
import { getAuthFeedback } from '@/lib/supabase/auth-feedback';

describe('로그인 차단 안내', () => {
  it('계정 조회 실패는 비밀번호 또는 계정 중지로 안내하지 않는다', () => {
    expect(getAuthFeedback('account_check_failed')).toContain('상태를 확인하지 못했습니다');
    expect(getAuthFeedback('account_disabled')).toContain('중지되거나 보관');
  });
  it('세션 만료와 알 수 없는 쿼리를 안전하게 처리한다', () => {
    expect(getAuthFeedback('session_expired')).toContain('로그인');
    expect(getAuthFeedback('untrusted-text')).toBeNull();
    expect(getAuthFeedback(null)).toBeNull();
  });
});
