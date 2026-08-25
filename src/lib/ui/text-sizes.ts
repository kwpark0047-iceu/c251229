/**
 * TEXT_SIZES - 통일된 텍스트 크기 계층
 * 
 * 사용법: TEXT_SIZES.h1, TEXT_SIZES.body, 등
 * 
 * 단위: 'px' 또는 'rem'
 */

export const TEXT_SIZES = {
  // 제목 계층 (H1-H6)
  h1: '3xl',    // 48px - 주요 섹션 제목
  h2: '2xl',    // 32px - 카드 제목
  h3: 'xl',     // 24px - 섹션 서브타이틀
  h4: 'lg',     // 18px - 카드 서브타이틀
  h5: 'md',     // 14px - 라벨/필터
  h6: 'sm',     // 12px - 보조 텍스트

  // 본문 계층
  body: 'lg',   // 18px - 메인 텍스트
  body_sm: 'md',// 14px - 보디 스몰

  // 라벨/필터/바지
  label: 'sm',  // 12px - 라벨
  filter: 'sm', // 12px - 드롭다운 필터
  badge: 'xs',  // 10px - 배지

  // 캡션/보조
  caption: 'xs',// 10px - 캡션
  caption_sm: '0.75rem', // 12px - 아주 작은 캡션

  // 숫자/카운트
  number: 'xl', // 24px - 중요 숫자
  count: 'lg',  // 18px - 카운트
} as const;

export type TextSizeKey = keyof typeof TEXT_SIZES;

/**
 * 텍스트 크기 클래스 생성 헬퍼
 */
export function textSizeClass(key: TextSizeKey, weight?: 'normal' | 'bold', lineHeight?: 'normal' | 'relaxed' | 'tight'): string {
  const size = TEXT_SIZES[key];
  const weightClass = weight === 'bold' ? 'font-black' : 'font-normal';
  const lineHeightClassMap: { [k: string]: string } = {
    relaxed: 'leading-relaxed',
    tight: 'leading-tight',
    normal: 'leading-normal',
    default: 'leading-normal',
  };
  const lineHeightClass = lineHeightClassMap[lineHeight || 'default'] || 'leading-normal';
  
  return `text-${size} ${weightClass} ${lineHeightClass} tracking-[0.2em]`;
}

/**
 * 크기별 일반적인 조합 반환
 */
export const textSizePresets = {
  h1: 'text-3xl font-black leading-tighter',
  h2: 'text-2xl font-black tracking-tighter',
  h3: 'text-xl font-black text-white',
  h4: 'text-lg font-semibold',
  h5: 'text-md font-medium uppercase tracking-wider',
  h6: 'text-sm font-bold uppercase tracking-widest',
  body: 'text-lg font-normal leading-relaxed',
  body_sm: 'text-md font-normal',
  label: 'text-sm font-black uppercase tracking-widest',
  filter: 'text-sm font-bold uppercase tracking-wider',
  badge: 'text-xs font-black',
  caption: 'text-xs text-slate-400',
  caption_sm: 'text-xs text-slate-500',
  number: 'text-3xl font-black',
  count: 'text-lg font-black',
} as const;