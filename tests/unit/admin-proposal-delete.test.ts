import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ session: vi.fn(), admin: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.session }));
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.admin }));
import { DELETE } from '@/app/api/admin/proposals/[id]/route';
import { getOwnedProposalFile } from '@/lib/proposal-storage';

const id = '22222222-2222-4222-8222-222222222222';
const project = 'https://example.supabase.co';
const file = `${project}/storage/v1/object/public/proposals/org/${id}/proposal.pdf`;

describe('최고관리자 제안서 삭제', () => {
  let authenticated: boolean, isAdmin: boolean, exists: boolean, conflict: boolean, deleteError: object | null;
  let referenceCount: number, storageError: object | null, auditError: object | null;
  let target: { id: string; title: string; status: string; organization_id: string; pdf_url: string; is_external: boolean; updated_at: string };
  const remove = vi.fn(), audit = vi.fn(), deleted = vi.fn();
  const context = { params: Promise.resolve({ id }) };
  function request(body: object = { confirmationTitle: '강남 광고 제안서' }, origin = 'http://localhost') {
    return new Request(`http://localhost/api/admin/proposals/${id}`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json', origin }, body: JSON.stringify(body),
    });
  }
  beforeEach(() => {
    vi.clearAllMocks();
    authenticated = true; isAdmin = true; exists = true; conflict = false;
    deleteError = null; referenceCount = 0; storageError = null; auditError = null;
    target = { id, title: '강남 광고 제안서', status: 'SENT', organization_id: 'org', pdf_url: file,
      is_external: true, updated_at: '2026-10-15T00:00:00Z' };
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', project);
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-server-key');
    mocks.session.mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: authenticated ? { id: 'admin', email: 'admin@example.com' } : null }, error: null }) },
      from: () => {
        const query = { select: () => query, eq: () => query,
          maybeSingle: async () => ({ data: { is_super_admin: isAdmin }, error: null }) };
        return query;
      },
    });
    mocks.admin.mockReturnValue({
      storage: { from: vi.fn(() => ({ remove })) },
      from: vi.fn((table: string) => {
        if (table === 'activity_logs') return { insert: audit };
        let deleting = false;
        const query = { select: vi.fn(() => query), eq: vi.fn(() => query), is: vi.fn(() => query), limit: vi.fn(() => query),
          delete: () => { deleting = true; deleted(); return query; },
          maybeSingle: async () => ({ data: deleting ? (conflict ? null : { id }) : (exists ? target : null), error: deleting ? deleteError : null }),
          then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: Array.from({ length: referenceCount }, () => ({ id: 'other' })), error: null }).then(resolve),
        };
        return query;
      }),
    });
    remove.mockImplementation(async () => ({ error: storageError }));
    audit.mockImplementation(async () => ({ error: auditError }));
  });
  afterEach(() => vi.unstubAllEnvs());
  it('비로그인과 일반 회원은 삭제할 수 없다', async () => {
    authenticated = false;
    expect((await DELETE(request(), context)).status).toBe(401);
    authenticated = true; isAdmin = false;
    expect((await DELETE(request(), context)).status).toBe(403);
    expect(mocks.admin).not.toHaveBeenCalled();
  });
  it('외부 사이트 요청은 거부한다', async () => {
    expect((await DELETE(request({}, 'https://other.example'), context)).status).toBe(403);
  });
  it('서버 삭제 설정이 없으면 중단한다', async () => {
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    expect((await DELETE(request(), context)).status).toBe(503);
    expect(deleted).not.toHaveBeenCalled();
  });
  it('제목 확인 없이 삭제할 수 없다', async () => {
    expect((await DELETE(request({}), context)).status).toBe(400);
    expect((await DELETE(request({ confirmationTitle: '다른 제목' }), context)).status).toBe(409);
    expect(deleted).not.toHaveBeenCalled();
  });
  it('이미 삭제된 제안서를 성공으로 표시하지 않는다', async () => {
    exists = false;
    expect((await DELETE(request(), context)).status).toBe(404);
    expect(remove).not.toHaveBeenCalled();
  });
  it('오래된 화면과 동시 변경을 감지한다', async () => {
    expect((await DELETE(request({ confirmationTitle: target.title, expectedUpdatedAt: 'old' }), context)).status).toBe(409);
    conflict = true;
    expect((await DELETE(request(), context)).status).toBe(409);
    expect(remove).not.toHaveBeenCalled();
  });
  it('DB 삭제 실패 시 파일을 지우지 않는다', async () => {
    deleteError = { message: 'constraint error' };
    expect((await DELETE(request(), context)).status).toBe(409);
    expect(remove).not.toHaveBeenCalled();
  });
  it('DB 삭제 후 전용 파일을 정리하고 감사 이력을 기록한다', async () => {
    expect((await DELETE(request(), context)).status).toBe(200);
    expect(remove).toHaveBeenCalledWith([`org/${id}/proposal.pdf`]);
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action_type: 'PROPOSAL_DELETE', entity_id: id }));
  });
  it('다른 제안서가 참조하는 파일은 남긴다', async () => {
    referenceCount = 1;
    const response = await DELETE(request(), context);
    expect(await response.json()).toMatchObject({ success: true, warnings: [expect.stringContaining('다른 제안서')] });
    expect(remove).not.toHaveBeenCalled();
  });
  it('외부 링크 원본은 삭제하지 않는다', async () => {
    target.pdf_url = 'https://other.example/file.pdf';
    expect((await DELETE(request(), context)).status).toBe(200);
    expect(remove).not.toHaveBeenCalled();
  });
  it('파일 및 이력 정리 실패는 이미 완료된 삭제와 구분한다', async () => {
    storageError = { message: 'storage error' }; auditError = { message: 'audit error' };
    const response = await DELETE(request(), context);
    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.warnings).toHaveLength(2);
  });
});

describe('업로드 파일 경로 검증', () => {
  it('같은 프로젝트의 제안서 전용 파일만 선택한다', () => {
    expect(getOwnedProposalFile(file, project, 'org', id)).toBe(`org/${id}/proposal.pdf`);
    for (const unsafe of [file.replace('example.supabase.co', 'other.supabase.co'), file.replace('/org/', '/other/'),
      file.replace('/proposal.pdf', '/shared.pdf'), file.replace('/proposal.pdf', '/proposal.pdf%2Fother'), file.replace('/proposals/', '/floor-plans/')]) {
      expect(getOwnedProposalFile(unsafe, project, 'org', id)).toBeNull();
    }
    expect(getOwnedProposalFile(file, project, null, id)).toBeNull();
  });
});
