
import { describe, it, expect } from 'vitest';
import { removeDuplicateLeads, createLeadKey, normalizeLeadKey, mergeDuplicateLeads } from './deduplication-utils';
import { Lead, LeadStatus } from './types';

// Mock Lead Factory
const createMockLead = (overrides: Partial<Lead> = {}): Lead => ({
    id: 'lead-1',
    bizName: 'Test Biz',
    roadAddress: '123 Test St',
    status: 'NEW' as LeadStatus, // Use Type Assertion to match Enum or String Union
    created_at: new Date().toISOString(),
    ...overrides
} as Lead);

describe('deduplication-utils', () => {
    describe('normalizeLeadKey', () => {
        it('should normalize strings by trimming and lowercasing', () => {
            expect(normalizeLeadKey('  Test Biz  ')).toBe('test biz');
            expect(normalizeLeadKey('Some   Business')).toBe('some business');
        });

        it('should return empty string for null/undefined', () => {
            expect(normalizeLeadKey(null)).toBe('');
            expect(normalizeLeadKey(undefined)).toBe('');
        });
    });

    describe('removeDuplicateLeads', () => {
        it('should remove exact duplicates based on key', () => {
            const leads = [
                createMockLead({ id: '1', bizName: 'ABC', roadAddress: 'Seoul' }),
                createMockLead({ id: '2', bizName: 'ABC', roadAddress: 'Seoul' }),
                createMockLead({ id: '3', bizName: 'XYZ', roadAddress: 'Busan' })
            ];

            const result = removeDuplicateLeads(leads);
            expect(result.uniqueCount).toBe(2);
            expect(result.duplicateCount).toBe(1);
            expect(result.uniqueLeads.map(l => l.id)).toEqual(['1', '3']);
        });

        it('should remove duplicates based on bizId', () => {
            const leads = [
                createMockLead({ id: '1', bizName: 'A', roadAddress: 'X', bizId: '12345' }),
                createMockLead({ id: '2', bizName: 'B', roadAddress: 'Y', bizId: '12345' }), // Different name/addr but same bizId
            ];

            const result = removeDuplicateLeads(leads, { checkBizId: true });
            expect(result.uniqueCount).toBe(1);
            expect(result.duplicates[0].id).toBe('2');
        });

        it('should keep first occurrence and mark rest as duplicates', () => {
            const leads = [
                createMockLead({ id: '1', bizName: 'Same', roadAddress: 'Road' }),
                createMockLead({ id: '2', bizName: 'Same', roadAddress: 'Road' }),
                createMockLead({ id: '3', bizName: 'Same', roadAddress: 'Road' }),
            ];
            const result = removeDuplicateLeads(leads);
            expect(result.uniqueCount).toBe(1);
            expect(result.duplicateCount).toBe(2);
            expect(result.uniqueLeads[0].id).toBe('1');
        });
    });

    describe('mergeDuplicateLeads', () => {
        it('should merge data from duplicate leads favoring non-empty values', () => {
            const lead1 = createMockLead({ id: '1', bizName: 'Main', roadAddress: '', phone: '' });
            const lead2 = createMockLead({ id: '2', bizName: 'Main', roadAddress: 'Full Address', phone: '010-1234-5678' });

            const merged = mergeDuplicateLeads([lead1, lead2]);

            expect(merged.roadAddress).toBe('Full Address');
            expect(merged.phone).toBe('010-1234-5678');
        });

        it('should prioritize data from higher score lead (usually more complete)', () => {
            // lead2 has more fields, so it should be the base, but merge function sorts by score
            // calculateDataScore checks for fields.
            const lead1 = createMockLead({ id: '1', bizName: 'A', roadAddress: 'B' });
            const lead2 = createMockLead({ id: '2', bizName: 'A', roadAddress: 'B', phone: '123', latitude: 37.0, longitude: 127.0 });

            const merged = mergeDuplicateLeads([lead1, lead2]);
            // Expect lead2 to be the base because it has higher score
            expect(merged.phone).toBe('123');
            expect(merged.latitude).toBe(37.0);
        });
    });
});
