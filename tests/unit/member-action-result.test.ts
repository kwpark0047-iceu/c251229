import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/lib/supabase/client', () => ({ createClient: vi.fn() }));
import { updateProfileStatus } from '@/app/lead-manager/auth-service';
afterEach(() => vi.unstubAllGlobals());
describe('회원 처리 응답 경고 분리', () => {
  it('성공 메시지와 후속 경고를 별도 필드로 유지한다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, message: '승인 완료', warnings: ['메일 실패'] }) }));
    expect(await updateProfileStatus('synthetic', { isApproved: true })).toEqual({ success: true, message: '승인 완료', warnings: ['메일 실패'] });
  });
  it('경고가 잘못된 자료형이어도 저장 성공을 연결 실패로 바꾸지 않는다', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true, message: '승인 완료', warnings: {} }) }));
    expect(await updateProfileStatus('synthetic', { isApproved: true })).toMatchObject({ success: true, message: '승인 완료', warnings: [] });
  });
});
