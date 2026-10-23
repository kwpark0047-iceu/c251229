import { afterEach, describe, expect, it } from 'vitest';
import { applyThemeVariables } from '@/app/lead-manager/utils/design-tokens';

afterEach(() => {
  document.documentElement.removeAttribute('style');
  document.documentElement.removeAttribute('class');
  document.documentElement.removeAttribute('data-theme');
});

describe('design effects preserve color mode', () => {
  it('does not override mode-owned glass colors with inline tokens', () => {
    document.documentElement.setAttribute('data-theme', 'light');
    applyThemeVariables('glass');
    expect(document.documentElement.style.getPropertyValue('--glass-bg')).toBe('');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });
  it('removes stale effect tokens when changing design', () => {
    applyThemeVariables('neo');
    applyThemeVariables('antigravity');
    expect(document.documentElement.style.getPropertyValue('--neo-bg')).toBe('');
    expect(document.documentElement.classList.contains('theme-neo')).toBe(false);
  });
  it('ignores invalid persisted effects without throwing', () => {
    expect(() => applyThemeVariables('invalid' as Parameters<typeof applyThemeVariables>[0])).not.toThrow();
    expect(() => applyThemeVariables('toString' as Parameters<typeof applyThemeVariables>[0])).not.toThrow();
  });
});
