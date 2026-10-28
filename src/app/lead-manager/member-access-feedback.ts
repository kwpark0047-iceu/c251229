export function memberAccessFeedback(user: { accountStatus?: string } | null, loading: boolean) {
  if (loading && !user) return { title: '계정 정보 확인 중', message: '회원 이용 권한을 확인하고 있습니다.' };
  if (!user) return { title: '계정 정보 조회 실패', message: '프로필 또는 조직 정보를 확인하지 못했습니다. 승인 대기로 판정된 것은 아닙니다. 다시 시도해주세요.' };
  if (user.accountStatus === 'PENDING') return { title: '승인 대기 중', message: '관리자가 승인한 후 시스템을 이용하실 수 있습니다.' };
  return { title: '이용 권한 확인 필요', message: '계정 상태 또는 이용 기간을 확인해주세요. 관리자에게 문의해주세요.' };
}
