/**
 * 접근성 훅
 * 키보드 내비게이션, 포커스 관리, 스크린 리더 지원
 */

import { useState, useEffect, useRef, useCallback } from 'react';

// 포커스 관리 훅
export function useFocusManagement(isOpen: boolean = false) {
  const containerRef = useRef<HTMLElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // 포커스 가능한 요소들
  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];
    
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
    ];
    
    return Array.from(
      containerRef.current.querySelectorAll(focusableSelectors.join(', '))
    ) as HTMLElement[];
  }, []);

  // 첫 번째 포커스 가능한 요소로 포커스
  const focusFirstElement = useCallback(() => {
    const focusableElements = getFocusableElements();
    if (focusableElements.length > 0) {
      focusableElements[0].focus();
    }
  }, [getFocusableElements]);

  // 포커스 트랩
  const trapFocus = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;
    
    const focusableElements = getFocusableElements();
    if (focusableElements.length === 0) return;
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      }
    } else {
      if (document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    }
  }, [isOpen, getFocusableElements]);

  // 모달/패널 열릴 때 이전 포커스 저장 및 첫 요소 포커스
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement as HTMLElement;
      setTimeout(focusFirstElement, 100);
    } else {
      // 닫힐 때 이전 포커스 복원
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    }
  }, [isOpen, focusFirstElement]);

  // 키보드 이벤트 리스너
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', trapFocus);
      return () => document.removeEventListener('keydown', trapFocus);
    }
  }, [isOpen, trapFocus]);

  return {
    containerRef,
    focusFirstElement,
    focusableElements: getFocusableElements(),
  };
}

// 키보드 내비게이션 훅
export function useKeyboardNavigation(
  items: any[],
  onSelect?: (item: any, index: number) => void,
  options: {
    orientation?: 'vertical' | 'horizontal';
    loop?: boolean;
    disabled?: boolean;
  } = {}
) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const { orientation = 'vertical', loop = true, disabled = false } = options;

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (disabled) return;

    const isVertical = orientation === 'vertical';
    const nextKey = isVertical ? 'ArrowDown' : 'ArrowRight';
    const prevKey = isVertical ? 'ArrowUp' : 'ArrowLeft';

    switch (e.key) {
      case nextKey:
        e.preventDefault();
        setActiveIndex(prev => {
          const next = prev + 1;
          if (next >= items.length) {
            return loop ? 0 : prev;
          }
          return next;
        });
        break;
      
      case prevKey:
        e.preventDefault();
        setActiveIndex(prev => {
          const prev = prev - 1;
          if (prev < 0) {
            return loop ? items.length - 1 : 0;
          }
          return prev;
        });
        break;
      
      case 'Home':
        e.preventDefault();
        setActiveIndex(0);
        break;
      
      case 'End':
        e.preventDefault();
        setActiveIndex(items.length - 1);
        break;
      
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < items.length) {
          onSelect?.(items[activeIndex], activeIndex);
        }
        break;
      
      case 'Escape':
        setActiveIndex(-1);
        break;
    }
  }, [items, activeIndex, orientation, loop, disabled, onSelect]);

  return {
    activeIndex,
    setActiveIndex,
    handleKeyDown,
  };
}

// 스크린 리더 알림 훅
export function useScreenReader() {
  const announcementRef = useRef<HTMLDivElement>(null);

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!announcementRef.current) return;

    announcementRef.current.setAttribute('aria-live', priority);
    announcementRef.current.textContent = message;
    
    // 메시지를 지우기 위해 잠시 후에 빈 문자열 설정
    setTimeout(() => {
      if (announcementRef.current) {
        announcementRef.current.textContent = '';
      }
    }, 1000);
  }, []);

  const Component = useCallback(() => (
    <div
      ref={announcementRef}
      className="sr-only"
      aria-live="polite"
      aria-atomic="true"
    />
  ), []);

  return { announce, Announcer: Component };
}

// 접근성 테스트 훅
export function useAccessibilityTest() {
  const [violations, setViolations] = useState<any[]>([]);
  const [isTesting, setIsTesting] = useState(false);

  const runAccessibilityTest = useCallback(async () => {
    setIsTesting(true);
    
    try {
      // axe-core를 사용한 접근성 테스트 (실제 구현에서는 라이브러리 설치 필요)
      // const axe = await import('axe-core');
      // const results = await axe.run(document.body);
      // setViolations(results.violations);
      
      // 임시 테스트 결과
      const mockViolations = [
        {
          id: 'color-contrast',
          description: '색상 대비율 부족',
          impact: 'serious',
          nodes: [],
        },
      ];
      
      setViolations(mockViolations);
    } catch (error) {
      console.error('Accessibility test failed:', error);
    } finally {
      setIsTesting(false);
    }
  }, []);

  return {
    violations,
    isTesting,
    runTest: runAccessibilityTest,
  };
}

