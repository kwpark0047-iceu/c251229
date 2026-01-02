'use client';

import { useTheme } from './ThemeProvider';
import { Sun, Moon, Monitor } from 'lucide-react';

type ThemeValue = 'light' | 'dark' | 'system';

interface ThemeOption {
  value: ThemeValue;
  icon: typeof Sun;
  label: string;
  color: string;
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const themes: ThemeOption[] = [
    { value: 'light', icon: Sun, label: '라이트', color: '#EF7C1C' },
    { value: 'dark', icon: Moon, label: '다크', color: '#996CAC' },
    { value: 'system', icon: Monitor, label: '시스템', color: '#00A5DE' },
  ];

  return (
    <div className="flex gap-1 p-1 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-subtle)]">
      {themes.map(({ value, icon: Icon, label, color }) => {
        const isActive = theme === value;
        return (
          <button
            key={value}
            onClick={() => setTheme(value)}
            className={
              isActive
                ? 'p-2.5 rounded-lg transition-all duration-300 text-white shadow-md'
                : 'p-2.5 rounded-lg transition-all duration-300 text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]'
            }
            style={isActive ? {
              background: color,
              boxShadow: '0 2px 10px ' + color + '40',
            } : {}}
            title={label}
          >
            <Icon className="w-5 h-5" />
          </button>
        );
      })}
    </div>
  );
}

export function ThemeToggleSimple() {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] hover:border-[var(--metro-line5)] text-[var(--text-muted)] hover:text-[var(--metro-line5)] transition-all duration-300"
      title={resolvedTheme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="w-5 h-5" />
      ) : (
        <Moon className="w-5 h-5" />
      )}
    </button>
  );
}
