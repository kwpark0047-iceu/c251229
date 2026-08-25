/**
 * COLOR_THEME - 통일된 색상 테마 (3 primary에서 3으로 축소)
 * 
 * 기존: 6개 색상 (인디고, 에메랄드, 로즈, 암버, 주자, 자줏빛)
 * 축소: 3개 핵심 색상 + 네이티브 네임
 * 
 * 사용법: COLOR_THEME.primary, COLOR_THEME.background 등
 */

export const COLOR_THEME = {
  // 핵심 3색상 (이전 6색상에서 핵심 3가지 추출)
  primary: 'indigo',      // 신뢰/관리자 - 가장 많이 사용
  secondary: 'emerald',   // 활성/정상 상태
  accent: 'amber',        // 경고/주의/트라이얼
  
  // 네이티브 색상 이름 (국문/문서 호환)
  indigo: 'indigo',
  emerald: 'emerald', 
  amber: 'amber',
  
  // 배경/보조
  background: '#050505',     // 다크 모드 전체 배경
  surface: '#0f172a',        // 카드/배경 서피스
  card: '#1e293b',           // 개별 카드 배경
  border: '#334155',         // 테두리
  
  // 텍스트 색상
  text_primary: '#f8fafc',   // 메인 텍스트
  text_secondary: '#94a3b8', // 서브 텍스트
  text_muted: '#64748b',     // 미uted 텍스트
  text_on_primary: '#ffffff', // primary 텍스트 위에 올리는 색
  
  // 상태 색상
  success: '#10b981',        // 성공/승인
  warning: '#f59e0b',        // 경고/대기
  error: '#ef4444',          // 에러/거절
  info: '#63b3ed',           // 정보
  
  // 그라데이션 시작/끝 색상
  gradient_from: 'indigo-600',
  gradient_to: 'purple-600',
} as const;

export type ColorThemeKey = keyof typeof COLOR_THEME;

/**
 * 테마 색상 매핑 클래스 생성
 */
export function colorClass(key: ColorThemeKey, opacity?: number | string): string {
  const base = COLOR_THEME[key];
  
  // 색상이 테마 내장일 경우
  if (COLOR_THEME[base as ColorThemeKey]) {
    return `bg-${base}-500${opacity ? `/${opacity}` : ''} text-${base}-400`;
  }
  
  // hex 색상인 경우
  if (base.startsWith('#')) {
    return `bg-${base}${opacity ? opacity : ''}`;
  }
  
  // 기본값
  return `bg-indigo-500 text-indigo-400`;
}

/**
 * 테마별 사전 정의된 그라데이션
 */
export const gradientPresets = {
  primary: 'from-indigo-500 to-purple-500',
  secondary: 'from-emerald-500 to-emerald-400',
  accent: 'from-amber-500 to-orange-500',
  info: 'from-indigo-500 to-blue-400',
  success: 'from-emerald-400 to-emerald-300',
  warning: 'from-amber-500 to-orange-400',
  error: 'from-rose-500 to-rose-400',
} as const;