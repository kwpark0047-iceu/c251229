import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mocks = vi.hoisted(() => ({ profiles: vi.fn(), update: vi.fn(), archive: vi.fn(), org: vi.fn(), resend: vi.fn() }));
vi.mock('@/app/lead-manager/auth-service', () => ({
  getAllProfiles: mocks.profiles, getAllOrganizations: vi.fn().mockResolvedValue([]),
  getCurrentUser: vi.fn().mockResolvedValue({ id: 'self' }),
  updateProfileStatus: mocks.update, deleteUserProfile: mocks.archive,
  updateUserOrganization: mocks.org, updateUserTier: mocks.update,
  sendWelcomeEmailResend: mocks.resend,
  getAdminNotifications: vi.fn().mockResolvedValue({ success: true, notifications: [] }),
}));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({
  channel: () => { const channel = { on: () => channel, subscribe: () => channel }; return channel; },
  removeChannel: vi.fn(),
}) }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));
import { toast } from 'sonner';
import MemberActionDialog from '@/app/lead-manager/components/admin/MemberActionDialog';
import UserManagementView from '@/app/lead-manager/components/admin/UserManagementView';
import SuperAdminDashboard from '@/app/lead-manager/components/admin/SuperAdminDashboard';
import type { UserInfo } from '@/app/lead-manager/auth-service';

const admin: UserInfo = { id: 'self', email: 'self@example.com', organizationId: null, organizationName: null,
  role: null, inviteCode: null, permissions: { can_export: true, can_delete_lead: false, can_view_sensitive: false }, isApproved: true, isSuperAdmin: true, tier: null, trialExpiresAt: null };
const Dashboard = () => <SuperAdminDashboard user={admin} />;

const profile = (id: string, accountStatus: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED') => ({
  id, email: `${id}@example.com`, fullName: id, accountStatus,
  isApproved: accountStatus === 'ACTIVE', isSuperAdmin: false,
  tier: 'FREE', trialExpiresAt: null, createdAt: '2026-10-01T00:00:00Z', membership: null,
  ...(accountStatus === 'ARCHIVED' ? { archivedAt: '2026-10-22T00:00:00Z', archivedReason: 'duplicate account' } : {}),
});
beforeEach(() => {
  mocks.profiles.mockResolvedValue({ success: true, profiles: [
    profile('pending', 'PENDING'), profile('active', 'ACTIVE'), profile('suspended', 'SUSPENDED'),
    profile('archived', 'ARCHIVED'), { ...profile('protected', 'ARCHIVED'), isSuperAdmin: true },
    profile('self', 'ARCHIVED'),
  ] });
  mocks.update.mockResolvedValue({ success: true, message: 'changed' });
  mocks.archive.mockResolvedValue({ success: true, message: 'archived' });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('archive confirmation', () => {
  it('accepts an optional archive reason and confirmed email without permanent deletion copy', async () => {
    render(<MemberActionDialog target={{ id: 'archived', email: 'archived@example.com', action: 'delete' }} onClose={vi.fn()} onComplete={vi.fn()} />);
    expect(screen.getByRole('dialog')).not.toHaveTextContent('되돌릴 수 없습니다');
    await userEvent.type(screen.getByLabelText(/이메일을 입력/), 'archived@example.com');
    await userEvent.type(screen.getByLabelText(/보관 사유/), 'duplicate account');
    await userEvent.click(screen.getByRole('button', { name: '회원 삭제·보관' }));
    expect(mocks.archive).toHaveBeenCalledWith('archived', 'archived@example.com', 'duplicate account');
  });
  it('restores through the dialog and explains approval is still required', async () => {
    render(<MemberActionDialog target={{ id: 'archived', email: 'archived@example.com', action: 'restore' }} onClose={vi.fn()} onComplete={vi.fn()} />);
    expect(screen.getByRole('dialog')).toHaveTextContent('이용 정지');
    const button = screen.getByRole('button', { name: '회원 복구' });
    button.focus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith('archived', { restore: true }));
  });
  it('allows archiving without a reason and prevents mismatched email submission', async () => {
    render(<MemberActionDialog target={{ id: 'active', email: 'active@example.com', action: 'delete' }} onClose={vi.fn()} onComplete={vi.fn()} />);
    const submit = screen.getByRole('button', { name: '회원 삭제·보관' });
    expect(submit).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/이메일을 입력/), 'other@example.com');
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/이메일을 입력/), { target: { value: 'active@example.com' } });
    await userEvent.click(submit);
    expect(mocks.archive).toHaveBeenCalledWith('active', 'active@example.com', undefined);
  });
  it('reports restore errors without closing the confirmation', async () => {
    mocks.update.mockResolvedValue({ success: false, message: 'restore denied' });
    const close = vi.fn();
    render(<MemberActionDialog target={{ id: 'archived', email: 'archived@example.com', action: 'restore' }} onClose={close} onComplete={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: '회원 복구' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('restore denied');
    expect(close).not.toHaveBeenCalled();
  });
  it('traps keyboard focus, closes on Escape and restores trigger focus', async () => {
    const trigger = document.createElement('button');
    document.body.append(trigger);
    trigger.focus();
    const close = vi.fn();
    const view = render(<MemberActionDialog target={{ id: 'active', email: 'active@example.com', action: 'delete' }} onClose={close} onComplete={vi.fn()} />);
    const email = screen.getByLabelText(/이메일을 입력/);
    expect(email).toHaveFocus();
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}');
    expect(screen.getByRole('button', { name: '취소' })).toHaveFocus();
    await userEvent.keyboard('{Tab}');
    expect(email).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(close).toHaveBeenCalledOnce();
    view.unmount();
    expect(trigger).toHaveFocus();
    trigger.remove();
  });
});

