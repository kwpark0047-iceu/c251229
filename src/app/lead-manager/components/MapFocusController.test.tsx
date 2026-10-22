import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
const map = vi.hoisted(() => ({ flyTo: vi.fn() }));
vi.mock('react-leaflet', () => ({ useMap: () => map }));
import MapFocusController from './MapFocusController';

beforeEach(() => { vi.useFakeTimers(); vi.clearAllMocks(); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
describe('지도 포커스 수명 관리', () => {
  it('화면 이탈 후 이전 포커스 완료 콜백을 실행하지 않는다', () => {
    const clear = vi.fn();
    const view = render(<MapFocusController targetLocation={{ lat: 37.5, lng: 127 }} onFocusClear={clear} />);
    view.unmount();
    act(() => { vi.advanceTimersByTime(2100); });
    expect(clear).not.toHaveBeenCalled();
  });
  it('검색 대상을 바꾸면 최신 위치로 이동하고 이전 완료 타이머를 취소한다', () => {
    const clear = vi.fn();
    const view = render(<MapFocusController targetLocation={{ lat: 37.5, lng: 127 }} onFocusClear={clear} />);
    act(() => { vi.advanceTimersByTime(1000); });
    view.rerender(<MapFocusController targetLocation={{ lat: 37.6, lng: 127.1 }} onFocusClear={clear} />);
    expect(map.flyTo).toHaveBeenLastCalledWith([37.6, 127.1], 17, expect.any(Object));
    act(() => { vi.advanceTimersByTime(1000); });
    expect(clear).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(1000); });
    expect(clear).toHaveBeenCalledTimes(1);
  });
  it('잘못된 좌표를 Leaflet에 전달하지 않는다', () => {
    render(<MapFocusController targetLocation={{ lat: Infinity, lng: 127 }} />);
    expect(map.flyTo).not.toHaveBeenCalled();
  });
});
