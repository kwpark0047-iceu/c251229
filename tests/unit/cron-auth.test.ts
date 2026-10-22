import { afterEach, describe, expect, it, vi } from 'vitest';
import { isAuthorizedCronRequest } from '@/lib/cron-auth';

const mocks = vi.hoisted(() => ({ client: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.client }));
vi.mock('@/app/api/sync-engine', () => ({ syncSource: vi.fn(), getAllSourceKeys: () => [], getSourceList: () => [] }));
vi.mock('@/app/api/sync-utils', () => ({ getOrgScoringConfig: vi.fn(), isSupabaseAuthError: () => false }));
import { GET } from '@/app/api/cron/sync/route';

afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });
describe('cron 인증은 DB 연결 전에 실패를 차단한다', () => {
  it.each([undefined, '', '   '])('비어 있는 서버 키를 거부한다: %s', secret => {
    expect(isAuthorizedCronRequest('Bearer undefined', secret)).toBe(false);
  });
  it('정확한 Bearer 값만 허용한다', () => {
    expect(isAuthorizedCronRequest('Bearer synthetic-secret', 'synthetic-secret')).toBe(true);
    for (const header of [null, 'synthetic-secret', 'bearer synthetic-secret', 'Bearer wrong']) {
      expect(isAuthorizedCronRequest(header, 'synthetic-secret')).toBe(false);
    }
  });
  it.each(['', 'wrong', 'undefined'])('미인증 요청은 DB 클라이언트를 생성하지 않는다: %s', async header => {
    vi.stubEnv('CRON_SECRET', 'synthetic-secret');
    const response = await GET(new Request('http://localhost/api/cron/sync', { headers: { authorization: `Bearer ${header}` } }));
    expect(response.status).toBe(401);
    expect(mocks.client).not.toHaveBeenCalled();
  });
  it('서버 키 미설정 시 Bearer undefined도 거부한다', async () => {
    vi.stubEnv('CRON_SECRET', undefined);
    const response = await GET(new Request('http://localhost/api/cron/sync', { headers: { authorization: 'Bearer undefined' } }));
    expect(response.status).toBe(401);
    expect(mocks.client).not.toHaveBeenCalled();
  });
  it('정상 인증 요청은 목 처리된 빈 조직 목록으로만 진행한다', async () => {
    vi.stubEnv('CRON_SECRET', 'synthetic-secret');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://127.0.0.1:54999');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'synthetic-key');
    mocks.client.mockReturnValue({ from: vi.fn(() => ({ select: () => ({ order: async () => ({ data: [], error: null }) }) })) });
    const response = await GET(new Request('http://localhost/api/cron/sync', { headers: { authorization: 'Bearer synthetic-secret' } }));
    expect(response.status).toBe(200);
    expect((await response.json()).orgCount).toBe(0);
    expect(mocks.client).toHaveBeenCalledTimes(1);
  });
});
