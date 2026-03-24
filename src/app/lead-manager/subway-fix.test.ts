import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

describe('Subway Display Fix Verification', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.restoreAllMocks();
    });
    describe('Line Code Standardization', () => {
        it('should convert KRIC numeric codes to simple line names in kric-data-manager', async () => {
            const { getLineDisplayName: getLineDisplayNameManager } = await import('./kric-data-manager');
            expect(getLineDisplayNameManager('1001')).toBe('1');
            expect(getLineDisplayNameManager('1002')).toBe('2');
            expect(getLineDisplayNameManager('1077')).toBe('S'); // Shinbundang
            expect(getLineDisplayNameManager('1085')).toBe('B'); // Suin-Bundang
            expect(getLineDisplayNameManager('Unknown')).toBe('Unknown');
        });

        it('should convert line codes to Korean names in subway-utils (for tooltips)', async () => {
            const { getLineDisplayName: getLineDisplayNameUtils } = await import('./utils/subway-utils');
            expect(getLineDisplayNameUtils('1')).toBe('1호선');
            expect(getLineDisplayNameUtils('2')).toBe('2호선');
            expect(getLineDisplayNameUtils('S')).toBe('신분당');
            expect(getLineDisplayNameUtils('B')).toBe('수인분당');
        });
    });

    describe('API Validation Logic', () => {
        it('should return false if API call returns success: false', async () => {
            vi.doMock('axios', () => ({
                default: {
                    get: vi.fn().mockResolvedValueOnce({ data: { success: false, error: 'Invalid Key' } })
                }
            }));
            
            const { validateServiceKey } = await import('./kric-api');
            
            // Case 1: Proxy returns error
            const result = await validateServiceKey('invalid-key');
            expect(result).toBe(false);
        });

        it('should return false if API call returns empty items', async () => {
            vi.doMock('axios', () => ({
                default: {
                    get: vi.fn().mockResolvedValueOnce({ 
                        data: { 
                            success: true, 
                            data: { body: { items: { item: [] } } } 
                        } 
                    })
                }
            }));
            
            const { validateServiceKey } = await import('./kric-api');
            
            // Case 2: Proxy returns empty data
            const result = await validateServiceKey('empty-key');
            expect(result).toBe(false);
        });

        it('should return true if API call returns valid station data', async () => {
            vi.doMock('axios', () => ({
                default: {
                    get: vi.fn().mockResolvedValue({
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
                    })
                }
            }));

            const { validateServiceKey } = await import('./kric-api');
            const result = await validateServiceKey('valid-key');
            expect(result).toBe(true);
        });
    });
});
