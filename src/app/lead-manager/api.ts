/**
 * 서울 지하철 광고 영업 시스템 - API 연동 로직
 * 서버사이드 API를 통해 LocalData.go.kr 데이터 조회
 *
 * 보안: API 키는 서버에서만 관리되며 클라이언트에 노출되지 않습니다.
 */

import { Lead, Settings, BusinessCategory, CATEGORY_SERVICE_IDS, CATEGORY_LABELS, ServiceIdInfo } from './types';
import {
  convertGRS80ToWGS84,
  formatDateToAPI,
  generateUUID,
} from './utils';
import { createLeadKey } from './lead-utils';
import { removeDuplicateLeads } from './deduplication-utils';
import { safeFetch, ApiError } from './api-client';

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
 * 서버 API 응답용 임시 리드 타입
 */
interface RawLead {
  bizName: string;
  bizId?: string;
  mgtNo?: string;         // 관리번호
  trdStateNm?: string;    // 영업상태명
  dtlStateNm?: string;    // 상세영업상태명
  licenseDate?: string;
  roadAddress?: string;
  lotAddress?: string;
  coordX?: number;
  coordY?: number;
  phone?: string;
  medicalSubject?: string;
}

/**
 * 서버사이드 API를 통해 LocalData 데이터 조회
 * API 키는 서버에서 안전하게 관리됩니다.
 */
export async function fetchLocalDataAPI(
  settings: Settings,
  startDate: Date,
  endDate: Date,
  pageIndex: number = 1,
  pageSize: number = 100,
  serviceInfo?: ServiceIdInfo,
  regionCode?: string
): Promise<FetchResult> {
  const serviceId = serviceInfo?.id || '01_01_02_P';
  const region = regionCode || settings.regionCode;

  try {
    let localDataKey = '';
    if (settings.apiKey) {
      try {
        const keys = JSON.parse(settings.apiKey);
        localDataKey = keys.localdata || '';
      } catch (e) {
        if (!settings.apiKey.startsWith('{')) {
          localDataKey = settings.apiKey;
        }
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (localDataKey) {
      headers['x-api-key'] = localDataKey;
    }

    const result = await safeFetch('/api/localdata', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        serviceId,
        regionCode: region,
        startDate: formatDateToAPI(startDate),
        endDate: formatDateToAPI(endDate),
        pageIndex,
        pageSize,
      }),
      maxRetries: 2,
    });

    if (!result.success) {
      return {
        success: false,
        leads: [],
        totalCount: 0,
        message: result.error || result.message || 'API 호출에 실패했습니다.',
      };
    }

    const leads = await processRawLeads(result.leads, serviceInfo);

    return {
      success: true,
      leads,
      totalCount: result.totalCount,
    };

  } catch (error) {
    console.error('[API] LocalData API Error:', error);

    return {
      success: false,
      leads: [],
      totalCount: 0,
      message: error instanceof ApiError
        ? error.message
        : `네트워크 오류: ${(error as Error).message}`,
    };
  }
}

/**
 * 서울 열린데이터 광장 API를 통해 서울시 의원 인허가 정보 조회
 */
export async function fetchSeoulClinicAPI(
  startIndex: number = 1,
  endIndex: number = 100,
  settings?: Settings
): Promise<FetchResult> {
  try {
    let seoulKey = '';
    if (settings?.apiKey) {
      try {
        const keys = JSON.parse(settings.apiKey);
        seoulKey = keys.seoul || '';
      } catch (e) {}
    }

    const headers: Record<string, string> = {};
    if (seoulKey) {
      headers['x-api-key'] = seoulKey;
    }

    const result = await safeFetch(`/api/seoul-data?service=clinic&start=${startIndex}&end=${endIndex}`, {
      method: 'GET',
      headers,
    });

    if (!result.success) {
      return {
        success: false,
        leads: [],
        totalCount: 0,
        message: result.error || '서울 데이터 API 호출에 실패했습니다.',
      };
    }

    const leads = await processSeoulRawLeads(result.leads);

    return {
      success: true,
      leads,
      totalCount: result.totalCount,
    };

  } catch (error) {
    console.error('[API] Seoul Clinic API Error:', error);
    return {
      success: false,
      leads: [],
      totalCount: 0,
      message: `네트워크 오류: ${(error as Error).message}`,
    };
  }
}

/**
 * 서울 열린데이터 광장 API를 통해 서울시 병원 인허가 정보 조회
 */
