import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Proposal } from '../types';
vi.mock('../proposal-service', () => ({ getProposals: vi.fn(), getProposalLogs: vi.fn(), deleteProposal: vi.fn() }));
vi.mock('../auth-service', () => ({ getCurrentUser: vi.fn() }));
vi.mock('../supabase-service', () => ({ getLeads: vi.fn() }));
vi.mock('./ProposalForm', () => ({ default: () => null }));
import { getProposals, deleteProposal } from '../proposal-service';
import { getCurrentUser } from '../auth-service';
import ProposalsView from './ProposalsView';

const proposal: Proposal = { id: 'proposal', leadId: 'lead', title: '강남 광고 제안서', inventoryIds: [], status: 'SENT', updatedAt: '2026-10-15T00:00:00Z' };
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getProposals).mockResolvedValue({ success: true, proposals: [proposal], message: '조회 완료' });
  vi.mocked(getCurrentUser).mockResolvedValue({ isSuperAdmin: true } as Awaited<ReturnType<typeof getCurrentUser>>);
});
afterEach(cleanup);

describe('최고관리자 제안서 삭제 화면', () => {
  it('삭제 버튼에 아이콘뿐 아니라 삭제 문구를 표시한다', async () => {
    render(<ProposalsView />);
    expect(await screen.findByRole('button', { name: `${proposal.title} 제안서 삭제` })).toHaveTextContent('삭제');
  });
  it('일반 회원에게 삭제 버튼을 표시하지 않는다', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ isSuperAdmin: false } as Awaited<ReturnType<typeof getCurrentUser>>);
    render(<ProposalsView />);
    await screen.findByText(proposal.title);
    expect(screen.queryByTitle('제안서 삭제')).not.toBeInTheDocument();
  });
  it('제목 확인 후 삭제하고 현재 목록에서 제거한다', async () => {
    vi.mocked(deleteProposal).mockResolvedValue({ success: true, message: '제안서가 삭제되었습니다.', warnings: ['첨부파일 정리를 확인해주세요.'] });
    render(<ProposalsView />);
    await userEvent.click(await screen.findByTitle('제안서 삭제'));
    const dialog = screen.getByRole('dialog');
    const confirm = within(dialog).getByRole('button', { name: '삭제 확정' });
    expect(confirm).toBeDisabled();
    await userEvent.type(within(dialog).getByLabelText(/확인을 위해/), proposal.title);
    await userEvent.click(confirm);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.queryByText(proposal.title)).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('첨부파일 정리');
    expect(deleteProposal).toHaveBeenCalledWith(proposal.id, proposal.title, proposal.updatedAt);
  });
  it('삭제 실패 시 목록과 확인창을 유지한다', async () => {
    vi.mocked(deleteProposal).mockResolvedValue({ success: false, message: '삭제 권한이 없습니다.' });
    render(<ProposalsView />);
    await userEvent.click(await screen.findByTitle('제안서 삭제'));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText(/확인을 위해/), proposal.title);
    await userEvent.click(within(dialog).getByRole('button', { name: '삭제 확정' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('삭제 권한이 없습니다.');
    expect(screen.getByRole('dialog')).toBeVisible();
    expect(screen.getAllByText(proposal.title)).toHaveLength(2);
  });
  it('조회 실패를 빈 목록과 구분한다', async () => {
    vi.mocked(getProposals).mockResolvedValue({ success: false, proposals: [], message: '연결 오류' });
    render(<ProposalsView />);
    expect(await screen.findByRole('alert')).toHaveTextContent('연결 오류');
    expect(screen.getByRole('button', { name: '제안서 목록 새로고침' })).toBeVisible();
  });
  it('삭제 중에는 중복 제출과 취소를 막는다', async () => {
    let resolve!: (result: { success: boolean; message: string }) => void;
    vi.mocked(deleteProposal).mockReturnValue(new Promise(done => { resolve = done; }));
    render(<ProposalsView />);
    await userEvent.click(await screen.findByTitle('제안서 삭제'));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText(/확인을 위해/), proposal.title);
    await userEvent.click(within(dialog).getByRole('button', { name: '삭제 확정' }));
    fireEvent.submit(dialog.querySelector('form')!);
    expect(within(dialog).getByRole('button', { name: '삭제 중...' })).toBeDisabled();
    expect(within(dialog).getByRole('button', { name: '취소' })).toBeDisabled();
    expect(deleteProposal).toHaveBeenCalledTimes(1);
    resolve({ success: true, message: '삭제 완료' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
  it('수락된 제안서는 계약 현황 영향을 안내하고 취소할 수 있다', async () => {
    vi.mocked(getProposals).mockResolvedValue({ success: true, proposals: [{ ...proposal, status: 'ACCEPTED' }], message: '' });
    render(<ProposalsView />);
    await userEvent.click(await screen.findByTitle('제안서 삭제'));
    expect(screen.getByText(/계약 현황 표시에도/)).toBeVisible();
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '취소' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(deleteProposal).not.toHaveBeenCalled();
  });
});
