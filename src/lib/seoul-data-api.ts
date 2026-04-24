/**
 * 서울 열린데이터 광장 (Seoul Open Data Portal) API 클라이언트
 * 역사 정보 및 인허가 데이터 조회를 담당합니다.
 */

const SEOUL_DATA_BASE_URL = 'http://openapi.seoul.go.kr:8088';

/**
 * 서울 데이터 API 호출 기본 함수
 */
async function fetchSeoulData<T>(
  service: string,
  startIndex: number = 1,
  endIndex: number = 100,
  ...additionalParams: string[]
): Promise<T | null> {
  // 전용 키가 있는 경우 우선 사용
  let apiKey = process.env.SEOUL_DATA_API_KEY;
  if (service === 'LOCALDATA_010101' && process.env.SEOUL_DATA_HOSPITAL_API_KEY) {
    apiKey = process.env.SEOUL_DATA_HOSPITAL_API_KEY;
  } else if (service === 'LOCALDATA_010301' && process.env.SEOUL_DATA_QUASI_MEDICAL_API_KEY) {
    apiKey = process.env.SEOUL_DATA_QUASI_MEDICAL_API_KEY;
  } else if (service === 'LOCALDATA_104201' && process.env.SEOUL_DATA_FITNESS_API_KEY) {
    apiKey = process.env.SEOUL_DATA_FITNESS_API_KEY;
  }

  if (!apiKey) {
    console.error(`[Seoul Data API] Error: API key for ${service} is not defined`);
    return null;
  }

  // URL 형식: http://openapi.seoul.go.kr:8088/(인증키)/json/(서비스명)/(시작)/ (종료)/(기타 파라미터)
  const params = additionalParams.length > 0 ? `/${additionalParams.join('/')}` : '';
  const url = `${SEOUL_DATA_BASE_URL}/${apiKey}/json/${service}/${startIndex}/${endIndex}${params}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store', // 실시간 조회를 위해 캐시 비활성화
    });

    if (!response.ok) {
      throw new Error(`Seoul Data API HTTP Error: ${response.status}`);
    }

    const data = await response.json();

    // 서울 데이터 API는 에러 시 { RESULT: { CODE: '...', MESSAGE: '...' } } 형식을 반환할 수 있음
    if (data.RESULT && data.RESULT.CODE !== 'INFO-000') {
      console.warn(`[Seoul Data API] ${service} Logic Error:`, data.RESULT.MESSAGE);
      return null;
    }

    return data;
  } catch (error) {
    console.error(`[Seoul Data API] ${service} Fetch Error:`, error);
    return null;
  }
}

/**
 * 노선별 지하철역 목록 및 좌표 조회 (SearchSTNBySubwayLineService)
 */
export async function getSeoulStationsByLine(line: string) {
  // line format: "2호선", "9호선" 등
  const data = await fetchSeoulData<any>('SearchSTNBySubwayLineService', 1, 100, ' ', ' ', line);
  if (!data || !data.SearchSTNBySubwayLineService) return [];
  
  return data.SearchSTNBySubwayLineService.row || [];
}

/**
 * 역사 정보 상세 조회 (SearchInfoBySubwayNameService)
 */
export async function getSeoulStationDetail(stationName: string) {
  const data = await fetchSeoulData<any>('SearchInfoBySubwayNameService', 1, 5, stationName);
  if (!data || !data.SearchInfoBySubwayNameService) return null;
  
  return data.SearchInfoBySubwayNameService.row?.[0] || null;
}

/**
 * 실시간 도착 정보 (RealtimeCitySubwayArrival)
 */
export async function getRealtimeArrival(stationName: string) {
  const data = await fetchSeoulData<any>('realtimeStationArrival', 1, 10, stationName);
  if (!data || !data.realtimeStationArrivalList) return [];
  
  return data.realtimeStationArrivalList;
}

/**
 * 서울시 의원 인허가 정보 (localdata_010102)
 */
export async function getSeoulClinicLicenseData(startIndex: number = 1, endIndex: number = 100) {
  const data = await fetchSeoulData<any>('LOCALDATA_010102', startIndex, endIndex);
  if (!data || !data.LOCALDATA_010102) return { leads: [], totalCount: 0 };
  
  return {
    leads: data.LOCALDATA_010102.row || [],
    totalCount: parseInt(data.LOCALDATA_010102.list_total_count) || 0
  };
}

/**
 * 서울시 병원 인허가 정보 (localdata_010101)
 */
export async function getSeoulHospitalLicenseData(startIndex: number = 1, endIndex: number = 100) {
  const data = await fetchSeoulData<any>('LOCALDATA_010101', startIndex, endIndex);
  if (!data || !data.LOCALDATA_010101) return { leads: [], totalCount: 0 };
  
  return {
    leads: data.LOCALDATA_010101.row || [],
    totalCount: parseInt(data.LOCALDATA_010101.list_total_count) || 0
  };
}

/**
 * 서울시 의료유사업 인허가 정보 (localdata_010301)
 * 안마시술소, 침술원 등
 */
export async function getSeoulQuasiMedicalLicenseData(startIndex: number = 1, endIndex: number = 100) {
  const data = await fetchSeoulData<any>('LOCALDATA_010301', startIndex, endIndex);
  if (!data || !data.LOCALDATA_010301) return { leads: [], totalCount: 0 };
  
  return {
    leads: data.LOCALDATA_010301.row || [],
    totalCount: parseInt(data.LOCALDATA_010301.list_total_count) || 0
  };
}

/**
 * 서울시 체력단련장업 인허가 정보 (localdata_104201)
 */
export async function getSeoulFitnessLicenseData(startIndex: number = 1, endIndex: number = 100) {
  const data = await fetchSeoulData<any>('LOCALDATA_104201', startIndex, endIndex);
  if (!data || !data.LOCALDATA_104201) return { leads: [], totalCount: 0 };
  
  return {
    leads: data.LOCALDATA_104201.row || [],
    totalCount: parseInt(data.LOCALDATA_104201.list_total_count) || 0
  };
}
