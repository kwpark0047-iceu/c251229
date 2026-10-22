export function getRoleLabel(role?: string | null): string {
  return ({ owner: '조직 소유자', admin: '관리자', member: '일반 회원' } as Record<string, string>)[role || ''] || '미지정';
}

export function getSourceLabel(source: string): string {
  const labels: Record<string, string> = {
    'seoul-clinic': '서울시 의원', 'seoul-hospital': '서울시 병원',
    'gg-clinic': '경기도 의원', 'gg-hospital': '경기도 병원', 'gg-academy': '경기도 학원',
    'gg-restaurant': '경기도 음식점', 'gg-food-trucks': '경기도 푸드트럭', 'gg-coffee-shops': '경기도 커피숍',
    'gg-jncl-univ': '경기도 전문대학', 'gg-univ': '경기도 대학교',
  };
  return labels[source] || '기타 공공데이터';
}

export function getActionLabel(action?: string | null): string {
  const labels: Record<string, string> = {
    LOGIN: '로그인', LOGOUT: '로그아웃', SIGNUP: '회원가입',
    USER_APPROVED: '회원가입 승인', USER_APPROVAL_REVOKED: '승인 취소', USER_DELETED: '회원 삭제',
    APPROVED: '승인', REJECTED: '승인 취소', ROLE_CHANGE: '역할 변경',
    ADMIN_TIER_CHANGE: '서비스 등급 변경', ADMIN_USER_DELETE: '회원 삭제',
    LEAD_IMPORT: '잠재고객 가져오기', LEAD_STATUS_UPDATE: '영업 상태 변경', LEAD_NOTE_UPDATE: '영업 메모 수정',
    LEAD_DELETE: '잠재고객 삭제', CALL_LOG: '통화 기록', PROPOSAL_CREATE: '제안서 작성',
    PROPOSAL_SENT: '제안서 발송', PROPOSAL_DOWNLOAD: '제안서 내려받기', PROPOSAL_DELETE: '제안서 삭제',
    DOWNLOAD: '파일 내려받기', VIEW: '조회', TASK_CREATE: '업무 생성', TASK_COMPLETE: '업무 완료',
    INVENTORY_UPDATE: '광고매체 수정', INVENTORY_UPLOAD: '광고매체 업로드', CONTRACT_CREATE: '계약 등록',
  };
  return labels[action || ''] || '기타 시스템 작업';
}
