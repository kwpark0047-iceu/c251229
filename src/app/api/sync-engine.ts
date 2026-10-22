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

// 본문 수신까지 제한하고 키가 포함될 수 있는 외부 오류 본문/URL은 전달하지 않습니다.
export async function fetchSyncJson(url: string, label: string, deadline = Date.now() + 180_000) {
  const remaining = deadline - Date.now();
  if (remaining <= 0) throw new Error(`[${label}] 수집 제한 시간이 지났습니다. 지역을 좁혀 다시 시도해 주세요.`);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.min(15_000, remaining));
  try {
    const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
    if (!response.ok) throw new Error(`[${label}] 제공기관 응답 오류 (HTTP ${response.status})`);
    let data;
    try { data = await response.json(); }
    catch { throw new Error(`[${label}] 제공기관의 JSON 응답을 읽지 못했습니다.`); }
    if (!data || typeof data !== 'object') throw new Error(`[${label}] 제공기관 응답 형식이 올바르지 않습니다.`);
    const code = data.RESULT?.CODE;
    if (code && !['INFO-000', 'INFO-200'].includes(code)) {
      const safeCode = /^[A-Z]+-\d+$/.test(String(code)) ? code : 'UNKNOWN';
      throw new Error(`[${label}] 제공기관 오류 (${safeCode}). API 키 권한과 서비스 상태를 확인해 주세요.`);
    }
    return data;
  } catch (error) {
    if (controller.signal.aborted) throw new Error(`[${label}] 응답 대기 시간이 초과되었습니다. 잠시 후 다시 시도해 주세요.`);
    if (error instanceof Error && error.message.startsWith(`[${label}]`)) throw error;
    throw new Error(`[${label}] 제공기관에 연결하지 못했습니다.`);
  } finally { clearTimeout(timer); }
}

