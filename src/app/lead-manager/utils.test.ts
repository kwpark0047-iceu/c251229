/**
 * Lead Manager 유틸리티 함수 테스트
 */

import { describe, it, expect } from 'vitest';
import {
  convertGRS80ToWGS84,
  calculateDistance,
  formatDistance,
  formatPhoneNumber,
  truncateString,
  getHighlightParts,
} from './utils';

describe('좌표 변환', () => {
  it('GRS80 좌표를 WGS84로 변환', () => {
    // 서울 강남역 근처 좌표 (EPSG:5174)
    const result = convertGRS80ToWGS84(200000, 500000);
    expect(result).not.toBeNull();
    if (result) {
      expect(result.lat).toBeGreaterThan(37);
      expect(result.lat).toBeLessThan(38);
      expect(result.lng).toBeGreaterThan(126);
      expect(result.lng).toBeLessThan(128);
    }
  });

  it('잘못된 좌표는 null 반환', () => {
    const result = convertGRS80ToWGS84(0, 0);
    expect(result).toBeNull();
  });
});

describe('거리 계산', () => {
  it('Haversine 공식으로 거리 계산', () => {
    // 강남역 (37.4980, 127.0276)과 역삼역 (37.5000, 127.0364) 간 거리
    const distance = calculateDistance(37.4980, 127.0276, 37.5000, 127.0364);
    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThan(2000); // 약 800m 정도
  });
});

describe('거리 포맷', () => {
  it('1000m 미만은 미터 단위', () => {
    expect(formatDistance(500)).toBe('500m');
    expect(formatDistance(999)).toBe('999m');
  });

  it('1000m 이상은 킬로미터 단위', () => {
    expect(formatDistance(1000)).toBe('1.0km');
    expect(formatDistance(2500)).toBe('2.5km');
  });
});

describe('전화번호 포맷', () => {
  it('02 지역번호 포맷', () => {
    expect(formatPhoneNumber('0212345678')).toBe('02-1234-5678');
    expect(formatPhoneNumber('02123456789')).toBe('02-1234-56789');
  });

  it('일반 지역번호 포맷', () => {
    expect(formatPhoneNumber('0311234567')).toBe('031-123-4567');
    expect(formatPhoneNumber('01012345678')).toBe('010-1234-5678');
  });

  it('이미 포맷된 번호는 그대로 반환', () => {
    expect(formatPhoneNumber('02-1234-5678')).toBe('02-1234-5678');
  });
});

describe('문자열 처리', () => {
  it('문자열 길이 제한', () => {
    expect(truncateString('안녕하세요', 5)).toBe('안녕하세요');
    expect(truncateString('안녕하세요 반갑습니다', 10)).toBe('안녕하세요 반...');
  });

  it('하이라이트 파트 추출', () => {
    const parts = getHighlightParts('서울시 강남구 역삼동', '강남');
    expect(parts.length).toBeGreaterThan(1);
    expect(parts.some(p => p.isHighlight && p.text.includes('강남'))).toBe(true);
  });

  it('검색어가 없으면 하이라이트 없음', () => {
    const parts = getHighlightParts('서울시 강남구', '');
    expect(parts.length).toBe(1);
    expect(parts[0].isHighlight).toBe(false);
  });
});
