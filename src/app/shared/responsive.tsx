/**
 * 반응형 그리드 시스템
 * Tailwind CSS 커스텀 유틸리티
 */

import { useState, useEffect } from 'react';

// 브레이크포인트 정의
export const BREAKPOINTS = {
  sm: 640,   // 모바일
  md: 768,   // 태블릿
  lg: 1024,  // 작은 데스크톱
  xl: 1280,  // 데스크톱
  '2xl': 1536, // 큰 데스크톱
} as const;

type Breakpoint = keyof typeof BREAKPOINTS;

/**
 * 반응형 훅
 */
export function useBreakpoint(): Breakpoint {
  const [breakpoint, setBreakpoint] = useState<Breakpoint>('lg');

  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      
      if (width >= BREAKPOINTS['2xl']) {
        setBreakpoint('2xl');
      } else if (width >= BREAKPOINTS.xl) {
        setBreakpoint('xl');
      } else if (width >= BREAKPOINTS.lg) {
        setBreakpoint('lg');
      } else if (width >= BREAKPOINTS.md) {
        setBreakpoint('md');
      } else {
        setBreakpoint('sm');
      }
    };

    updateBreakpoint();
    window.addEventListener('resize', updateBreakpoint);
    
    return () => window.removeEventListener('resize', updateBreakpoint);
  }, []);

  return breakpoint;
}

/**
 * 미디어 쿼리 훅
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    
    if (media.matches !== matches) {
      setMatches(media.matches);
    }

    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
}

/**
 * 반응형 값 훅
 */
export function useResponsiveValue<T>(values: Partial<Record<Breakpoint, T>>): T {
  const breakpoint = useBreakpoint();
  
  // 현재 브레이크포인트 이상의 가장 작은 값을 찾음
  const breakpointOrder: Breakpoint[] = ['sm', 'md', 'lg', 'xl', '2xl'];
  const currentIndex = breakpointOrder.indexOf(breakpoint);
  
  for (let i = currentIndex; i >= 0; i--) {
    const bp = breakpointOrder[i];
    if (values[bp] !== undefined) {
      return values[bp]!;
    }
  }
  
  // 기본값 (lg)
  return values.lg as T;
}

/**
 * 반응형 컴포넌트 래퍼
 */
interface ResponsiveWrapperProps {
  children: React.ReactNode;
  className?: string;
  breakpoint?: Breakpoint;
  hideBelow?: Breakpoint;
  hideAbove?: Breakpoint;
}

export function ResponsiveWrapper({
  children,
  className = '',
  breakpoint,
  hideBelow,
  hideAbove,
}: ResponsiveWrapperProps) {
  const currentBreakpoint = useBreakpoint();
  const breakpointOrder: Breakpoint[] = ['sm', 'md', 'lg', 'xl', '2xl'];
  
  // 숨김 조건 확인
  const shouldHide = () => {
    if (hideBelow) {
      const currentIndex = breakpointOrder.indexOf(currentBreakpoint);
      const hideIndex = breakpointOrder.indexOf(hideBelow);
      return currentIndex < hideIndex;
    }
    
    if (hideAbove) {
      const currentIndex = breakpointOrder.indexOf(currentBreakpoint);
      const hideIndex = breakpointOrder.indexOf(hideAbove);
      return currentIndex > hideIndex;
    }
    
    return false;
  };

  if (shouldHide()) {
    return null;
  }

  return <div className={className}>{children}</div>;
}

/**
 * 반응형 그리드 컴포넌트
 */
interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  cols?: Partial<Record<Breakpoint, number>>;
  gap?: Partial<Record<Breakpoint, number>>;
  autoFit?: boolean;
  minItemWidth?: number;
}

