import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ client: vi.fn(), user: vi.fn(), update: vi.fn() }));
vi.mock('@/lib/supabase/utils', () => ({ getSupabase: mocks.client }));
vi.mock('./auth-service', () => ({ getCurrentUser: mocks.user, getOrganizationId: vi.fn() }));
vi.mock('./lead-service', () => ({ updateLeadStatus: mocks.update }));
vi.mock('./activity-service', () => ({ ActivityService: { trackProposalCreate: vi.fn(), trackProposalSent: vi.fn() } }));
vi.mock('./utils/mapping-utils', () => ({ mapProposalFromDB: (value: unknown) => value }));
import { createProposal, markProposalSent } from './proposal-crud';

describe('제안서 상태 전환', () => {
  const query = {
    from: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(), in: vi.fn().mockResolvedValue({ data: [], error: null }),
    insert: vi.fn().mockReturnThis(), update: vi.fn().mockReturnThis(), single: vi.fn(),
  };
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.client.mockReturnValue(query);
    mocks.user.mockResolvedValue({ organizationId: 'org' });
    mocks.update.mockResolvedValue({ success: true });
  });
  it('초안 생성은 리드 상태를 변경하지 않는다', async () => {
    query.single.mockResolvedValueOnce({ data: { biz_name: '업체' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'proposal' }, error: null });
    expect((await createProposal('lead', [], { greetingMessage: '안녕하세요' })).success).toBe(true);
    expect(query.insert).toHaveBeenCalledWith(expect.objectContaining({ status: 'DRAFT' }));
    expect(mocks.update).not.toHaveBeenCalled();
  });
  it('발송 완료 저장 후 연결 리드를 갱신한다', async () => {
    query.single.mockResolvedValue({ data: { lead_id: 'lead' }, error: null });
    expect((await markProposalSent('proposal')).success).toBe(true);
    expect(mocks.update).toHaveBeenCalledWith('lead', 'PROPOSAL_SENT');
  });
  it('발송 상태 저장 실패 시 리드는 변경하지 않는다', async () => {
    query.single.mockResolvedValue({ data: null, error: { message: '저장 실패' } });
    expect((await markProposalSent('proposal')).success).toBe(false);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
