/**
 * 공용 데이터 동기화 엔진
 * 경기데이터드림 + 서울 열린광장 API 페치/맵핑/저장 로직을 한 곳에 모은 모듈.
 * - /api/sync-all (사용자 수동 동기화)
 * - /api/cron/sync (매일 06:10 자동 증분 동기화)
 * 두 라우트가 함께 import하여 로직 중복을 방지한다.
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { findNearestStation, convertGRS80ToWGS84 } from '@/app/lead-manager/utils';
import { upsertLeadsByMgtNo } from '@/app/api/sync-utils';

// ============================================================
// 경기도 API 소스 설정 정의
// ============================================================

type GGSourceKey =
  | 'gg-clinics'
  | 'gg-hospitals'
  | 'gg-restaurants'
  | 'gg-food-trucks'
  | 'gg-coffee-shops'
  | 'gg-univ'
  | 'gg-jncl-univ';

interface GGSourceConfig {
  endpoint: string;
  dataKey: string;
  category: string;
  service_name: string;
  nameField: string;        // 사업장명 필드
  phoneField: string;       // 전화번호 필드
  envKey: string;           // 환경변수 키 이름
  label: string;            // UI 표시명
  mgtPrefix: string;        // mgt_no 접두사
  disabled?: boolean;       // 공공 API 서비스 중지 등으로 사용 불가
  disabledReason?: string;  // 비활성 사유
}

const GG_SOURCES: Record<GGSourceKey, GGSourceConfig> = {
  'gg-clinics': {
    endpoint: 'https://openapi.gg.go.kr/AsembyStus',
    dataKey: 'AsembyStus',
    category: 'HEALTH',
    service_name: '의원',
    nameField: 'BIZPLC_NM',
    phoneField: 'LOCPLC_FACLT_TELNO',
    envKey: 'GG_CLINIC_API_KEY',
    label: '경기도 의원',
    mgtPrefix: 'GG_CLINIC',
  },
  'gg-hospitals': {
    endpoint: 'https://openapi.gg.go.kr/GgHosptlM',
    dataKey: 'GgHosptlM',
    category: 'HEALTH',
    service_name: '병원',
    nameField: 'BIZPLC_NM',
    phoneField: 'LOCPLC_FACLT_TELNO',
    envKey: 'GG_HOSPITAL_API_KEY',
    label: '경기도 병원',
    mgtPrefix: 'GG_HOSPITAL',
  },
  'gg-restaurants': {
    endpoint: 'https://openapi.gg.go.kr/GENRESTRT',
    dataKey: 'GENRESTRT',
    category: 'FOOD',
    service_name: '일반음식점',
    nameField: 'BIZPLC_NM',
    phoneField: 'LOCPLC_FACLT_TELNO',
    envKey: 'GG_REST_API_KEY',
    label: '경기도 일반음식점',
    mgtPrefix: 'GG_REST',
  },
  'gg-food-trucks': {
    endpoint: 'https://openapi.gg.go.kr/Resrestrtfodtuck',
    dataKey: 'Resrestrtfodtuck',
    category: 'FOOD',
    service_name: '푸드트럭',
    nameField: 'BIZPLC_NM',
    phoneField: '',
    envKey: 'GG_FOOD_TRUCK_API_KEY',
    label: '경기도 푸드트럭',
    mgtPrefix: 'GG_FOOD_TRUCK',
  },
  'gg-coffee-shops': {
    endpoint: 'https://openapi.gg.go.kr/RESRESTRT',
    dataKey: 'RESRESTRT',
    category: 'FOOD',
    service_name: '커피숍',
    nameField: 'BIZCOND_DIV_NM_INFO', // RESRESTRT는 업소명(BIZPLC_NM)이 없어 업종명을 사용
    phoneField: '',
    envKey: 'GG_COFFEE_SHOP_API_KEY',
    label: '경기도 커피숍',
    mgtPrefix: 'GG_COFFEE',
  },
  'gg-univ': {
    endpoint: 'https://openapi.gg.go.kr/Univ',
    dataKey: 'Univ',
    category: 'EDUCATION',
    service_name: '대학교',
    nameField: 'FACLT_NM',
    phoneField: '',
    envKey: 'GG_UNIV_API_KEY',
    label: '경기도 대학교',
    mgtPrefix: 'GG_UNIV',
    disabled: true,
    disabledReason: '경기도 Univ 오픈API 서비스 중지 (ERROR-310)',
  },
  'gg-jncl-univ': {
    endpoint: 'https://openapi.gg.go.kr/Jnclluniv',
    dataKey: 'Jnclluniv',
    category: 'EDUCATION',
    service_name: '전문대학',
    nameField: 'FACLT_NM',
    phoneField: '',
    envKey: 'GG_JNCL_UNIV_API_KEY',
    label: '경기도 전문대학',
    mgtPrefix: 'GG_JNCL',
  },
};

// ============================================================
// 경기도 API 공통 데이터 수집 함수 (전체 페이지 순회)
// ============================================================

export async function fetchGGAllPages(
  config: GGSourceConfig,
  apiKey: string,
  sigunNm?: string,
  pageSize: number = 1000
): Promise<{ total: number; rows: any[] }> {
  // 1페이지로 총 건수 파악
  const firstUrl = buildGGUrl(config.endpoint, apiKey, 1, pageSize, sigunNm);
  const firstRes = await fetch(firstUrl, { cache: 'no-store' });
  if (!firstRes.ok) {
    // HTTP 오류 응답 본문에 실제 사유(ERROR-xxx 등)가 담겨 있으면 함께 전달한다
    let detail = '';
    try {
      const errText = await firstRes.text();
      if (errText) {
        const snippet = errText.slice(0, 200).replace(/\s+/g, ' ');
        try {
          const errJson = JSON.parse(errText);
          detail = errJson.RESULT?.CODE
            ? ` [${errJson.RESULT.CODE}] ${errJson.RESULT.MESSAGE || ''}`
            : ` (${snippet})`;
        } catch {
          detail = ` (${snippet})`;
        }
      }
    } catch {
      // 본문 읽기 실패는 무시
    }
    throw new Error(`[${config.label}] API 응답 오류: HTTP ${firstRes.status}${detail}`);
  }

  const firstText = await firstRes.text();
  let firstData: any;
  try {
    firstData = JSON.parse(firstText);
  } catch {
    // 경기도 오픈API는 서비스 종료 시 HTTP 200 + EUC-KR HTML 안내문을 반환하므로
    // 비JSON 응답에서 정책 종료 문구를 감지해 실제 사유를 명확히 던진다
    const snippet = firstText.slice(0, 300).replace(/\s+/g, ' ');
    if (/서비스가 종료|정책이 변경|서비스 종료|<html|EUC-KR/i.test(snippet)) {
      throw new Error(`[${config.label}] 경기데이터드림 정책 변경으로 해당 API 서비스가 종료되었습니다 (응답: ${snippet.slice(0, 120)})`);
    }
    throw new Error(`[${config.label}] API 응답 파싱 실패 - 서비스 중지 또는 잘못된 엔드포인트일 수 있음 (응답: ${snippet.slice(0, 120)})`);
  }
  if (!firstData[config.dataKey]) {
    const code = firstData.RESULT?.CODE || 'UNKNOWN';
    const msg = firstData.RESULT?.MESSAGE || '데이터 없음';
    throw new Error(`[${config.label}] [${code}] ${msg}`);
  }

  const headItem = Array.isArray(firstData[config.dataKey])
    ? firstData[config.dataKey].find((item: any) => item.head)
    : null;
  const rowItem = Array.isArray(firstData[config.dataKey])
    ? firstData[config.dataKey].find((item: any) => item.row)
    : null;

  const total: number = headItem?.head?.find((h: any) => h.list_total_count)?.list_total_count || 0;
  const MAX_PAGES = 20;
  const totalPages = Math.min(Math.ceil(total / pageSize), MAX_PAGES);

  let allRows: any[] = rowItem?.row || [];

  // 나머지 페이지 순회
  for (let page = 2; page <= totalPages; page++) {
    const url = buildGGUrl(config.endpoint, apiKey, page, pageSize, sigunNm);
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) {
        console.warn(`[${config.label}] 페이지 ${page} 실패: ${res.status}`);
        continue;
      }
      const data = await res.json();
      const ri = Array.isArray(data[config.dataKey])
        ? data[config.dataKey].find((item: any) => item.row)
        : null;
      if (ri?.row) allRows = allRows.concat(ri.row);
    } catch (e) {
      console.warn(`[${config.label}] 페이지 ${page} 예외:`, e);
    }
  }

  return { total, rows: allRows };
}

function buildGGUrl(endpoint: string, apiKey: string, page: number, pageSize: number, sigunNm?: string): string {
  const url = new URL(endpoint);
  url.searchParams.set('KEY', apiKey);
  url.searchParams.set('Type', 'json');
  url.searchParams.set('pIndex', String(page));
  url.searchParams.set('pSize', String(pageSize));
  if (sigunNm) url.searchParams.set('SIGUN_NM', sigunNm);
  return url.toString();
}

/** 경기도 API 행 데이터를 leads 테이블 형식으로 변환 */
export function mapGGRow(row: any, config: GGSourceConfig, orgId: string | null) {
  const lat = parseFloat(row.REFINE_WGS84_LAT);
  const lng = parseFloat(row.REFINE_WGS84_LOGT);
  const nearest = (!isNaN(lat) && !isNaN(lng)) ? findNearestStation(lat, lng) : null;
  const bizName = row[config.nameField] || '';
  const zipOrAddr = row.REFINE_ZIP_CD || row.REFINE_ROADNM_ADDR || '';

  return {
    biz_name: bizName,
    road_address: row.REFINE_ROADNM_ADDR || '',
    lot_address: row.REFINE_LOTNO_ADDR || '',
    phone: config.phoneField ? (row[config.phoneField] || '') : '',
    medical_subject: config.service_name,
    service_name: config.service_name,
    category: config.category,
    latitude: isNaN(lat) ? null : lat,
    longitude: isNaN(lng) ? null : lng,
    nearest_station: nearest?.station.name ?? null,
    station_lines: nearest?.station.lines ?? null,
    station_distance: nearest ? Math.round(nearest.distance) : null,
    status: 'NEW',
    operating_status: '영업중',
    mgt_no: `${config.mgtPrefix}_${bizName}_${zipOrAddr}`.replace(/\s+/g, ''),
    ...(orgId ? { organization_id: orgId } : {}),
  };
}

