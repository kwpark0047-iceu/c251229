import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Lead } from '../types';

vi.mock('@/context/NotificationContext', () => ({ useNotification: () => ({ showNotification: vi.fn() }) }));
vi.mock('../auth-service', () => ({ getCurrentUser: vi.fn().mockResolvedValue({ isSuperAdmin: true }) }));
vi.mock('../proposal-service', () => ({
  getDefaultGreeting: () => '안녕하세요',
  getProposals: vi.fn().mockResolvedValue({ success: true, proposals: [
    { id: 'attachment', title: '공용 광고 자료', originalFilename: 'sample.pdf', isExternal: true, fileType: 'PDF' },
  ] }),
  uploadProposalFile: vi.fn(), sendProposalEmail: vi.fn(), createProposal: vi.fn(), downloadAIProposalPDF: vi.fn(),
}));
vi.mock('@/lib/supabase/client', () => ({ createClient: vi.fn() }));
import ProposalForm from './ProposalForm';

afterEach(cleanup);
const lead = { id: 'lead', bizName: '테스트 업체', nearestStation: '' } as Lead;

describe('제안서 접근성', () => {
  it('입력 라벨을 실제 컨트롤에 연결하고 첨부 선택을 키보드로 전환한다', async () => {
    const { container } = render(<ProposalForm lead={lead} onClose={vi.fn()} />);
    const attachment = await screen.findByRole('button', { name: /공용 광고 자료/ });
    expect(attachment).toHaveAttribute('aria-pressed', 'false');
    attachment.focus();
    await userEvent.keyboard('{Enter}');
    expect(attachment).toHaveAttribute('aria-pressed', 'true');
    await userEvent.keyboard(' ');
    expect(attachment).toHaveAttribute('aria-pressed', 'false');
    for (const label of container.querySelectorAll('label')) expect(label.control).not.toBeNull();
    expect(container.querySelector('button button')).toBeNull();
  });

  it('닫기 배경과 파일 선택을 키보드로 조작할 수 있다', async () => {
    const close = vi.fn();
    const { container } = render(<ProposalForm lead={null} onClose={close} />);
    const backdrop = screen.getByRole('button', { name: '제안서 작성 닫기' });
    backdrop.focus();
    await userEvent.keyboard('{Enter}');
    expect(close).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByRole('textbox', { name: /제목/ })).toBeInTheDocument());
    const file = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    expect(file).not.toHaveClass('hidden');
    expect(file.labels?.length).toBeGreaterThan(0);
    for (const label of container.querySelectorAll('label')) expect(label.control).not.toBeNull();
    backdrop.focus();
    for (let index = 0; index < 24 && document.activeElement !== file; index++) await userEvent.tab();
    expect(file).toHaveFocus();
    await userEvent.upload(file, new File(['%PDF-1.4'], 'keyboard-proof.pdf', { type: 'application/pdf' }));
    expect(screen.getByRole('textbox', { name: '제안서 제목' })).toHaveValue('keyboard-proof');
    expect(screen.getByText('keyboard-proof.pdf')).toBeVisible();
    expect(file).toHaveValue('');
    await userEvent.clear(screen.getByRole('textbox', { name: '제안서 제목' }));
    await userEvent.upload(file, new File(['%PDF-1.4'], 'keyboard-proof.pdf', { type: 'application/pdf' }));
    expect(screen.getByRole('textbox', { name: '제안서 제목' })).toHaveValue('keyboard-proof');
  });
});
