/**
 * 철도산업정보센터 API 연동 서비스
 * 도시철도 전체노선정보 API를 활용한 실시간 노선 데이터
 */

import axios from 'axios';

// API 기본 정보
const KRIC_API_BASE_URL = 'https://openapi.kric.go.kr/openapi/trainUseInfo/subwayRouteInfo';
const KRIC_STATION_INFO_URL = 'https://openapi.kric.go.kr/openapi/convenientInfo/stationInfo';

// 제공된 서비스 키 (제거됨 - 서버 프록시 사용)
// const KRIC_SERVICE_KEY = '...';

// 권역 코드
export const AREA_CODES = {
  SEOUL: '01',    // 수도권
  BUSAN: '02',    // 부산
  DAEGU: '03',    // 대구
  GWANGJU: '04',  // 광주
  DAEJEON: '05',  // 대전
} as const;

// 노선 코드 (철도산업정보센터 기준)
export const LINE_CODES = {
  // 수도권
  LINE_1: '1001',      // 1호선
  LINE_2: '1002',      // 2호선
  LINE_3: '1003',      // 3호선
  LINE_4: '1004',      // 4호선
  LINE_5: '1005',      // 5호선
  LINE_6: '1006',      // 6호선
  LINE_7: '1007',      // 7호선
  LINE_8: '1008',      // 8호선
  LINE_9: '1009',      // 9호선

  // 신분당선
  SUIN_BUNDANG: '1085', // 수인분당선
  SHINBUNDANG: '1077',  // 신분당선

  // 경의중앙선
  GYEONGUI_JUNGANG: '1063', // 경의중앙선
  GYEONGCHUN: '1067',      // 경춘선

  // 공항철도
  AIRPORT_RAILROAD: '1065',  // 공항철도

  // 기타
  UIJEONGBU: '1099',    // 의정부경전철
  EVERLINE: '1086',     // 에버라인
  GIMPO_GOLD: '1087',   // 김포골드라인
  SEOIL: '1090',        // 서해선

  // 인천
  INCHEON_1: '1061',    // 인천 1호선
  INCHEON_2: '1069',    // 인천 2호선

  // 경전철
  UI_SINSEOL: '1092',   // 우이신설선
  SILLIM: '1093',       // 신림선
  GYEONGGANG: '1081',   // 경강선
} as const;

// 노선 색상 (실제 운영기관 표준 색상)
export const LINE_COLORS = {
  [LINE_CODES.LINE_1]: '#0052A4',      // 1호선: 남색
  [LINE_CODES.LINE_2]: '#00A84D',      // 2호선: 녹색
  [LINE_CODES.LINE_3]: '#EF7C1C',      // 3호선: 주황색
  [LINE_CODES.LINE_4]: '#00A5DE',      // 4호선: 하늘색
  [LINE_CODES.LINE_5]: '#996CAC',      // 5호선: 보라색
  [LINE_CODES.LINE_6]: '#CD7E2F',      // 6호선: 갈색
  [LINE_CODES.LINE_7]: '#727FB8',      // 7호선: 올리브색
  [LINE_CODES.LINE_8]: '#E6186A',      // 8호선: 분홍색
  [LINE_CODES.LINE_9]: '#BAB135',      // 9호선: 금색

  [LINE_CODES.SUIN_BUNDANG]: '#F5A200', // 수인분당선: 노란색
  [LINE_CODES.SHINBUNDANG]: '#D4003A',  // 신분당선: 빨간색
  [LINE_CODES.GYEONGUI_JUNGANG]: '#77BB4A', // 경의중앙선: 연두색
  [LINE_CODES.GYEONGCHUN]: '#807DB8',      // 경춘선: 보라색
  [LINE_CODES.AIRPORT_RAILROAD]: '#009D3E',  // 공항철도: 초록색

  [LINE_CODES.UIJEONGBU]: '#FDA600',     // 의정부경전철: 주황색
  [LINE_CODES.EVERLINE]: '#6FB245',      // 에버라인: 녹색
  [LINE_CODES.GIMPO_GOLD]: '#A17800',   // 김포골드라인: 금색
  [LINE_CODES.SEOIL]: '#81A914',        // 서해선: 연두색

  [LINE_CODES.INCHEON_1]: '#7CA8D5',    // 인천 1호선: 하늘색
  [LINE_CODES.INCHEON_2]: '#ED8B00',    // 인천 2호선: 주황색

  [LINE_CODES.UI_SINSEOL]: '#B0CE18',   // 우이신설선: 라임색
  [LINE_CODES.SILLIM]: '#6789CA',       // 신림선: 파란색
  [LINE_CODES.GYEONGGANG]: '#003DA5',   // 경강선: 파란색
} as const;

