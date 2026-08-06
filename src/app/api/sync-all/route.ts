/**
 * 통합 데이터 동기화 API
 * 경기도 공공 API + 서울 열린광장 API를 한 번에 처리하여 Supabase DB에 저장
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { findNearestStation, convertGRS80ToWGS84 } from '@/app/lead-manager/utils';
import { upsertLeadsByMgtNo, getOrgId, requireSyncAuth } from '@/app/api/sync-utils';

export const dynamic = 'force-dynamic';
// 대량 데이터 처리를 위해 타임아웃 연장 (Vercel 기본 10초 → 60초)
export const maxDuration = 60;

// ============================================================
// 경기도 API 소스 설정 정의
// ============================================================

type GGSourceKey = 'gg-clinics' | 'gg-hospitals' | 'gg-restaurants' | 'gg-univ' | 'gg-jncl-univ';

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
    endpoint: 'https://openapi.gg.go.kr/Genrestrtjpnfood',
    dataKey: 'Genrestrtjpnfood',
    category: 'FOOD',
    service_name: '음식점',
    nameField: 'BIZPLC_NM',
    phoneField: '',
    envKey: 'GG_REST_API_KEY',
    label: '경기도 음식점',
    mgtPrefix: 'GG_REST',
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

async function fetchGGAllPages(
  config: GGSourceConfig,
  apiKey: string,
  sigunNm?: string,
  pageSize: number = 1000
): Promise<{ total: number; rows: any[] }> {
  // 1페이지로 총 건수 파악
  const firstUrl = buildGGUrl(config.endpoint, apiKey, 1, pageSize, sigunNm);
  const firstRes = await fetch(firstUrl, { cache: 'no-store' });
  if (!firstRes.ok) throw new Error(`[${config.label}] API 응답 오류: ${firstRes.status}`);

  const firstData = await firstRes.json();
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
function mapGGRow(row: any, config: GGSourceConfig, orgId: string | null) {
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

async function fetchSeoulAllPages(
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
          // 폐업 제외
          return rows.filter((r: any) => !(r.DTLSTATENM || '').includes('폐업'));
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

  return { total, rows: allRows };
}

/** 서울 API 행 데이터를 leads 테이블 형식으로 변환 */
function mapSeoulRow(row: any, config: SeoulSourceConfig, orgId: string | null) {
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
    operating_status: row.TRDSTATENM || '영업중',
    detailed_status: row.DTLSTATENM || null,
    mgt_no: row.MGTNO || null,
    biz_id: row.BRNO || null,
    license_date: row.APVPERMYMD || null,
    ...(orgId ? { organization_id: orgId } : {}),
  };
}

// ============================================================
// POST 핸들러 - 통합 동기화 실행
// ============================================================

export interface SyncSourceResult {
  source: string;
  label: string;
  total: number;
  fetched: number;
  saved: number;
  error?: string;
}

