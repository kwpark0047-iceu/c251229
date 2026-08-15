/**
 * 경기데이터드림 동기화 라우트 공통 핸들러 팩토리
 *
 * - GET: 조회 전용 (로그인 필수, DB 저장 없음)
 * - POST: 동기화 실행 (로그인 + 소속 조직 필수, DB 저장)
 *
 * 기존에는 각 라우트(gg-clinics, gg-hospitals 등)가 동일한 로직을 복제하고
 * GET ?sync=true로 DB를 변경했으나, 인증 부재/CSRF/집계 부정확 문제로 통합함.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { findNearestStation } from '@/app/lead-manager/utils';
import { upsertLeadsByMgtNo, requireSyncAuth, requireUser, getOrgScoringConfig } from './sync-utils';

const PAGE_SIZE = 1000;

export interface GGRouteConfig {
  endpoint: string;         // openapi.gg.go.kr 엔드포인트 URL
  dataKey: string;          // 응답 JSON의 데이터 키 (예: 'AsembyStus')
  envKey: string;           // API 키 환경변수 이름
  label: string;            // 로그 표시명
  mgtPrefix: string;        // mgt_no 접두사
  serviceName: string;      // service_name / medical_subject 값
  category: string;         // 업종 카테고리
  nameFields: string[];     // 사업장명 필드 우선순위
  phoneField: string;       // 전화번호 필드 ('' 이면 없음)
  operatingStatus: string;  // operating_status 기본값
  maxPages: number;         // 최대 페이지 수 (페이지당 1000건)
  supportsSigun: boolean;   // SIGUN_NM 필터 지원 여부
}

function mapRow(row: any, config: GGRouteConfig, orgId: string | null) {
  const lat = parseFloat(row.REFINE_WGS84_LAT);
  const lng = parseFloat(row.REFINE_WGS84_LOGT);
  const nearest = (!isNaN(lat) && !isNaN(lng)) ? findNearestStation(lat, lng) : null;
  const bizName = config.nameFields.map(f => row[f]).find(Boolean) || '';
  const zipOrAddr = row.REFINE_ZIP_CD || row.REFINE_ROADNM_ADDR || '';

  return {
    biz_name: bizName,
    road_address: row.REFINE_ROADNM_ADDR || '',
    lot_address: row.REFINE_LOTNO_ADDR || '',
    phone: config.phoneField ? (row[config.phoneField] || '') : '',
    medical_subject: config.serviceName,
    service_name: config.serviceName,
    category: config.category,
    latitude: isNaN(lat) ? null : lat,
    longitude: isNaN(lng) ? null : lng,
    nearest_station: nearest?.station.name ?? null,
    station_lines: nearest?.station.lines ?? null,
    station_distance: nearest ? Math.round(nearest.distance) : null,
    status: 'NEW',
    operating_status: config.operatingStatus,
    mgt_no: `${config.mgtPrefix}_${bizName}_${zipOrAddr}`.replace(/\s+/g, ''),
    ...(orgId ? { organization_id: orgId } : {}),
  };
}

function buildUrl(config: GGRouteConfig, page: number, size: number, apiKey: string, sigunNm?: string): string {
  const url = new URL(config.endpoint);
  url.searchParams.set('KEY', apiKey);
  url.searchParams.set('Type', 'json');
  url.searchParams.set('pIndex', String(page));
  url.searchParams.set('pSize', String(size));
  if (config.supportsSigun && sigunNm) url.searchParams.set('SIGUN_NM', sigunNm);
  return url.toString();
}

/** 전체 페이지 순회 수집 후 리드 형식으로 매핑 */
async function fetchAllLeads(
  config: GGRouteConfig,
  apiKey: string,
  orgId: string | null,
  sigunNm?: string
): Promise<{ total: number; leads: any[] } | { errorResponse: NextResponse }> {
  const firstRes = await fetch(buildUrl(config, 1, 1, apiKey, sigunNm), { cache: 'no-store' });
  if (!firstRes.ok) throw new Error(`API 응답 오류: ${firstRes.status}`);

  const firstData = await firstRes.json();
  if (!firstData[config.dataKey]) {
    const code = firstData.RESULT?.CODE || 'UNKNOWN';
    const msg = firstData.RESULT?.MESSAGE || '데이터 없음';
    return { errorResponse: NextResponse.json({ success: false, error: `[${code}] ${msg}` }) };
  }

  const headItem = firstData[config.dataKey].find((i: any) => i.head);
  const total = headItem?.head?.find((h: any) => h.list_total_count)?.list_total_count || 0;
  const totalPages = Math.min(Math.ceil(total / PAGE_SIZE), config.maxPages);

  console.log(`[${config.label}] 총 ${total}건, ${totalPages}페이지 처리 시작`);

  let leads: any[] = [];
  for (let page = 1; page <= totalPages; page++) {
    const res = await fetch(buildUrl(config, page, PAGE_SIZE, apiKey, sigunNm), { cache: 'no-store' });
    if (!res.ok) { console.warn(`[${config.label}] 페이지 ${page} 실패`); continue; }
    const data = await res.json();
    const rows = data[config.dataKey]?.find((i: any) => i.row)?.row || [];
    leads = leads.concat(rows.map((r: any) => mapRow(r, config, orgId)));
  }

  return { total, leads };
}

