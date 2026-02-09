
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateEffectAnalysis, getDefaultGreeting, createProposal } from './proposal-service';
import { AdInventory, Lead } from './types';

// Mock Supabase
const mockInsert = vi.fn();
const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockIn = vi.fn();
const mockSingle = vi.fn();

const mockFrom = vi.fn((table) => {
    return {
        select: mockSelect,
        insert: mockInsert,
        update: mockUpdate,
    };
});

mockSelect.mockReturnThis();
mockInsert.mockReturnThis();
mockUpdate.mockReturnThis();

mockSelect.mockImplementation(() => ({
    eq: mockEq,
    in: mockIn,
    single: mockSingle,
    order: vi.fn().mockReturnThis()
}));
mockEq.mockReturnThis();
mockIn.mockReturnThis();

vi.mock('@/lib/supabase/utils', () => ({
    getSupabase: () => ({
        from: mockFrom
    })
}));

vi.mock('./auth-service', () => ({
    getOrganizationId: vi.fn().mockResolvedValue('org-123')
}));

describe('proposal-service', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('generateEffectAnalysis', () => {
        it('should calculate daily impressions and monthly reach correctly', () => {
            const inventory: AdInventory[] = [
                { id: '1', trafficDaily: 1000 } as AdInventory,
                { id: '2', trafficDaily: 2000 } as AdInventory
            ];

            const analysis = generateEffectAnalysis(inventory);

            expect(analysis.dailyImpressions).toBe(3000);
            expect(analysis.monthlyReach).toBe(Math.round(3000 * 30 * 0.3));
        });

        it('should estimate demographics based on medical subject', () => {
            const lead = { medicalSubject: '피부과' } as Lead;
            const analysis = generateEffectAnalysis([], lead);
            expect(analysis.targetDemographics).toContain('20-40대 여성');
        });
    });

    describe('getDefaultGreeting', () => {
        it('should generate greeting with provided names', () => {
            const greeting = getDefaultGreeting('ABC병원', '강남');
            expect(greeting).toContain('ABC병원 원장님께');
            expect(greeting).toContain('강남역 인근에서');
        });

        it('should use defaults if names are missing', () => {
            const greeting = getDefaultGreeting(undefined, undefined);
            expect(greeting).toContain('원장님 원장님께'); // Logic uses '원장님' as default for bizName
            expect(greeting).toContain('인근역 인근에서');
        });
    });

    describe('createProposal', () => {
        it('should create a proposal successfully', async () => {
            // Setup Mocks
            const mockLead = { biz_name: 'Test Biz', nearest_station: 'Test Station' };
            const mockInventory = [{ id: 'inv-1', price_monthly: 100 }];
            const mockProposal = { id: 'prop-1', title: 'Test Proposal' };

            // Mock chains
            // lead lookup
            mockSingle.mockResolvedValueOnce({ data: mockLead });
            // inventory lookup
            mockIn.mockResolvedValueOnce({ data: mockInventory });
            // insert proposal
            mockSingle.mockResolvedValueOnce({ data: mockProposal });

            const result = await createProposal('lead-1', ['inv-1']);

            expect(result.success).toBe(true);
            expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
                lead_id: 'lead-1',
                inventory_ids: ['inv-1'],
                total_price: 100
            }));
            expect(result.proposal?.title).toBe('Test Proposal');
        });

        it('should handle errors gracefully', async () => {
            mockSingle.mockRejectedValueOnce(new Error('DB Error'));

            const result = await createProposal('lead-1', ['inv-1']);

            expect(result.success).toBe(false);
            expect(result.message).toContain('DB Error');
        });
    });
});
