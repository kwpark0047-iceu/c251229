import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import PresenceIndicator from './PresenceIndicator';
afterEach(cleanup);
it('실제 0명과 재연결 중의 확인 불가 인원을 구분한다', () => {
  const view = render(<PresenceIndicator count={0} connection="connected" />);
  expect(screen.getByRole('status')).toHaveTextContent('0명');
  view.rerender(<PresenceIndicator count={12} connection="reconnecting" />);
  expect(screen.getByRole('status')).toHaveTextContent('재연결 중');
  expect(screen.getByRole('status')).not.toHaveTextContent('12명');
  view.rerender(<PresenceIndicator count={0} connection="unavailable" />);
  expect(screen.getByRole('status')).toHaveTextContent('확인 불가');
  expect(screen.getByRole('status')).not.toHaveTextContent('0명');
});
