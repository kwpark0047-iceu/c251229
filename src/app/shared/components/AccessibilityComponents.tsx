/**
 * 접근성 개선 컴포넌트
 * ARIA 라벨, 키보드 내비게이션, 스크린 리더 지원
 */

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useFocusManagement, useKeyboardNavigation, useScreenReader, useFocusIndicator } from './hooks/useAccessibility';

// 접근성 버튼 컴포넌트
interface AccessibleButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  ariaLabel?: string;
  ariaDescribedBy?: string;
  className?: string;
}

export function AccessibleButton({
  children,
  onClick,
  disabled = false,
  variant = 'primary',
  size = 'md',
  ariaLabel,
  ariaDescribedBy,
  className = '',
}: AccessibleButtonProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isKeyboardUser = useFocusIndicator();

  const baseClasses = 'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 focus:outline-none';
  
  const variantClasses = {
    primary: 'bg-blue-500 text-white hover:bg-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2',
    danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-2 focus:ring-red-500 focus:ring-offset-2',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  const focusClasses = isKeyboardUser ? 'ring-2 ring-offset-2' : '';

  return (
    <button
      ref={buttonRef}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${focusClasses}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      {children}
    </button>
  );
}

// 접근성 모달 컴포넌트
interface AccessibleModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnEscape?: boolean;
  closeOnBackdrop?: boolean;
}

export function AccessibleModal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closeOnEscape = true,
  closeOnBackdrop = true,
}: AccessibleModalProps) {
  const { containerRef, focusFirstElement } = useFocusManagement(isOpen);
  const { announce } = useScreenReader();

  // 모달 열릴 때 스크린 리더 알림
  useEffect(() => {
    if (isOpen) {
      announce(`${title} 모달이 열렸습니다`);
      // 배경 스크롤 방지
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen, title, announce]);

  // ESC 키로 닫기
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen, closeOnEscape, onClose]);

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />
      
      {/* 모달 */}
      <div
        ref={containerRef}
        className={`
          relative bg-white rounded-lg shadow-xl w-full mx-4
          ${sizeClasses[size]}
        `}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby="modal-content"
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 id="modal-title" className="text-xl font-semibold">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500"
            aria-label="모달 닫기"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* 콘텐츠 */}
        <div id="modal-content" className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

// 접근성 토글 컴포넌트
interface AccessibleToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function AccessibleToggle({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = 'md',
}: AccessibleToggleProps) {
  const toggleRef = useRef<HTMLButtonElement>(null);
  const { announce } = useScreenReader();

  const handleToggle = useCallback(() => {
    const newState = !checked;
    onChange(newState);
    announce(`${label}이(가) ${newState ? '켜짐' : '꺼짐'}`);
  }, [checked, onChange, label, announce]);

  const sizeClasses = {
    sm: 'w-8 h-4',
    md: 'w-11 h-6',
    lg: 'w-14 h-8',
  };

  const thumbSizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <div className="flex items-center space-x-3">
      <button
        ref={toggleRef}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={handleToggle}
        disabled={disabled}
        className={`
          relative inline-flex items-center rounded-full transition-colors
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
          ${checked ? 'bg-blue-500' : 'bg-gray-300'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${sizeClasses[size]}
        `}
      >
        <span
          className={`
            inline-block rounded-full bg-white transition-transform
            ${thumbSizeClasses[size]}
            ${checked ? 'translate-x-full' : 'translate-x-0'}
          `}
        />
      </button>
      
      <div className="flex flex-col">
        <label className="text-sm font-medium text-gray-900">
          {label}
        </label>
        {description && (
          <p className="text-xs text-gray-500">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

// 접근성 선택 컴포넌트
interface AccessibleSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; disabled?: boolean }[];
  label: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}

export function AccessibleSelect({
  value,
  onChange,
  options,
  label,
  placeholder = '선택하세요',
  disabled = false,
  required = false,
}: AccessibleSelectProps) {
  const selectRef = useRef<HTMLSelectElement>(null);
  const { announce } = useScreenReader();

  const handleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    const selectedOption = options.find(opt => opt.value === newValue);
    if (selectedOption) {
      announce(`${selectedOption.label}이(가) 선택되었습니다`);
    }
  }, [onChange, options, announce]);

  return (
    <div className="space-y-1">
      <label htmlFor={label} className="block text-sm font-medium text-gray-900">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      <select
        ref={selectRef}
        id={label}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        required={required}
        className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
        aria-describedby={required ? `${label}-required` : undefined}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
      
      {required && (
        <p id={`${label}-required`} className="text-xs text-gray-500">
          필수 항목입니다
        </p>
      )}
    </div>
  );
}

