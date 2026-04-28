/**
 * ?쒖슱 ?대┛?곗씠??愿묒옣 (Seoul Open Data Portal) API ?대씪?댁뼵?? * ??궗 ?뺣낫 諛??명뿀媛 ?곗씠??議고쉶瑜??대떦?⑸땲??
 */

const SEOUL_DATA_BASE_URL = 'http://openapi.seoul.go.kr:8088';

/**
 * ?쒖슱 ?곗씠??API ?몄텧 湲곕낯 ?⑥닔
 */
async function fetchSeoulData<T>(
  service: string,
  startIndex: number = 1,
  endIndex: number = 100,
  ...additionalParams: string[]
): Promise<T | null> {
  // 공통 키가 비어 있어도 서비스별 키로 fallback
  let apiKey =
    process.env.SEOUL_DATA_API_KEY ||
    process.env.SEOUL_DATA_CLINIC_API_KEY ||
    process.env.SEOUL_DATA_HOSPITAL_API_KEY ||
    process.env.SEOUL_DATA_QUASI_MEDICAL_API_KEY ||
    process.env.SEOUL_DATA_FITNESS_API_KEY;

  if (service === 'LOCALDATA_010102' && process.env.SEOUL_DATA_CLINIC_API_KEY) {
    apiKey = process.env.SEOUL_DATA_CLINIC_API_KEY;
  } else if (service === 'LOCALDATA_010101' && process.env.SEOUL_DATA_HOSPITAL_API_KEY) {
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

  // URL ?뺤떇: http://openapi.seoul.go.kr:8088/(?몄쬆??/json/(?쒕퉬?ㅻ챸)/(?쒖옉)/ (醫낅즺)/(湲고? ?뚮씪誘명꽣)
  const params = additionalParams.length > 0 ? `/${additionalParams.join('/')}` : '';
  const url = `${SEOUL_DATA_BASE_URL}/${apiKey}/json/${service}/${startIndex}/${endIndex}${params}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store', // ?ㅼ떆媛?議고쉶瑜??꾪빐 罹먯떆 鍮꾪솢?깊솕
    });

    if (!response.ok) {
      throw new Error(`Seoul Data API HTTP Error: ${response.status}`);
    }

    const data = await response.json();

    // ?쒖슱 ?곗씠??API???먮윭 ??{ RESULT: { CODE: '...', MESSAGE: '...' } } ?뺤떇??諛섑솚?????덉쓬
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
 * ?몄꽑蹂?吏?섏쿋??紐⑸줉 諛?醫뚰몴 議고쉶 (SearchSTNBySubwayLineService)
 */
export async function getSeoulStationsByLine(line: string) {
  // line format: "2호선", "9호선"
  const data = await fetchSeoulData<any>('SearchSTNBySubwayLineService', 1, 100, ' ', ' ', line);
  if (!data || !data.SearchSTNBySubwayLineService) return [];
  
  return data.SearchSTNBySubwayLineService.row || [];
}

/**
 * ??궗 ?뺣낫 ?곸꽭 議고쉶 (SearchInfoBySubwayNameService)
 */
export async function getSeoulStationDetail(stationName: string) {
  const data = await fetchSeoulData<any>('SearchInfoBySubwayNameService', 1, 5, stationName);
  if (!data || !data.SearchInfoBySubwayNameService) return null;
  
  return data.SearchInfoBySubwayNameService.row?.[0] || null;
}

/**
 * ?ㅼ떆媛??꾩갑 ?뺣낫 (RealtimeCitySubwayArrival)
 */
export async function getRealtimeArrival(stationName: string) {
  const data = await fetchSeoulData<any>('realtimeStationArrival', 1, 10, stationName);
  if (!data || !data.realtimeStationArrivalList) return [];
  
  return data.realtimeStationArrivalList;
}

/**
 * ?쒖슱???섏썝 ?명뿀媛 ?뺣낫 (localdata_010102)
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
 * ?쒖슱??蹂묒썝 ?명뿀媛 ?뺣낫 (localdata_010101)
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
 * ?쒖슱???섎즺?좎궗???명뿀媛 ?뺣낫 (localdata_010301)
 * ?덈쭏?쒖닠?? 移⑥닠???? */
export async function getSeoulQuasiMedicalLicenseData(startIndex: number = 1, endIndex: number = 100) {
  const data = await fetchSeoulData<any>('LOCALDATA_010301', startIndex, endIndex);
  if (!data || !data.LOCALDATA_010301) return { leads: [], totalCount: 0 };
  
  return {
    leads: data.LOCALDATA_010301.row || [],
    totalCount: parseInt(data.LOCALDATA_010301.list_total_count) || 0
  };
}

/**
 * ?쒖슱??泥대젰?⑤젴?μ뾽 ?명뿀媛 ?뺣낫 (localdata_104201)
 */
export async function getSeoulFitnessLicenseData(startIndex: number = 1, endIndex: number = 100) {
  const data = await fetchSeoulData<any>('LOCALDATA_104201', startIndex, endIndex);
  if (!data || !data.LOCALDATA_104201) return { leads: [], totalCount: 0 };
  
  return {
    leads: data.LOCALDATA_104201.row || [],
    totalCount: parseInt(data.LOCALDATA_104201.list_total_count) || 0
  };
}