// ============================================================
// 서울 열린광장 API 처리
// ============================================================

type SeoulSourceKey = 'seoul-clinics' | 'seoul-hospitals' | 'seoul-fitness';

interface SeoulSourceConfig {
  serviceCode: string;  // LOCALDATA_010102 등
  category: string;
  service_name: string;
  label: string;
  envKey: string;
}

const SEOUL_SOURCES: Record<SeoulSourceKey, SeoulSourceConfig> = {
  'seoul-clinics': {
    serviceCode: 'LOCALDATA_010102',
    category: 'HEALTH',
    service_name: '의원',
    label: '서울 의원',
    envKey: 'SEOUL_DATA_CLINIC_API_KEY',
  },
  'seoul-hospitals': {
    serviceCode: 'LOCALDATA_010101',
    category: 'HEALTH',
    service_name: '병원',
    label: '서울 병원',
    envKey: 'SEOUL_DATA_HOSPITAL_API_KEY',
  },
  'seoul-fitness': {
    serviceCode: 'LOCALDATA_104201',
    category: 'SPORTS',
    service_name: '체력단련장',
    label: '서울 헬스장',
    envKey: 'SEOUL_DATA_FITNESS_API_KEY',
  },
};

// 서울 오픈데이터 API는 8088 포트로만 제공되며 HTTPS 미지원 (공식 문서 기준)
// API 키가 URL 경로에 포함되는 구조이므로 내부 서버→외부 API 통신에만 사용됨 (클라이언트 미노출)
const SEOUL_BASE = 'http://openapi.seoul.go.kr:8088';
const SEOUL_PAGE_SIZE = 1000;
const SEOUL_MAX_PAGES = 100; // 10만 건까지 수용 가능하도록 확대

