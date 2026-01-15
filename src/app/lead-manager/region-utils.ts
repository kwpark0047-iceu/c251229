/**
 * 지역 필터링 유틸리티
 * 서울/경기 지역 코드와 주소 매핑
 */

/**
 * 지역 코드 타입
 */
export type RegionCode = '6110000' | '6410000';

/**
 * 지역 정보 타입
 */
export interface RegionInfo {
  code: RegionCode;
  name: string;
  fullName: string;
  prefixes: string[];
  color: string;
}

/**
 * 지역 정보 매핑
 */
export const REGIONS: Record<RegionCode, RegionInfo> = {
  '6110000': {
    code: '6110000',
    name: '서울',
    fullName: '서울특별시',
    prefixes: ['서울특별시', '서울'],
    color: 'var(--metro-line1)',
  },
  '6410000': {
    code: '6410000',
    name: '경기',
    fullName: '경기도',
    prefixes: ['경기도', '경기'],
    color: 'var(--metro-line3)',
  },
};

/**
 * 주소가 해당 지역에 속하는지 확인
 * @param address - 주소 문자열
 * @param regionCode - 지역 코드
 * @returns 지역에 속하면 true
 */
export function isAddressInRegion(address: string, regionCode: RegionCode): boolean {
  const region = REGIONS[regionCode];
  if (!region) return false;
  
  return region.prefixes.some(prefix => address.includes(prefix));
}

/**
 * 주소에서 지역 코드 추출
 * @param address - 주소 문자열
 * @returns 지역 코드 또는 null
 */
export function extractRegionCode(address: string): RegionCode | null {
  for (const [code, region] of Object.entries(REGIONS)) {
    if (isAddressInRegion(address, code as RegionCode)) {
      return code as RegionCode;
    }
  }
  return null;
}

/**
 * 여러 지역 코드로 필터링
 * @param address - 주소 문자열
 * @param regionCodes - 지역 코드 배열
 * @returns 해당 지역들 중 하나에 속하면 true
 */
export function isAddressInRegions(address: string, regionCodes: RegionCode[]): boolean {
  return regionCodes.some(code => isAddressInRegion(address, code));
}

/**
 * 지역 코드 배열로 지역 이름 배열 변환
 * @param regionCodes - 지역 코드 배열
 * @returns 지역 이름 배열
 */
export function getRegionNames(regionCodes: RegionCode[]): string[] {
  return regionCodes.map(code => REGIONS[code]?.name || code);
}

/**
 * 지역 코드 배열로 지역 전체 이름 배열 변환
 * @param regionCodes - 지역 코드 배열
 * @returns 지역 전체 이름 배열
 */
export function getRegionFullNames(regionCodes: RegionCode[]): string[] {
  return regionCodes.map(code => REGIONS[code]?.fullName || code);
}

/**
 * 지역 필터링을 위한 접두사 목록 생성 (레거시 호환성)
 * @param regionCodes - 지역 코드 배열
 * @returns 주소 접두사 배열
 */
export function getRegionPrefixes(regionCodes: RegionCode[]): string[] {
  const prefixes: string[] = [];
  regionCodes.forEach(code => {
    const region = REGIONS[code];
    if (region) {
      prefixes.push(...region.prefixes);
    }
  });
  return prefixes;
}

/**
 * 지역 선택 옵션 생성
 * @returns 지역 선택 옵션 배열
 */
export function getRegionOptions(): Array<{
  code: RegionCode;
  name: string;
  fullName: string;
  color: string;
}> {
  return Object.values(REGIONS).map(region => ({
    code: region.code,
    name: region.name,
    fullName: region.fullName,
    color: region.color,
  }));
}

/**
 * 주소 정규화 (지역 필터링용)
 * @param address - 원본 주소
 * @returns 정규화된 주소
 */
export function normalizeAddress(address: string): string {
  return address
    .replace(/\s+/g, ' ')      // 연속 공백 -> 단일 공백
    .replace(/[\u3000]/g, ' ') // 전각 공백 -> 반각 공백
    .trim();                   // 앞뒤 공백 제거
}

/**
 * 주소에서 지역 정보 추출
 * @param address - 주소 문자열
 * @returns 지역 정보 또는 null
 */
export function extractRegionInfo(address: string): RegionInfo | null {
  const regionCode = extractRegionCode(address);
  return regionCode ? REGIONS[regionCode] : null;
}

/**
 * 지역별 통계 생성
 * @param addresses - 주소 배열
 * @returns 지역별 개수 통계
 */
export function getRegionStats(addresses: string[]): Record<RegionCode, number> {
  const stats: Record<RegionCode, number> = {
    '6110000': 0,
    '6410000': 0,
  };

  addresses.forEach(address => {
    const regionCode = extractRegionCode(address);
    if (regionCode) {
      stats[regionCode]++;
    }
  });

  return stats;
}
