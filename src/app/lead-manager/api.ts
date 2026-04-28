/**
 * ?쒖슱 吏?섏쿋 愿묎퀬 ?곸뾽 ?쒖뒪??- API ?곕룞 濡쒖쭅
 * ?쒕쾭?ъ씠??API瑜??듯빐 LocalData.go.kr ?곗씠??議고쉶
 *
 * 蹂댁븞: API ?ㅻ뒗 ?쒕쾭?먯꽌留?愿由щ릺硫??대씪?댁뼵?몄뿉 ?몄텧?섏? ?딆뒿?덈떎.
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
 * API ?몄텧 寃곌낵 ???
 */
interface FetchResult {
  success: boolean;
  leads: Lead[];
  totalCount: number;
  message?: string;
}

/**
 * ?쒕쾭 API ?묐떟???먯떆 由щ뱶 ???
 */
interface RawLead {
  bizName: string;
  bizId?: string;
  mgtNo?: string;         // 愿由щ쾲??
  trdStateNm?: string;    // ?곸뾽?곹깭紐?
  dtlStateNm?: string;    // ?곸꽭?곸뾽?곹깭紐?
  licenseDate?: string;
  roadAddress?: string;
  lotAddress?: string;
  coordX?: number;
  coordY?: number;
  phone?: string;
  medicalSubject?: string;
}

/**
 * ?쒕쾭?ъ씠??API瑜??듯빐 LocalData ?곗씠??議고쉶
 * API ?ㅻ뒗 ?쒕쾭?먯꽌 ?덉쟾?섍쾶 愿由щ맗?덈떎.
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
        message: result.error || result.message || 'API ?몄텧???ㅽ뙣?덉뒿?덈떎.',
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
        : `?ㅽ듃?뚰겕 ?ㅻ쪟: ${(error as Error).message}`,
    };
  }
}

/**
 * ?쒖슱 ?대┛?곗씠??愿묒옣 API瑜??듯빐 ?쒖슱???섏썝 ?명뿀媛 ?뺣낫 議고쉶
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
        message: result.error || '?쒖슱 ?곗씠??API ?몄텧???ㅽ뙣?덉뒿?덈떎.',
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
      message: `?ㅽ듃?뚰겕 ?ㅻ쪟: ${(error as Error).message}`,
    };
  }
}

/**
 * ?쒖슱 ?대┛?곗씠??愿묒옣 API瑜??듯빐 ?쒖슱??蹂묒썝 ?명뿀媛 ?뺣낫 議고쉶
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
        message: result.error || '?쒖슱 ?곗씠??API ?몄텧???ㅽ뙣?덉뒿?덈떎.',
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
      message: `?ㅽ듃?뚰겕 ?ㅻ쪟: ${(error as Error).message}`,
    };
  }
}

/**
 * ?쒖슱 ?곗씠??API???먯떆 由щ뱶 ?곗씠?곕? 泥섎━ (醫뚰몴 蹂?? ??留ㅼ묶)
 */