export async function POST(request: NextRequest) {
  // ── 인증 + 소속 조직 확인 (공통 가드) ───────────────────────
  const supabase = await createClient();
  const auth = await requireSyncAuth(supabase);
  if (auth.errorResponse) {
    return auth.errorResponse;
  }

  // ── 권한 확인: owner 또는 admin만 동기화 가능 ──────────────
  const orgId = auth.orgId;
  if (!['owner', 'admin'].includes(auth.role ?? '')) {
    return NextResponse.json({ error: '동기화 권한이 없습니다. owner 또는 admin만 가능합니다.' }, { status: 403 });
  }

  const body = await request.json();
  const {
    sources = ['all'],   // 'all' 또는 소스 키 배열
    apiKeys = {},        // { 'GG_CLINIC_API_KEY': '...', ... }
    sigunNm,             // 경기도 시군구 필터
    sync = true,         // DB 저장 여부
  } = body;

  // 처리할 소스 결정
  const allGGKeys = Object.keys(GG_SOURCES) as GGSourceKey[];
  const allSeoulKeys = Object.keys(SEOUL_SOURCES) as SeoulSourceKey[];
  const allSources = [...allGGKeys, ...allSeoulKeys];

  const targetSources: string[] = sources.includes('all') ? allSources : sources;

  const results: SyncSourceResult[] = [];

  for (const sourceKey of targetSources) {
    // ── 경기도 소스 처리 ──
    if (sourceKey in GG_SOURCES) {
      const config = GG_SOURCES[sourceKey as GGSourceKey];
      const apiKey = apiKeys[config.envKey] || process.env[config.envKey] || '';
      if (!apiKey) {
        results.push({ source: sourceKey, label: config.label, total: 0, fetched: 0, saved: 0, error: `API 키 없음 (${config.envKey})` });
        continue;
      }
      try {
        console.log(`[sync-all] ${config.label} 시작...`);
        const { total, rows } = await fetchGGAllPages(config, apiKey, sigunNm);
        const leads = rows.map(row => mapGGRow(row, config, orgId));
        let saved = 0;
        if (sync && leads.length > 0) {
          const { error } = await upsertLeadsByMgtNo(supabase, leads);
          if (error) throw error;
          saved = leads.length;
        }
        console.log(`[sync-all] ${config.label} 완료: ${leads.length}/${total}건 (저장: ${saved}건)`);
        results.push({ source: sourceKey, label: config.label, total, fetched: leads.length, saved });
      } catch (e: any) {
        console.error(`[sync-all] ${config.label} 오류:`, e);
        results.push({ source: sourceKey, label: config.label, total: 0, fetched: 0, saved: 0, error: e.message });
      }
      continue;
    }

    // ── 서울 소스 처리 ──
    if (sourceKey in SEOUL_SOURCES) {
      const config = SEOUL_SOURCES[sourceKey as SeoulSourceKey];
      const apiKey = apiKeys[config.envKey] ||
        process.env[config.envKey] ||
        process.env.SEOUL_DATA_API_KEY ||
        '';
      if (!apiKey) {
        results.push({ source: sourceKey, label: config.label, total: 0, fetched: 0, saved: 0, error: `API 키 없음 (${config.envKey})` });
        continue;
      }
      try {
        console.log(`[sync-all] ${config.label} 시작...`);
        const { total, rows } = await fetchSeoulAllPages(config, apiKey);
        const leads = rows.map(row => mapSeoulRow(row, config, orgId));
        let saved = 0;
        if (sync && leads.length > 0) {
          const { error } = await upsertLeadsByMgtNo(supabase, leads);
          if (error) throw error;
          saved = leads.length;
        }
        console.log(`[sync-all] ${config.label} 완료: ${leads.length}/${total}건 (저장: ${saved}건)`);
        results.push({ source: sourceKey, label: config.label, total, fetched: leads.length, saved });
      } catch (e: any) {
        console.error(`[sync-all] ${config.label} 오류:`, e);
        results.push({ source: sourceKey, label: config.label, total: 0, fetched: 0, saved: 0, error: e.message });
      }
      continue;
    }

    results.push({ source: sourceKey, label: sourceKey, total: 0, fetched: 0, saved: 0, error: '알 수 없는 소스' });
  }

  const totalSaved = results.reduce((sum, r) => sum + r.saved, 0);
  const hasError = results.some(r => r.error);

  return NextResponse.json({
    success: !hasError || totalSaved > 0,
    results,
    totalSaved,
  });
}

// GET - 사용 가능한 소스 목록 반환
export async function GET() {
  const sources = [
    ...Object.entries(GG_SOURCES).map(([key, cfg]) => ({
      key,
      label: cfg.label,
      region: '경기도',
      category: cfg.category,
      hasKey: !!process.env[cfg.envKey],
    })),
    ...Object.entries(SEOUL_SOURCES).map(([key, cfg]) => ({
      key,
      label: cfg.label,
      region: '서울',
      category: cfg.category,
      hasKey: !!(process.env[cfg.envKey] || process.env.SEOUL_DATA_API_KEY),
    })),
  ];
  return NextResponse.json({ sources });
}
