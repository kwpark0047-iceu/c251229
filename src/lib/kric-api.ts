/**
 * KRIC (한국철도공사) OpenAPI 서비스
 * 역사별 정보 조회
 */

const KRIC_API_BASE_URL = 'https://openapi.kric.go.kr/openapi';

export interface StationInfo {
  stinCd: string;        // 역코드
  stinNm: string;        // 역명
  railOprIsttCd: string; // 철도운영기관코드
  lnCd: string;          // 선코드
  lonmAdr: string;       // 지번주소
  roadNmAdr: string;     // 도로명주소
  mapCordX: string;      // X좌표
  mapCordY: string;      // Y좌표
  stinLocLat: string;    // 위도
  stinLocLon: string;    // 경도
  stinNmEng: string;     // 영문역명
  stinNmJpn?: string;    // 일본어역명
  strkZone: string;      // 행정구역코드
}

interface KricApiResponse {
  body: StationInfo[];
  header: {
    resultCode: string;
    resultMsg: string;
  };
}

/**
 * KRIC API 서비스키 가져오기
 */
function getServiceKey(): string {
  const key = process.env.KRIC_API_KEY;
  if (!key) {
    console.warn('KRIC_API_KEY가 설정되지 않았습니다.');
    return '';
  }
  return key;
}

/**
 * 역사 정보 조회
 * @param params 조회 파라미터
 */
export async function getStationInfo(params: {
  railOprIsttCd?: string; // 철도운영기관코드 (KR: 한국철도공사)
  lnCd?: string;          // 선코드 (1, 2, 3...)
  stinCd?: string;        // 역코드
  stinNm?: string;        // 역명
}): Promise<StationInfo[]> {
  const serviceKey = getServiceKey();

  if (!serviceKey) {
    console.warn('KRIC API 서비스키가 없어 빈 배열 반환');
    return [];
  }

  try {
    const queryParams = new URLSearchParams({
      serviceKey,
      format: 'JSON',
    });

    if (params.railOprIsttCd) queryParams.append('railOprIsttCd', params.railOprIsttCd);
    if (params.lnCd) queryParams.append('lnCd', params.lnCd);
    if (params.stinCd) queryParams.append('stinCd', params.stinCd);
    if (params.stinNm) queryParams.append('stinNm', params.stinNm);

    const url = `${KRIC_API_BASE_URL}/convenientInfo/stationInfo?${queryParams.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`KRIC API 오류: ${response.status}`);
    }

    const data: KricApiResponse = await response.json();

    if (data.header?.resultCode !== '00') {
      console.error('KRIC API 응답 오류:', data.header?.resultMsg);
      return [];
    }

    return data.body || [];
  } catch (error) {
    console.error('KRIC API 호출 오류:', error);
    return [];
  }
}

/**
 * 노선별 역 목록 조회
 * @param lineCode 노선 코드 (1, 2, 3...)
 */
export async function getStationsByLine(lineCode: string): Promise<StationInfo[]> {
  return getStationInfo({
    railOprIsttCd: 'KR',
    lnCd: lineCode,
  });
}

/**
 * 역명으로 역 정보 조회
 * @param stationName 역명
 */
export async function getStationByName(stationName: string): Promise<StationInfo | null> {
  const stations = await getStationInfo({
    stinNm: stationName,
  });
  return stations.length > 0 ? stations[0] : null;
}

/**
 * 여러 역명으로 역 정보 일괄 조회
 * @param stationNames 역명 배열
 */
export async function getStationsByNames(stationNames: string[]): Promise<Map<string, StationInfo>> {
  const result = new Map<string, StationInfo>();

  // 병렬 처리 (최대 5개씩)
  const batchSize = 5;
  for (let i = 0; i < stationNames.length; i += batchSize) {
    const batch = stationNames.slice(i, i + batchSize);
    const promises = batch.map(name => getStationByName(name));
    const stations = await Promise.all(promises);

    batch.forEach((name, index) => {
      if (stations[index]) {
        result.set(name, stations[index]!);
      }
    });
  }

  return result;
}
