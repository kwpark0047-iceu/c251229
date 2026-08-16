/**
 * 서울 지하철 광고 영업 시스템 - API 연동 로직
 * 서버사이드 API를 통해 LocalData.go.kr 데이터 조회
 *
 * 보안: API 키는 서버에서만 관리되며 클라이언트에 노출되지 않습니다.
 */

import { Lead, Settings, BusinessCategory, CATEGORY_SERVICE_IDS, ServiceIdInfo } from './types';
import {
  convertGRS80ToWGS84,
  formatDateToAPI,
  generateUUID,
} from './utils';
import { safeFetch } from './api-client';
import { subwayDataManager } from './kric-data-manager';

// ============================================================
// 타입 정의
// ============================================================

interface FetchResult {
  success: boolean;
  leads: Lead[];
  totalCount: number;
  message?: string;
}

// /api/localdata 라우트가 camelCase로 변환하여 반환하는 구조
interface RawLead {
  bizName: string;
  bizId?: string;
  mgtNo?: string;
  trdStateNm?: string;
  dtlStateNm?: string;
  licenseDate?: string;
  roadAddress?: string;
  lotAddress?: string;
  coordX?: number;
  coordY?: number;
  phone?: string;
  medicalSubject?: string;
}

interface ParsedApiKeys {
  localdata: string;
  seoul: string;
}

// ============================================================
// 모듈 레벨 유틸
// ============================================================

function delay(ms: number): Promise<void> {
  return new Promise(res => setTimeout(res, ms));
}

function parseApiKeys(settings: Settings): ParsedApiKeys {
  if (!settings?.apiKey) return { localdata: '', seoul: '' };
  try {
    const keys = JSON.parse(settings.apiKey);
    return {
      localdata: keys.localdata || '',
      seoul: keys.seoul || '',
    };
  } catch {
    // JSON이 아닌 단순 문자열이면 두 용도 모두 사용
    const raw = settings.apiKey.startsWith('{') ? '' : settings.apiKey;
    return { localdata: raw, seoul: raw };
  }
}

// ============================================================
// 공통 리드 변환 함수 (좌표 변환 + 역 매칭 + Lead 생성)
// fetchLocalDataAPI / 서울 전용 API 양쪽에서 공유
// ============================================================

async function convertToLeads(
  rawLeads: RawLead[],
  serviceInfo: ServiceIdInfo
): Promise<Lead[]> {
  const { name: svcName, category, id: serviceId } = serviceInfo;

  const results = await Promise.all(
    rawLeads.map(async (raw): Promise<Lead | null> => {
      const bizName = (raw.bizName || '').trim();
      if (!bizName) return null;

      // 폐업 상태 제외
      if (raw.dtlStateNm?.includes('폐업')) return null;

      let latitude: number | undefined;
      let longitude: number | undefined;
      let nearestStation: string | undefined;
      let stationDistance: number | undefined;
      let stationLines: string[] | undefined;
      let nearestExitNo: string | undefined;

      const x = raw.coordX || 0;
      const y = raw.coordY || 0;

      if (x && y) {
        const converted = convertGRS80ToWGS84(x, y);
        if (converted) {
          latitude = converted.lat;
          longitude = converted.lng;

          const bizAddress = raw.roadAddress || raw.lotAddress;
          const nearest = await subwayDataManager.findNearbyStation(latitude, longitude, bizAddress);
          if (nearest) {
            nearestStation = nearest.station.name;
            stationDistance = nearest.distance;
            stationLines = nearest.station.lines;

            // 가장 가까운 출구 정보
            const exitNo = await subwayDataManager.findNearestExit(nearest.station.name, latitude, longitude);
            if (exitNo) nearestExitNo = exitNo;
          }
        }
      }

      return {
        id: generateUUID(),
        bizName: raw.bizName,
        bizId: raw.bizId || undefined,
        licenseDate: raw.licenseDate || undefined,
        roadAddress: raw.roadAddress,
        lotAddress: raw.lotAddress,
        coordX: x || undefined,
        coordY: y || undefined,
        latitude,
        longitude,
        phone: raw.phone,
        medicalSubject: raw.medicalSubject,
        mgtNo: raw.mgtNo,
        operatingStatus: raw.trdStateNm,
        detailedStatus: raw.dtlStateNm,
        category,
        serviceId,
        serviceName: svcName,
        nearestStation,
        nearestExitNo,
        stationDistance,
        stationLines,
        status: 'NEW',
      } as Lead;
    })
  );

  return results.filter((lead): lead is Lead => lead !== null);
}

