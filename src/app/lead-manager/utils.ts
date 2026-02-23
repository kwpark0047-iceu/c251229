/**
 * 서울 지하철 광고 영업 시스템 - 유틸리티 함수
 */

import proj4 from 'proj4';
import { PROJ4_DEFS, SUBWAY_STATIONS } from './constants';
import { SubwayStation } from './types';

// proj4 좌표계 등록
proj4.defs('EPSG5174', PROJ4_DEFS.EPSG5174);
proj4.defs('EPSG5181', PROJ4_DEFS.EPSG5181);
proj4.defs('EPSG5179', PROJ4_DEFS.EPSG5179);
proj4.defs('WGS84', PROJ4_DEFS.WGS84);
// KRIC API 전용 TM128 좌표계 정의 (중부원점 GRS80)
const TM128 = '+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=500000 +ellps=GRS80 +units=m +no_defs';
proj4.defs('TM128', TM128);

/**
 * 좌표값을 기반으로 좌표계 자동 감지
 * @param x - X 좌표
 * @param y - Y 좌표
 * @returns 좌표계 이름
 */
function detectCoordinateSystem(x: number, y: number): string {
  // EPSG:5179 (통합기준점): x가 약 100만~130만, y가 약 170만~220만
  if (x > 800000 && x < 1500000 && y > 1500000 && y < 2500000) {
    return 'EPSG5179';
  }
  // EPSG:5174/5181 (중부원점): x가 약 10만~40만, y가 약 40만~70만
  if (x > 100000 && x < 500000 && y > 300000 && y < 800000) {
    return 'EPSG5174';
  }
  // 기본값
  return 'EPSG5174';
}

/**
 * TM 좌표를 WGS84 위경도로 변환
 * @param x - TM X 좌표
 * @param y - TM Y 좌표
 * @returns { lat, lng } - 위도, 경도
 */
export function convertGRS80ToWGS84(x: number, y: number): { lat: number; lng: number } | null {
  try {
    if (!x || !y || x === 0 || y === 0) {
      return null;
    }

    // 좌표계 자동 감지
    const sourceSystem = detectCoordinateSystem(x, y);
    const [lng, lat] = proj4(sourceSystem, 'WGS84', [x, y]);

    // 변환 결과 유효성 검사 (서울/경기 범위: 위도 33~43, 경도 124~132)
    if (lat < 33 || lat > 43 || lng < 124 || lng > 132) {
      console.warn(`[Utils] 좌표 변환 결과가 범위를 벗어남: (${lat}, ${lng}) from source ${sourceSystem}`);
      return null;
    }

    return { lat, lng };
  } catch (error) {
    console.error('[Utils] GRS80 좌표 변환 오류:', error);
    return null;
  }
}

/**
 * KRIC 좌표(TM128)를 WGS84 위경도로 변환
 * @param xcrd - X 좌표 문자열
 * @param ycrd - Y 좌표 문자열
 * @returns [lat, lng] 배열
 */
export function convertKRICToWGS84(xcrd: string, ycrd: string): [number, number] {
  if (!xcrd || !ycrd) {
    return [0, 0];
  }

  try {
    const x = parseFloat(xcrd);
    const y = parseFloat(ycrd);

    if (isNaN(x) || isNaN(y) || x === 0 || y === 0) {
      return [0, 0];
    }

    // 방어 코드: 이미 WGS84(위경도) 범위인 경우 변환 건너뜀
    // 경도: 124~132, 위도: 33~39 (한국 범위)
    if (x > 124 && x < 132 && y > 33 && y < 39) {
      return [y, x];
    }
    // KRIC API 응답 중 x, y 순서가 바뀐 경우 대응 (위도: 33~39, 경도: 124~132)
    if (y > 124 && y < 132 && x > 33 && x < 39) {
      return [x, y];
    }

    // proj4를 이용한 TM128 -> WGS84 변환
    const [lng, lat] = proj4('TM128', 'WGS84', [x, y]);

    // 변환 결과 유효성 검증
    if (isNaN(lat) || isNaN(lng) || lat < 33 || lat > 43 || lng < 124 || lng > 132) {
      console.warn(`[Utils] KRIC 좌표 변환 결과 무효: (${lat}, ${lng}) for inputs (${xcrd}, ${ycrd})`);
      return [0, 0];
    }

    return [lat, lng];
  } catch (error) {
    console.error('[Utils] KRIC 좌표 변환 실패:', error);
    return [0, 0];
  }
}

/**
 * Haversine 공식을 사용하여 두 지점 간의 거리 계산 (미터)
 * @param lat1 - 시작점 위도
 * @param lng1 - 시작점 경도
 * @param lat2 - 끝점 위도
 * @param lng2 - 끝점 경도
 * @returns 거리 (미터)
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371000; // 지구 반경 (미터)
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * 각도를 라디안으로 변환
 */
function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * 가장 가까운 지하철역 찾기
 * @param lat - 위도
 * @param lng - 경도
 * @returns { station, distance } - 가장 가까운 역 정보와 거리
 */
