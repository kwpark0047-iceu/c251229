/**
 * 다크모드 테마 컴포넌트
 * 테마 전환 버튼, 테마 인디케이터, 테마 설정
 */

'use client';

import React, { useState } from 'react';
import { useThemeContext, useThemeToggle, useThemeColors } from '../hooks/useTheme';
import { Sun, Moon, Monitor, Check, Palette } from 'lucide-react';

// 테마 전환 버튼 컴포넌트
export function ThemeToggle() {
  const { theme, toggleTheme } = useThemeContext();
  const { getThemeIcon, getThemeLabel } = useThemeToggle();
  const { isDark } = useThemeColors();

  const iconMap = {
    sun: Sun,
    moon: Moon,
    computer: Monitor,
  };

  const Icon = iconMap[getThemeIcon() as keyof typeof iconMap];

  return (
    <button
      onClick={toggleTheme}
      className={`
        relative p-2 rounded-lg transition-all duration-200
        ${isDark 
          ? 'bg-gray-800 text-gray-200 hover:bg-gray-700' 
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
      `}
      title={getThemeLabel()}
      aria-label={`현재 테마: ${getThemeLabel()}. 클릭하여 테마 변경`}
    >
      <Icon className="w-5 h-5" />
      
      {/* 테마 인디케이터 */}
      <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full" />
    </button>
  );
}

