import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Lead } from '@/app/lead-manager/types';
const mocks = vi.hoisted(() => ({ update: vi.fn(), eq: vi.fn(), select: vi.fn(), single: vi.fn() }));
vi.mock('@/lib/supabase/utils', () => ({ getSupabase: () => ({ from: () => mocks }) }));
import { saveSopoLead } from '@/app/lead-manager/sopo-service';

describe('SOPO persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.update.mockReturnValue(mocks); mocks.eq.mockReturnValue(mocks);
    mocks.select.mockReturnValue(mocks); mocks.single.mockResolvedValue({ data: { id: 'lead' }, error: null });
  });
  const lead: Lead = { id: 'lead', bizName: '기존 상호', status: 'CONTACTED', organizationId: 'org', sopoBizesId: 'store', sopoBizName: '상가' };
  it('updates only enrichment fields and scopes by organization', async () => {
    await saveSopoLead(lead);
    expect(mocks.eq).toHaveBeenCalledWith('organization_id', 'org');
    const update = mocks.update.mock.calls[0][0];
    expect(update.sopo_bizes_id).toBe('store');
    expect(Object.keys(update).every(key => key.startsWith('sopo_'))).toBe(true);
  });
  it('rejects invisible or deleted rows rather than claiming success', async () => {
    mocks.single.mockResolvedValue({ data: null, error: null });
    await expect(saveSopoLead(lead)).rejects.toThrow('저장하지 못했습니다');
  });
  it('rejects unscoped writes', async () => {
    await expect(saveSopoLead({ ...lead, organizationId: undefined })).rejects.toThrow('조직');
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