// 역 정보 타입 (노선 정보 API)
export interface KRICStation {
  stinCd: string;        // 역코드
  stinNm: string;        // 역명
  lnCd: string;          // 노선코드
  lnNm: string;          // 노선명
  ordrNo: string;        // 순번
  xcrd: string;          // X좌표
  ycrd: string;          // Y좌표
  mreaWideCd: string;    // 권역코드
  mreaWideNm: string;    // 권역명
  railOprIsttNm: string; // 운영기관명
}

// 역 정보 타입 (역사별 정보 API)
export interface KRICStationInfo {
  stinCd: string;           // 역코드
  stinNm: string;           // 역명
  lnCd: string;             // 노선코드
  lnNm: string;             // 노선명
  xcrd: string;            // X좌표
  ycrd: string;            // Y좌표
  stinAdres: string;        // 역 주소
  stinTelno: string;        // 역 전화번호
  railOprIsttNm: string;   // 운영기관명
  mreaWideCd: string;      // 권역코드
  mreaWideNm: string;      // 권역명
  stinKndCd: string;       // 역종류코드
  stinKndNm: string;       // 역종류명
  stinFcty: string;       // 역시설정보
  useDt: string;           // 사용일자
}

// 노선 정보 타입
export interface KRICLine {
  lnCd: string;          // 노선코드
  lnNm: string;          // 노선명
  mreaWideCd: string;    // 권역코드
  railOprIsttNm: string; // 운영기관명
  color: string;         // 노선색상
}

// API 응답 타입
interface KRICAPIResponse<T> {
  resultCode: string;
  resultMsg: string;
  body?: {
    items: {
      item: T[];
    };
  };
}

/**
 * 철도산업정보센터 API로 노선별 역 정보 가져오기
 * @param serviceKey API 서비스키
 * @param areaCode 권역코드
 * @param lineCode 노선코드
 * @returns 역 정보 배열
 */
export async function fetchSubwayRouteInfo(
  serviceKey: string,
  areaCode: string,
  lineCode: string
): Promise<KRICStation[]> {
  try {
    // 서버 프록시 사용 (/api/station-info)
    const response = await axios.get<any>('/api/station-info', {
      params: {
        line: lineCode,
      },
    });

    if (!response.data.success) {
      // API 호출 실패 시 빈 배열 반환 (지원되지 않는 노선일 수 있음)
      console.warn(`API returned failure for line ${lineCode}: ${response.data.error}`);
      return [];
    }

    const proxyData = response.data.data;
    const body = proxyData?.body || proxyData;
    const items = body?.items?.item || [];

    const result = Array.isArray(items) ? items : [items];
    if (result.length === 0) {
      // 데이터가 없으면 빈 배열 반환 (KRIC에서 지원되지 않는 노선)
      console.warn(`No data found for line ${lineCode} - this line may not be supported by KRIC API`);
      return [];
    }
    return result;
  } catch (error) {
    console.error(`Failed to fetch subway route info for line ${lineCode}:`, error);
    // 에러 발생 시에도 빈 배열 반환하여 다른 노선 데이터 로딩에 영향 없도록 함
    return [];
  }
}

/**
 * 철도산업정보센터 API로 역사별 상세 정보 가져오기
 * @param serviceKey API 서비스키
 * @param areaCode 권역코드
 * @param lineCode 노선코드
 * @param stationCode 역코드 (선택사항)
 * @returns 역사 정보 배열
 */