function resolveGGKey(envKey: string, overrides: Record<string, string> = {}) {
  return overrides[envKey]?.trim() || overrides.GG_API_KEY?.trim() || process.env[envKey]?.trim() || process.env.GG_API_KEY?.trim() || '';
}

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
  supportsSigun?: boolean;
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
    disabled: true,
    disabledReason: '원본 API에 업소명이 없어 정확한 리드 저장 불가 (대체 데이터셋 확인 필요)',
  },
  'gg-univ': {
    endpoint: 'https://openapi.gg.go.kr/Univ',
    dataKey: 'Univ',
    supportsSigun: false,
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
    supportsSigun: false,
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
): Promise<{ total: number; rows: any[]; truncated?: boolean }> {
  const deadline = Date.now() + 180_000;
  async function readPage(page: number) {
    const data = await fetchSyncJson(buildGGUrl(config.endpoint, apiKey, page, pageSize, config.supportsSigun === false ? undefined : sigunNm), config.label, deadline);
    if (data.RESULT?.CODE === 'INFO-200') return { total: 0, rows: [] };
    const entries = data[config.dataKey];
    if (!Array.isArray(entries)) throw new Error(`[${config.label}] 제공기관 응답 형식을 확인해 주세요.`);
    const head = entries.find((item: any) => item.head)?.head;
    const result = head?.find((item: any) => item.RESULT)?.RESULT;
    if (result?.CODE && result.CODE !== 'INFO-000') throw new Error(`[${config.label}] 제공기관 오류 (${/^[A-Z]+-\d+$/.test(String(result.CODE)) ? result.CODE : 'UNKNOWN'})`);
    const rows = entries.find((item: any) => item.row)?.row;
    if (!Array.isArray(rows)) throw new Error(`[${config.label}] 페이지 ${page} 데이터가 누락되었습니다.`);
    return { total: Number(head?.find((item: any) => item.list_total_count !== undefined)?.list_total_count) || 0, rows };
  }
  const first = await readPage(1);
  const totalPages = Math.min(Math.ceil(first.total / pageSize), 20);
  let allRows = first.rows;
  for (let page = 2; page <= totalPages; page++) {
    const next = await readPage(page);
    allRows = allRows.concat(next.rows);
  }
  return { total: first.total, rows: allRows, truncated: first.total > 20 * pageSize };
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
): Promise<{ total: number; rows: any[]; truncated?: boolean }> {
  // 총 건수 파악 (1건)
  const countUrl = `${SEOUL_BASE}/${apiKey}/json/${config.serviceCode}/1/1`;
  const deadline = Date.now() + 180_000;
  const countData = await fetchSyncJson(countUrl, config.label, deadline);
  if (countData.RESULT?.CODE === 'INFO-200') return { total: 0, rows: [] };
  if (!countData[config.serviceCode]) {
    const code = countData.RESULT?.CODE || 'UNKNOWN';
    void code;
    throw new Error(`[${config.label}] 서울 데이터 응답 형식과 서비스 상태를 확인해 주세요.`);
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
      
      const fetchPromise = fetchSyncJson(url, config.label, deadline)
        .then(data => {
          const payload = data[config.serviceCode];
          if (payload?.RESULT?.CODE && payload.RESULT.CODE !== 'INFO-000') throw new Error(`[${config.label}] 페이지 ${page} 조회에 실패했습니다.`);
          const rows = payload?.row;
          if (!Array.isArray(rows)) throw new Error(`[${config.label}] 페이지 ${page} 데이터가 누락되었습니다.`);
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

  return { total, rows: allRows, truncated: total > SEOUL_MAX_PAGES * SEOUL_PAGE_SIZE };
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
  warning?: string;
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
      if (sync) await logSyncSource(supabase, orgId, sourceKey, config.label, { source: sourceKey, label: config.label, total: 0, fetched: 0, saved: 0, error: `비활성: ${config.disabledReason}` });
      return { source: sourceKey, label: config.label, total: 0, fetched: 0, saved: 0, error: `비활성: ${config.disabledReason}` };
    }
    const apiKey = resolveGGKey(config.envKey, apiKeys);
    if (!apiKey) {
      if (sync) await logSyncSource(supabase, orgId, sourceKey, config.label, { source: sourceKey, label: config.label, total: 0, fetched: 0, saved: 0, error: `API 키 없음 (${config.envKey})` });
      return { source: sourceKey, label: config.label, total: 0, fetched: 0, saved: 0, error: `API 키 없음 (${config.envKey})` };
    }
    try {
      console.log(`[sync-engine] ${config.label} 시작...`);
      const { total, rows, truncated } = await fetchGGAllPages(config, apiKey, sigunNm);
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
      const syncResult: SyncSourceResult = { source: sourceKey, label: config.label, total, fetched: leads.length, saved, inserted, updated, skipped, failed, ...(truncated ? { warning: '페이지 제한으로 일부 데이터만 수집했습니다. 지역 범위를 좁혀 확인해 주세요.' } : {}) };
      if (sync) await logSyncSource(supabase, orgId, sourceKey, config.label, syncResult);
      console.log(`[sync-engine] ${config.label} 완료: ${leads.length}/${total}건 (저장: ${saved}건)`);
      return syncResult;
    } catch (e: any) {
      const syncResult: SyncSourceResult = { source: sourceKey, label: config.label, total: 0, fetched: 0, saved: 0, error: e.message };
      if (sync) await logSyncSource(supabase, orgId, sourceKey, config.label, syncResult);
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
      if (sync) await logSyncSource(supabase, orgId, sourceKey, config.label, { source: sourceKey, label: config.label, total: 0, fetched: 0, saved: 0, error: `API 키 없음 (${config.envKey})` });
      return { source: sourceKey, label: config.label, total: 0, fetched: 0, saved: 0, error: `API 키 없음 (${config.envKey})` };
    }
    try {
      console.log(`[sync-engine] ${config.label} 시작...`);
      const { total, rows, truncated } = await fetchSeoulAllPages(config, apiKey);
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
      const syncResult: SyncSourceResult = { source: sourceKey, label: config.label, total, fetched: leads.length, saved, inserted, updated, skipped, failed, ...(truncated ? { warning: '페이지 제한으로 일부 데이터만 수집했습니다. 지역 범위를 좁혀 확인해 주세요.' } : {}) };
      if (sync) await logSyncSource(supabase, orgId, sourceKey, config.label, syncResult);
      console.log(`[sync-engine] ${config.label} 완료: ${leads.length}/${total}건 (저장: ${saved}건)`);
      return syncResult;
    } catch (e: any) {
      const syncResult: SyncSourceResult = { source: sourceKey, label: config.label, total: 0, fetched: 0, saved: 0, error: e.message };
      if (sync) await logSyncSource(supabase, orgId, sourceKey, config.label, syncResult);
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
      hasKey: !!resolveGGKey(cfg.envKey),
      envKey: cfg.envKey,
      ...(cfg.disabled ? { disabled: true, disabledReason: cfg.disabledReason } : {}),
    })),
    ...Object.entries(SEOUL_SOURCES).map(([key, cfg]) => ({
      key,
      label: cfg.label,
      region: '서울',
      category: cfg.category,
      hasKey: !!(process.env[cfg.envKey] || process.env.SEOUL_DATA_API_KEY),
      envKey: cfg.envKey,
    })),
  ];
}

/** 모든 소스 키 (GG 우선순위 + Seoul) */
export function getAllSourceKeys(): string[] {
  return [...Object.keys(GG_SOURCES), ...Object.keys(SEOUL_SOURCES)];
}