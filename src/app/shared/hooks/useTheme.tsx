/**
 * 다크모드 테마 훅
 * 테마 전환, 시스템 설정 감지, 지속성
 */

import { useState, useEffect, useCallback } from 'react';

export type Theme = 'light' | 'dark' | 'system';

// 테마 관련 상수
export const THEME_STORAGE_KEY = 'wemarket-theme';
export const THEME_COLORS = {
  light: {
    primary: '#2563eb',
    secondary: '#64748b',
    background: '#ffffff',
    surface: '#f9fafb',
    text: '#111827',
    textSecondary: '#6b7280',
    border: '#e5e7eb',
    error: '#ef4444',
    warning: '#f59e0b',
    success: '#10b981',
    info: '#3b82f6',
  },
  dark: {
    primary: '#3b82f6',
    secondary: '#9ca3af',
    background: '#111827',
    surface: '#1f2937',
    text: '#f9fafb',
    textSecondary: '#9ca3af',
    border: '#374151',
    error: '#f87171',
    warning: '#fbbf24',
    success: '#34d399',
    info: '#60a5fa',
  },
} as const;

/**
 * 테마 훅
 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>('system');
  const [isDark, setIsDark] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // 시스템 테마 감지
  const getSystemTheme = useCallback((): 'light' | 'dark' => {
    if (typeof window === 'undefined') return 'light';
    
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }, []);

  // 테마 적용
  const applyTheme = useCallback((theme: Theme) => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    const isDarkMode = theme === 'dark' || (theme === 'system' && getSystemTheme() === 'dark');

    // CSS 변수 설정
    Object.entries(THEME_COLORS[isDarkMode ? 'dark' : 'light']).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });

    // 데이터 속성 설정
    root.setAttribute('data-theme', theme);
    root.setAttribute('data-color-mode', isDarkMode ? 'dark' : 'light');

    // 메타 태그 설정
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', THEME_COLORS[isDarkMode ? 'dark' : 'light'].background);
    }

    setIsDark(isDarkMode);
  }, [getSystemTheme]);

  // 테마 변경
  const changeTheme = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
    applyTheme(newTheme);
    
    // 로컬 스토리지에 저장
    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    }
  }, [applyTheme]);

  // 테마 토글
  const toggleTheme = useCallback(() => {
    if (theme === 'light') {
      changeTheme('dark');
    } else if (theme === 'dark') {
      changeTheme('light');
    } else {
      changeTheme('dark');
    }
  }, [theme, changeTheme]);

  // 초기화
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 로컬 스토리지에서 테마 로드
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme;
    const initialTheme = savedTheme || 'system';
    
    setTheme(initialTheme);
    applyTheme(initialTheme);
    setIsLoaded(true);

    // 시스템 테마 변경 감지
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, applyTheme]);

  return {
    theme,
    isDark,
    isLoaded,
    changeTheme,
    toggleTheme,
    systemTheme: getSystemTheme(),
  };
}

/**
 * 테마 컨텍스트
 */
import { createContext, useContext } from 'react';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  isLoaded: boolean;
  changeTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  systemTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeData = useTheme();

  return (
    <ThemeContext.Provider value={themeData}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
}

/**
 * 테마 유틸리티 함수
 */