// ============================================================
// LocalData API 호출
// ============================================================

export async function fetchLocalDataAPI(
  settings: Settings,
  startDate: Date,
  endDate: Date,
  pageIndex: number = 1,
  pageSize: number = 100,
  serviceInfo?: ServiceIdInfo,
  regionCode?: string
): Promise<FetchResult> {
  const resolvedServiceInfo: ServiceIdInfo = serviceInfo ?? {
    id: '01_01_02_P',
    name: '의원',
    category: 'HEALTH',
  };
  const region = regionCode || settings.regionCode;
  const { localdata: localdataKey } = parseApiKeys(settings);

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (localdataKey) headers['x-api-key'] = localdataKey;

    const result = await safeFetch<{ success: boolean; leads?: RawLead[]; totalCount?: number; message?: string }>(
      '/api/localdata',
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          serviceId: resolvedServiceInfo.id,
          regionCode: region,
          startDate: formatDateToAPI(startDate),
          endDate: formatDateToAPI(endDate),
          searchType: settings.searchType,
          pageIndex,
          pageSize,
        }),
        maxRetries: 2,
      }
    );

    if (!result.success) {
      return { success: false, leads: [], totalCount: 0, message: result.message };
    }

    const rawLeads: RawLead[] = result.leads ?? [];

    // subwayDataManager 데이터 준비 (캐시 활용)
    await subwayDataManager.getAllSubwayData();
    const processedLeads = await convertToLeads(rawLeads, resolvedServiceInfo);

    return {
      success: true,
      leads: processedLeads,
      totalCount: result.totalCount ?? 0,
    };
  } catch (error) {
    console.error('[API] fetchLocalDataAPI 오류:', error);
    return {
      success: false,
      leads: [],
      totalCount: 0,
      message: `연결 오류: ${(error as Error).message}`,
    };
  }
}

// ============================================================
// 전체 리드 동기화 (병렬 처리)
// ============================================================

// 서울 오픈API 서비스 ID 매핑 (LocalData serviceId → Seoul API endpoint)
const SEOUL_ENDPOINT_MAP: Record<string, string> = {
  '01_01_02_P': 'clinic',      // 의원
  '01_01_01_P': 'hospital',    // 병원
  'LOCALDATA_010301': 'quasi-medical', // 의료유사업
  'LOCALDATA_104201': 'fitness',       // 체력단련장
};

function isSeoulSpecialtyService(regionCode: string, serviceId: string): boolean {
  return regionCode === '6110000' && serviceId in SEOUL_ENDPOINT_MAP;
}

