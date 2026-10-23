import { describe, expect, it } from 'vitest';
import { getAccountStatus, accountStatusLabel, isAccountBlocked } from '@/lib/account-state';

describe('회원 상태 분류', () => {
  it('보관 회원은 승인 여부와 관계없이 승인 대기가 아니다', () => {
    expect(getAccountStatus({ accountStatus: 'ARCHIVED', isApproved: false })).toBe('ARCHIVED');
    expect(accountStatusLabel('ARCHIVED')).toBe('삭제·보관');
  });
  it('복구된 이용 중지 회원도 승인 대기와 구별한다', () => {
    expect(getAccountStatus({ accountStatus: 'SUSPENDED', isApproved: false })).toBe('SUSPENDED');
  });
  it('기존 표시 데이터의 승인 여부는 호환하되 알 수 없는 명시 상태는 차단한다', () => {
    expect(getAccountStatus({ isApproved: true })).toBe('ACTIVE');
    expect(getAccountStatus({ isApproved: false })).toBe('PENDING');
    expect(getAccountStatus({ accountStatus: 'unexpected', isApproved: true })).toBe('SUSPENDED');
  });
  it.each(['ARCHIVED', 'SUSPENDED'])('%s는 서비스 접근을 허용하지 않는다', state => {
    expect(isAccountBlocked(state)).toBe(true);
  });
});