// 접근성 툴팁 컴포넌트
interface AccessibleTooltipProps {
  content: string;
  children: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
}

export function AccessibleTooltip({
  content,
  children,
  placement = 'top',
  delay = 300,
}: AccessibleTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const tooltipRef = useRef<HTMLDivElement>(null);

  const showTooltip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
    }, delay);
  }, [delay]);

  const hideTooltip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  }, []);

  const placementClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 transform -translate-x-1/2 -mt-1',
    bottom: 'bottom-full left-1/2 transform -translate-x-1/2 -mb-1',
    left: 'left-full top-1/2 transform -translate-y-1/2 -ml-1',
    right: 'right-full top-1/2 transform -translate-y-1/2 -mr-1',
  };

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        tabIndex={0}
        role="button"
        aria-describedby="tooltip-content"
      >
        {children}
      </div>
      
      {isVisible && (
        <div
          ref={tooltipRef}
          className={`
            absolute z-50 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg
            ${placementClasses[placement]}
          `}
          role="tooltip"
          id="tooltip-content"
        >
          {content}
          <div
            className={`
              absolute w-2 h-2 bg-gray-900 transform rotate-45
              ${arrowClasses[placement]}
            `}
          />
        </div>
      )}
    </div>
  );
}

// 접근성 로딩 스피너 컴포넌트
interface AccessibleSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export function AccessibleSpinner({ size = 'md', label = '로딩 중' }: AccessibleSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex items-center justify-center" role="status" aria-live="polite">
      <div
        className={`
          animate-spin rounded-full border-2 border-gray-300 border-t-blue-500
          ${sizeClasses[size]}
        `}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </div>
  );
}

// 접근성 건너뛰기 링크 컴포넌트
export function SkipLinks() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleFocus = () => setIsVisible(true);
    const handleBlur = () => setIsVisible(false);

    document.addEventListener('focus', handleFocus, true);
    document.addEventListener('blur', handleBlur, true);

    return () => {
      document.removeEventListener('focus', handleFocus, true);
      document.removeEventListener('blur', handleBlur, true);
    };
  }, []);

  const skipToMain = () => {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.focus();
      mainContent.scrollIntoView();
    }
  };

  const skipToNavigation = () => {
    const navigation = document.getElementById('main-navigation');
    if (navigation) {
      navigation.focus();
      navigation.scrollIntoView();
    }
  };

  return (
    <div
      className={`
        fixed top-0 left-0 z-50 p-2 bg-white border border-gray-300 rounded-lg
        transform -translate-y-full focus:translate-y-0 transition-transform
        ${isVisible ? 'focus:translate-y-0' : ''}
      `}
    >
      <a
        href="#main-content"
        onClick={skipToMain}
        className="block px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        메인 콘텐츠로 건너뛰기
      </a>
      <a
        href="#main-navigation"
        onClick={skipToNavigation}
        className="block px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        내비게이션으로 건너뛰기
      </a>
    </div>
  );
}

// 접근성 테스트 결과 컴포넌트
interface AccessibilityTestResultsProps {
  violations: any[];
  onFix?: (violation: any) => void;
}

export function AccessibilityTestResults({ violations, onFix }: AccessibilityTestResultsProps) {
  if (violations.length === 0) {
    return (
      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
        <p className="text-green-800">✅ 접근성 검사를 통과했습니다!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-red-800 font-semibold">
          ⚠️ {violations.length}개의 접근성 문제가 발견되었습니다
        </h3>
      </div>
      
      <div className="space-y-2">
        {violations.map((violation, index) => (
          <div key={index} className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-semibold text-yellow-800">
              {violation.description}
            </h4>
            <p className="text-sm text-yellow-700 mt-1">
              영향: {violation.impact}
            </p>
            {onFix && (
              <button
                onClick={() => onFix(violation)}
                className="mt-2 px-3 py-1 text-sm bg-yellow-500 text-white rounded hover:bg-yellow-600"
              >
                수정하기
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
