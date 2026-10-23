export type AccountStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';

export function getAccountStatus(profile: { accountStatus?: string | null; isApproved?: boolean }): AccountStatus {
  const status = profile.accountStatus;
  if (status === 'PENDING' || status === 'ACTIVE' || status === 'SUSPENDED' || status === 'ARCHIVED') return status;
  if (status !== undefined && status !== null) return 'SUSPENDED';
  return profile.isApproved ? 'ACTIVE' : 'PENDING';
}

export function accountStatusLabel(status: AccountStatus): string {
  return { PENDING: '승인 대기', ACTIVE: '이용 중', SUSPENDED: '이용 중지', ARCHIVED: '삭제·보관' }[status];
}

export function isAccountBlocked(status: unknown): boolean {
  return status !== 'ACTIVE' && status !== 'PENDING';
}