/** 최종수정일자(LASTMODTS, 'YYYY-MM-DD HH:MM:SS')가 최근 3개월 이내인지 확인 (ISO 날짜 문자열 사전순 비교) */
function isWithinLastThreeMonths(lastModTs: string | null | undefined): boolean {
  if (!lastModTs || typeof lastModTs !== 'string') return false;
  const datePart = lastModTs.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return false;
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - 3);
  return datePart >= cutoff.toISOString().slice(0, 10);
}

export async function fetchSeoulAllPages(
  config: SeoulSourceConfig,
  apiKey: string
): Promise<{ total: number; rows: any[] }> {
  // 총 건수 파악 (1건)
  const countUrl = `${SEOUL_BASE}/${apiKey}/json/${config.serviceCode}/1/1`;
  const countRes = await fetch(countUrl, { cache: 'no-store' });
  if (!countRes.ok) throw new Error(`[${config.label}] API 응답 오류: ${countRes.status}`);

  const countData = await countRes.json();
  if (!countData[config.serviceCode]) {
    const code = countData.RESULT?.CODE || 'UNKNOWN';
    const msg = countData.RESULT?.MESSAGE || '데이터 없음';
    throw new Error(`[${config.label}] [${code}] ${msg}`);
  }

  const total = parseInt(countData[config.serviceCode].list_total_count) || 0;
  const totalPages = Math.min(Math.ceil(total / SEOUL_PAGE_SIZE), SEOUL_MAX_PAGES);

  let allRows: any[] = [];

  // 병렬 처리를 위해 chunk 사이즈 정의 (예: 5개 페이지씩 동시에 요청하여 대기 시간 단축)
  const CHUNK_SIZE = 5;

  // 필터 제외 원인별 집계 (0건 수집 문제의 원인 파악용)
  let statNotOperating = 0; // '영업중'이 아닌 상태 (폐업·휴업 등)
  let statTooOld = 0;       // 최종수정일이 3개월 초과
  let statBadDate = 0;      // LASTMODTS 포맷 오류 또는 누락

  for (let i = 1; i <= totalPages; i += CHUNK_SIZE) {
    const pagePromises = [];
    for (let j = 0; j < CHUNK_SIZE && i + j <= totalPages; j++) {
      const page = i + j;
      const start = (page - 1) * SEOUL_PAGE_SIZE + 1;
      const end = page * SEOUL_PAGE_SIZE;
      const url = `${SEOUL_BASE}/${apiKey}/json/${config.serviceCode}/${start}/${end}`;
      
      const fetchPromise = fetch(url, { cache: 'no-store' })
        .then(async res => {
          if (!res.ok) {
            console.warn(`[${config.label}] 페이지 ${page} 실패: ${res.status}`);
            return [];
          }
          const data = await res.json();
          const rows = data[config.serviceCode]?.row || [];
          // 영업중(또는 영업/정상)이면서 최종수정일자가 최근 3개월 이내인 업소만 유효 처리
          const valid: any[] = [];
          for (const r of rows) {
            const trdState = (r.TRDSTATENM || '').trim();
            if (trdState !== '영업중' && trdState !== '영업/정상') {
              statNotOperating++;
              continue;
            }
            const ts = r.LASTMODTS;
            if (!ts || typeof ts !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(ts.slice(0, 10))) {
              statBadDate++;
              continue;
            }
            if (!isWithinLastThreeMonths(ts)) {
              statTooOld++;
              continue;
            }
            valid.push(r);
          }
          return valid;
        })
        .catch(e => {
          console.warn(`[${config.label}] 페이지 ${page} 예외:`, e);
          return [];
        });
        
      pagePromises.push(fetchPromise);
    }
    
    // 5페이지씩 병렬 완료 대기
    const results = await Promise.all(pagePromises);
    results.forEach((rows, index) => {
      allRows = allRows.concat(rows);
      console.log(`[${config.label}] 페이지 ${i + index}/${totalPages}: ${rows.length}건 유효`);
    });
  }

  // 제외 원인별 집계 로그: 0건 수집일 때 어느 필터가 걸러냈는지 즉시 파악 가능
  const excluded = statNotOperating + statTooOld + statBadDate;
  if (excluded > 0) {
    console.log(`[${config.label}] 필터 제외 ${excluded}건 (폐업·휴업 ${statNotOperating}, 3개월 초과 ${statTooOld}, 날짜 포맷 오류 ${statBadDate})`);
  }
  if (total > 0 && allRows.length / total < 0.1) {
    console.warn(`[${config.label}] 유효 건수가 전체의 10% 미만입니다 (${allRows.length}/${total}건) - API 키 갱신 또는 필터 조건 재검토 필요`);
  }

  return { total, rows: allRows };
}

