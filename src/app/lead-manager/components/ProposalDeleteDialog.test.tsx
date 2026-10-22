import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Proposal } from '../types';
vi.mock('../proposal-service', () => ({ deleteProposal: vi.fn() }));
import { deleteProposal } from '../proposal-service';
import ProposalDeleteDialog from './ProposalDeleteDialog';

const proposal: Proposal = { id: 'synthetic', leadId: 'lead', title: '합성 제안서', inventoryIds: [], status: 'SENT' };
afterEach(() => { cleanup(); vi.resetAllMocks(); });

describe('제안서 삭제 안전성', () => {
  it('삭제 후 화면 갱신 예외가 나면 재삭제를 허용하지 않는다', async () => {
    vi.mocked(deleteProposal).mockResolvedValue({ success: true, message: '삭제 완료', warnings: ['첨부 정리 확인'] });
    render(<ProposalDeleteDialog proposal={proposal} onClose={vi.fn()} onDeleted={() => { throw Error('local refresh'); }} />);
    await userEvent.type(screen.getByLabelText(/확인을 위해/), proposal.title);
    await userEvent.click(screen.getByRole('button', { name: '삭제 확정' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('삭제 완료');
    expect(screen.queryByRole('button', { name: '삭제 확정' })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('첨부 정리 확인');
    expect(deleteProposal).toHaveBeenCalledTimes(1);
  });
  it('컨테이너에 포커스가 있어도 Tab을 내부에 유지하고 Escape를 처리한다', async () => {
    const close = vi.fn();
    render(<ProposalDeleteDialog proposal={proposal} onClose={close} onDeleted={vi.fn()} />);
    const panel = screen.getByRole('dialog');
    panel.focus();
    await userEvent.tab();
    expect(within(panel).getByLabelText(/확인을 위해/)).toHaveFocus();
    panel.focus();
    await userEvent.tab({ shift: true });
    expect(within(panel).getByRole('button', { name: '취소' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(close).toHaveBeenCalledTimes(1);
  });
});
