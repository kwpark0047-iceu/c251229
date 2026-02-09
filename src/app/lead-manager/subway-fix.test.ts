import { describe, it, expect, vi } from 'vitest';
import { getLineDisplayName as getLineDisplayNameManager } from './kric-data-manager';
import { getLineDisplayName as getLineDisplayNameUtils } from './utils/subway-utils';
import { validateServiceKey } from './kric-api';

// Mocking axios for kric-api tests
vi.mock('axios', () => ({
    default: {
        get: vi.fn()
    }
}));

describe('Subway Display Fix Verification', () => {
    describe('Line Code Standardization', () => {
        it('should convert KRIC numeric codes to simple line names in kric-data-manager', () => {
            expect(getLineDisplayNameManager('1001')).toBe('1');
            expect(getLineDisplayNameManager('1002')).toBe('2');
            expect(getLineDisplayNameManager('1077')).toBe('S'); // Shinbundang
            expect(getLineDisplayNameManager('1085')).toBe('B'); // Suin-Bundang
            expect(getLineDisplayNameManager('Unknown')).toBe('Unknown');
        });

        it('should convert line codes to Korean names in subway-utils (for tooltips)', () => {
            expect(getLineDisplayNameUtils('1')).toBe('1호선');
            expect(getLineDisplayNameUtils('2')).toBe('2호선');
            expect(getLineDisplayNameUtils('S')).toBe('신분당');
            expect(getLineDisplayNameUtils('B')).toBe('수인분당');
        });
    });

    describe('API Validation Logic', () => {
        it('should return false if API call fails or returns no data', async () => {
            const axios = (await import('axios')).default;

            // Case 1: Proxy returns error
            (axios.get as any).mockResolvedValueOnce({ data: { success: false, error: 'Invalid Key' } });
            expect(await validateServiceKey('invalid-key')).toBe(false);

            // Case 2: Proxy returns empty data
            (axios.get as any).mockResolvedValueOnce({ data: { success: true, data: { body: { items: { item: [] } } } } });
            expect(await validateServiceKey('empty-key')).toBe(false);
        });

        it('should return true if API call returns valid station data', async () => {
            const axios = (await import('axios')).default;
            (axios.get as any).mockResolvedValueOnce({
                data: {
                    success: true,
                    data: {
                        body: {
                            items: {
                                item: [{ stinNm: 'Seoul Station' }]
                            }
                        }
                    }
                }
            });
            expect(await validateServiceKey('valid-key')).toBe(true);
        });
    });
});