export async function fetchStationInfo(
  serviceKey: string,
  areaCode: string,
  lineCode?: string,
  stationCode?: string
): Promise<KRICStationInfo[]> {
  try {
    const params: any = {
      serviceKey,
      format: 'json',
      mreaWideCd: areaCode,
    };

    if (lineCode) {
      params.lnCd = lineCode;
    }

    if (stationCode) {
      params.stinCd = stationCode;
    }

    // 서버 프록시 사용
    const response = await axios.get<any>('/api/station-info', {
      params: {
        line: lineCode || '1', // 기본값 설정
        station: stationCode
      }
    });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to fetch station info');
    }

    const proxyData = response.data.data;
    const body = proxyData?.body || proxyData;
    const items = body?.items?.item || [];

    return Array.isArray(items) ? items : [items];
  } catch (error) {
    console.error(`Failed to fetch station info:`, error);
    // 빈 배열 반환하여 UI 중단 방지
    return [];
  }
}

/**
 * 수도권 전체 노선 정보 가져오기
 * @param serviceKey API 서비스키
 * @returns 전체 노선별 역 정보
 */
export async function fetchAllSeoulSubwayRoutes(
  serviceKey: string
): Promise<Record<string, KRICStation[]>> {
  const seoulLines = [
    LINE_CODES.LINE_1,
    LINE_CODES.LINE_2,
    LINE_CODES.LINE_3,
    LINE_CODES.LINE_4,
    LINE_CODES.LINE_5,
    LINE_CODES.LINE_6,
    LINE_CODES.LINE_7,
    LINE_CODES.LINE_8,
    LINE_CODES.LINE_9,
    LINE_CODES.SUIN_BUNDANG,
    LINE_CODES.SHINBUNDANG,
    LINE_CODES.GYEONGUI_JUNGANG,
    LINE_CODES.GYEONGCHUN,
    LINE_CODES.AIRPORT_RAILROAD,
    LINE_CODES.UIJEONGBU,
    LINE_CODES.EVERLINE,
    LINE_CODES.GIMPO_GOLD,
    LINE_CODES.SEOIL,
    LINE_CODES.INCHEON_1,
    LINE_CODES.INCHEON_2,
    LINE_CODES.UI_SINSEOL,
    LINE_CODES.SILLIM,
    LINE_CODES.GYEONGGANG,
  ];

  const results: Record<string, KRICStation[]> = {};

  // 브라우저 리소스 보호를 위해 청크 단위로 병렬 실행 (동시 요청 5개 제한)
  const chunkSize = 5;
  for (let i = 0; i < seoulLines.length; i += chunkSize) {
    const chunk = seoulLines.slice(i, i + chunkSize);
    await Promise.all(chunk.map(async (lineCode) => {
      try {
        const stations = await fetchSubwayRouteInfo(serviceKey, AREA_CODES.SEOUL, lineCode);
        results[lineCode] = stations;
        console.log(`✅ ${lineCode} 노선: ${stations.length}개역 로드 완료`);
      } catch (error) {
        console.error(`❌ ${lineCode} 노선 로드 실패:`, error);
        results[lineCode] = [];
      }
    }));
  }

  return results;
}

/**
 * 수도권 전체 역사 정보 가져오기 (상세 정보 포함)
 * @param serviceKey API 서비스키
 * @returns 전체 역사 상세 정보
 */
export async function fetchAllSeoulStationInfo(
  serviceKey: string
): Promise<KRICStationInfo[]> {
  try {
    console.log('🔄 Fetching all Seoul station info from KRIC API...');

    const stations = await fetchStationInfo(serviceKey, AREA_CODES.SEOUL);

    console.log(`✅ Loaded ${stations.length} station details`);
    return stations;
  } catch (error) {
    console.error('❌ Failed to fetch station info:', error);
    throw error;
  }
}

import proj4 from 'proj4';

// proj4 ESM/CJS 호환성 처리
const getProj4 = () => {
  // console.log('DEBUG [getProj4]: proj4 value:', proj4);
  if (typeof proj4 === 'function') return proj4;
  if (proj4 && (proj4 as any).default && typeof (proj4 as any).default === 'function') {
    return (proj4 as any).default;
  }
  // Try to use globally or locally if available
  try {
    const p = require('proj4');
    if (typeof p === 'function') return p;
    if (p.default && typeof p.default === 'function') return p.default;
  } catch (e) {
    // ignore
  }
  return proj4;
};

