import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SopoLookupModal from '@/app/lead-manager/components/crm/SopoLookupModal';
vi.mock('sonner', () => ({ toast: vi.fn() }));
vi.mock('@/context/NotificationContext', () => ({ useNotification: () => ({ showNotification: vi.fn() }) }));
const lead = { id: 'lead', bizName: '상호', status: 'NEW' as const, mgtNo: 'localdata-id' };
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
describe('SOPO lookup dialog', () => {
  it('ignores an old response after the search identifier changes', async () => {
    let resolve!: (value: Response) => void;
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(done => { resolve = done; })));
    render(<SopoLookupModal lead={lead} onSave={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('건물관리번호'), { target: { value: 'old-building' } });
    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    fireEvent.change(screen.getByLabelText('건물관리번호'), { target: { value: 'new-building' } });
    await act(async () => resolve(new Response(JSON.stringify({ success: true, data: [{ bizesId: 'old', bizesNm: '이전 결과' }] }))));
    expect(screen.queryByText('이전 결과')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '데이터 저장하기' })).toBeDisabled();
  });
  it('does not automatically query with a LocalData license identifier', () => {
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    render(<SopoLookupModal lead={lead} onSave={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByLabelText('건물관리번호')).toHaveValue('');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('shows server error responses without requiring a data field', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: false, error: '요청 한도 초과' }), { status: 429 })));
    render(<SopoLookupModal lead={lead} onSave={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('건물관리번호'), { target: { value: 'building' } });
    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('요청 한도 초과');
  });
  it('requires selection and keeps the dialog open when persistence fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ success: true, data: [{ bizesId: 'store', bizesNm: '선택할 상가', rdnmAdr: '주소' }] }))));
    const close = vi.fn(); const save = vi.fn().mockRejectedValue(new Error('저장 실패'));
    render(<SopoLookupModal lead={lead} onSave={save} onClose={close} />);
    fireEvent.change(screen.getByLabelText('건물관리번호'), { target: { value: 'building' } });
    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    await screen.findByText('선택할 상가');
    expect(screen.getByRole('button', { name: '데이터 저장하기' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: /선택할 상가/ }));
    fireEvent.click(screen.getByRole('button', { name: '데이터 저장하기' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('저장 실패');
    expect(close).not.toHaveBeenCalled();
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
  });
});
