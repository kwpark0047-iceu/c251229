import { describe, expect, it, vi } from 'vitest';
vi.mock('./constants', async importOriginal => ({
  ...await importOriginal<typeof import('./constants')>(),
  SUBWAY_STATIONS: [
    { name: '잘못된 역', lat: Infinity, lng: 127, line: '2' },
    { name: '합성 역', lat: 37.5, lng: 127, line: '2' },
  ],
}));
import { findNearestStation } from './utils';

describe('인근역 좌표 안전성', () => {
  it.each([[Infinity, 127], [37.5, Infinity], [NaN, 127], [91, 127], [37.5, 181]])('유효하지 않은 좌표 %s,%s는 추천하지 않는다', (lat, lng) => {
    expect(findNearestStation(lat, lng)).toBeNull();
  });
  it('잘못된 역사 좌표를 건너뛰고 정상 역과 유한한 거리를 반환한다', () => {
    expect(findNearestStation(37.5, 127)).toMatchObject({ station: { name: '합성 역' }, distance: 0 });
  });
  it('기존 3km 추천 반경을 유지한다', () => {
    expect(findNearestStation(35, 127)).toBeNull();
  });
});