export async function fetchSeoulHospitalAPI(
  startIndex: number = 1,
  endIndex: number = 100,
  settings?: Settings
): Promise<FetchResult> {
  try {
    let seoulKey = '';
    if (settings?.apiKey) {
      try {
        const keys = JSON.parse(settings.apiKey);
        seoulKey = keys.seoul || '';
      } catch (e) {}
    }

    const headers: Record<string, string> = {};
    if (seoulKey) {
      headers['x-api-key'] = seoulKey;
    }

    const result = await safeFetch(`/api/seoul-data?service=hospital&start=${startIndex}&end=${endIndex}`, {
      method: 'GET',
      headers,
    });

    if (!result.success) {
      return {
        success: false,
        leads: [],
        totalCount: 0,
        message: result.error || '서울 데이터 API 호출에 실패했습니다.',
      };
    }

    const leads = await processSeoulRawLeads(result.leads, 'LOCALDATA_010101');

    return {
      success: true,
      leads,
      totalCount: result.totalCount,
    };

  } catch (error) {
    console.error('[API] Seoul Hospital API Error:', error);
    return {
      success: false,
      leads: [],
      totalCount: 0,
      message: `네트워크 오류: ${(error as Error).message}`,
    };
  }
}

/**
 * 서울 데이터 API의 임시 리드 데이터를 처리 (좌표 변환, 역 매칭)
 */
async function processSeoulRawLeads(rawLeads: any[], serviceId: string = 'LOCALDATA_010102'): Promise<Lead[]> {
  const { subwayDataManager } = await import('./kric-data-manager');
  await subwayDataManager.getAllSubwayData();

  const processedLeads = (await Promise.all(rawLeads.map(async (raw) => {
    const bizName = raw.BPLCNM || '';
    if (!bizName) return null;

    let latitude: number | undefined;
    let longitude: number | undefined;
    let nearestStation: string | undefined;
    let stationDistance: number | undefined;
    let stationLines: string[] | undefined;

    const x = parseFloat((raw.X || '0').toString().trim());
    const y = parseFloat((raw.Y || '0').toString().trim());

    if (x && y) {
      const { convertGRS80ToWGS84 } = await import('./utils');
      const converted = convertGRS80ToWGS84(x, y);

      if (converted) {
        latitude = converted.lat;
        longitude = converted.lng;

        const bizAddress = raw.RDNWHLADDR || raw.SITEWHLADDR;
        const nearest = await subwayDataManager.findNearbyStation(latitude, longitude, bizAddress);

        if (nearest) {
          nearestStation = nearest.station.name;
          stationDistance = nearest.distance;
          stationLines = nearest.station.lines;
        }
      }
    }

    const { CATEGORY_SERVICE_IDS } = await import('./types');
    let category: any = 'OTHER';
    
    let serviceName = '알 수 없는 서비스';
    for (const [cat, services] of Object.entries(CATEGORY_SERVICE_IDS)) {
      const foundService = services.find(s => s.id === serviceId);
      if (foundService) {
        category = cat;
        serviceName = foundService.name;
        break;
      }
    }

    return {
      id: generateUUID(),
      bizName: raw.BPLCNM,
      bizId: raw.BRNO || undefined,
      licenseDate: raw.APVPERMYMD,
      roadAddress: raw.RDNWHLADDR,
      lotAddress: raw.SITEWHLADDR,
      coordX: x,
      coordY: y,
      latitude,
      longitude,
      phone: raw.SITETEL,
      medicalSubject: raw.UPTAENM || (category === 'HEALTH' ? '의원' : raw.UPTAENM),
      mgtNo: raw.MGTNO,
      operatingStatus: raw.TRDSTATENM,
      detailedStatus: raw.DTLSTATENM,
      category: category,
      serviceId: serviceId,
      serviceName: serviceName,
      nearestStation,
      stationDistance,
      stationLines,
      status: 'NEW',
    } as Lead;
  }))).filter((lead): lead is Lead => lead !== null);

  return processedLeads;
}

/**
 * 임시 리드 데이터를 처리 (좌표 변환, 역 매칭)
 */
