/**
 * 서울 吏?섏쿋 광고 영업 시스템- API 연동 로직
 * 서버사이드API瑜??듯빐 LocalData.go.kr ?곗씠??議고쉶
 *
 * 보안: API ?ㅻ뒗 ?쒕쾭?먯꽌留?愿由щ릺硫?클라이언트에 노출되지 않습니다.
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
 * API 호출 결과 ???
 */
interface FetchResult {
  success: boolean;
  leads: Lead[];
  totalCount: number;
  message?: string;
}

/**
 * ?쒕쾭 API 응답??임시 리드 ???
 */
interface RawLead {
  bizName: string;
  bizId?: string;
  mgtNo?: string;         // 愿由щ쾲??
  trdStateNm?: string;    // 영업?곹깭紐?
  dtlStateNm?: string;    // ?곸꽭영업?곹깭紐?
  licenseDate?: string;
  roadAddress?: string;
  lotAddress?: string;
  coordX?: number;
  coordY?: number;
  phone?: string;
  medicalSubject?: string;
}

/**
 * 서버사이드API瑜??듯빐 LocalData ?곗씠??議고쉶
 * API ?ㅻ뒗 ?쒕쾭?먯꽌 안전하게 愿由щ맗?덈떎.
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
      maxRetries: 2, // ?섎룞 由ы듃?쇱씠 ?ы븿 珥?3??
    });

    if (!result.success) {
      return {
        success: false,
        leads: [],
        totalCount: 0,
        message: result.error || result.message || 'API ?몄텧??실패했습니다.',
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
 * 서울 ?대┛?곗씠??愿묒옣 API瑜??듯빐 서울???섏썝 ?명뿀媛 ?뺣낫 議고쉶
 */