export function findNearestStation(
  lat: number,
  lng: number
): { station: SubwayStation; distance: number } | null {
  if (!lat || !lng) return null;

  let nearest: { station: SubwayStation; distance: number } | null = null;

  for (const station of SUBWAY_STATIONS) {
    const distance = calculateDistance(lat, lng, station.lat, station.lng);
    if (!nearest || distance < nearest.distance) {
      nearest = { station, distance };
    }
  }

  return nearest;
}

/**
 * 거리를 사람이 읽기 쉬운 형태로 포맷
 * @param meters - 거리 (미터)
 * @returns 포맷된 거리 문자열
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${meters}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
}

/**
 * 날짜를 YYYYMMDD 형식으로 포맷
 * @param date - Date 객체
 * @returns YYYYMMDD 형식 문자열
 */
export function formatDateToAPI(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * 날짜를 YYYY-MM-DD 형식으로 포맷
 * @param date - Date 객체
 * @returns YYYY-MM-DD 형식 문자열
 */
export function formatDateDisplay(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * API 날짜 문자열을 Date 객체로 변환
 * @param dateStr - YYYYMMDD 또는 YYYY-MM-DD 형식 문자열
 * @returns Date 객체
 */
export function parseAPIDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  // YYYYMMDD 형식
  if (dateStr.length === 8 && !dateStr.includes('-')) {
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1;
    const day = parseInt(dateStr.substring(6, 8));
    return new Date(year, month, day);
  }

  // YYYY-MM-DD 형식
  return new Date(dateStr);
}

/**
 * 전화번호 포맷
 * @param phone - 전화번호 문자열
 * @returns 포맷된 전화번호
 */
export function formatPhoneNumber(phone: string): string {
  if (!phone) return '';

  // 숫자만 추출
  const numbers = phone.replace(/\D/g, '');

  // 02 지역번호
  if (numbers.startsWith('02')) {
    if (numbers.length === 9) {
      return `${numbers.slice(0, 2)}-${numbers.slice(2, 5)}-${numbers.slice(5)}`;
    } else if (numbers.length === 10) {
      return `${numbers.slice(0, 2)}-${numbers.slice(2, 6)}-${numbers.slice(6)}`;
    }
  }

  // 일반 지역번호 및 휴대폰
  if (numbers.length === 10) {
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 6)}-${numbers.slice(6)}`;
  } else if (numbers.length === 11) {
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7)}`;
  }

  return phone;
}

/**
 * 문자열 길이 제한 및 말줄임
 * @param str - 원본 문자열
 * @param maxLength - 최대 길이
 * @returns 말줄임 처리된 문자열
 */
export function truncateString(str: string, maxLength: number): string {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * UUID 생성
 * @returns UUID 문자열
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * n일 전 날짜 계산
 * @param days - 일수
 * @returns Date 객체
 */
export function getDateBefore(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

/**
 * 전월 24일 날짜 반환 (LocalData API 조회 가능 시작일)
 * @returns Date 객체
 */
export function getPreviousMonth24th(): Date {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  date.setDate(24);
  return date;
}

/**
 * API 키가 URL 인코딩되어 있는지 확인
 * @param key - API 키
 * @returns boolean
 */
export function isURLEncoded(key: string): boolean {
  try {
    return decodeURIComponent(key) !== key;
  } catch {
    return false;
  }
}


/**
 * 검색어와 일치하는 텍스트 하이라이트를 위한 정보 반환
 * @param text - 원본 텍스트
 * @param query - 검색어
 * @returns 하이라이트 정보 배열 [{text, isHighlight}]
 */
export function getHighlightParts(text: string, query: string): { text: string; isHighlight: boolean }[] {
  if (!text || !query || !query.trim()) {
    return [{ text: text || '', isHighlight: false }];
  }

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase().trim();
  const parts: { text: string; isHighlight: boolean }[] = [];

  let lastIndex = 0;
  let index = lowerText.indexOf(lowerQuery);

  while (index !== -1) {
    // 매칭 전 텍스트
    if (index > lastIndex) {
      parts.push({ text: text.slice(lastIndex, index), isHighlight: false });
    }
    // 매칭된 텍스트
    parts.push({ text: text.slice(index, index + lowerQuery.length), isHighlight: true });
    lastIndex = index + lowerQuery.length;
    index = lowerText.indexOf(lowerQuery, lastIndex);
  }

  // 남은 텍스트
  if (lastIndex < text.length) {
    parts.push({ text: text.slice(lastIndex), isHighlight: false });
  }

  return parts.length > 0 ? parts : [{ text, isHighlight: false }];
}
/**
 * 주소 문자열에서 구(District) 정보 추출
 * @param address 주소 문자열
 * @returns 구 이름 (예: 강남구)
 */
export function extractDistrict(address: string | null | undefined): string | null {
  if (!address) return null;
  const match = address.match(/([가-힣]+구)\b/);
  return match ? match[1] : null;
}

/**
 * 주소 문자열에서 동(Neighborhood) 정보 추출
 * @param address 주소 문자열
 * @returns 동 이름 (예: 역삼동)
 */
export function extractNeighborhood(address: string | null | undefined): string | null {
  if (!address) return null;
  // 도로명 주소에서 '동'을 찾거나, 지번 주소에서 '동'을 찾음
  const match = address.match(/([가-힣\d]+동)\b/);
  return match ? match[1] : null;
}