async function processRawLeads(rawLeads: RawLead[], serviceInfo?: ServiceIdInfo): Promise<Lead[]> {
  const { subwayDataManager } = await import('./kric-data-manager');
  await subwayDataManager.getAllSubwayData();

  const excludeKeywords = [
    '약국', '편의점', '세븐일레븐', '씨유', '지에스', 'GS25', 'CU', '7-ELEVEN',
    '이마트', '안경', '콘택트', '안경원', '다이소', '올리브영', '롭스', '랄라블라'
  ];

  const processedLeads = (await Promise.all(rawLeads.map(async (raw) => {
    const subject = (raw.medicalSubject || '').replace(/\s+/g, '');
    const bizName = (raw.bizName || '').replace(/\s+/g, '');

    const isMedicalService = serviceInfo?.id?.startsWith('01_01') || serviceInfo?.id?.startsWith('01_03');
    const isHealthCategory = serviceInfo?.category === 'HEALTH';
    
    if (isMedicalService || isHealthCategory) {
      // const isExcluded = excludeKeywords.some(keyword => {
      //   const k = keyword.replace(/\s+/g, '');
      //   return subject.includes(k) || bizName.includes(k);
      // });
      // if (isExcluded) return null;
    }

    let latitude: number | undefined;
    let longitude: number | undefined;
    let nearestStation: string | undefined;
    let stationDistance: number | undefined;
    let stationLines: string[] | undefined;

    if (raw.coordX && raw.coordY) {
      const { convertGRS80ToWGS84 } = await import('./utils');
      const converted = convertGRS80ToWGS84(raw.coordX, raw.coordY);

      if (converted) {
        latitude = converted.lat;
        longitude = converted.lng;

        const bizAddress = raw.roadAddress || raw.lotAddress;
        const nearest = await subwayDataManager.findNearbyStation(latitude, longitude, bizAddress);

        if (nearest) {
          nearestStation = nearest.station.name;
          stationDistance = nearest.distance;
          stationLines = nearest.station.lines;

          const nearestExit = await subwayDataManager.findNearestExit(nearest.station.name, latitude, longitude);
          if (nearestExit) {
            (raw as any).nearestExitNo = nearestExit;
          }
        }
      }
    }

    return {
      id: generateUUID(),
      bizName: raw.bizName,
      bizId: raw.bizId,
      licenseDate: raw.licenseDate,
      roadAddress: raw.roadAddress,
      lotAddress: raw.lotAddress,
      coordX: raw.coordX,
      coordY: raw.coordY,
      latitude,
      longitude,
      phone: raw.phone,
      medicalSubject: raw.medicalSubject,
      mgtNo: raw.mgtNo,
      operatingStatus: raw.trdStateNm,
      detailedStatus: raw.dtlStateNm,
      category: serviceInfo?.category || 'OTHER',
      serviceId: serviceInfo?.id || 'UNKNOWN',
      serviceName: serviceInfo?.name || '기타',
      nearestStation,
      nearestExitNo: (raw as any).nearestExitNo,
      stationDistance,
      stationLines,
      status: 'NEW',
    } as Lead;
  }))).filter((lead): lead is Lead => lead !== null);

  return processedLeads;
}

/**
 * 모든 리드 조회 및 동기화 (고성능 병렬 처리 버전)
 * 여러 지역과 서비스를 병렬로 조회하여 속도를 극대화합니다.
 */
