export function getAuthFeedback(error: string | null): string | null {
  switch (error) {
    case 'account_disabled':
      return '이용이 중지되거나 보관된 계정입니다. 관리자에게 문의해주세요.';
    case 'account_check_failed':
      return '계정 이용 상태를 확인하지 못했습니다. 관리자 계정도 서버의 회원 상태 조회 설정 확인이 필요합니다. 잠시 후 다시 시도해주세요.';
    case 'session_expired':
      return '로그인 세션을 확인하지 못했습니다. 다시 로그인해주세요.';
    default:
      return null;
  }
}