/** 서울 API 행 데이터를 leads 테이블 형식으로 변환 */
export function mapSeoulRow(row: any, config: SeoulSourceConfig, orgId: string | null) {
  const rawX = parseFloat(row.X);
  const rawY = parseFloat(row.Y);
  let lat: number | null = null;
  let lng: number | null = null;
  let nearest = null;

  if (!isNaN(rawX) && !isNaN(rawY) && rawX > 0 && rawY > 0) {
    const coord = convertGRS80ToWGS84(rawX, rawY);
    if (coord) {
      lat = coord.lat;
      lng = coord.lng;
      nearest = findNearestStation(lat, lng);
    }
  }

  return {
    biz_name: row.BPLCNM || '',
    road_address: row.RDNWHLADDR || row.SITEWHLADDR || '',
    lot_address: row.SITEWHLADDR || '',
    phone: row.SITETEL || '',
    medical_subject: row.UPTAENM || config.service_name,
    service_name: config.service_name,
    service_id: config.serviceCode === 'LOCALDATA_010102' ? '01_01_02_P' :
                config.serviceCode === 'LOCALDATA_010101' ? '01_01_01_P' : undefined,
    category: config.category,
    latitude: lat,
    longitude: lng,
    nearest_station: nearest?.station.name ?? null,
    station_lines: nearest?.station.lines ?? null,
    station_distance: nearest ? Math.round(nearest.distance) : null,
    status: 'NEW',
    operating_status: (row.TRDSTATENM || '').trim() === '영업/정상' ? '영업중' : (row.TRDSTATENM || '영업중'),
    detailed_status: row.DTLSTATENM || null,
    mgt_no: row.MGTNO || null,
    biz_id: row.BRNO || null,
    license_date: row.APVPERMYMD || null,
    last_modified_date: row.LASTMODTS || null,
    ...(orgId ? { organization_id: orgId } : {}),
  };
}

