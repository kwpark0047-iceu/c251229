// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ status: 'ACTIVE', throws: false }));
vi.mock('@supabase/ssr', () => ({ createServerClient: () => ({
  auth: { getUser: async () => ({ data: { user: { id: 'synthetic', email: 'synthetic@example.com' } } }) },
  from: () => { const q = { select: () => q, eq: () => q, maybeSingle: async () => {
    if (mocks.throws) throw new Error('synthetic failure');
    return { data: { account_status: mocks.status }, error: null };
  } }; return q; },
}) }));
import { proxy } from '@/proxy';
beforeEach(() => { mocks.status = 'ACTIVE'; mocks.throws = false; vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co'); vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'synthetic'); });
afterEach(() => vi.unstubAllEnvs());
describe('보관 계정의 기존 세션 차단', () => {
  it('기존 JWT 세션이 있어도 API를 차단한다', async () => {
    mocks.status = 'ARCHIVED';
    expect((await proxy(new NextRequest('http://localhost/api/email/send'))).status).toBe(403);
  });
  it('승인 대기 계정도 업무 API를 호출할 수 없다', async () => {
    mocks.status = 'PENDING';
    expect((await proxy(new NextRequest('http://localhost/api/email/send'))).status).toBe(403);
  });
  it('중지 계정은 보호 화면에서 인증 화면으로 이동한다', async () => {
    mocks.status = 'SUSPENDED';
    const response = await proxy(new NextRequest('http://localhost/lead-manager'));
    expect(response.headers.get('location')).toContain('/auth?error=account_disabled');
  });
  it('보관 계정의 인증 화면은 대시보드로 돌려보내지 않는다', async () => {
    mocks.status = 'ARCHIVED';
    expect((await proxy(new NextRequest('http://localhost/auth'))).headers.get('location')).toBeNull();
  });
  it('계정 상태 조회 실패 시 API 접근을 허용하지 않는다', async () => {
    mocks.throws = true;
    expect((await proxy(new NextRequest('http://localhost/api/email/send'))).status).toBe(503);
  });
  it('차단된 계정도 로그아웃 경로에는 접근할 수 있다', async () => {
    mocks.status = 'ARCHIVED'; mocks.throws = true;
    expect((await proxy(new NextRequest('http://localhost/api/auth/logout'))).status).toBe(200);
  });
});