export function ResponsiveGrid({
  children,
  className = '',
  cols = { sm: 1, md: 2, lg: 3, xl: 4, '2xl': 5 },
  gap = { sm: 2, md: 3, lg: 4, xl: 4, '2xl': 6 },
  autoFit = false,
  minItemWidth = 250,
}: ResponsiveGridProps) {
  const gridCols = useResponsiveValue(cols);
  const gridGap = useResponsiveValue(gap);

  const gridStyle: React.CSSProperties = autoFit
    ? {
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(${minItemWidth}px, 1fr))`,
        gap: `${gridGap * 0.25}rem`,
      }
    : {
        display: 'grid',
        gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
        gap: `${gridGap * 0.25}rem`,
      };

  return (
    <div className={className} style={gridStyle}>
      {children}
    </div>
  );
}

/**
 * 반응형 텍스트 컴포넌트
 */
interface ResponsiveTextProps {
  children: React.ReactNode;
  className?: string;
  size?: Partial<Record<Breakpoint, string>>;
  weight?: Partial<Record<Breakpoint, string>>;
  align?: Partial<Record<Breakpoint, 'left' | 'center' | 'right'>>;
}

export function ResponsiveText({
  children,
  className = '',
  size = { sm: 'text-sm', md: 'text-base', lg: 'text-lg', xl: 'text-xl' },
  weight = { sm: 'font-normal', md: 'font-medium', lg: 'font-semibold' },
  align = { sm: 'left', md: 'left', lg: 'left' },
}: ResponsiveTextProps) {
  const textSize = useResponsiveValue(size);
  const textWeight = useResponsiveValue(weight);
  const textAlign = useResponsiveValue(align);

  return (
    <div
      className={`${className} ${textSize} ${textWeight}`}
      style={{ textAlign }}
    >
      {children}
    </div>
  );
}

/**
 * 반응형 컨테이너 컴포넌트
 */
interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: Partial<Record<Breakpoint, string>>;
  padding?: Partial<Record<Breakpoint, string>>;
}

export function ResponsiveContainer({
  children,
  className = '',
  maxWidth = { sm: '100%', md: '100%', lg: '1200px', xl: '1400px' },
  padding = { sm: '1rem', md: '1.5rem', lg: '2rem', xl: '2rem' },
}: ResponsiveContainerProps) {
  const containerMaxWidth = useResponsiveValue(maxWidth);
  const containerPadding = useResponsiveValue(padding);

  return (
    <div
      className={`${className} mx-auto`}
      style={{
        maxWidth: containerMaxWidth,
        padding: containerPadding,
      }}
    >
      {children}
    </div>
  );
}

/**
 * 반응형 사이드바 컴포넌트
 */
interface ResponsiveSidebarProps {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  position?: 'left' | 'right';
  width?: Partial<Record<Breakpoint, string>>;
  overlay?: boolean;
}

export function ResponsiveSidebar({
  children,
  isOpen,
  onClose,
  position = 'left',
  width = { sm: '80vw', md: '400px', lg: '350px', xl: '400px' },
  overlay = true,
}: ResponsiveSidebarProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const sidebarWidth = useResponsiveValue(width);

  return (
    <>
      {/* 오버레이 */}
      {overlay && isOpen && isMobile && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
      )}
      
      {/* 사이드바 */}
      <div
        className={`
          fixed top-0 ${position === 'left' ? 'left-0' : 'right-0'} 
          h-full bg-white shadow-lg z-50 transform transition-transform duration-300
          ${isOpen ? 'translate-x-0' : position === 'left' ? '-translate-x-full' : 'translate-x-full'}
        `}
        style={{ width: sidebarWidth }}
      >
        <div className="h-full overflow-y-auto">
          {children}
        </div>
      </div>
    </>
  );
}

/**
 * 반응형 네비게이션 컴포넌트
 */
interface ResponsiveNavProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'horizontal' | 'vertical' | 'collapsible';
}

export function ResponsiveNav({
  children,
  className = '',
  variant = 'horizontal',
}: ResponsiveNavProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');

  const shouldCollapse = variant === 'collapsible' && isMobile;

  return (
    <nav className={className}>
      {shouldCollapse ? (
        <div>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          {isCollapsed && (
            <div className="mt-2 space-y-1">
              {children}
            </div>
          )}
        </div>
      ) : (
        <div className={variant === 'vertical' ? 'space-y-1' : 'flex space-x-1'}>
          {children}
        </div>
      )}
    </nav>
  );
}

/**
 * 반응형 카드 컴포넌트
 */
interface ResponsiveCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: Partial<Record<Breakpoint, string>>;
  shadow?: Partial<Record<Breakpoint, string>>;
  rounded?: Partial<Record<Breakpoint, string>>;
}

export function ResponsiveCard({
  children,
  className = '',
  padding = { sm: 'p-4', md: 'p-6', lg: 'p-8' },
  shadow = { sm: 'shadow', md: 'shadow-md', lg: 'shadow-lg' },
  rounded = { sm: 'rounded-lg', md: 'rounded-xl', lg: 'rounded-2xl' },
}: ResponsiveCardProps) {
  const cardPadding = useResponsiveValue(padding);
  const cardShadow = useResponsiveValue(shadow);
  const cardRounded = useResponsiveValue(rounded);

  return (
    <div className={`bg-white ${cardShadow} ${cardRounded} ${cardPadding} ${className}`}>
      {children}
    </div>
  );
}

/**
 * 반응형 유틸리티 함수
 */
export const responsive = {
  // 반응형 클래스 생성
  cls: (values: Partial<Record<Breakpoint, string>>): string => {
    return Object.entries(values)
      .map(([bp, value]) => {
        if (bp === 'lg') return value; // 기본값
        return `${bp}:${value}`;
      })
      .join(' ');
  },

  // 반응형 스타일 생성
  style: (values: Partial<Record<Breakpoint, React.CSSProperties>>): React.CSSProperties => {
    const breakpoint = useBreakpoint();
    const breakpointOrder: Breakpoint[] = ['sm', 'md', 'lg', 'xl', '2xl'];
    const currentIndex = breakpointOrder.indexOf(breakpoint);
    
    let style: React.CSSProperties = {};
    
    for (let i = currentIndex; i >= 0; i--) {
      const bp = breakpointOrder[i];
      if (values[bp]) {
        style = { ...style, ...values[bp] };
      }
    }
    
    return style;
  },

  // 브레이크포인트 확인
  is: (bp: Breakpoint): boolean => {
    const current = useBreakpoint();
    const breakpointOrder: Breakpoint[] = ['sm', 'md', 'lg', 'xl', '2xl'];
    return breakpointOrder.indexOf(current) >= breakpointOrder.indexOf(bp);
  },

  // 브레이크포인트 범위 확인
  between: (min: Breakpoint, max: Breakpoint): boolean => {
    const current = useBreakpoint();
    const breakpointOrder: Breakpoint[] = ['sm', 'md', 'lg', 'xl', '2xl'];
    const currentIndex = breakpointOrder.indexOf(current);
    const minIndex = breakpointOrder.indexOf(min);
    const maxIndex = breakpointOrder.indexOf(max);
    
    return currentIndex >= minIndex && currentIndex <= maxIndex;
  },
};
