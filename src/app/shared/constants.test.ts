import { describe, it, expect } from 'vitest';
import { LINE_COLORS, LINE_NAMES } from './constants';

describe('Shared Constants', () => {
    it('should have correct line colors', () => {
        expect(LINE_COLORS['1']).toBe('#0052A4');
        expect(LINE_COLORS['2']).toBe('#00A84D');
    });

    it('should have correct line names', () => {
        expect(LINE_NAMES['1']).toBe('1호선');
        expect(LINE_NAMES['2']).toBe('2호선');
    });

    it('should match keys between colors and names', () => {
        const colorKeys = Object.keys(LINE_COLORS).sort();
        const nameKeys = Object.keys(LINE_NAMES).sort();
        expect(colorKeys).toEqual(nameKeys);
    });
});
