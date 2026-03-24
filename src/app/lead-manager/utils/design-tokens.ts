/**
 * design-tokens.ts
 * 최신 트렌드 3D 입체 디자인 토큰 정의
 */

export type ThemeType = 'glass' | 'neo' | 'antigravity';

export const DESIGN_THEMES = {
  glass: {
    name: 'Glassmorphism',
    className: 'theme-glass',
    variables: {
      '--glass-bg': 'rgba(255, 255, 255, 0.1)',
      '--glass-border': 'rgba(255, 255, 255, 0.2)',
      '--glass-blur': '15px',
      '--glass-shadow': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
      '--card-3d-transform': 'translateZ(0)',
    }
  },
  neo: {
    name: 'Neumorphism',
    className: 'theme-neo',
    variables: {
      '--neo-bg': '#e0e5ec',
      '--neo-shadow-light': '9px 9px 16px rgb(163,177,198,0.6)',
      '--neo-shadow-dark': '-9px -9px 16px rgba(255,255,255, 0.5)',
      '--card-3d-transform': 'perspective(1000px) rotateX(2deg)',
    }
  },
  antigravity: {
    name: 'Antigravity 3D',
    className: 'theme-antigravity',
    variables: {
      '--float-animation': 'float 3s ease-in-out infinite',
      '--layer-shadow': '0 20px 40px rgba(0,0,0,0.3), 0 15px 12px rgba(0,0,0,0.2)',
      '--card-3d-transform': 'translateY(-10px) rotateY(1deg)',
    }
  }
};

/**
 * 테마에 따른 CSS 변수를 root 또는 특정 요소에 주입하는 함수
 */
export const applyThemeVariables = (theme: ThemeType) => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const tokens = DESIGN_THEMES[theme].variables;
  
  Object.entries(tokens).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  
  // 테마 클래스 교체
  Object.values(DESIGN_THEMES).forEach(t => root.classList.remove(t.className));
  root.classList.add(DESIGN_THEMES[theme].className);
};

/**
 * 현재 테마에 맞는 카드 클래스를 반환하는 헬퍼
 */
export const getCardClass = () => {
    return 'glass-card neo-card float-card'; 
    // CSS Selector (.theme-glass .glass-card) 덕분에 이 방식이 가장 간편합니다.
};