// ============================================================
// 소스별 동기화 오케스트레이터
// ============================================================

export interface SyncSourceResult {
  source: string;
  label: string;
  total: number;
  fetched: number;      // 유효하게 가져온 건수 (폐업 제외 등)
  saved: number;        // 저장 성공 건수
  inserted?: number;    // 신규 추가
  updated?: number;     // 기존 수정
  skipped?: number;     // UNIQUE 충돌 등 건너뜀
  failed?: number;      // 저장 실패
  error?: string;
}

export interface SyncSourceOptions {
  apiKeys?: Record<string, string>;
  sigunNm?: string;
  sync?: boolean;               // false면 DB 저장 없이 fetch만
  scoringConfig?: any;          // 서울 소스 전용: 리드 스코어링 설정
}

/**
 * 단일 소스 동기화 실행 (fetch → map → upsert)
 * - GG 소스: scoringConfig 미적용
 * - Seoul 소스: scoringConfig 적용
 * 실패 시 throw하지 않고 error 필드가 담긴 결과를 반환한다 (자동 동기화 견고성).
 */
async function logSyncSource(supabase: SupabaseClient, organizationId: string | null, sourceKey: string, label: string, result: SyncSourceResult): Promise<void> {
  const { total, fetched, saved, inserted, updated, skipped, failed, error } = result;
  await supabase
    .from('source_sync_logs')
    .upsert({
      organization_id: organizationId,
      source_key: sourceKey,
      source_label: label,
      status: error ? 'error' : 'success',
      total_count: total,
      fetched_count: fetched,
      inserted_count: inserted ?? 0,
      updated_count: updated ?? 0,
      skipped_count: skipped ?? 0,
      failed_count: failed ?? 0,
      error_message: error ?? null,
      started_at: new Date(),
      finished_at: new Date(),
    }, { onConflict: 'organization_id, source_key' });
}