async function processSeoulRawLeads(rawLeads: any[], serviceId: string = 'LOCALDATA_010102'): Promise<Lead[]> {
  const { subwayDataManager } = await import('./kric-data-manager');
  await subwayDataManager.getAllSubwayData();

  const processedLeads = (await Promise.all(rawLeads.map(async (raw) => {
    // ?쒖슱 ?곗씠???꾨뱶 留ㅽ븨 (?몃뜑諛??놁쓬 二쇱쓽): 
    // BPLCNM (?ъ뾽?λ챸), RDNWHLADDR (?꾨줈紐낆＜??, SITEWHLADDR (吏踰덉＜??, SITETEL (?꾪솕踰덊샇), X (醫뚰몴X), Y (醫뚰몴Y)
    const bizName = raw.BPLCNM || '';
    if (!bizName) return null;

    let latitude: number | undefined;
    let longitude: number | undefined;
    let nearestStation: string | undefined;
    let stationDistance: number | undefined;
    let stationLines: string[] | undefined;

    // ?쒖슱 ?곗씠?곗쓽 醫뚰몴(X, Y)??以묐??먯젏(GRS80)
    // 媛믪뿉 怨듬갚???ы븿?섏뼱 ?덉쓣 ???덉쑝誘濡?trim 泥섎━
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

    // ?쒕퉬??ID???곕Ⅸ 移댄뀒怨좊━ 寃곗젙
    const { CATEGORY_SERVICE_IDS } = await import('./types');
    let category: any = 'OTHER';
    
    // CATEGORY_SERVICE_IDS??紐⑤뱺 移댄뀒怨좊━瑜??쒗쉶?섎ŉ ?대떦 serviceId瑜??ы븿?섎뒗 移댄뀒怨좊━ 李얘린
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
 * ?먯떆 由щ뱶 ?곗씠?곕? 泥섎━ (醫뚰몴 蹂?? ??留ㅼ묶)
 */
/**
 * ?먯떆 由щ뱶 ?곗씠?곕? 泥섎━ (醫뚰몴 蹂?? ??留ㅼ묶)
 */
async function processRawLeads(rawLeads: RawLead[], serviceInfo?: ServiceIdInfo): Promise<Lead[]> {
  const { subwayDataManager } = await import('./kric-data-manager');

  // 罹먯떆 ?뚮컢
  await subwayDataManager.getAllSubwayData();

  // ?쒖쇅 ?ㅼ썙???뺤쓽 (?섎즺湲곌? 寃?????욎씠??鍮꾪?寃??낆쥌)
  const excludeKeywords = [
    '약국', '편의점', '세븐일레븐', '씨유', '지에스', 'GS25', 'CU', '7-ELEVEN',
    '이마트', '안경', '콘택트', '안경원', '다이소', '올리브영', '롭스', '랄라블라'
  ];

  const processedLeads = (await Promise.all(rawLeads.map(async (raw) => {
    const subject = (raw.medicalSubject || '').replace(/\s+/g, '');
    const bizName = (raw.bizName || '').replace(/\s+/g, '');

    // ?섎즺湲곌? 愿???쒕퉬?ㅼ씠嫄곕굹 移댄뀒怨좊━媛 HEALTH???뚮쭔 ?뺣? ?꾪꽣留??곸슜
    // 泥댁쑁?쒖꽕(SPORTS) ???ㅻⅨ 移댄뀒怨좊━???꾪꽣留??쒖쇅 (?곹샇紐낆뿉 '?덇꼍' ?깆씠 ?ы븿?????덉쓬)
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

          // 媛??媛源뚯슫 異쒓뎄 踰덊샇 怨꾩궛
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
 * ?꾩껜 ?곗씠??議고쉶 (?섏씠吏?ㅼ씠??泥섎━)
 * @param settings - ?ㅼ젙 ?뺣낫 (API ?ㅻ뒗 ?ъ슜?섏? ?딆쓬)
 * @param startDate - ?쒖옉 ?좎쭨
 * @param endDate - 醫낅즺 ?좎쭨
 * @param onProgress - 吏꾪뻾 ?곹솴 肄쒕갚
 * @param category - ?낆쥌 移댄뀒怨좊━ (?좏깮)
 */
export async function fetchAllLeads(
  settings: Settings,
  startDate: Date,
  endDate: Date,
  onProgress?: (current: number, total: number, status?: string) => void,
  category?: BusinessCategory,
  selectedServiceIds?: string[]  // ?좏깮???몃???ぉ ID??
): Promise<FetchResult> {
  const pageSize = 100;
  let allLeads: Lead[] = [];
  const seenKeys = new Set<string>(); // 以묐났 泥댄겕??
  const seenBizIds = new Set<string>(); // ?ъ뾽??ID 以묐났 泥댄겕??

  // 移댄뀒怨좊━???대떦?섎뒗 ?쒕퉬??ID 紐⑸줉
  let serviceIds: ServiceIdInfo[] = [];

  if (category === 'ALL' || !category) {
    // 紐⑤뱺 移댄뀒怨좊━???쒕퉬??ID瑜??⑹묠 (ALL ?쒖쇅)
    Object.entries(CATEGORY_SERVICE_IDS).forEach(([key, services]) => {
      if (key !== 'ALL') {
        serviceIds = [...serviceIds, ...services];
      }
    });
  } else {
    serviceIds = CATEGORY_SERVICE_IDS[category];
  }

  // ?좏깮???몃???ぉ???덉쑝硫??대떦 ??ぉ留??꾪꽣留?
  if (selectedServiceIds && selectedServiceIds.length > 0) {
    serviceIds = serviceIds.filter(s => selectedServiceIds.includes(s.id));
  }

  // 吏??肄붾뱶 紐⑸줉 (?ㅼ쨷 吏??吏??
  const regionCodes = settings.regionCodes?.length
    ? settings.regionCodes
    : [settings.regionCode];

  // 吏??챸 留ㅽ븨
  const regionNames: Record<string, string> = {
    '6110000': '?쒖슱',
    '6410000': '寃쎄린',
  };

  let totalProcessed = 0;
  let estimatedTotal = serviceIds.length * regionCodes.length * 100;

  for (const regionCode of regionCodes) {
    const regionName = regionNames[regionCode] || regionCode;

    for (const serviceInfo of serviceIds) {
      const categoryLabel = CATEGORY_LABELS[serviceInfo.category] || serviceInfo.category;
      onProgress?.(totalProcessed, estimatedTotal, `[${regionName}/${categoryLabel}] ${serviceInfo.name} 議고쉶 以?..`);

      // 泥??섏씠吏 議고쉶
      let firstResult: FetchResult | undefined;
      
      // ?쒖슱 吏??씠怨??뱀젙 ?꾨Ц ?낆쥌(?섎즺湲곌?/?섎즺?좎궗??泥대젰?⑤젴????寃쎌슦 ?쒖슱 ?곗씠??API ?곗꽑 ?쒕룄
      const isSeoulSpecialty = regionCode === '6110000' && 
        (serviceInfo.id === '01_01_02_P' || serviceInfo.id === '01_01_01_P' || 
         serviceInfo.id === 'LOCALDATA_010301' || serviceInfo.id === 'LOCALDATA_104201');

      if (isSeoulSpecialty) {
        onProgress?.(totalProcessed, estimatedTotal, `[?쒖슱] ?쒖슱 ?곗씠??Portal?먯꽌 ${serviceInfo.name} 理쒖떊 ?뺣낫 ?섏쭛 以?..`);
        if (serviceInfo.id === '01_01_02_P') {
          firstResult = await fetchSeoulClinicAPI(1, pageSize);
        } else if (serviceInfo.id === '01_01_01_P') {
          firstResult = await fetchSeoulHospitalAPI(1, pageSize);
        } else if (serviceInfo.id === 'LOCALDATA_010301') {
          // ?섎즺?좎궗???꾩슜 API ?몄텧
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
          // 泥대젰?⑤젴?μ뾽 ?꾩슜 API ?몄텧
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
        console.error(`[${regionName}] ${serviceInfo.name} 議고쉶 ?ㅽ뙣: ?묐떟??鍮꾩뼱 ?덉뒿?덈떎.`);
        continue;
      }

      if (!firstResult.success) {
        console.error(`[${regionName}] ${serviceInfo.name} 議고쉶 ?ㅽ뙣:`, firstResult.message);
        continue;
      }

      // 1?섏씠吏 ?곗씠??利됱떆 ???諛??좉퇋 ?щ? ?뺤씤
      const { saveLeads } = await import('./supabase-service');
      const saveResult = await saveLeads(firstResult.leads, undefined);
      
      // ??λ맂 ?좉퇋 ?곗씠?곕쭔 寃곌낵???ы븿 (?붾㈃ ?쒖떆??
      allLeads = [...allLeads, ...saveResult.newLeads];
      totalProcessed += firstResult.leads.length;
      
      // ?좉퇋 ?곗씠?곌? ?섎굹???녾퀬 ?대? 湲곗〈 ?곗씠?곌? 留롮? 寃쎌슦, ?쒖슱 ?곗씠?곕뒗 理쒖떊?쒖씠誘濡?議곌린 醫낅즺 媛??
      const isSeoulAPI = regionCode === '6110000' && (serviceInfo.id === '01_01_02_P' || serviceInfo.id === '01_01_01_P');

      // 珥??덉긽 嫄댁닔 ?낅뜲?댄듃
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
            // ?섎즺?좎궗???섏씠吏?ㅼ씠??
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
            // 泥대젰?⑤젴?μ뾽 ?섏씠吏?ㅼ씠??
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
          console.error(`[${regionName}] ${serviceInfo.name} ?섏씠吏 ${pageIndex} 議고쉶 ?ㅽ뙣: ?묐떟??鍮꾩뼱 ?덉뒿?덈떎.`);
          continue;
        }

        if (result.success) {
          // 利됱떆 DB ???諛??좉퇋 ?щ? ?뺤씤
          const { saveLeads } = await import('./supabase-service');
          const pageSaveResult = await saveLeads(result.leads, undefined);
          
          allLeads = [...allLeads, ...pageSaveResult.newLeads];
          totalProcessed += result.leads.length;
          onProgress?.(totalProcessed, estimatedTotal, `[${regionName}] ${serviceInfo.name}: ${totalProcessed}嫄?(?좉퇋: ${pageSaveResult.newCount})`);
          
          // ?쒖슱 ?곗씠??API??寃쎌슦, ?좉퇋 ?곗씠?곌? ?놁쑝硫??대? 怨쇨굅 ?곗씠??援ш컙??吏꾩엯??寃껋씠誘濡?以묐떒
        } else {
          console.error(`[${regionName}] ${serviceInfo.name} ?섏씠吏 ${pageIndex} 議고쉶 ?ㅽ뙣`);
        }

        // API ?몄텧 媛꾧꺽 (Rate Limiting 諛⑹?)
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // ?쒕퉬??媛?媛꾧꺽
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  onProgress?.(allLeads.length, allLeads.length, '?꾨즺');

  return {
    success: true,
    leads: allLeads,
    totalCount: allLeads.length,
  };
}

/**
 * API ?곌껐 ?뚯뒪??
 * ?쒕쾭??API ?ㅺ? ?щ컮瑜닿쾶 ?ㅼ젙?섏뿀?붿? ?뺤씤
 */
export async function testAPIConnection(settings: Settings): Promise<{ success: boolean; message: string }> {
  try {
    const today = new Date();
    const result = await fetchLocalDataAPI(settings, today, today, 1, 1);

    if (result.success) {
      return { success: true, message: 'API ?곌껐 ?깃났' };
    } else {
      return { success: false, message: result.message || 'API ?곌껐 ?ㅽ뙣' };
    }
  } catch (error) {
    return { success: false, message: `?곌껐 ?ㅻ쪟: ${(error as Error).message}` };
  }
}
