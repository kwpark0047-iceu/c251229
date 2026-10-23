import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ session: vi.fn(), admin: vi.fn(), email: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.session }));
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.admin }));
vi.mock('@/lib/email-service', () => ({ sendEmail: mocks.email }));
import { PATCH, DELETE, POST } from '@/app/api/admin/users/[id]/route';

const actorId = '11111111-1111-4111-8111-111111111111';
const targetId = '22222222-2222-4222-8222-222222222222';
const context = (id = targetId) => ({ params: Promise.resolve({ id }) });

describe('최고관리자 회원 처리', () => {
  let authenticated: boolean, superAdmin: boolean, protectedTarget: boolean, approved: boolean, conflict: boolean;
  let owners: object[], others: { user_id: string; role: string }[], databaseError: object | null;
  let leadCount: number | null = 0;
  let mutationError: object | null;
  const update = vi.fn(), remove = vi.fn(), audit = vi.fn();
  function request(method: string, body: object, origin = 'http://localhost') {
    return new Request(`http://localhost/api/admin/users/${targetId}`, {
      method, headers: { 'Content-Type': 'application/json', origin }, body: JSON.stringify(body),
    });
  }
  beforeEach(() => {
    vi.clearAllMocks();
    authenticated = true; superAdmin = true; protectedTarget = false; approved = false; conflict = false;
    owners = []; others = []; databaseError = null; mutationError = null; leadCount = 0;
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-only-key');
    mocks.email.mockResolvedValue({ success: true });
    remove.mockResolvedValue({ error: null });
    audit.mockResolvedValue({ error: null });
    const sessionClient = {
      rpc: vi.fn(async () => ({ data: { user_id: targetId, archived: true, already: false }, error: owners.length && !others.some(x=>x.role==='owner') || (leadCount ?? 0)>0 ? {code:'23514'} : null })),
      auth: { getUser: vi.fn(async () => ({ data: { user: authenticated ? { id: actorId, email: 'admin@example.com' } : null }, error: null })) },
      from: vi.fn((table: string) => {
        if (table === 'activity_logs') return { insert: audit };
        let fields = '', updating = false, otherMembers = false;
        const query = {
          select: vi.fn((value: string) => { fields = value; return query; }),
          eq: vi.fn(() => query),
          neq: vi.fn(() => { otherMembers = true; return query; }),
          limit: vi.fn(() => query),
          update: vi.fn((value: unknown) => { updating = true; update(value); return query; }),
          maybeSingle: vi.fn(async () => ({
            data: updating ? (conflict ? null : { id: targetId }) : fields.startsWith('is_super_admin')
              ? { is_super_admin: superAdmin, account_status: 'ACTIVE' }
              : { id: targetId, email: 'member@example.com', account_status: approved ? 'ACTIVE' : 'PENDING', is_approved: approved, is_super_admin: protectedTarget },
            error: updating ? mutationError : databaseError,
          })),
          then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: otherMembers ? others : owners, error: databaseError }).then(resolve),
        };
        return query;
      }),
    };
    mocks.session.mockResolvedValue(sessionClient);
    mocks.admin.mockReturnValue({ auth: { admin: { deleteUser: remove, updateUserById: vi.fn(async () => ({error:null})) } }, from: (table: string) => table === 'leads' ? { select: () => ({ eq: async () => ({ count: leadCount, error: null }) }) } : sessionClient.from(table) });
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

  it.each([
    ['42703', 'SCHEMA_CONFIGURATION', 503],
    ['PGRST204', 'SCHEMA_CONFIGURATION', 503],
    ['42P01', 'SCHEMA_CONFIGURATION', 503],
    ['PGRST205', 'SCHEMA_CONFIGURATION', 503],
    ['42501', 'PERMISSION_CONFIGURATION', 503],
    ['23503', 'DATA_CONFLICT', 409],
    ['23505', 'DATA_CONFLICT', 409],
    ['23514', 'DATA_CONFLICT', 409],
    ['08000', 'DATABASE_UNAVAILABLE', 503],
    ['08003', 'DATABASE_UNAVAILABLE', 503],
    ['08006', 'DATABASE_UNAVAILABLE', 503],
    ['53300', 'DATABASE_UNAVAILABLE', 503],
    ['57P01', 'DATABASE_UNAVAILABLE', 503],
    ['57014', 'DATABASE_UNAVAILABLE', 503],
    ['arbitrary member@example.com', 'UNKNOWN', 500],
    ['__proto__', 'UNKNOWN', 500],
  ])('저장 오류 %s를 비식별 분류하고 재시도·이메일을 실행하지 않는다', async (code, category, status) => {
    const logger = vi.spyOn(console, 'error').mockImplementation(() => {});
    mutationError = { code, message: `private ${targetId} member@example.com`, details: 'secret row', hint: 'private query' };
    const response = await PATCH(request('PATCH', { isApproved: true }), context());
    const body = await response.json();
    expect(response.status).toBe(status);
    expect(body).toMatchObject({ success: false, errorCode: category, requestId: expect.any(String) });
    expect(body.requestId).toMatch(/^[a-f0-9-]{36}$/);
    expect(response.headers.get('x-request-id')).toBe(body.requestId);
    expect(body.message).toContain(body.requestId);
    expect(logger).toHaveBeenCalledTimes(1);
    expect(logger.mock.calls[0]).toEqual(['[AdminMemberPatch]', {
      event: 'member_status_failed', stage: 'save', category,
      databaseCode: category === 'UNKNOWN' ? 'UNKNOWN' : code, requestId: body.requestId,
    }]);
    const output = JSON.stringify([body, logger.mock.calls]);
    for (const secret of [targetId, actorId, 'member@example.com', 'secret row', 'private query']) expect(output).not.toContain(secret);
    expect(update).toHaveBeenCalledTimes(1);
    expect(mocks.email).not.toHaveBeenCalled();
    expect(audit).not.toHaveBeenCalled();
    expect(mocks.admin).not.toHaveBeenCalled();
  });

  it('예외 원문은 숨기고 불확실한 결과에 재승인 대신 상태 확인을 안내한다', async () => {
    const logger = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.session.mockRejectedValueOnce(new Error(`private ${actorId} token=secret`));
    const response = await PATCH(request('PATCH', { isApproved: true }), context());
    const body = await response.json();
    expect(response.status).toBe(500);
    expect(body).toMatchObject({ success: false, errorCode: 'UNKNOWN', requestId: expect.any(String) });
    expect(body.message).toContain('상태를 확인');
    expect(JSON.stringify(logger.mock.calls)).not.toContain('secret');
    expect(JSON.stringify(logger.mock.calls)).not.toContain(actorId);
    expect(update).not.toHaveBeenCalled();
  });

  it('담당 리드 또는 확인 불가 상태에서는 삭제하지 않는다', async () => {
    leadCount = 2;
    expect((await DELETE(request('DELETE', { confirmationEmail: 'member@example.com' }), context())).status).toBe(409);
    leadCount = null;
    expect((await DELETE(request('DELETE', { confirmationEmail: 'member@example.com' }), context())).status).toBe(200);
    expect(remove).not.toHaveBeenCalled();
  });
  it('승인 후 이메일 예외도 승인 성공과 구분한다', async () => {
    mocks.email.mockRejectedValue(new Error('mail unavailable'));
    const response = await PATCH(request('PATCH', { isApproved: true }), context());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, warnings: [expect.any(String)] });
  });
  it('원자적 보관 이력 기록 실패 시 후속 인증 변경을 하지 않는다', async () => {
    const client = await mocks.session();
    client.rpc.mockResolvedValueOnce({ data: null, error: { code: '42P01' } });
    const response = await DELETE(request('DELETE', { confirmationEmail: 'member@example.com' }), context());
    expect(response.status).toBe(503);
    expect(remove).not.toHaveBeenCalled();
  });
  it('비로그인 요청을 거부한다', async () => {
    authenticated = false;
    expect((await PATCH(request('PATCH', { isApproved: true }), context())).status).toBe(401);
    expect(update).not.toHaveBeenCalled();
  });
  it('일반 회원의 요청을 거부한다', async () => {
    superAdmin = false;
    expect((await DELETE(request('DELETE', { confirmationEmail: 'member@example.com' }), context())).status).toBe(403);
    expect(remove).not.toHaveBeenCalled();
  });
  it('본인 계정과 다른 최고관리자 계정을 보호한다', async () => {
    expect((await PATCH(request('PATCH', { isApproved: false }), context(actorId))).status).toBe(409);
    protectedTarget = true;
    expect((await DELETE(request('DELETE', { confirmationEmail: 'member@example.com' }), context())).status).toBe(409);
    expect(remove).not.toHaveBeenCalled();
  });
  it('다른 사이트 요청과 잘못된 입력을 거부한다', async () => {
    expect((await PATCH(request('PATCH', { isApproved: true }, 'https://other.example'), context())).status).toBe(403);
    expect((await PATCH(request('PATCH', { isApproved: 'true' }), context())).status).toBe(400);
    expect((await PATCH(request('PATCH', { isSuperAdmin: true }), context())).status).toBe(400);
  });
  it('승인 시 처리자와 시각을 저장하고 안내를 발송한다', async () => {
    const response = await PATCH(request('PATCH', { isApproved: true }), context());
    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ is_approved: true, approved_by: actorId, approved_at: expect.any(String) }));
    expect(mocks.email).toHaveBeenCalledTimes(1);
    expect(audit).toHaveBeenCalled();
  });
  it('이메일 실패는 승인 성공과 구분해 경고한다', async () => {
    mocks.email.mockResolvedValue({ success: false });
    const response = await PATCH(request('PATCH', { isApproved: true }), context());
    expect(await response.json()).toMatchObject({ success: true, warnings: [expect.stringContaining('이메일')] });
  });
  it('중복 승인은 재발송하지 않는다', async () => {
    approved = true;
    await PATCH(request('PATCH', { isApproved: true }), context());
    expect(update).not.toHaveBeenCalled();
    expect(mocks.email).not.toHaveBeenCalled();
  });
  it('동시 변경 충돌은 성공으로 표시하지 않는다', async () => {
    conflict = true;
    expect((await PATCH(request('PATCH', { isApproved: true }), context())).status).toBe(409);
    expect(mocks.email).not.toHaveBeenCalled();
  });
  it('승인 취소는 승인 정보를 비우고 안내 메일을 재발송하지 않는다', async () => {
    approved = true;
    await PATCH(request('PATCH', { isApproved: false }), context());
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ is_approved: false, approved_at: null, approved_by: null, rejected_at: expect.any(String) }));
    expect(mocks.email).not.toHaveBeenCalled();
  });
  it('삭제 이메일과 조직 소유권을 검증한다', async () => {
    expect((await DELETE(request('DELETE', { confirmationEmail: 'other@example.com' }), context())).status).toBe(400);
    owners = [{ organization_id: 'org' }];
    others = [{ user_id: 'another', role: 'member' }];
    expect((await DELETE(request('DELETE', { confirmationEmail: 'member@example.com' }), context())).status).toBe(409);
    expect(remove).not.toHaveBeenCalled();
  });
  it('단독 소유자는 빈 조직이어도 보호하고 공동 소유자는 삭제할 수 있다', async () => {
    owners = [{ organization_id: 'org' }];
    expect((await DELETE(request('DELETE', { confirmationEmail: 'member@example.com' }), context())).status).toBe(409);
    others = [{ user_id: 'another', role: 'owner' }];
    expect((await DELETE(request('DELETE', { confirmationEmail: 'member@example.com' }), context())).status).toBe(200);
  });
  it('서버 서비스 키 없이 인증된 RPC로 보관하고 영구 삭제는 하지 않는다', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    const response = await DELETE(request('DELETE', { confirmationEmail: 'member@example.com' }), context());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ success: true, warnings: [] });
    expect(remove).not.toHaveBeenCalled();
  });
  it('보관은 영구 삭제 기능을 호출하지 않는다', async () => {
    const response = await DELETE(request('DELETE', { confirmationEmail: 'member@example.com' }), context());
    expect(response.status).toBe(200);
    expect(remove).not.toHaveBeenCalled();
  });
  it('재전송은 승인된 회원에게만 서버가 조회한 주소로 발송한다', async () => {
    expect((await POST(request('POST', {}), context())).status).toBe(409);
    approved = true;
    expect((await POST(request('POST', {}), context())).status).toBe(200);
    expect(mocks.email).toHaveBeenCalledWith(expect.objectContaining({ to: 'member@example.com' }));
  });
  it('발송 설정 오류는 게이트웨이 오류와 구분하며 회원 상태를 변경하지 않는다', async () => {
    approved = true;
    mocks.email.mockResolvedValue({ success: false, errorCode: 'EMAIL_CONFIGURATION' });
    const response = await POST(request('POST', {}), context());
    expect(response.status).toBe(503);
    expect((await response.json()).message).toContain('발신 주소');
    expect(update).not.toHaveBeenCalled();
    expect(mocks.email).toHaveBeenCalledTimes(1);
  });
});