export async function syncSource(
  supabase: SupabaseClient,
  sourceKey: string,
  orgId: string | null,
  opts: SyncSourceOptions = {}
): Promise<SyncSourceResult> {
  const { apiKeys = {}, sigunNm, sync = true, scoringConfig } = opts;

  // ── 경기도 소스 처리 ──
  if (sourceKey in GG_SOURCES) {
    const config = GG_SOURCES[sourceKey as GGSourceKey];
    if (config.disabled) {
      await logSyncSource(supabase, orgId, sourceKey, config.label, { source: sourceKey, label: config.label, total: 0, fetched: 0, saved: 0, error: `비활성: ${config.disabledReason}` });
      return { source: sourceKey, label: config.label, total: 0, fetched: 0, saved: 0, error: `비활성: ${config.disabledReason}` };
    }
    const apiKey = apiKeys[config.envKey] || process.env[config.envKey] || '';
    if (!apiKey) {
      await logSyncSource(supabase, orgId, sourceKey, config.label, { source: sourceKey, label: config.label, total: 0, fetched: 0, saved: 0, error: `API 키 없음 (${config.envKey})` });
      return { source: sourceKey, label: config.label, total: 0, fetched: 0, saved: 0, error: `API 키 없음 (${config.envKey})` };
    }
    try {
      console.log(`[sync-engine] ${config.label} 시작...`);
      const { total, rows } = await fetchGGAllPages(config, apiKey, sigunNm);
      const leads = rows.map(row => mapGGRow(row, config, orgId));
      let saved = 0;
      let inserted = 0, updated = 0, skipped = 0, failed = 0;
      if (sync && leads.length > 0) {
        const result = await upsertLeadsByMgtNo(supabase, leads);
        if (result.error) throw result.error;
        saved = result.savedCount;
        inserted = result.insertedCount;
        updated = result.updatedCount;
        skipped = result.skippedCount;
        failed = result.failedCount;
      } else if (sync) {
        saved = leads.length;
      }
      const syncResult: SyncSourceResult = { source: sourceKey, label: config.label, total, fetched: leads.length, saved, inserted, updated, skipped, failed };
      await logSyncSource(supabase, orgId, sourceKey, config.label, syncResult);
      console.log(`[sync-engine] ${config.label} 완료: ${leads.length}/${total}건 (저장: ${saved}건)`);
      return syncResult;
    } catch (e: any) {
      const syncResult: SyncSourceResult = { source: sourceKey, label: config.label, total: 0, fetched: 0, saved: 0, error: e.message };
      await logSyncSource(supabase, orgId, sourceKey, config.label, syncResult);
      console.error(`[sync-engine] ${config.label} 오류:`, e);
      return { source: sourceKey, label: config.label, total: 0, fetched: 0, saved: 0, error: e.message };
    }
  }

  // ── 서울 소스 처리 ──
  if (sourceKey in SEOUL_SOURCES) {
    const config = SEOUL_SOURCES[sourceKey as SeoulSourceKey];
    const apiKey = apiKeys[config.envKey] ||
      process.env[config.envKey] ||
      process.env.SEOUL_DATA_API_KEY ||
      '';
    if (!apiKey) {
      await logSyncSource(supabase, orgId, sourceKey, config.label, { source: sourceKey, label: config.label, total: 0, fetched: 0, saved: 0, error: `API 키 없음 (${config.envKey})` });
      return { source: sourceKey, label: config.label, total: 0, fetched: 0, saved: 0, error: `API 키 없음 (${config.envKey})` };
    }
    try {
      console.log(`[sync-engine] ${config.label} 시작...`);
      const { total, rows } = await fetchSeoulAllPages(config, apiKey);
      const leads = rows.map(row => mapSeoulRow(row, config, orgId));
      let saved = 0;
      let inserted = 0, updated = 0, skipped = 0, failed = 0;
      if (sync && leads.length > 0) {
        const result = await upsertLeadsByMgtNo(supabase, leads, scoringConfig);
        if (result.error) throw result.error;
        saved = result.savedCount;
        inserted = result.insertedCount;
        updated = result.updatedCount;
        skipped = result.skippedCount;
        failed = result.failedCount;
      } else if (sync) {
        saved = leads.length;
      }
      const syncResult: SyncSourceResult = { source: sourceKey, label: config.label, total, fetched: leads.length, saved, inserted, updated, skipped, failed };
      await logSyncSource(supabase, orgId, sourceKey, config.label, syncResult);
      console.log(`[sync-engine] ${config.label} 완료: ${leads.length}/${total}건 (저장: ${saved}건)`);
      return syncResult;
    } catch (e: any) {
      const syncResult: SyncSourceResult = { source: sourceKey, label: config.label, total: 0, fetched: 0, saved: 0, error: e.message };
      await logSyncSource(supabase, orgId, sourceKey, config.label, syncResult);
      console.error(`[sync-engine] ${config.label} 오류:`, e);
      return { source: sourceKey, label: config.label, total: 0, fetched: 0, saved: 0, error: e.message };
    }
  }

  return { source: sourceKey, label: sourceKey, total: 0, fetched: 0, saved: 0, error: '알 수 없는 소스' };
}

/** 소스 목록 (GET /api/sync-all 응답용) */
export function getSourceList() {
  return [
    ...Object.entries(GG_SOURCES).map(([key, cfg]) => ({
      key,
      label: cfg.label,
      region: '경기도',
      category: cfg.category,
      hasKey: !!process.env[cfg.envKey],
      ...(cfg.disabled ? { disabled: true, disabledReason: cfg.disabledReason } : {}),
    })),
    ...Object.entries(SEOUL_SOURCES).map(([key, cfg]) => ({
      key,
      label: cfg.label,
      region: '서울',
      category: cfg.category,
      hasKey: !!(process.env[cfg.envKey] || process.env.SEOUL_DATA_API_KEY),
    })),
  ];
}

/** 모든 소스 키 (GG 우선순위 + Seoul) */
export function getAllSourceKeys(): string[] {
  return [...Object.keys(GG_SOURCES), ...Object.keys(SEOUL_SOURCES)];
}