import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

import { getLineDisplayName as getLineDisplayNameManager } from './kric-data-manager';
import { getLineDisplayName as getLineDisplayNameUtils } from './utils/subway-utils';
import { validateServiceKey } from './kric-api';

describe('Subway Display Fix Verification', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });
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
            // Case 1: Proxy returns error
            vi.spyOn(axios, 'get').mockResolvedValueOnce({ data: { success: false, error: 'Invalid Key' } });
            expect(await validateServiceKey('invalid-key')).toBe(false);

            // Case 2: Proxy returns empty data
            vi.spyOn(axios, 'get').mockResolvedValueOnce({ data: { success: true, data: { body: { items: { item: [] } } } } });
            expect(await validateServiceKey('empty-key')).toBe(false);
        });

        it('should return true if API call returns valid station data', async () => {
            vi.spyOn(axios, 'get').mockResolvedValueOnce({
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