describe.each([['management', UserManagementView], ['dashboard', Dashboard]] as const)('%s archive states', (name, View) => {
  it('shows partial success as warning in either management entry point', async () => {
    mocks.update.mockResolvedValue({ success: true, message: '승인 완료', warnings: ['메일 발송 실패'] });
    render(<View />);
    const email = await screen.findByText('pending@example.com');
    const row = within(email.closest('tr')!);
    await userEvent.click(row.getByTitle(name === 'management' ? '승인하기' : '회원 승인'));
    await userEvent.click(screen.getByRole('button', { name: '신규 회원가입 승인' }));
    await waitFor(() => expect(toast.warning).toHaveBeenCalled());
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toHaveTextContent('메일 발송 실패');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
  it('excludes archives by default and separates pending, active and suspended filters', async () => {
    render(<View />);
    await screen.findByText('active@example.com');
    expect(screen.queryByText('archived@example.com')).not.toBeInTheDocument();
    if (name === 'management') expect(await screen.findByText('1 pending')).toBeInTheDocument();
    else expect(screen.getByRole('option', { name: '승인 대기 (1명)' })).toBeInTheDocument();
    const filter = screen.getByRole('combobox', { name: '상태 필터' });
    for (const [value, visible] of [['PENDING', 'pending'], ['APPROVED', 'active'], ['SUSPENDED', 'suspended']]) {
      fireEvent.change(filter, { target: { value } });
      expect(screen.getByText(`${visible}@example.com`)).toBeInTheDocument();
      for (const hidden of ['pending', 'active', 'suspended', 'archived'].filter(id => id !== visible)) {
        expect(screen.queryByText(`${hidden}@example.com`)).not.toBeInTheDocument();
      }
    }
  });
  it('shows archive metadata and only restore, not approval, email, tier or membership edits', async () => {
    render(<View />);
    await screen.findByText('active@example.com');
    fireEvent.change(screen.getByRole('combobox', { name: '상태 필터' }), { target: { value: 'ARCHIVED' } });
    const row = within(screen.getByText('archived@example.com').closest('tr')!);
    expect(row.getByText('duplicate account')).toBeInTheDocument();
    expect(row.getByText(/2026.*10.*22/)).toBeInTheDocument();
    expect(row.queryByRole('button', { name: /승인|철회|삭제|조직|이메일/ })).not.toBeInTheDocument();
    for (const select of row.queryAllByRole('combobox')) expect(select).toBeDisabled();
    await userEvent.click(row.getByRole('button', { name: '복구' }));
    await userEvent.click(screen.getByRole('button', { name: '회원 복구' }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith('archived', { restore: true }));
    expect(mocks.archive).not.toHaveBeenCalled();
    expect(mocks.org).not.toHaveBeenCalled();
    expect(mocks.resend).not.toHaveBeenCalled();
  });
  it('protects self and superadmin archive rows', async () => {
    render(<View />);
    await screen.findByText('active@example.com');
    fireEvent.change(screen.getByRole('combobox', { name: '상태 필터' }), { target: { value: 'ARCHIVED' } });
    const self = within(screen.getAllByText('self@example.com').find(element => element.closest('tr'))!.closest('tr')!);
    expect(self.getByRole('button', { name: '복구' })).toBeDisabled();
    const protectedEmail = screen.queryByText('protected@example.com');
    if (name === 'management') expect(protectedEmail).not.toBeInTheDocument();
    else expect(within(protectedEmail!.closest('tr')!).getByRole('button', { name: '복구' })).toBeDisabled();
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
