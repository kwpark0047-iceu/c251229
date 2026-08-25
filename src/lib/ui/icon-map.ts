/**
 * ICON_MAP - 통일된 아이콘 매핑 및 크기 표준화
 * 
 * 아이콘 사용 패턴 통일:
 * - 모든 아이콘에 일관된 크기 적용
 * - 카테고리별 통일된 색상 체계
 * - 호버/액티브 상태 통일된 스타일
 */

export const ICON_MAP = {
  // 크기 표준 (모든 아이콘은 기본적으로 'w-4 h-4' 또는 'w-5 h-5' 사용)
  size_xs: 'w-3.5 h-3.5',    // 배지, 라벨 안
  size_sm: 'w-4 h-4',        // 일반 버튼, 필터
  size_md: 'w-5 h-5',        // 카드, KPI 섹션
  size_lg: 'w-6 h-6',        // 큰 카드, 테이블 헤더
  size_xl: 'w-8 h-8',        // 모달, 드롭다운 헤더

  // 카테고리별 아이콘 매핑 (LucideReact에서 사용)
  categories: {
    // 사용자/프로필 관련
    user: 'Users',
    admin: 'Shield',
    profile: 'UserCheck',
    
    // 데이터/동기화 관련
    sync: 'Activity',
    download: 'Download',
    upload: 'Upload',
    database: 'FileText',
    
    // 상태/승인 관련
    approved: 'CheckCircle',
    pending: 'AlertCircle',
    revoked: 'XCircle',
    
    // 조직/기관 관련
    organization: 'Building',
    team: 'Users',
    member: 'User',
    
    // 등급/등급 관련
    tier_free: 'Free',
    tier_demo: 'Trial',
    tier_medium: 'Media',
    tier_sales: 'Sales',
    
    // API/설정 관련
    api: 'Settings',
    refresh: 'Activity',
    test: 'Square',
    
    // 알림/로그 관련
    notification: 'Bell',
    audit: 'Activity',
    history: 'History',
    alert: 'AlertCircle',
    
    // 플랜/데이터 관련
    plan: 'Calendar',
    data: 'Download',
    lead: 'Users',
    proposal: 'FileText',
    
    // 기타
    search: 'Search',
    menu: 'Menu',
    close: 'X',
    arrow_down: 'ChevronDown',
    pencil: 'Edit',
    trash: 'Trash2',
    calendar: 'Calendar',
    shield: 'Shield',
    info: 'Info',
  } as const,
} as const;

export type IconCategory = keyof typeof ICON_MAP.categories;
export type IconSizeKey = 'size_xs' | 'size_sm' | 'size_md' | 'size_lg' | 'size_xl';

/**
 * 아이콘 크기 클래스 생성
 */
export function iconSizeClass(size: IconSizeKey): string {
  return ICON_MAP[size];
}

/**
 * 카테고리별 아이콘 이름 반환
 */
export function iconName(category: IconCategory): string {
  return ICON_MAP.categories[category];
}

/**
 * 상태별 아이콘 + 색상 조합
 */
export const statusIconMap = {
  approved: {
    icon: 'CheckCircle',
    baseColor: 'emerald',
    bgColor: 'emerald-500/10',
    textColor: 'emerald-400',
    shadow: 'shadow-emerald-500/5',
  },
  pending: {
    icon: 'AlertCircle',
    baseColor: 'amber',
    bgColor: 'amber-500/10',
    textColor: 'amber-400',
    shadow: 'shadow-amber-500/5',
  },
  rejected: {
    icon: 'XCircle',
    baseColor: 'rose',
    bgColor: 'rose-500/10',
    textColor: 'rose-400',
    shadow: 'shadow-rose-500/5',
  },
  verified: {
    icon: 'CheckCircle',
    baseColor: 'emerald',
    bgColor: 'emerald-500/10',
    textColor: 'emerald-400',
    shadow: 'shadow-emerald-500/5',
  },
} as const;

/**
 * 상태 아이콘 클래스 생성
 */
export function statusIconClass(status: keyof typeof statusIconMap): string {
  const map = statusIconMap[status];
  return `w-3.5 h-3.5 ${map.baseColor}-400 ${map.bgColor} ${map.textColor} ${map.shadow}`;
}

/**
 * 버튼 아이콘 헬퍼 (호버/액티브 상태 포함)
 */
export const buttonIconPresets = {
  primary: {
    normal: 'text-indigo-400 hover:text-indigo-300',
    active: 'bg-indigo-500/10 hover:bg-indigo-400',
  },
  secondary: {
    normal: 'text-emerald-400 hover:text-emerald-300',
    active: 'bg-emerald-500/10 hover:bg-emerald-400',
  },
  accent: {
    normal: 'text-amber-400 hover:text-amber-300',
    active: 'bg-amber-500/10 hover:bg-amber-400',
  },
} as const;