export async function fetchSeoulClinicAPI(
  startIndex: number = 1,
  endIndex: number = 100
): Promise<FetchResult> {
  try {
    const result = await safeFetch(`/api/seoul-data?service=clinic&start=${startIndex}&end=${endIndex}`, {
      method: 'GET',
    });

    if (!result.success) {
      return {
        success: false,
        leads: [],
        totalCount: 0,
        message: result.error || '서울 ?곗씠??API ?몄텧??실패했습니다.',
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
 * 서울 ?대┛?곗씠??愿묒옣 API瑜??듯빐 서울??蹂묒썝 ?명뿀媛 ?뺣낫 議고쉶
 */
export async function fetchSeoulHospitalAPI(
  startIndex: number = 1,
  endIndex: number = 100
): Promise<FetchResult> {
  try {
    const result = await safeFetch(`/api/seoul-data?service=hospital&start=${startIndex}&end=${endIndex}`, {
      method: 'GET',
    });

    if (!result.success) {
      return {
        success: false,
        leads: [],
        totalCount: 0,
        message: result.error || '서울 ?곗씠??API ?몄텧??실패했습니다.',
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
 * 서울 ?곗씠??API??임시 리드 ?곗씠?곕? 처리 (醫뚰몴 蹂?? 역 매칭)
 */
async function processSeoulRawLeads(rawLeads: any[], serviceId: string = 'LOCALDATA_010102'): Promise<Lead[]> {
  const { subwayDataManager } = await import('./kric-data-manager');
  await subwayDataManager.getAllSubwayData();

  const processedLeads = (await Promise.all(rawLeads.map(async (raw) => {
    // 서울 ?곗씠???꾨뱶 留ㅽ븨 (?몃뜑諛??놁쓬 二쇱쓽): 
    // BPLCNM (?ъ뾽?λ챸), RDNWHLADDR (?꾨줈紐낆＜??, SITEWHLADDR (吏踰덉＜??, SITETEL (전화번호), X (醫뚰몴X), Y (醫뚰몴Y)
    const bizName = raw.BPLCNM || '';
    if (!bizName) return null;

    let latitude: number | undefined;
    let longitude: number | undefined;
    let nearestStation: string | undefined;
    let stationDistance: number | undefined;
    let stationLines: string[] | undefined;

    // 서울 ?곗씠?곗쓽 醫뚰몴(X, Y)??以묐??먯젏(GRS80)
    // 媛믪뿉 怨듬갚???ы븿?섏뼱 ?덉쓣 ???덉쑝誘濡?trim 처리
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

    // ?쒕퉬??ID???곕Ⅸ 카테고리 寃곗젙
    const { CATEGORY_SERVICE_IDS } = await import('./types');
    let category: any = 'OTHER';
    
    // CATEGORY_SERVICE_IDS??紐⑤뱺 카테고리瑜??쒗쉶?섎ŉ ?대떦 serviceId瑜??ы븿?섎뒗 카테고리 李얘린
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
 * 임시 리드 ?곗씠?곕? 처리 (醫뚰몴 蹂?? 역 매칭)
 */
/**
 * 임시 리드 ?곗씠?곕? 처리 (醫뚰몴 蹂?? 역 매칭)
 */
async function processRawLeads(rawLeads: RawLead[], serviceInfo?: ServiceIdInfo): Promise<Lead[]> {
  const { subwayDataManager } = await import('./kric-data-manager');

  // 罹먯떆 ?뚮컢
  await subwayDataManager.getAllSubwayData();

  // 제외 ?ㅼ썙???뺤쓽 (의료기관 寃?????욎씠??鍮꾪?寃?업종)
  const excludeKeywords = [
    '약국', '편의점', '세븐일레븐', '씨유', '지에스', 'GS25', 'CU', '7-ELEVEN',
    '이마트', '안경', '콘택트', '안경원', '다이소', '올리브영', '롭스', '랄라블라'
  ];

  const processedLeads = (await Promise.all(rawLeads.map(async (raw) => {
    const subject = (raw.medicalSubject || '').replace(/\s+/g, '');
    const bizName = (raw.bizName || '').replace(/\s+/g, '');

    // 의료기관 愿???쒕퉬?ㅼ씠嫄곕굹 카테고리媛 HEALTH???뚮쭔 ?뺣? 필터링?곸슜
    // 泥댁쑁?쒖꽕(SPORTS) ???ㅻⅨ 카테고리??필터링제외 (상호명에 '안경' 등이 포함될 수 있음)
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

    // 醫뚰몴 蹂??(GRS80 -> WGS84)
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

          // 媛??媛源뚯슫 출구 번호 계산
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
      serviceName: serviceInfo?.name || '湲고?',
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
 * 전체 ?곗씠??議고쉶 (?섏씠吏?ㅼ씠??처리)
 * @param settings - 설정 정보 (API ?ㅻ뒗 사용하지 않음)
 * @param startDate - 시작 날짜
 * @param endDate - 醫낅즺 ?좎쭨
 * @param onProgress - 진행 상황 콜백
 * @param category - 업종 카테고리 (선택)
 */
export async function fetchAllLeads(
  settings: Settings,
  startDate: Date,
  endDate: Date,
  onProgress?: (current: number, total: number, status?: string) => void,
  category?: BusinessCategory,
  selectedServiceIds?: string[]  // 선택???몃???ぉ ID??
): Promise<FetchResult> {
  const pageSize = 100;
  let allLeads: Lead[] = [];
  const seenKeys = new Set<string>(); // 以묐났 泥댄겕??
  const seenBizIds = new Set<string>(); // ?ъ뾽??ID 以묐났 泥댄겕??

  // 카테고리??해당하는 ?쒕퉬??ID 목록
  let serviceIds: ServiceIdInfo[] = [];

  if (category === 'ALL' || !category) {
    // 紐⑤뱺 카테고리???쒕퉬??ID瑜?합침 (ALL 제외)
    Object.entries(CATEGORY_SERVICE_IDS).forEach(([key, services]) => {
      if (key !== 'ALL') {
        serviceIds = [...serviceIds, ...services];
      }
    });
  } else {
    serviceIds = CATEGORY_SERVICE_IDS[category];
  }

  // 선택???몃???ぉ???덉쑝硫??대떦 ??ぉ留?필터링
  if (selectedServiceIds && selectedServiceIds.length > 0) {
    serviceIds = serviceIds.filter(s => selectedServiceIds.includes(s.id));
  }

  // 吏??肄붾뱶 목록 (?ㅼ쨷 吏??吏??
  const regionCodes = settings.regionCodes?.length
    ? settings.regionCodes
    : [settings.regionCode];

  // 吏??챸 留ㅽ븨
  const regionNames: Record<string, string> = {
    '6110000': '서울',
    '6410000': '寃쎄린',
  };

  let totalProcessed = 0;
  let estimatedTotal = serviceIds.length * regionCodes.length * 100;

  for (const regionCode of regionCodes) {
    const regionName = regionNames[regionCode] || regionCode;

    for (const serviceInfo of serviceIds) {
      const categoryLabel = CATEGORY_LABELS[serviceInfo.category] || serviceInfo.category;
      onProgress?.(totalProcessed, estimatedTotal, `[${regionName}/${categoryLabel}] ${serviceInfo.name} 조회 중...`);

      // 泥??섏씠吏 議고쉶
      let firstResult: FetchResult | undefined;
      
      // 서울 吏??씠怨??뱀젙 ?꾨Ц 업종(의료기관/의료유사泥대젰?⑤젴????寃쎌슦 서울 ?곗씠??API 우선 시도
      const isSeoulSpecialty = regionCode === '6110000' && 
        (serviceInfo.id === '01_01_02_P' || serviceInfo.id === '01_01_01_P' || 
         serviceInfo.id === 'LOCALDATA_010301' || serviceInfo.id === 'LOCALDATA_104201');

      if (isSeoulSpecialty) {
        onProgress?.(totalProcessed, estimatedTotal, `[서울] 서울 ?곗씠??Portal?먯꽌 ${serviceInfo.name} 최신 정보 수집 중...`);
        if (serviceInfo.id === '01_01_02_P') {
          firstResult = await fetchSeoulClinicAPI(1, pageSize);
        } else if (serviceInfo.id === '01_01_01_P') {
          firstResult = await fetchSeoulHospitalAPI(1, pageSize);
        } else if (serviceInfo.id === 'LOCALDATA_010301') {
          // 의료유사전용 API 호출
          const result = await safeFetch(`/api/seoul-data?service=quasi-medical&start=1&end=${pageSize}`, {
            method: 'GET',
          });
          if (result.success) {
            const leads = await processSeoulRawLeads(result.leads, 'LOCALDATA_010301');
            firstResult = { success: true, leads, totalCount: result.totalCount };
          } else {
            firstResult = { success: false, leads: [], totalCount: 0, message: result.error };
          }
        } else if (serviceInfo.id === 'LOCALDATA_104201') {
          // 체력단련장업 전용 API 호출
          const result = await safeFetch(`/api/seoul-data?service=fitness&start=1&end=${pageSize}`, {
            method: 'GET',
          });
          if (result.success) {
            const leads = await processSeoulRawLeads(result.leads, 'LOCALDATA_104201');
            firstResult = { success: true, leads, totalCount: result.totalCount };
          } else {
            firstResult = { success: false, leads: [], totalCount: 0, message: result.error };
          }
        }
      } else {
        firstResult = await fetchLocalDataAPI(
          settings,
          startDate,
          endDate,
          1,
          pageSize,
          serviceInfo,
          regionCode
        );
      }

      if (!firstResult) {
        console.error(`[${regionName}] ${serviceInfo.name} 조회 실패: 응답??鍮꾩뼱 ?덉뒿?덈떎.`);
        continue;
      }

      if (!firstResult.success) {
        console.error(`[${regionName}] ${serviceInfo.name} 조회 실패:`, firstResult.message);
        continue;
      }

      // 1?섏씠吏 ?곗씠??利됱떆 ???諛??좉퇋 ?щ? ?뺤씤
      const { saveLeads } = await import('./supabase-service');
      const saveResult = await saveLeads(firstResult.leads, undefined);
      
      // ??λ맂 ?좉퇋 ?곗씠?곕쭔 寃곌낵???ы븿 (?붾㈃ ?쒖떆??
      allLeads = [...allLeads, ...saveResult.newLeads];
      totalProcessed += firstResult.leads.length;
      
      // ?좉퇋 ?곗씠?곌? ?섎굹???녾퀬 이미 기존 데이터가 많은 경우, 서울 ?곗씠?곕뒗 理쒖떊?쒖씠誘濡?議곌린 醫낅즺 媛??
      const isSeoulAPI = regionCode === '6110000' && (serviceInfo.id === '01_01_02_P' || serviceInfo.id === '01_01_01_P');

      // 珥?예상 건수 업데이트
      const remainingServices = serviceIds.length - serviceIds.indexOf(serviceInfo) - 1;
      const remainingRegions = regionCodes.length - regionCodes.indexOf(regionCode) - 1;
      estimatedTotal = Math.max(
        estimatedTotal,
        totalProcessed + (remainingServices + remainingRegions * serviceIds.length) * 50
      );
      onProgress?.(totalProcessed, estimatedTotal, `[${regionName}] ${serviceInfo.name}: ${firstResult.totalCount}건`);

      // 異붽? ?섏씠吏 議고쉶
      const totalPages = Math.ceil(firstResult.totalCount / pageSize);

      for (let pageIndex = 2; pageIndex <= totalPages; pageIndex++) {
        let result: FetchResult | undefined;
        
        const isSeoulSpecialty = regionCode === '6110000' && 
          (serviceInfo.id === '01_01_02_P' || serviceInfo.id === '01_01_01_P' || 
           serviceInfo.id === 'LOCALDATA_010301' || serviceInfo.id === 'LOCALDATA_104201');

        if (isSeoulSpecialty) {
          const start = (pageIndex - 1) * pageSize + 1;
          const end = pageIndex * pageSize;

          if (serviceInfo.id === '01_01_02_P') {
            result = await fetchSeoulClinicAPI(start, end);
          } else if (serviceInfo.id === '01_01_01_P') {
            result = await fetchSeoulHospitalAPI(start, end);
          } else if (serviceInfo.id === 'LOCALDATA_010301') {
            // 의료유사?섏씠吏?ㅼ씠??
            const apiResult = await safeFetch(`/api/seoul-data?service=quasi-medical&start=${start}&end=${end}`, {
              method: 'GET',
            });
            if (apiResult.success) {
              const leads = await processSeoulRawLeads(apiResult.leads, 'LOCALDATA_010301');
              result = { success: true, leads, totalCount: apiResult.totalCount };
            } else {
              result = { success: false, leads: [], totalCount: 0 };
            }
          } else if (serviceInfo.id === 'LOCALDATA_104201') {
            // 체력단련장업 ?섏씠吏?ㅼ씠??
            const apiResult = await safeFetch(`/api/seoul-data?service=fitness&start=${start}&end=${end}`, {
              method: 'GET',
            });
            if (apiResult.success) {
              const leads = await processSeoulRawLeads(apiResult.leads, 'LOCALDATA_104201');
              result = { success: true, leads, totalCount: apiResult.totalCount };
            } else {
              result = { success: false, leads: [], totalCount: 0 };
            }
          }
        } else {
          result = await fetchLocalDataAPI(
            settings,
            startDate,
            endDate,
            pageIndex,
            pageSize,
            serviceInfo,
            regionCode
          );
        }

        if (!result) {
          console.error(`[${regionName}] ${serviceInfo.name} ?섏씠吏 ${pageIndex} 조회 실패: 응답??鍮꾩뼱 ?덉뒿?덈떎.`);
          continue;
        }

        if (result.success) {
          // 利됱떆 DB ???諛??좉퇋 ?щ? ?뺤씤
          const { saveLeads } = await import('./supabase-service');
          const pageSaveResult = await saveLeads(result.leads, undefined);
          
          allLeads = [...allLeads, ...pageSaveResult.newLeads];
          totalProcessed += result.leads.length;
          onProgress?.(totalProcessed, estimatedTotal, `[${regionName}] ${serviceInfo.name}: ${totalProcessed}嫄?(?좉퇋: ${pageSaveResult.newCount})`);
          
          // 서울 ?곗씠??API??寃쎌슦, ?좉퇋 ?곗씠?곌? ?놁쑝硫??대? 怨쇨굅 ?곗씠??援ш컙??吏꾩엯??寃껋씠誘濡?以묐떒
        } else {
          console.error(`[${regionName}] ${serviceInfo.name} ?섏씠吏 ${pageIndex} 조회 실패`);
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
 * 서버의 API 키가 올바르게 설정되었는지 ?뺤씤
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