export async function fetchAllLeads(
  settings: Settings,
  startDate: Date,
  endDate: Date,
  onProgress?: (current: number, total: number, status?: string) => void,
  category: BusinessCategory = 'ALL',
  selectedServiceIds?: string[]
): Promise<FetchResult> {
  const pageSize = 100;

  // 1. 서비스 ID 목록 준비
  let serviceIds: ServiceIdInfo[] = [];
  if (category === 'ALL' || !category) {
    Object.entries(CATEGORY_SERVICE_IDS).forEach(([key, services]) => {
      if (key !== 'ALL') serviceIds = [...serviceIds, ...services];
    });
  } else {
    serviceIds = CATEGORY_SERVICE_IDS[category] ?? [];
  }
  if (selectedServiceIds && selectedServiceIds.length > 0) {
    serviceIds = serviceIds.filter(s => selectedServiceIds.includes(s.id));
  }

  const regionCodes = settings.regionCodes?.length ? settings.regionCodes : [settings.regionCode];
  const REGION_NAMES: Record<string, string> = { '6110000': '서울', '6410000': '경기' };

  // 2. 작업 목록 생성
  const tasks: { regionCode: string; serviceInfo: ServiceIdInfo }[] = [];
  for (const regionCode of regionCodes) {
    for (const svc of serviceIds) {
      tasks.push({ regionCode, serviceInfo: svc });
    }
  }

  const totalTasks = tasks.length;
  let completedTasks = 0;
  let totalNewLeadsCount = 0;
  const results: Lead[] = [];

  onProgress?.(0, totalTasks, `동기화 시작 (총 ${totalTasks}개 서비스)...`);

  // 3. API 키 파싱 (루프 밖에서 1회)
  const { seoul: seoulKey } = parseApiKeys(settings);
  const seoulHeaders = seoulKey ? { 'x-api-key': seoulKey } : undefined;

  // 4. 지하철 데이터 선행 초기화 (루프 밖에서 1회, 이후 캐시 활용)
  try {
    await subwayDataManager.getAllSubwayData();
  } catch (e) {
    console.warn('[API] 지하철 데이터 초기화 실패, 진행 계속:', e);
  }

  // 5. saveLeads 동적 임포트 (루프 밖에서 1회)
  const { saveLeads } = await import('./supabase-service');

  // 6. Race Condition 방지 Mutex
  const mutex = {
    locked: false,
    queue: [] as Array<() => void>,
  };
  const lock = (): Promise<void> =>
    new Promise(resolve => {
      if (!mutex.locked) {
        mutex.locked = true;
        resolve();
      } else {
        mutex.queue.push(resolve);
      }
    });
  const unlock = (): void => {
    const next = mutex.queue.shift();
    if (next) next();
    else mutex.locked = false;
  };

  // 날짜 문자열 (YYYYMMDD 형식)
  const startStr = formatDateToAPI(startDate);
  const endStr = formatDateToAPI(endDate);

  // --------------------------------------------------------
  // 태스크 실행 함수
  // --------------------------------------------------------
  const executeTask = async (task: { regionCode: string; serviceInfo: ServiceIdInfo }): Promise<void> => {
    const { regionCode, serviceInfo } = task;
    const regionName = REGION_NAMES[regionCode] || regionCode;

    const progressDone = (msg: string) => {
      completedTasks++;
      onProgress?.(completedTasks, totalTasks, msg);
    };

    try {
      if (isSeoulSpecialtyService(regionCode, serviceInfo.id)) {
        // ── 서울 전용 오픈API 경로 ──
        const svc = SEOUL_ENDPOINT_MAP[serviceInfo.id];
        const countRes = await safeFetch<{ success: boolean; totalCount?: number }>(
          `/api/seoul-data?service=${svc}&start=1&end=1`,
          { headers: seoulHeaders }
        );

        if (!countRes.success || !countRes.totalCount) {
          progressDone(`[${regionName}] ${serviceInfo.name}: 데이터 없음`);
          return;
        }

        const total = countRes.totalCount;
        const SEOUL_PAGE_SIZE = 1000;
        const maxPages = Math.min(Math.ceil(total / SEOUL_PAGE_SIZE), 10);
        let currentEnd = total;
        let pagesFetched = 0;
        let savedInTask = 0;

        while (currentEnd > 0 && pagesFetched < maxPages) {
          const currentStart = Math.max(1, currentEnd - SEOUL_PAGE_SIZE + 1);
          const pageRes = await safeFetch<{ success: boolean; leads?: any[] }>(
            `/api/seoul-data?service=${svc}&start=${currentStart}&end=${currentEnd}`,
            { headers: seoulHeaders }
          );

          if (pageRes.success && pageRes.leads && pageRes.leads.length > 0) {
            // 서울 API는 대문자 원시 필드 반환 → RawLead 구조로 변환
            const rawLeads: RawLead[] = pageRes.leads.map((r: any) => ({
              bizName: r.BPLCNM,
              bizId: r.BRNO || undefined,
              mgtNo: r.MGTNO,
              trdStateNm: r.TRDSTATENM,
              dtlStateNm: r.DTLSTATENM,
              licenseDate: r.APVPERMYMD || undefined,
              roadAddress: r.RDNWHLADDR,
              lotAddress: r.SITEWHLADDR,
              coordX: parseFloat((r.X || '0').toString()) || undefined,
              coordY: parseFloat((r.Y || '0').toString()) || undefined,
              phone: r.SITETEL,
              medicalSubject: r.UPTAENM,
            }));

            const processed = await convertToLeads(rawLeads, serviceInfo);

const filtered = processed.filter(l => {
          if (!l.licenseDate) return true;
          const d = l.licenseDate.replace(/-/g, '');
          return d >= startStr && d <= endStr;
        });

            if (filtered.length > 0) {
              await lock();
              try {
                const saved = await saveLeads(filtered, undefined);
                totalNewLeadsCount += saved.newCount;
                savedInTask += saved.newCount;
                results.push(...saved.newLeads);
              } finally {
                unlock();
              }
            }
          }

          currentEnd = currentStart - 1;
          pagesFetched++;
          await delay(200);
        }

        progressDone(`[${regionName}] ${serviceInfo.name}: 완료 (${savedInTask}건 신규)`);
      } else {
        // ── LocalData.go.kr 경로 ──
        const firstResult = await fetchLocalDataAPI(
          settings, startDate, endDate, 1, pageSize, serviceInfo, regionCode
        );

        if (!firstResult.success || firstResult.leads.length === 0) {
          progressDone(`[${regionName}] ${serviceInfo.name}: 데이터 없음`);
          return;
        }

        // 첫 페이지 저장
        await lock();
        try {
          const saved = await saveLeads(firstResult.leads, undefined);
          totalNewLeadsCount += saved.newCount;
          results.push(...saved.newLeads);
        } finally {
          unlock();
        }

        // 추가 페이지 처리
        const totalPages = Math.ceil(firstResult.totalCount / pageSize);
        for (let p = 2; p <= totalPages; p++) {
          const pageResult = await fetchLocalDataAPI(
            settings, startDate, endDate, p, pageSize, serviceInfo, regionCode
          );
          if (pageResult.success && pageResult.leads.length > 0) {
            await lock();
            try {
              const saved = await saveLeads(pageResult.leads, undefined);
              totalNewLeadsCount += saved.newCount;
              results.push(...saved.newLeads);
            } finally {
              unlock();
            }
          }
          await delay(500);
        }

        progressDone(
          `[${regionName}] ${serviceInfo.name}: ${firstResult.totalCount}건 확인 (${totalNewLeadsCount}건 신규)`
        );
        await delay(1000);
      }
    } catch (err) {
      console.error(`[Task Error] ${regionName}/${serviceInfo.name}:`, err);
      progressDone(`[${regionName}] ${serviceInfo.name}: 오류 발생`);
    }
  };

  // 7. 동시 실행 풀 (동시성 2)
  const CONCURRENCY_LIMIT = 2;
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

  return { success: true, leads: results, totalCount: results.length };
}

// ============================================================
// API 연결 테스트
// ============================================================

export async function testAPIConnection(
  settings: Settings
): Promise<{ success: boolean; message: string }> {
  try {
    const today = new Date();
    const result = await fetchLocalDataAPI(settings, today, today, 1, 1);
    return result.success
      ? { success: true, message: 'API 연결 성공' }
      : { success: false, message: result.message || 'API 연결 실패' };
  } catch (error) {
    return { success: false, message: `연결 오류: ${(error as Error).message}` };
  }
}
