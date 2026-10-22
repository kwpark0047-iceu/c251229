import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DataSyncModal from '@/app/lead-manager/components/DataSyncModal';
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const sources = [
  { key: 'gg-clinics', label: '경기도 의원', region: '경기도', hasKey: true },
  { key: 'gg-univ', label: '경기도 대학교', region: '경기도', hasKey: true, disabled: true, disabledReason: '서비스 중지' },
  { key: 'gg-food-trucks', label: '경기도 푸드트럭', region: '경기도', hasKey: false, envKey: 'GG_FOOD_TRUCK_API_KEY' },
];
describe('동기화 화면 회귀 검증', () => {
  it('prevents selecting missing-key and unavailable sources', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ sources }))));
    render(<DataSyncModal onClose={vi.fn()} />);
    expect(await screen.findByRole('button', { name: /경기도 대학교/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /경기도 푸드트럭/ })).toBeDisabled();
    expect(screen.getByText('1개 소스 선택됨')).toBeInTheDocument();
  });
  it('shows a provider failure and releases the running state', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ sources })))
      .mockResolvedValueOnce(new Response(JSON.stringify({ results: [{ source: 'gg-clinics', total: 0, fetched: 0, saved: 0, error: '제공기관 오류' }] }))));
    render(<DataSyncModal onClose={vi.fn()} />);
    await screen.findByText('1개 소스 선택됨');
    fireEvent.click(screen.getByRole('button', { name: '동기화 시작' }));
    expect(await screen.findByText('제공기관 오류')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText('데이터 수집 중...')).not.toBeInTheDocument());
  });
});