export const themeUtils = {
  // 테마 색상 가져오기
  getColor: (colorName: keyof typeof THEME_COLORS.light, theme: 'light' | 'dark' = 'light') => {
    return THEME_COLORS[theme][colorName];
  },

  // 현재 테마 색상 가져오기
  getCurrentColor: (colorName: keyof typeof THEME_COLORS.light) => {
    if (typeof window === 'undefined') return THEME_COLORS.light[colorName];
    
    const isDark = document.documentElement.getAttribute('data-color-mode') === 'dark';
    return THEME_COLORS[isDark ? 'dark' : 'light'][colorName];
  },

  // 테마 적용 가능 여부 확인
  isSupported: () => {
    return typeof window !== 'undefined' && 'matchMedia' in window;
  },

  // 테마 전환 애니메이션
  transitionTheme: (callback: () => void) => {
    if (typeof document === 'undefined') {
      callback();
      return;
    }

    const root = document.documentElement;
    root.style.transition = 'background-color 0.3s ease, color 0.3s ease';
    
    callback();
    
    setTimeout(() => {
      root.style.transition = '';
    }, 300);
  },

  // 테마 CSS 클래스 생성
  getThemeClass: (theme: Theme) => {
    return `theme-${theme}`;
  },

  // 다크모드 여부 확인
  isDarkMode: () => {
    if (typeof window === 'undefined') return false;
    
    return (
      document.documentElement.getAttribute('data-color-mode') === 'dark' ||
      window.matchMedia('(prefers-color-scheme: dark)').matches
    );
  },

  // 테마 초기화
  initialize: () => {
    if (typeof window === 'undefined') return;

    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme;
    const theme = savedTheme || 'system';
    
    const root = document.documentElement;
    const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    root.setAttribute('data-theme', theme);
    root.setAttribute('data-color-mode', isDarkMode ? 'dark' : 'light');

    // CSS 변수 설정
    Object.entries(THEME_COLORS[isDarkMode ? 'dark' : 'light']).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });
  },
};

/**
 * 테마 커스텀 훅
 */
export function useThemeColors() {
  const { isDark } = useThemeContext();
  
  return {
    colors: THEME_COLORS[isDark ? 'dark' : 'light'],
    isDark,
  };
}

/**
 * 테마 전환 버튼 훅
 */
export function useThemeToggle() {
  const { theme, toggleTheme } = useThemeContext();
  
  const getNextTheme = (): Theme => {
    if (theme === 'light') return 'dark';
    if (theme === 'dark') return 'system';
    return 'light';
  };

  const getThemeIcon = (): string => {
    switch (theme) {
      case 'light':
        return 'sun';
      case 'dark':
        return 'moon';
      default:
        return 'computer';
    }
  };

  const getThemeLabel = (): string => {
    switch (theme) {
      case 'light':
        return '라이트 모드';
      case 'dark':
        return '다크 모드';
      default:
        return '시스템 모드';
    }
  };

  return {
    toggleTheme,
    getNextTheme,
    getThemeIcon,
    getThemeLabel,
  };
}

/**
 * 테마 감시 훅
 */
export function useThemeWatcher(callback: (theme: Theme, isDark: boolean) => void) {
  const { theme, isDark } = useThemeContext();

  useEffect(() => {
    callback(theme, isDark);
  }, [theme, isDark, callback]);
}

/**
 * 테마 로컬 스토리지 훅
 */
export function useThemeStorage() {
  const saveTheme = useCallback((theme: Theme) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
  }, []);

  const loadTheme = useCallback((): Theme | null => {
    if (typeof window === 'undefined') return null;
    
    return localStorage.getItem(THEME_STORAGE_KEY) as Theme;
  }, []);

  const removeTheme = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(THEME_STORAGE_KEY);
    }
  }, []);

  return {
    saveTheme,
    loadTheme,
    removeTheme,
  };
}

/**
 * 테마 미디어 쿼리 훅
 */
export function useThemeMediaQuery() {
  const [prefersDark, setPrefersDark] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersDark(e.matches);
    };

    setPrefersDark(mediaQuery.matches);
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersDark;
}

/**
 * 테마 애니메이션 훅
 */
export function useThemeAnimation() {
  const [isAnimating, setIsAnimating] = useState(false);

  const animateThemeChange = useCallback((callback: () => void) => {
    if (typeof document === 'undefined') {
      callback();
      return;
    }

    setIsAnimating(true);
    
    const root = document.documentElement;
    root.style.transition = 'background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease';
    
    callback();
    
    setTimeout(() => {
      root.style.transition = '';
      setIsAnimating(false);
    }, 300);
  }, []);

  return {
    isAnimating,
    animateThemeChange,
  };
}
