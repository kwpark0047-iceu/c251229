import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
vi.mock('../../auth-service', () => ({
  getCurrentUser: vi.fn().mockResolvedValue({ id: 'admin' }), getAllProfiles: vi.fn(), getAllOrganizations: vi.fn().mockResolvedValue([]),
  getAdminNotifications: vi.fn().mockResolvedValue({ success: true, notifications: [] }),
  updateProfileStatus: vi.fn(), deleteUserProfile: vi.fn(), updateUserTier: vi.fn(),
  updateUserOrganization: vi.fn(), createOrganization: vi.fn(), getAllUserLogs: vi.fn(), getUserLogs: vi.fn(),
  markNotificationAsRead: vi.fn(), markAllNotificationsAsRead: vi.fn(), sendWelcomeEmailResend: vi.fn(),
}));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({
  channel: () => { const channel = { on: () => channel, subscribe: () => channel }; return channel; },
  removeChannel: vi.fn(),
}) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));
import { getAllProfiles, getAdminNotifications, markNotificationAsRead, updateProfileStatus, deleteUserProfile, updateUserTier } from '../../auth-service';
import SuperAdminDashboard from './SuperAdminDashboard';
import UserManagementView from './UserManagementView';

const member = { id: 'member', email: 'member@example.com', fullName: '신규회원', isApproved: false,
  isSuperAdmin: false, tier: 'FREE', trialExpiresAt: null, createdAt: '2026-10-15T00:00:00Z', membership: null };
beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  vi.mocked(getAllProfiles).mockResolvedValue({ success: true, profiles: [member] });
});
afterEach(cleanup);

describe('최고관리자 대시보드 회원 관리', () => {
  it.each([SuperAdminDashboard, UserManagementView])('associates organization editor labels with native selects (%s)', async Component => {
    render(<Component />);
    await screen.findByText('신규회원');
    await userEvent.click(screen.getByTitle('조직 및 역할 수정'));
    expect(screen.getByLabelText('소속 조직', { exact: true })).toBeInstanceOf(HTMLSelectElement);
    expect(screen.getByLabelText('역할', { exact: true })).toBeInstanceOf(HTMLSelectElement);
  });
  it('labels the new organization field', async () => {
    render(<SuperAdminDashboard />);
    await screen.findByText('신규회원');
    await userEvent.click(screen.getByRole('button', { name: /조직 만들기/ }));
    expect(screen.getByLabelText('조직 이름')).toBeInstanceOf(HTMLInputElement);
  });
  it('associates data configuration labels with their controls', async () => {
    render(<SuperAdminDashboard />);
    await screen.findByText('신규회원');
    await userEvent.click(screen.getByRole('button', { name: /데이터 관리/ }));
    expect(screen.getByLabelText('조직 선택')).toBeInstanceOf(HTMLSelectElement);
    await userEvent.click(screen.getByRole('button', { name: /인증 키 추가/ }));
    for (const label of ['연동 설정 이름 *', '데이터 연동 유형 *', '공공데이터 인증 키 *', '시군명 (경기도 전용 / 선택)', '활성화 여부 *']) {
      expect(screen.getByLabelText(label)).toBeVisible();
    }
  });
  it('marks notifications read with a native keyboard-operable button', async () => {
    vi.mocked(getAdminNotifications).mockResolvedValueOnce({ success: true, notifications: [
      { id: 'notice', message: 'Test signup notice', type: 'SIGNUP', is_read: false, created_at: '2026-10-15T00:00:00Z' },
    ] });
    vi.mocked(markNotificationAsRead).mockResolvedValue({ success: true });
    render(<SuperAdminDashboard user={{
      id: 'admin', email: 'admin@example.com', organizationId: null, organizationName: null,
      role: 'owner', inviteCode: null, permissions: { can_export: true, can_delete_lead: true, can_view_sensitive: true },
      isApproved: true, isSuperAdmin: true, tier: 'FREE', trialExpiresAt: null,
    }} />);
    await screen.findByText('신규회원');
    await userEvent.click(screen.getByRole('button', { name: '시스템 알림' }));
    const notice = screen.getByRole('button', { name: /Test signup notice/ });
    expect(notice.tagName).toBe('BUTTON');
    notice.focus();
    await userEvent.keyboard('{Enter}');
    expect(markNotificationAsRead).toHaveBeenCalledWith('notice');
  });
  it('한글 화면에서 신규 가입을 승인하고 목록을 갱신한다', async () => {
    vi.mocked(updateProfileStatus).mockResolvedValue({ success: true, message: '회원가입을 승인했습니다.' });
    render(<SuperAdminDashboard />);
    const name = await screen.findByText('신규회원');
    expect(screen.getByText('최고관리자')).toBeVisible();
    expect(screen.getByPlaceholderText('이름 또는 이메일 검색')).toBeVisible();
    expect(screen.getByRole('option', { name: '전체 승인 상태' })).toBeInTheDocument();
    expect(screen.queryByText('Identity Profile')).not.toBeInTheDocument();
    vi.mocked(getAllProfiles).mockResolvedValue({ success: true, profiles: [{ ...member, isApproved: true }] });
    await userEvent.click(within(name.closest('tr')!).getByTitle('회원 승인'));
    await userEvent.click(screen.getByRole('button', { name: '신규 회원가입 승인' }));
    await waitFor(() => expect(updateProfileStatus).toHaveBeenCalledWith(member.id, { isApproved: true }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByTitle('접근 철회')).toBeVisible();
  });
  it('승인된 회원도 이메일 확인 후 삭제할 수 있다', async () => {
    vi.mocked(getAllProfiles).mockResolvedValue({ success: true, profiles: [{ ...member, isApproved: true }] });
    vi.mocked(deleteUserProfile).mockResolvedValue({ success: true, message: '회원 계정이 삭제되었습니다.' });
    render(<SuperAdminDashboard />);
    await screen.findByText('신규회원');
    vi.mocked(getAllProfiles).mockResolvedValue({ success: true, profiles: [] });
    await userEvent.click(screen.getByTitle('회원 삭제·보관'));
    await userEvent.type(screen.getByLabelText(/확인을 위해/), member.email);
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '회원 삭제·보관' }));
    await waitFor(() => expect(screen.queryByText('신규회원')).not.toBeInTheDocument());
    expect(deleteUserProfile).toHaveBeenCalledWith(member.id, member.email, undefined);
  });
  it('최고관리자 계정의 승인 취소와 삭제 버튼을 잠근다', async () => {
    vi.mocked(getAllProfiles).mockResolvedValue({ success: true, profiles: [{ ...member, isSuperAdmin: true, isApproved: true }] });
    render(<SuperAdminDashboard />);
    await screen.findByText('신규회원');
    expect(screen.getByTitle('보호된 계정은 보관할 수 없습니다')).toBeDisabled();
    expect(screen.getByTitle('접근 철회')).toBeDisabled();
  });
  it('등급은 한글로 표시하고 서버에는 기존 등급 코드를 전달한다', async () => {
    vi.mocked(updateUserTier).mockResolvedValue({ success: true });
    render(<SuperAdminDashboard />);
    await screen.findByText('신규회원');
    const select = screen.getByLabelText('회원 등급 변경');
    expect(select).toHaveValue('FREE');
    expect(within(select).getByRole('option', { name: '매체사' })).toHaveValue('MEDIA');
    await userEvent.selectOptions(select, 'MEDIA');
    expect(updateUserTier).toHaveBeenCalledWith(member.id, member.email, 'MEDIA');
  });
});
