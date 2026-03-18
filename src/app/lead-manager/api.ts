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
 * 서버 API 응답의 원시 리드 타입
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
    const result = await safeFetch('/api/localdata', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        serviceId,
        regionCode: region,
        startDate: formatDateToAPI(startDate),
        endDate: formatDateToAPI(endDate),
        pageIndex,
        pageSize,
      }),
      maxRetries: 2, // 수동 리트라이 포함 총 3회
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
 * 원시 리드 데이터를 처리 (좌표 변환, 역 매칭)
 */
/**
 * 원시 리드 데이터를 처리 (좌표 변환, 역 매칭)
 */
async function processRawLeads(rawLeads: RawLead[], serviceInfo?: ServiceIdInfo): Promise<Lead[]> {
  const { subwayDataManager } = await import('./kric-data-manager');

  // 캐시 워밍
  await subwayDataManager.getAllSubwayData();

  // 제외 키워드 정의 (의료기관 검색 시 섞이는 비타겟 업종)
  const excludeKeywords = [
    '약국', '편의점', '세븐일레븐', '씨유', '지에스', 'GS25', 'CU', '7-ELEVEN', 
    '이마트', '안경', '콘택트', '안경원', '다이소', '올리브영', '롭스', '랄라블라'
  ];

  const processedLeads = (await Promise.all(rawLeads.map(async (raw) => {
    const subject = (raw.medicalSubject || '').replace(/\s+/g, '');
    const bizName = (raw.bizName || '').replace(/\s+/g, '');

    // 의료기관 관련 서비스이거나 카테고리가 HEALTH일 때만 정밀 필터링 적용
    // 체육시설(SPORTS) 등 다른 카테고리는 필터링 제외 (상호명에 '안경' 등이 포함될 수 있음)
    const isMedicalService = serviceInfo?.id?.startsWith('01_01') || serviceInfo?.id?.startsWith('01_03');
    const isHealthCategory = serviceInfo?.category === 'HEALTH';
    
    if (isMedicalService || isHealthCategory) {
      const isExcluded = excludeKeywords.some(keyword => {
        const k = keyword.replace(/\s+/g, '');
        return subject.includes(k) || bizName.includes(k);
      });
      if (isExcluded) return null;
    }

    let latitude: number | undefined;
    let longitude: number | undefined;
    let nearestStation: string | undefined;
    let stationDistance: number | undefined;
    let stationLines: string[] | undefined;

    // 좌표 변환 (GRS80 -> WGS84)
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

          // 가장 가까운 출구 번호 계산
          const nearestExit = await subwayDataManager.findNearestExit(nearestStation, latitude, longitude);
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
 * 전체 데이터 조회 (페이지네이션 처리)
 * @param settings - 설정 정보 (API 키는 사용되지 않음)
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
  category?: BusinessCategory,
  selectedServiceIds?: string[]  // 선택된 세부항목 ID들
): Promise<FetchResult> {
  const pageSize = 100;
  let allLeads: Lead[] = [];
  const seenKeys = new Set<string>(); // 중복 체크용
  const seenBizIds = new Set<string>(); // 사업자 ID 중복 체크용

  // 카테고리에 해당하는 서비스 ID 목록
  let serviceIds: ServiceIdInfo[] = [];

  if (category === 'ALL' || !category) {
    // 모든 카테고리의 서비스 ID를 합침 (ALL 제외)
    Object.entries(CATEGORY_SERVICE_IDS).forEach(([key, services]) => {
      if (key !== 'ALL') {
        serviceIds = [...serviceIds, ...services];
      }
    });
  } else {
    serviceIds = CATEGORY_SERVICE_IDS[category];
  }

  // 선택된 세부항목이 있으면 해당 항목만 필터링
  if (selectedServiceIds && selectedServiceIds.length > 0) {
    serviceIds = serviceIds.filter(s => selectedServiceIds.includes(s.id));
  }

  // 지역 코드 목록 (다중 지역 지원)
  const regionCodes = settings.regionCodes?.length
    ? settings.regionCodes
    : [settings.regionCode];

  // 지역명 매핑
  const regionNames: Record<string, string> = {
    '6110000': '서울',
    '6410000': '경기',
  };

  let totalProcessed = 0;
  let estimatedTotal = serviceIds.length * regionCodes.length * 100;

  for (const regionCode of regionCodes) {
    const regionName = regionNames[regionCode] || regionCode;

    for (const serviceInfo of serviceIds) {
      const categoryLabel = CATEGORY_LABELS[serviceInfo.category] || serviceInfo.category;
      onProgress?.(totalProcessed, estimatedTotal, `[${regionName}/${categoryLabel}] ${serviceInfo.name} 조회 중...`);

      // 첫 페이지 조회
      const firstResult = await fetchLocalDataAPI(
        settings,
        startDate,
        endDate,
        1,
        pageSize,
        serviceInfo,
        regionCode
      );

      if (!firstResult.success) {
        console.error(`[${regionName}] ${serviceInfo.name} 조회 실패:`, firstResult.message);
        continue;
      }

      // 중복 제거하며 추가
      for (const lead of firstResult.leads) {
        const key = createLeadKey(lead.bizName, lead.roadAddress, lead.bizId);
        const bizId = lead.bizId;

        // 중복 체크: 상호명+주소 또는 사업자 ID
        if (!seenKeys.has(key) && (!bizId || !seenBizIds.has(bizId))) {
          seenKeys.add(key);
          if (bizId) {
            seenBizIds.add(bizId);
          }
          allLeads.push(lead);
        }
      }
      totalProcessed += firstResult.leads.length;

      // 총 예상 건수 업데이트
      const remainingServices = serviceIds.length - serviceIds.indexOf(serviceInfo) - 1;
      const remainingRegions = regionCodes.length - regionCodes.indexOf(regionCode) - 1;
      estimatedTotal = Math.max(
        estimatedTotal,
        totalProcessed + (remainingServices + remainingRegions * serviceIds.length) * 50
      );
      onProgress?.(totalProcessed, estimatedTotal, `[${regionName}] ${serviceInfo.name}: ${firstResult.totalCount}건`);

      // 추가 페이지 조회
      const totalPages = Math.ceil(firstResult.totalCount / pageSize);

      for (let pageIndex = 2; pageIndex <= totalPages; pageIndex++) {
        const result = await fetchLocalDataAPI(
          settings,
          startDate,
          endDate,
          pageIndex,
          pageSize,
          serviceInfo,
          regionCode
        );

        if (result.success) {
          // 중복 제거하며 추가
          for (const lead of result.leads) {
            const key = createLeadKey(lead.bizName, lead.roadAddress);
            const bizId = lead.bizId;

            // 중복 체크: 상호명+주소 또는 사업자 ID
            if (!seenKeys.has(key) && (!bizId || !seenBizIds.has(bizId))) {
              seenKeys.add(key);
              if (bizId) {
                seenBizIds.add(bizId);
              }
              allLeads.push(lead);
            }
          }
          totalProcessed += result.leads.length;
          onProgress?.(totalProcessed, estimatedTotal, `[${regionName}] ${serviceInfo.name}: ${totalProcessed}건`);
        } else {
          console.error(`[${regionName}] ${serviceInfo.name} 페이지 ${pageIndex} 조회 실패`);
        }

        // API 호출 간격 (Rate Limiting 방지)
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // 서비스 간 간격
      await new Promise(resolve => setTimeout(resolve, 300));
    }
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
 * 서버에 API 키가 올바르게 설정되었는지 확인
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
