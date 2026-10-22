import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
const mocks = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock('@/context/NotificationContext', () => ({ useNotification: () => ({
  notifications: [{ id: 'notice', message: '키보드 알림', type: 'info', isRead: false, timestamp: new Date() }],
  unreadCount: 1, markAsRead: mocks.read, markAllAsRead: vi.fn(), clearAll: vi.fn(),
}) }));
import NotificationCenter from '@/components/NotificationCenter';
import { ResponsiveCard } from '@/app/shared/responsive';
import AiRecommendWidget from '@/components/AiRecommendWidget';
import SendEmailModal from '@/app/lead-manager/components/crm/SendEmailModal';

afterEach(() => { cleanup(); vi.clearAllMocks(); });
describe('공용 UI 접근성', () => {
  it('추천 조건의 라벨을 실제 선택 입력에 연결한다', () => {
    render(<AiRecommendWidget />);
    for (const label of ['업종 선택', '월간 예산', '희망 지역']) {
      expect(screen.getByLabelText(label)).toBeInstanceOf(HTMLSelectElement);
    }
  });
  it('메일 입력 라벨을 연결하고 기존 발송 payload를 보존한다', async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    render(<SendEmailModal isOpen onClose={vi.fn()} onSend={send} />);
    await userEvent.type(screen.getByLabelText(/받는 사람/), 'mock@example.com');
    await userEvent.type(screen.getByLabelText(/제목/), '제안서');
    await userEvent.type(screen.getByLabelText('내용'), '테스트 본문');
    fireEvent.submit(screen.getByLabelText('내용').closest('form')!);
    await waitFor(() => expect(send).toHaveBeenCalledWith({ to: 'mock@example.com', subject: '제안서', body: '테스트 본문' }));
  });
  it('알림을 네이티브 버튼으로 키보드 처리한다', async () => {
    render(<NotificationCenter />);
    await userEvent.click(screen.getByRole('button', { name: /알림/ }));
    const notice = screen.getByRole('button', { name: /키보드 알림/ });
    expect(notice.tagName).toBe('BUTTON');
    notice.focus();
    await userEvent.keyboard('{Enter}');
    expect(mocks.read).toHaveBeenCalledExactlyOnceWith('notice');
  });
  it('카드 상세와 내부 버튼의 동작을 분리한다', async () => {
    const open = vi.fn(), nested = vi.fn();
    render(<ResponsiveCard onClick={open}><span>카드 본문</span><button onClick={nested}>내부 작업</button></ResponsiveCard>);
    await userEvent.click(screen.getByRole('button', { name: '내부 작업' }));
    expect(nested).toHaveBeenCalledTimes(1);
    expect(open).not.toHaveBeenCalled();
    const detail = screen.getByRole('button', { name: '카드 선택' });
    expect(detail.tagName).toBe('BUTTON');
    expect(detail.querySelector('button')).toBeNull();
    detail.focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');
    expect(open).toHaveBeenCalledTimes(2);
  });
  it('이미지 로드·실패 이벤트를 보존하고 재렌더 시 중복 호출하지 않는다', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,AA');
    const { default: OptimizedImage } = await import('@/app/shared/OptimizedImage');
    const loaded = vi.fn(), failed = vi.fn();
    const view = render(<OptimizedImage src="/test.png" alt="도면" format="jpeg" priority placeholder="empty" onLoad={loaded} onError={failed} />);
    const image = screen.getByAltText('도면');
    await waitFor(() => expect(image).toHaveAttribute('src', expect.stringContaining('test.png')));
    fireEvent.load(image);
    expect(loaded).toHaveBeenCalledTimes(1);
    view.rerender(<OptimizedImage src="/test.png" alt="도면" format="jpeg" priority placeholder="empty" onLoad={loaded} onError={failed} />);
    fireEvent.error(image);
    expect(failed).toHaveBeenCalledTimes(1);
    expect(screen.getByText('이미지를 불러올 수 없습니다')).toBeInTheDocument();
    vi.restoreAllMocks();
  });
});
