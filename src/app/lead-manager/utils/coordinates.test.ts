import { describe, expect, it } from 'vitest';
import { isValidCoordinates } from './coordinates';

describe('WGS84 좌표 검증', () => {
  it.each([[37.5, 127], [0, 0], [-90, -180], [90, 180]])('유효한 범위 %s,%s를 허용한다', (lat, lng) => {
    expect(isValidCoordinates(lat, lng)).toBe(true);
  });
  it.each([[undefined, 127], [37.5, null], ['37.5', 127], [37.5, '127'], [NaN, 127],
    [37.5, NaN], [Infinity, 127], [37.5, -Infinity], [-91, 127], [91, 127], [37.5, -181], [37.5, 181]])('유효하지 않은 값 %s,%s를 거부한다', (lat, lng) => {
    expect(isValidCoordinates(lat, lng)).toBe(false);
  });
});