export async function fetchAllLeads(
  settings: Settings,
  startDate: Date,
  endDate: Date,
  onProgress?: (current: number, total: number, status?: string) => void,
  category: BusinessCategory = 'ALL',
  selectedServiceIds?: string[]
): Promise<FetchResult> {
  const pageSize = 100;
  let serviceIds: ServiceIdInfo[] = [];

  // 1. 서비스 ID 목록 준비
  if (category === 'ALL' || !category) {
    Object.entries(CATEGORY_SERVICE_IDS).forEach(([key, services]) => {
      if (key !== 'ALL') {
        serviceIds = [...serviceIds, ...services];
      }
    });
  } else {
    serviceIds = CATEGORY_SERVICE_IDS[category];
  }

  if (selectedServiceIds && selectedServiceIds.length > 0) {
    serviceIds = serviceIds.filter(s => selectedServiceIds.includes(s.id));
  }

  const regionCodes = settings.regionCodes?.length ? settings.regionCodes : [settings.regionCode];
  const regionNames: Record<string, string> = { '6110000': '서울', '6410000': '경기' };

  // 2. 작업 목록 생성
  const tasks: { regionCode: string; serviceInfo: ServiceIdInfo }[] = [];
  for (const regionCode of regionCodes) {
    for (const serviceInfo of serviceIds) {
      tasks.push({ regionCode, serviceInfo });
    }
  }

  let completedTasks = 0;
  const totalTasks = tasks.length;
  let totalNewLeadsCount = 0;

  onProgress?.(0, totalTasks, `동기화 시작 (총 ${totalTasks}개 서비스)...`);

  // 3. 병렬 처리 엔진 (동시성 제한: 2로 낮추어 서버 과부하 방지)
  const CONCURRENCY_LIMIT = 2;
  const results: Lead[] = [];
  
  // 딜레이 유틸리티 함수
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  
  const executeTask = async (task: { regionCode: string; serviceInfo: ServiceIdInfo }) => {
    const { regionCode, serviceInfo } = task;
    const regionName = regionNames[regionCode] || regionCode;
    
    try {
      let seoulKey = '';
      if (settings?.apiKey) {
        try {
          const keys = JSON.parse(settings.apiKey);
          seoulKey = keys.seoul || '';
        } catch (e) {}
      }
      const seoulHeaders = seoulKey ? { 'x-api-key': seoulKey } : undefined;

      // 첫 페이지 조회
      let firstResult: FetchResult | undefined;
      const isSeoulSpecialty = regionCode === '6110000' && 
        (serviceInfo.id === '01_01_02_P' || serviceInfo.id === '01_01_01_P' || 
         serviceInfo.id === 'LOCALDATA_010301' || serviceInfo.id === 'LOCALDATA_104201');

      if (isSeoulSpecialty) {
        if (serviceInfo.id === '01_01_02_P') firstResult = await fetchSeoulClinicAPI(1, pageSize, settings);
        else if (serviceInfo.id === '01_01_01_P') firstResult = await fetchSeoulHospitalAPI(1, pageSize, settings);
        else if (serviceInfo.id === 'LOCALDATA_010301') {
          const res = await safeFetch(`/api/seoul-data?service=quasi-medical&start=1&end=${pageSize}`, {
            headers: seoulHeaders
          });
          if (res.success) firstResult = { success: true, leads: await processSeoulRawLeads(res.leads, 'LOCALDATA_010301'), totalCount: res.totalCount };
        } else if (serviceInfo.id === 'LOCALDATA_104201') {
          const res = await safeFetch(`/api/seoul-data?service=fitness&start=1&end=${pageSize}`, {
            headers: seoulHeaders
          });
          if (res.success) firstResult = { success: true, leads: await processSeoulRawLeads(res.leads, 'LOCALDATA_104201'), totalCount: res.totalCount };
        }
      } else {
        firstResult = await fetchLocalDataAPI(settings, startDate, endDate, 1, pageSize, serviceInfo, regionCode);
      }

      if (!firstResult || !firstResult.success || firstResult.leads.length === 0) {
        completedTasks++;
        onProgress?.(completedTasks, totalTasks, `[${regionName}] ${serviceInfo.name}: 데이터 없음`);
        return;
      }

      // 첫 페이지 즉시 저장 및 신규 확인
      const { saveLeads } = await import('./supabase-service');
      const saveResult = await saveLeads(firstResult.leads, undefined);
      
      totalNewLeadsCount += saveResult.newCount;
      results.push(...saveResult.newLeads);

      // 추가 페이지 처리 (필요한 경우)
      const totalPages = Math.ceil(firstResult.totalCount / pageSize);
      if (totalPages > 1) {
        for (let p = 2; p <= totalPages; p++) {
          let pageResult: FetchResult | undefined;
          if (isSeoulSpecialty) {
            const start = (p - 1) * pageSize + 1;
            const end = p * pageSize;
            const endpointMap: Record<string, string> = {
              'LOCALDATA_010301': 'quasi-medical',
              'LOCALDATA_104201': 'fitness'
            };
            
            if (serviceInfo.id === '01_01_02_P') pageResult = await fetchSeoulClinicAPI(start, end, settings);
            else if (serviceInfo.id === '01_01_01_P') pageResult = await fetchSeoulHospitalAPI(start, end, settings);
            else if (endpointMap[serviceInfo.id]) {
              const res = await safeFetch(`/api/seoul-data?service=${endpointMap[serviceInfo.id]}&start=${start}&end=${end}`, {
                headers: seoulHeaders
              });
              if (res.success) pageResult = { success: true, leads: await processSeoulRawLeads(res.leads, serviceInfo.id), totalCount: res.totalCount };
            }
          } else {
            pageResult = await fetchLocalDataAPI(settings, startDate, endDate, p, pageSize, serviceInfo, regionCode);
          }

          if (pageResult?.success && pageResult.leads.length > 0) {
            const psr = await saveLeads(pageResult.leads, undefined);
            totalNewLeadsCount += psr.newCount;
            results.push(...psr.newLeads);
          }
          
          // 각 페이지 호출 사이에 500ms 딜레이를 주어 Rate Limit 및 과부하 방지
          await delay(500);
        }
      }

      completedTasks++;
      onProgress?.(completedTasks, totalTasks, `[${regionName}] ${serviceInfo.name}: ${firstResult.totalCount}건 확인 (${totalNewLeadsCount}건 신규)`);
      
      // 서비스/지역 간 작업 전환 시 1초 딜레이
      await delay(1000);

      
    } catch (err) {
      console.error(`[Task Error] ${regionName}/${serviceInfo.name}:`, err);
      completedTasks++;
    }
  };

  // 4. 동시 실행 제어 (Pool 방식)
  const pool = [...tasks];
  const workers = Array(Math.min(CONCURRENCY_LIMIT, pool.length))
    .fill(null)
    .map(async () => {
      while (pool.length > 0) {
        const task = pool.shift();
        if (task) await executeTask(task);
      }
    });

  await Promise.all(workers);

  onProgress?.(totalTasks, totalTasks, `동기화 완료 (총 ${totalNewLeadsCount}건 신규 추가)`);

  return {
    success: true,
    leads: results,
    totalCount: results.length,
  };
}

/**
 * API 연결 테스트
 * 서버의 API 키가 올바르게 설정되었는지 확인
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
