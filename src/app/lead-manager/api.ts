/**
 * 서울 지하철 광고 영업 시스템 - API 연동 로직
 * LocalData.go.kr API 호출 및 데이터 파싱
 */

import { Lead, Settings, BusinessCategory, CATEGORY_SERVICE_IDS, ServiceIdInfo } from './types';
import { API_ENDPOINT, CORS_PROXIES } from './constants';
import {
  convertGRS80ToWGS84,
  findNearestStation,
  formatDateToAPI,
  isURLEncoded,
  generateUUID,
} from './utils';

/**
 * API 호출 결과 타입
 */
interface FetchResult {
  success: boolean;
  leads: Lead[];
  totalCount: number;
  message?: string;
}

/**
 * LocalData API 호출 (CORS 프록시 + 재시도 로직 포함)
 * @param settings - 설정 정보
 * @param startDate - 시작 날짜
 * @param endDate - 종료 날짜
 * @param pageIndex - 페이지 인덱스 (1부터 시작)
 * @param pageSize - 페이지 크기
 * @param serviceInfo - 서비스 정보 (카테고리, 서비스ID 등)
 */
export async function fetchLocalDataAPI(
  settings: Settings,
  startDate: Date,
  endDate: Date,
  pageIndex: number = 1,
  pageSize: number = 100,
  serviceInfo?: ServiceIdInfo
): Promise<FetchResult> {
  const { apiKey, corsProxy, regionCode } = settings;
  const serviceId = serviceInfo?.id || '01_01_02_P';

  // API 키 인코딩 여부에 따른 처리
  const keyVariants = isURLEncoded(apiKey)
    ? [apiKey, decodeURIComponent(apiKey)]
    : [apiKey, encodeURIComponent(apiKey)];

  // 프록시 목록 (설정된 프록시 우선)
  const proxies = [corsProxy, ...CORS_PROXIES.map(p => p.value).filter(p => p !== corsProxy)];

  // 날짜 파라미터 (LocalData API는 lastModTs 기준으로만 동작)
  const dateParams = `lastModTsBgn=${formatDateToAPI(startDate)}&lastModTsEnd=${formatDateToAPI(endDate)}`;

  // 최대 재시도
  let lastError: Error | null = null;

  for (const key of keyVariants) {
    for (const proxy of proxies.slice(0, 2)) {
      try {
        const targetUrl = `${API_ENDPOINT}?authKey=${encodeURIComponent(key)}&opnSvcId=${serviceId}&localCode=${regionCode}&${dateParams}&pageIndex=${pageIndex}&pageSize=${pageSize}&resultType=xml`;

        // 프록시별 URL 구성
        let proxyUrl: string;
        if (proxy.includes('corsproxy.io')) {
          proxyUrl = `${proxy}${encodeURIComponent(targetUrl)}`;
        } else if (proxy.includes('allorigins.win')) {
          proxyUrl = `${proxy}${encodeURIComponent(targetUrl)}`;
        } else {
          proxyUrl = `${proxy}${encodeURIComponent(targetUrl)}`;
        }

        console.log(`API 호출 시도: ${proxy.substring(0, 30)}...`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(proxyUrl, {
          method: 'GET',
          headers: {
            'Accept': 'application/xml, text/xml, */*',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const xmlText = await response.text();

        // HTML 에러 페이지 체크
        if (xmlText.includes('<!DOCTYPE') || xmlText.includes('<html')) {
          throw new Error('프록시 서버 오류');
        }

        const result = parseAPIResponse(xmlText, serviceInfo);

        if (result.success) {
          console.log(`API 호출 성공 [${serviceInfo?.name || '병원'}]: ${result.leads.length}건`);
          return result;
        } else {
          throw new Error(result.message || '알 수 없는 오류');
        }
      } catch (error) {
        console.error(`API 호출 실패:`, error);
        lastError = error as Error;
        continue;
      }
    }
  }

  return {
    success: false,
    leads: [],
    totalCount: 0,
    message: lastError?.message || 'API 호출에 실패했습니다. 설정에서 API 키를 확인하세요.',
  };
}

/**
 * XML 응답 파싱
 * @param xmlText - XML 문자열
 * @param serviceInfo - 서비스 정보
 */
function parseAPIResponse(xmlText: string, serviceInfo?: ServiceIdInfo): FetchResult {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');

    // 파싱 오류 체크
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
      return {
        success: false,
        leads: [],
        totalCount: 0,
        message: 'XML 파싱 오류',
      };
    }

    // 결과 코드 확인 (LocalData API는 process > code 구조 사용)
    const resultCode = xmlDoc.querySelector('process > code')?.textContent ||
                       xmlDoc.querySelector('code')?.textContent;
    const resultMsg = xmlDoc.querySelector('process > message')?.textContent ||
                      xmlDoc.querySelector('message')?.textContent;

    if (resultCode !== '00') {
      return {
        success: false,
        leads: [],
        totalCount: 0,
        message: `API 오류 (${resultCode}): ${resultMsg}`,
      };
    }

    // 전체 건수 (paging > totalCount 구조)
    const totalCount = parseInt(
      xmlDoc.querySelector('paging > totalCount')?.textContent ||
      xmlDoc.querySelector('totalCount')?.textContent || '0'
    );

    // 데이터 항목들 (body > rows > row 구조)
    const rows = xmlDoc.querySelectorAll('row');
    const leads: Lead[] = [];

    rows.forEach((row) => {
      const lead = parseRowToLead(row, serviceInfo);
      if (lead) {
        leads.push(lead);
      }
    });

    return {
      success: true,
      leads,
      totalCount,
    };
  } catch (error) {
    console.error('XML 파싱 오류:', error);
    return {
      success: false,
      leads: [],
      totalCount: 0,
      message: 'XML 파싱 중 오류가 발생했습니다.',
    };
  }
}

/**
 * XML row 요소를 Lead 객체로 변환
 * @param row - XML row 요소
 * @param serviceInfo - 서비스 정보
 */
function parseRowToLead(row: Element, serviceInfo?: ServiceIdInfo): Lead | null {
  const getValue = (tagName: string): string => {
    return row.querySelector(tagName)?.textContent?.trim() || '';
  };

  const bizName = getValue('bplcNm'); // 사업장명
  if (!bizName) return null;

  // 좌표 추출
  const coordX = parseFloat(getValue('x')) || 0;
  const coordY = parseFloat(getValue('y')) || 0;

  // 좌표 변환
  let latitude: number | undefined;
  let longitude: number | undefined;
  let nearestStation: string | undefined;
  let stationDistance: number | undefined;
  let stationLines: string[] | undefined;

  if (coordX && coordY) {
    const converted = convertGRS80ToWGS84(coordX, coordY);
    if (converted) {
      latitude = converted.lat;
      longitude = converted.lng;

      // 가장 가까운 역 찾기
      const nearest = findNearestStation(latitude, longitude);
      if (nearest) {
        nearestStation = nearest.station.name;
        stationDistance = nearest.distance;
        stationLines = nearest.station.lines;
      }
    }
  }

  return {
    id: generateUUID(),
    bizName,
    bizId: getValue('brno'), // 사업자등록번호
    licenseDate: getValue('apvPermYmd') || getValue('dcbYmd'), // 인허가일자
    roadAddress: getValue('rdnWhlAddr'), // 도로명 주소
    lotAddress: getValue('sitWhlAddr'), // 지번 주소
    coordX,
    coordY,
    latitude,
    longitude,
    phone: getValue('siteTel'), // 전화번호
    medicalSubject: getValue('medicalSubject') || getValue('uptaeNm'), // 진료과목/업태
    category: serviceInfo?.category || 'HEALTH',
    serviceId: serviceInfo?.id || '01_01_02_P',
    serviceName: serviceInfo?.name || '병원',
    nearestStation,
    stationDistance,
    stationLines,
    status: 'NEW',
  };
}

/**
 * 전체 데이터 조회 (페이지네이션 처리)
 * @param settings - 설정 정보
 * @param startDate - 시작 날짜
 * @param endDate - 종료 날짜
 * @param onProgress - 진행 상황 콜백
 * @param category - 업종 카테고리 (선택)
 */
export async function fetchAllLeads(
  settings: Settings,
  startDate: Date,
  endDate: Date,
  onProgress?: (current: number, total: number, status?: string) => void,
  category?: BusinessCategory
): Promise<FetchResult> {
  const pageSize = 100;
  let allLeads: Lead[] = [];

  // 카테고리에 해당하는 서비스 ID 목록
  const serviceIds: ServiceIdInfo[] = category
    ? CATEGORY_SERVICE_IDS[category]
    : CATEGORY_SERVICE_IDS['HEALTH']; // 기본값: 건강

  let totalProcessed = 0;
  let estimatedTotal = serviceIds.length * 100; // 초기 추정치

  for (const serviceInfo of serviceIds) {
    onProgress?.(totalProcessed, estimatedTotal, `${serviceInfo.name} 조회 중...`);

    // 첫 페이지 조회
    const firstResult = await fetchLocalDataAPI(settings, startDate, endDate, 1, pageSize, serviceInfo);

    if (!firstResult.success) {
      console.error(`${serviceInfo.name} 조회 실패:`, firstResult.message);
      continue;
    }

    allLeads = [...allLeads, ...firstResult.leads];
    totalProcessed += firstResult.leads.length;

    // 총 예상 건수 업데이트
    estimatedTotal = Math.max(estimatedTotal, totalProcessed + (serviceIds.length - serviceIds.indexOf(serviceInfo) - 1) * 50);
    onProgress?.(totalProcessed, estimatedTotal, `${serviceInfo.name}: ${firstResult.totalCount}건`);

    // 추가 페이지 조회
    const totalPages = Math.ceil(firstResult.totalCount / pageSize);

    for (let pageIndex = 2; pageIndex <= totalPages; pageIndex++) {
      const result = await fetchLocalDataAPI(settings, startDate, endDate, pageIndex, pageSize, serviceInfo);

      if (result.success) {
        allLeads = [...allLeads, ...result.leads];
        totalProcessed += result.leads.length;
        onProgress?.(totalProcessed, estimatedTotal, `${serviceInfo.name}: ${totalProcessed}건`);
      } else {
        console.error(`${serviceInfo.name} 페이지 ${pageIndex} 조회 실패`);
      }

      // API 호출 간격 (Rate Limiting 방지)
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // 서비스 간 간격
    await new Promise(resolve => setTimeout(resolve, 300));
  }

  onProgress?.(allLeads.length, allLeads.length, '완료');

  return {
    success: true,
    leads: allLeads,
    totalCount: allLeads.length,
  };
}

/**
 * API 연결 테스트
 * @param settings - 설정 정보
 */
export async function testAPIConnection(settings: Settings): Promise<{ success: boolean; message: string }> {
  try {
    const today = new Date();
    const result = await fetchLocalDataAPI(settings, today, today, 1, 1);

    if (result.success) {
      return { success: true, message: 'API 연결 성공' };
    } else {
      return { success: false, message: result.message || 'API 연결 실패' };
    }
  } catch (error) {
    return { success: false, message: `연결 오류: ${(error as Error).message}` };
  }
}