// 테마 선택기 컴포넌트
export function ThemeSelector() {
  const { theme, changeTheme } = useThemeContext();
  const { colors } = useThemeColors();
  const [isOpen, setIsOpen] = useState(false);

  const themes = [
    { value: 'light', label: '라이트', icon: Sun, description: '밝은 테마' },
    { value: 'dark', label: '다크', icon: Moon, description: '어두운 테마' },
    { value: 'system', label: '시스템', icon: Monitor, description: '시스템 설정 따르기' },
  ] as const;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200
          ${colors.background === '#ffffff' 
            ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
            : 'bg-gray-800 text-gray-200 hover:bg-gray-700'
          }
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        `}
        aria-label="테마 선택"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <Palette className="w-4 h-4" />
        <span className="text-sm font-medium">
          {themes.find(t => t.value === theme)?.label}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className={`
          absolute top-full mt-2 w-48 rounded-lg shadow-lg border
          ${colors.background === '#ffffff' 
            ? 'bg-white border-gray-200' 
            : 'bg-gray-800 border-gray-700'
          }
          z-50
        `}>
          <div className="p-1" role="listbox">
            {themes.map(({ value, label, icon: Icon, description }) => (
              <button
                key={value}
                onClick={() => {
                  changeTheme(value);
                  setIsOpen(false);
                }}
                className={`
                  w-full flex items-center space-x-3 px-3 py-2 rounded-md transition-colors
                  ${theme === value
                    ? colors.background === '#ffffff'
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-blue-900 text-blue-200'
                    : colors.background === '#ffffff'
                      ? 'hover:bg-gray-100 text-gray-700'
                      : 'hover:bg-gray-700 text-gray-200'
                  }
                `}
                role="option"
                aria-selected={theme === value}
              >
                <Icon className="w-4 h-4" />
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium">{label}</div>
                  <div className="text-xs opacity-70">{description}</div>
                </div>
                {theme === value && (
                  <Check className="w-4 h-4" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// 테마 인디케이터 컴포넌트
export function ThemeIndicator() {
  const { theme, isDark } = useThemeContext();
  const { colors } = useThemeColors();

  const getThemeStatus = () => {
    switch (theme) {
      case 'light':
        return { label: '라이트 모드', color: 'bg-yellow-500' };
      case 'dark':
        return { label: '다크 모드', color: 'bg-blue-500' };
      default:
        return { label: '시스템 모드', color: 'bg-gray-500' };
    }
  };

  const { label, color } = getThemeStatus();

  return (
    <div className={`
      flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-medium
      ${colors.background === '#ffffff' 
        ? 'bg-gray-100 text-gray-700' 
        : 'bg-gray-800 text-gray-200'
      }
    `}>
      <div className={`w-2 h-2 rounded-full ${color}`} />
      <span>{label}</span>
    </div>
  );
}

// 테마 설정 패널 컴포넌트
export function ThemeSettings() {
  const { theme, changeTheme } = useThemeContext();
  const { colors } = useThemeColors();
  const [customSettings, setCustomSettings] = useState({
    enableAnimations: true,
    enableTransitions: true,
    reduceMotion: false,
  });

  const handleSettingChange = (key: string, value: boolean) => {
    setCustomSettings(prev => ({ ...prev, [key]: value }));
    
    // 실제로는 설정을 localStorage에 저장하고 적용
    if (key === 'enableAnimations') {
      document.documentElement.style.setProperty('--enable-animations', value ? '1' : '0');
    }
  };

  return (
    <div className={`
      p-6 rounded-lg space-y-6
      ${colors.background === '#ffffff' 
        ? 'bg-white border border-gray-200' 
        : 'bg-gray-800 border border-gray-700'
      }
    `}>
      <h3 className="text-lg font-semibold">테마 설정</h3>
      
      {/* 테마 선택 */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">테마 모드</h4>
        <div className="grid grid-cols-3 gap-3">
          {[
            { value: 'light', label: '라이트', icon: Sun },
            { value: 'dark', label: '다크', icon: Moon },
            { value: 'system', label: '시스템', icon: Monitor },
          ].map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => changeTheme(value as any)}
              className={`
                flex flex-col items-center space-y-2 p-3 rounded-lg border-2 transition-colors
                ${theme === value
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : colors.background === '#ffffff'
                    ? 'border-gray-200 hover:border-gray-300'
                    : 'border-gray-700 hover:border-gray-600'
                }
              `}
            >
              <Icon className="w-6 h-6" />
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 애니메이션 설정 */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">애니메이션</h4>
        <div className="space-y-2">
          {[
            { key: 'enableAnimations', label: '애니메이션 활성화' },
            { key: 'enableTransitions', label: '전환 효과 활성화' },
            { key: 'reduceMotion', label: '모션 감소' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center justify-between">
              <span className="text-sm">{label}</span>
              <input
                type="checkbox"
                checked={customSettings[key as keyof typeof customSettings]}
                onChange={(e) => handleSettingChange(key, e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </label>
          ))}
        </div>
      </div>

      {/* 미리보기 */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">미리보기</h4>
        <div className="grid grid-cols-2 gap-4">
          <div
            className={`
              p-4 rounded-lg border
              ${colors.background === '#ffffff' 
                ? 'bg-white border-gray-200' 
                : 'bg-gray-900 border-gray-700'
              }
            `}
          >
            <div className="text-sm font-medium mb-2">라이트 모드</div>
            <div className="space-y-1">
              <div className="h-2 bg-gray-200 rounded"></div>
              <div className="h-2 bg-gray-200 rounded w-3/4"></div>
              <div className="h-2 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
          
          <div
            className={`
              p-4 rounded-lg border
              ${colors.background === '#111827' 
                ? 'bg-gray-900 border-gray-700' 
                : 'bg-white border-gray-200'
              }
            `}
          >
            <div className="text-sm font-medium mb-2">다크 모드</div>
            <div className="space-y-1">
              <div className="h-2 bg-gray-700 rounded"></div>
              <div className="h-2 bg-gray-700 rounded w-3/4"></div>
              <div className="h-2 bg-gray-700 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// 테마 전환 애니메이션 컴포넌트
export function ThemeTransition({ children }: { children: React.ReactNode }) {
  const { isDark } = useThemeColors();
  const [isTransitioning, setIsTransitioning] = useState(false);

  const handleThemeChange = () => {
    setIsTransitioning(true);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  return (
    <div
      className={`
        transition-all duration-300 ease-in-out
        ${isTransitioning ? 'scale-95 opacity-50' : 'scale-100 opacity-100'}
      `}
      style={{
        backgroundColor: colors.background,
        color: colors.text,
      }}
    >
      {children}
    </div>
  );
}

// 테마 커스터마이저 컴포넌트
export function ThemeCustomizer() {
  const { colors } = useThemeColors();
  const [customColors, setCustomColors] = useState({
    primary: colors.primary,
    secondary: colors.secondary,
    background: colors.background,
    surface: colors.surface,
    text: colors.text,
  });

  const handleColorChange = (colorName: string, value: string) => {
    setCustomColors(prev => ({ ...prev, [colorName]: value }));
    // 실제로는 CSS 커스텀 속성을 업데이트
    document.documentElement.style.setProperty(`--custom-${colorName}`, value);
  };

  return (
    <div className={`
      p-6 rounded-lg space-y-6
      ${colors.background === '#ffffff' 
        ? 'bg-white border border-gray-200' 
        : 'bg-gray-800 border border-gray-700'
      }
    `}>
      <h3 className="text-lg font-semibold">테마 커스터마이징</h3>
      
      <div className="space-y-4">
        {Object.entries(customColors).map(([colorName, value]) => (
          <div key={colorName} className="flex items-center space-x-4">
            <label className="text-sm font-medium capitalize min-w-20">
              {colorName}
            </label>
            <input
              type="color"
              value={value}
              onChange={(e) => handleColorChange(colorName, e.target.value)}
              className="w-12 h-8 rounded cursor-pointer"
            />
            <input
              type="text"
              value={value}
              onChange={(e) => handleColorChange(colorName, e.target.value)}
              className={`
                flex-1 px-3 py-1 rounded border text-sm
                ${colors.background === '#ffffff' 
                  ? 'bg-white border-gray-300' 
                  : 'bg-gray-700 border-gray-600 text-gray-200'
                }
              `}
            />
          </div>
        ))}
      </div>

      <div className="flex space-x-3">
        <button
          onClick={() => {
            // 기본값으로 리셋
            Object.entries(THEME_COLORS.light).forEach(([key, value]) => {
              handleColorChange(key, value);
            });
          }}
          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
        >
          기본값으로 리셋
        </button>
        
        <button
          onClick={() => {
            // 커스텀 테마 저장
            localStorage.setItem('wemarket-custom-theme', JSON.stringify(customColors));
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          저장
        </button>
      </div>
    </div>
  );
}