// 포커스 표시 훅
export function useFocusIndicator() {
  const [isKeyboardUser, setIsKeyboardUser] = useState(false);

  useEffect(() => {
    const handleMouseDown = () => {
      setIsKeyboardUser(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Tab 키 사용 시 키보드 사용자로 간주
      if (e.key === 'Tab') {
        setIsKeyboardUser(true);
      }
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return isKeyboardUser;
}

// 점프 링크 훅
export function useSkipLinks() {
  const [showSkipLinks, setShowSkipLinks] = useState(false);

  useEffect(() => {
    const handleFocus = () => setShowSkipLinks(true);
    const handleBlur = () => setShowSkipLinks(false);

    document.addEventListener('focus', handleFocus, true);
    document.addEventListener('blur', handleBlur, true);

    return () => {
      document.removeEventListener('focus', handleFocus, true);
      document.removeEventListener('blur', handleBlur, true);
    };
  }, []);

  const skipToMain = useCallback(() => {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.focus();
      mainContent.scrollIntoView();
    }
  }, []);

  const skipToNavigation = useCallback(() => {
    const navigation = document.getElementById('main-navigation');
    if (navigation) {
      navigation.focus();
      navigation.scrollIntoView();
    }
  }, []);

  return {
    showSkipLinks,
    skipToMain,
    skipToNavigation,
  };
}

// ARIA 라벨 생성 훅
export function useAriaLabel() {
  const generateLabel = useCallback((element: HTMLElement, context?: string) => {
    const tagName = element.tagName.toLowerCase();
    const type = element.getAttribute('type');
    const placeholder = element.getAttribute('placeholder');
    const title = element.getAttribute('title');
    const ariaLabel = element.getAttribute('aria-label');
    const labelledBy = element.getAttribute('aria-labelledby');
    
    let label = '';

    // 우선순위에 따라 라벨 결정
    if (ariaLabel) {
      label = ariaLabel;
    } else if (labelledBy) {
      const labelledElement = document.getElementById(labelledBy);
      if (labelledElement) {
        label = labelledElement.textContent || '';
      }
    } else if (title) {
      label = title;
    } else if (placeholder) {
      label = placeholder;
    }

    // 컨텍스트 추가
    if (context) {
      label = `${context}: ${label}`;
    }

    // 요소 타입 추가
    if (type) {
      label = `${label} (${type})`;
    }

    return label.trim();
  }, []);

  const setAriaLabel = useCallback((element: HTMLElement, label: string) => {
    element.setAttribute('aria-label', label);
  }, []);

  const setAriaDescribedBy = useCallback((element: HTMLElement, descriptionId: string) => {
    element.setAttribute('aria-describedby', descriptionId);
  }, []);

  return {
    generateLabel,
    setAriaLabel,
    setAriaDescribedBy,
  };
}

// 접근성 유틸리티 함수
export const accessibilityUtils = {
  // 색상 대비율 계산
  getContrastRatio: (color1: string, color2: string): number => {
    // 실제 구현에서는 색상 대비율 계산 로직 필요
    return 4.5; // 임시 값
  },

  // 색상이 접근성 기준을 만족하는지 확인
  isColorAccessible: (foreground: string, background: string, level: 'AA' | 'AAA' = 'AA'): boolean => {
    const ratio = accessibilityUtils.getContrastRatio(foreground, background);
    return level === 'AA' ? ratio >= 4.5 : ratio >= 7;
  },

  // 포커스 가능한 요소인지 확인
  isFocusable: (element: HTMLElement): boolean => {
    const tagName = element.tagName.toLowerCase();
    const focusableTags = ['button', 'input', 'select', 'textarea', 'a'];
    
    if (focusableTags.includes(tagName)) {
      return !element.hasAttribute('disabled');
    }
    
    return element.hasAttribute('tabindex') && element.getAttribute('tabindex') !== '-1';
  },

  // ARIA 역할이 유효한지 확인
  isValidAriaRole: (role: string): boolean => {
    const validRoles = [
      'alert', 'alertdialog', 'application', 'article', 'banner', 'button', 'cell',
      'checkbox', 'columnheader', 'combobox', 'complementary', 'contentinfo', 'definition',
      'dialog', 'directory', 'document', 'feed', 'figure', 'form', 'grid', 'gridcell',
      'group', 'heading', 'img', 'link', 'list', 'listbox', 'listitem', 'log', 'main',
      'marquee', 'math', 'menu', 'menubar', 'menuitem', 'menuitemcheckbox', 'menuitemradio',
      'navigation', 'none', 'note', 'option', 'presentation', 'progressbar', 'radio',
      'radiogroup', 'region', 'row', 'rowgroup', 'rowheader', 'scrollbar', 'search',
      'searchbox', 'separator', 'slider', 'spinbutton', 'status', 'switch', 'tab',
      'table', 'tablist', 'tabpanel', 'term', 'textbox', 'timer', 'toolbar', 'tooltip',
      'tree', 'treegrid', 'treeitem'
    ];
    
    return validRoles.includes(role);
  },

  // 키보드 접근성 확인
  isKeyboardAccessible: (element: HTMLElement): boolean => {
    const tagName = element.tagName.toLowerCase();
    
    // 기본 키보드 접근 가능 요소
    const keyboardAccessibleTags = ['button', 'input', 'select', 'textarea', 'a'];
    
    if (keyboardAccessibleTags.includes(tagName)) {
      return !element.hasAttribute('disabled');
    }
    
    // tabindex가 있는 요소
    if (element.hasAttribute('tabindex') && element.getAttribute('tabindex') !== '-1') {
      return true;
    }
    
    // ARIA role이 있는 요소
    const role = element.getAttribute('role');
    if (role && accessibilityUtils.isValidAriaRole(role)) {
      return true;
    }
    
    return false;
  },
};
