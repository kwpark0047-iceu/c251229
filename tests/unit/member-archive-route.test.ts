import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ session: vi.fn(), admin: vi.fn(), rpc: vi.fn(), ban: vi.fn(), permanentDelete: vi.fn(), email: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.session }));
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.admin }));
vi.mock('@/lib/email-service', () => ({ sendEmail: mocks.email }));
import { DELETE, PATCH, POST } from '@/app/api/admin/users/[id]/route';
const targetId = '22222222-2222-4222-8222-222222222222';
const actorId = '11111111-1111-4111-8111-111111111111';
const context = { params: Promise.resolve({ id: targetId }) };
let status: string;
function request(method: string, body: object) { return new Request(`http://localhost/api/admin/users/${targetId}`, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); }
beforeEach(() => {
  vi.clearAllMocks(); status = 'ACTIVE';
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'synthetic-server-key');
  const client = { auth: { getUser: async () => ({ data: { user: { id: actorId } } }) }, rpc: mocks.rpc,
    from: () => { let fields = ''; const q = { select: (s: string) => { fields = s; return q; }, eq: () => q,
      maybeSingle: async () => ({ data: fields.startsWith('is_super_admin') ? { is_super_admin: true, account_status: 'ACTIVE' } : { id: targetId, email: 'synthetic@example.com', is_super_admin: false, is_approved: status === 'ACTIVE', account_status: status }, error: null }) }; return q; } };
  mocks.session.mockResolvedValue(client);
  mocks.rpc.mockResolvedValue({ data: { user_id: targetId, archived: true, already: false }, error: null });
  mocks.ban.mockResolvedValue({ error: null });
  mocks.admin.mockReturnValue({ auth: { admin: { updateUserById: mocks.ban, deleteUser: mocks.permanentDelete } } });
});
afterEach(() => vi.unstubAllEnvs());
describe('회원 삭제·보관 API', () => {
  it('영구 삭제 대신 원자적 보관 RPC를 호출한다', async () => {
    const response = await DELETE(request('DELETE', { confirmationEmail: 'synthetic@example.com', archiveReason: '합성 사유' }), context);
    expect(response.status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith('transition_member_archive', { p_user_id: targetId, p_archive: true, p_reason: '합성 사유' });
    expect(mocks.permanentDelete).not.toHaveBeenCalled();
    expect(mocks.email).not.toHaveBeenCalled();
  });
  it('외부 Auth 응답으로 최신 보관·복구 상태를 덮어쓰지 않는다', async () => {
    mocks.ban.mockResolvedValue({ error: { message: 'synthetic private' } });
    const result = await (await DELETE(request('DELETE', { confirmationEmail: 'synthetic@example.com' }), context)).json();
    expect(result).toMatchObject({ success: true, warnings: [] });
    expect(mocks.ban).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain('private');
  });
  it('마지막 소유자 등 RPC 거부는 Auth를 변경하지 않는다', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code: '23514', message: 'private' } });
    expect((await DELETE(request('DELETE', { confirmationEmail: 'synthetic@example.com' }), context)).status).toBe(409);
    expect(mocks.ban).not.toHaveBeenCalled();
  });
  it('보관 계정은 바로 승인하거나 안내 이메일을 보낼 수 없다', async () => {
    status = 'ARCHIVED';
    expect((await PATCH(request('PATCH', { isApproved: true }), context)).status).toBe(409);
    expect((await POST(request('POST', {}), context)).status).toBe(409);
    expect(mocks.email).not.toHaveBeenCalled();
  });
  it('복구는 별도 RPC를 거치며 승인 메일을 발송하지 않는다', async () => {
    status = 'ARCHIVED';
    mocks.rpc.mockResolvedValue({ data: { user_id: targetId, archived: false, already: false }, error: null });
    expect((await PATCH(request('PATCH', { restore: true }), context)).status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith('transition_member_archive', { p_user_id: targetId, p_archive: false, p_reason: null });
    expect(mocks.email).not.toHaveBeenCalled();
  });
});
