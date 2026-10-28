// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ status: 'ACTIVE', throws: false, code: '', missing: false, refresh: false }));
vi.mock('@supabase/ssr', () => ({ createServerClient: (_url: string, _key: string, options: { cookies: { setAll: (cookies: unknown[]) => void } }) => ({
  auth: { getUser: async () => {
    if (mocks.refresh) options.cookies.setAll([{ name: 'sb-synthetic-auth-token', value: 'synthetic-refreshed', options: { path: '/', httpOnly: true } }]);
    return { data: { user: { id: 'synthetic', email: 'synthetic@example.com' } } };
  } },
  from: () => { const q = { select: () => q, eq: () => q, maybeSingle: async () => {
    if (mocks.throws) throw new Error('synthetic failure');
    return { data: mocks.missing ? null : { account_status: mocks.status }, error: mocks.code ? { code: mocks.code, message: 'private database message' } : null };
  } }; return q; },
}) }));
import { proxy } from '@/proxy';
beforeEach(() => { mocks.status = 'ACTIVE'; mocks.throws = false; mocks.code = ''; mocks.missing = false; mocks.refresh = false; vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co'); vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'synthetic'); });
afterEach(() => vi.unstubAllEnvs());
describe('보관 계정의 기존 세션 차단', () => {
  it.each(['42703', '42501', 'PGRST204'])('프로필 조회 오류 %s를 실제 계정 중지와 구분하고 접근은 차단한다', async (code) => {
    mocks.code = code;
    const response = await proxy(new NextRequest('http://localhost/lead-manager'));
    expect(response.headers.get('location')).toContain('error=account_check_failed');
    expect(response.headers.get('location')).not.toContain('account_disabled');
    expect((await proxy(new NextRequest('http://localhost/api/email/send'))).status).toBe(503);
    expect((await proxy(new NextRequest('http://localhost/auth'))).headers.get('location')).toBeNull();
  });
  it.each(['missing', 'unknown', 'throws'])('%s 계정 조회 실패도 중지 계정으로 단정하지 않는다', async (kind) => {
    mocks.missing = kind === 'missing'; mocks.status = kind === 'unknown' ? 'UNKNOWN' : 'ACTIVE'; mocks.throws = kind === 'throws';
    expect((await proxy(new NextRequest('http://localhost/lead-manager'))).headers.get('location')).toContain('error=account_check_failed');
  });
  it('인증 화면에서 대시보드로 이동할 때 갱신 쿠키를 보존한다', async () => {
    mocks.refresh = true;
    const response = await proxy(new NextRequest('http://localhost/auth?error=account_disabled'));
    expect(response.cookies.get('sb-synthetic-auth-token')?.value).toBe('synthetic-refreshed');
    expect(response.headers.get('location')).not.toContain('error=');
  });
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
