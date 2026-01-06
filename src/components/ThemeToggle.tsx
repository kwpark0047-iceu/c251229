'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)] transition-all hover:scale-105"
      title={theme === 'dark' ? '라이트 모드' : '다크 모드'}
    >
      {theme === 'dark' ? (
        <Sun className="w-5 h-5 text-[var(--text-muted)] hover:text-yellow-400" />
      ) : (
        <Moon className="w-5 h-5 text-[var(--text-muted)] hover:text-blue-500" />
      )}
    </button>
  );
}
