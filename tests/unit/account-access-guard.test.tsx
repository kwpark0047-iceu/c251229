import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
type AuthCallback = (event: string, session: { user: { id: string } } | null) => void;
const mocks = vi.hoisted(() => ({ status: 'ACTIVE', userId: 'synthetic', read: vi.fn(), signOut: vi.fn(), unsubscribe: vi.fn(), onChange: null as AuthCallback | null }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({
  auth: { getUser: async () => ({ data: { user: { id: mocks.userId } }, error: null }), signOut: mocks.signOut,
    onAuthStateChange: (callback: AuthCallback) => { mocks.onChange = callback; return { data: { subscription: { unsubscribe: mocks.unsubscribe } } }; } },
  from: () => { const q = { select: () => q, eq: () => q, maybeSingle: async () => {
    return await mocks.read() ?? { data: { account_status: mocks.status }, error: null };
  } }; return q; },
}) }));
import AccountAccessGuard from '@/components/AccountAccessGuard';
afterEach(() => { cleanup(); vi.clearAllMocks(); mocks.read.mockReset(); mocks.status = 'ACTIVE'; mocks.userId = 'synthetic'; mocks.onChange = null; });
describe('보관 후 기존 탭 접근 제한', () => {
  it.each(['ARCHIVED', 'SUSPENDED', 'PENDING', 'unknown'])('%s 계정의 업무 화면은 마운트하지 않는다', async status => {
    mocks.status = status;
    render(<AccountAccessGuard><div>protected-content</div></AccountAccessGuard>);
    await screen.findByRole('alert');
    expect(screen.queryByText('protected-content')).not.toBeInTheDocument();
  });
  it('활성 탭도 포커스 복귀 시 상태를 다시 확인해 내용을 제거한다', async () => {
    render(<AccountAccessGuard><div>protected-content</div></AccountAccessGuard>);
    await screen.findByText('protected-content');
    mocks.status = 'ARCHIVED';
    fireEvent.focus(window);
    await waitFor(() => expect(screen.queryByText('protected-content')).not.toBeInTheDocument());
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });
  it('로그아웃 알림은 포커스 이벤트 없이 즉시 업무 화면을 제거한다', async () => {
    render(<AccountAccessGuard><div>protected-content</div></AccountAccessGuard>);
    await screen.findByText('protected-content');
    act(() => mocks.onChange?.('SIGNED_OUT', null));
    expect(screen.queryByText('protected-content')).not.toBeInTheDocument();
    expect(mocks.signOut).not.toHaveBeenCalled();
  });
  it('이전 회원의 늦은 보관 응답으로 새로 로그인한 회원을 로그아웃하지 않는다', async () => {
    let finish!: (value: object) => void;
    mocks.read.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    render(<AccountAccessGuard><div>protected-content</div></AccountAccessGuard>);
    await waitFor(() => expect(mocks.read).toHaveBeenCalledTimes(1));
    mocks.userId = 'second-synthetic';
    act(() => mocks.onChange?.('SIGNED_IN', { user: { id: mocks.userId } }));
    await act(async () => finish({ data: { account_status: 'ARCHIVED' }, error: null }));
    await screen.findByText('protected-content');
    expect(mocks.read).toHaveBeenCalledTimes(2);
    expect(mocks.signOut).not.toHaveBeenCalled();
  });
  it('화면 이탈 후 완료된 보관 응답은 로그아웃 부작용을 만들지 않는다', async () => {
    let finish!: (value: object) => void;
    mocks.read.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const view = render(<AccountAccessGuard><div>protected-content</div></AccountAccessGuard>);
    await waitFor(() => expect(mocks.read).toHaveBeenCalledTimes(1));
    view.unmount();
    await act(async () => finish({ data: { account_status: 'ARCHIVED' }, error: null }));
    expect(mocks.signOut).not.toHaveBeenCalled();
    expect(mocks.unsubscribe).toHaveBeenCalledTimes(1);
  });
  it('이전 요청이 끝나지 않아도 새 계정의 상태 확인을 진행한다', async () => {
    let finish!: (value: object) => void;
    mocks.read.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    render(<AccountAccessGuard><div>protected-content</div></AccountAccessGuard>);
    await waitFor(() => expect(mocks.read).toHaveBeenCalledTimes(1));
    mocks.userId = 'second-synthetic';
    act(() => mocks.onChange?.('SIGNED_IN', { user: { id: mocks.userId } }));
    await screen.findByText('protected-content');
    await act(async () => finish({ data: null, error: { message: 'stale failure' } }));
    expect(screen.getByText('protected-content')).toBeInTheDocument();
    expect(mocks.signOut).not.toHaveBeenCalled();
  });
  it('동일 계정의 토큰 갱신은 작성 중인 입력값을 지우지 않는다', async () => {
    render(<AccountAccessGuard><input aria-label="draft" defaultValue="initial" /></AccountAccessGuard>);
    const input = await screen.findByLabelText('draft');
    fireEvent.change(input, { target: { value: 'unsaved draft' } });
    act(() => mocks.onChange?.('TOKEN_REFRESHED', { user: { id: mocks.userId } }));
    expect(screen.getByLabelText('draft')).toBe(input);
    await waitFor(() => expect(mocks.read).toHaveBeenCalledTimes(2));
    expect(screen.getByLabelText('draft')).toHaveValue('unsaved draft');
    expect(mocks.signOut).not.toHaveBeenCalled();
  });
});