export function createGGSyncHandlers(config: GGRouteConfig) {
  function resolveParams(request: NextRequest) {
    const sp = request.nextUrl.searchParams;
    return {
      sigunNm: sp.get('sigunNm') || undefined,
      apiKey: sp.get('apiKey') || process.env[config.envKey] || '',
      wantsSync: sp.get('sync') === 'true',
    };
  }

  /** GET - 조회 전용. DB를 변경하지 않음 */
  async function GET(request: NextRequest) {
    const supabase = await createClient();
    const authError = await requireUser(supabase);
    if (authError) return authError;

    const { sigunNm, apiKey, wantsSync } = resolveParams(request);
    if (wantsSync) {
      return NextResponse.json(
        { success: false, error: '동기화는 POST 요청으로만 가능합니다.' },
        { status: 405 }
      );
    }
    if (!apiKey) {
      return NextResponse.json({ success: false, error: `${config.envKey} 환경변수가 설정되지 않았습니다.` }, { status: 500 });
    }

    try {
      const fetched = await fetchAllLeads(config, apiKey, null, sigunNm);
      if ('errorResponse' in fetched) return fetched.errorResponse;
      return NextResponse.json({
        success: true,
        totalCount: fetched.total,
        fetchedCount: fetched.leads.length,
        savedCount: 0,
      });
    } catch (error) {
      console.error(`[${config.label}] 오류:`, error);
      return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
    }
  }

  /** POST - 동기화 실행 (수집 + DB 저장) */
  async function POST(request: NextRequest) {
    const supabase = await createClient();
    const auth = await requireSyncAuth(supabase);
    if (auth.errorResponse) return auth.errorResponse;

    const { sigunNm, apiKey } = resolveParams(request);
    if (!apiKey) {
      return NextResponse.json({ success: false, error: `${config.envKey} 환경변수가 설정되지 않았습니다.` }, { status: 500 });
    }

    try {
      const fetched = await fetchAllLeads(config, apiKey, auth.orgId, sigunNm);
      if ('errorResponse' in fetched) return fetched.errorResponse;

      const { total, leads } = fetched;
      const scoringConfig = await getOrgScoringConfig(supabase, auth.orgId);
      const upsert = leads.length > 0
        ? await upsertLeadsByMgtNo(supabase, leads, scoringConfig)
        : { savedCount: 0, insertedCount: 0, updatedCount: 0, skippedCount: 0, failedCount: 0, error: null };

      console.log(
        `[${config.label}] 저장 완료: 신규 ${upsert.insertedCount} / 갱신 ${upsert.updatedCount} / 중복 ${upsert.skippedCount} / 실패 ${upsert.failedCount}`
      );

      return NextResponse.json({
        success: !upsert.error,
        totalCount: total,
        fetchedCount: leads.length,
        savedCount: upsert.savedCount,
        insertedCount: upsert.insertedCount,
        updatedCount: upsert.updatedCount,
        skippedCount: upsert.skippedCount,
        failedCount: upsert.failedCount,
        error: upsert.error?.message || undefined,
      });
    } catch (error) {
      console.error(`[${config.label}] 오류:`, error);
      return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
    }
  }

  return { GET, POST };
}