// TM128 (EPSG:5181) 및 WGS84 (EPSG:4326) 정의
// 한국 중부원점 (GRS80)
const TM128 = '+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=500000 +ellps=GRS80 +units=m +no_defs';
const WGS84 = 'EPSG:4326';

/**
 * KRIC 좌표를 WGS84 좌표로 변환
 * KRIC API는 TM128 좌표계를 사용
 * @param xcrd X좌표
 * @param ycrd Y좌표
 * @returns WGS84 좌표 [lat, lng]
 */
export function convertKRICToWGS84(xcrd: string, ycrd: string): [number, number] {
  if (!xcrd || !ycrd) {
    return [0, 0];
  }

  try {
    const x = parseFloat(xcrd);
    const y = parseFloat(ycrd);

    if (isNaN(x) || isNaN(y)) {
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
    const p4 = getProj4();
    if (typeof p4 !== 'function') {
      // proj4 로드 실패 시 마지막 수단으로 (비정밀하지만) 그대로 반환 시도
      return [y > 100 ? x : y, x > 100 ? x : y];
    }

    const result = p4(TM128, WGS84, [x, y]);

    if (!result || !Array.isArray(result)) {
      return [0, 0];
    }

    const [lng, lat] = result;
    return [lat, lng];
  } catch (error) {
    console.error('Coordinate conversion failed:', error);
    return [0, 0];
  }
}

/**
 * KRIC 역 정보를 기존 SubwayStation 형식으로 변환
 * @param kricStations KRIC 역 정보 배열
 * @returns 변환된 역 정보 배열
 */
export function convertKRICToSubwayStation(kricStations: KRICStation[]): Array<{
  name: string;
  lat: number;
  lng: number;
  lines: string[];
}> {
  const stationMap = new Map<string, { lat: number; lng: number; lines: Set<string> }>();

  kricStations.forEach(station => {
    const [lat, lng] = convertKRICToWGS84(station.xcrd, station.ycrd);

    // 유효하지 않은 좌표(0, 0)인 경우 제외하지 않고 일단 역은 추가 (검색용)
    const stinName = station.stinNm;

    if (!stationMap.has(stinName)) {
      stationMap.set(stinName, {
        lat,
        lng,
        lines: new Set(),
      });
    }

    stationMap.get(stinName)!.lines.add(getLineName(station.lnCd));
  });

  return Array.from(stationMap.entries()).map(([name, data]) => ({
    name,
    lat: data.lat,
    lng: data.lng,
    lines: Array.from(data.lines),
  }));
}

/**
 * KRIC 역사 상세 정보를 기존 SubwayStation 형식으로 변환
 * @param kricStationInfos KRIC 역사 정보 배열
 * @returns 변환된 역 정보 배열
 */
export function convertKRICStationInfoToSubwayStation(kricStationInfos: KRICStationInfo[]): Array<{
  name: string;
  lat: number;
  lng: number;
  lines: string[];
  address?: string;
  phone?: string;
  facilities?: string;
}> {
  const stationMap = new Map<string, { lat: number; lng: number; lines: Set<string>; address?: string; phone?: string; facilities?: string }>();

  kricStationInfos.forEach(info => {
    const [lat, lng] = convertKRICToWGS84(info.xcrd, info.ycrd);
    const stationName = info.stinNm;

    if (!stationMap.has(stationName)) {
      stationMap.set(stationName, {
        lat,
        lng,
        lines: new Set(),
        address: info.stinAdres,
        phone: info.stinTelno,
        facilities: info.stinFcty,
      });
    }

    const current = stationMap.get(stationName)!;
    current.lines.add(getLineName(info.lnCd));

    // 더 상세한 정보가 있으면 업데이트
    if (info.stinAdres) current.address = info.stinAdres;
    if (info.stinTelno) current.phone = info.stinTelno;
    if (info.stinFcty) current.facilities = info.stinFcty;
  });

  return Array.from(stationMap.entries()).map(([name, data]) => ({
    name,
    lat: data.lat,
    lng: data.lng,
    lines: Array.from(data.lines),
    address: data.address,
    phone: data.phone,
    facilities: data.facilities,
  }));
}

/**
 * 노선코드를 노선명으로 변환
 * @param lineCode 노선코드
 * @returns 노선명
 */
function getLineName(lineCode: string): string {
  const lineNames: Record<string, string> = {
    [LINE_CODES.LINE_1]: '1',
    [LINE_CODES.LINE_2]: '2',
    [LINE_CODES.LINE_3]: '3',
    [LINE_CODES.LINE_4]: '4',
    [LINE_CODES.LINE_5]: '5',
    [LINE_CODES.LINE_6]: '6',
    [LINE_CODES.LINE_7]: '7',
    [LINE_CODES.LINE_8]: '8',
    [LINE_CODES.LINE_9]: '9',
    [LINE_CODES.SUIN_BUNDANG]: 'B',
    [LINE_CODES.SHINBUNDANG]: 'S',
    [LINE_CODES.GYEONGUI_JUNGANG]: 'K',
    [LINE_CODES.GYEONGCHUN]: 'G',
    [LINE_CODES.AIRPORT_RAILROAD]: 'A',
    [LINE_CODES.UIJEONGBU]: 'U',
    [LINE_CODES.EVERLINE]: 'E',
    [LINE_CODES.GIMPO_GOLD]: 'G',
    [LINE_CODES.SEOIL]: 'W', // Seo -> W (서해선 약어 일치)
    [LINE_CODES.INCHEON_1]: 'I1',
    [LINE_CODES.INCHEON_2]: 'I2',
    [LINE_CODES.UI_SINSEOL]: 'Ui',
    [LINE_CODES.SILLIM]: 'Si',
    [LINE_CODES.GYEONGGANG]: 'Kg',
  };

  return lineNames[lineCode] || lineCode;
}

/**
 * 노선별 좌표 경로 생성
 * @param kricStations 노선별 역 정보
 * @returns 노선별 좌표 배열
 */
export function generateLineRoutes(
  kricStations: Record<string, KRICStation[]>
): Record<string, { color: string; coords: [number, number][] }> {
  const routes: Record<string, { color: string; coords: [number, number][] }> = {};

  Object.entries(kricStations).forEach(([lineCode, stations]) => {
    if (stations.length === 0) return;

    // 순번으로 정렬
    const sortedStations = stations.sort((a, b) =>
      parseInt(a.ordrNo) - parseInt(b.ordrNo)
    );

    // 좌표 변환
    const coords = sortedStations
      .map(station => convertKRICToWGS84(station.xcrd, station.ycrd))
      .filter(([lat, lng]) => !isNaN(lat) && !isNaN(lng));

    routes[lineCode] = {
      color: LINE_COLORS[lineCode as keyof typeof LINE_COLORS] || '#888',
      coords,
    };
  });

  return routes;
}

/**
 * API 서비스키 유효성 검증
 * @param serviceKey API 서비스키
 * @returns 유효성 여부
 */
export async function validateServiceKey(serviceKey: string): Promise<boolean> {
  try {
    const info = await fetchSubwayRouteInfo(serviceKey, AREA_CODES.SEOUL, LINE_CODES.LINE_1);
    return info && info.length > 0;
  } catch (error) {
    return false;
  }
}

/**
 * 환경변수에서 API 키 가져오기
 * @returns API 서비스키
 */
export function getKRICServiceKey(): string {
  // 제공된 서비스키 우선 사용 (하드코딩 제거됨)
  // const providedKey = KRIC_SERVICE_KEY;
  // if (providedKey) {
  //   return providedKey;
  // }

  // 환경변수에서 API 키 찾기
  const key = process.env.KRIC_API_KEY || process.env.NEXT_PUBLIC_KRIC_API_KEY;

  if (!key) {
    throw new Error('KRIC API key not found. Please set KRIC_API_KEY or NEXT_PUBLIC_KRIC_API_KEY environment variable.');
  }

  return key;
}
