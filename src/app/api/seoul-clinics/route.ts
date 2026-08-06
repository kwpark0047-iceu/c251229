/** API Route - 서울 의원 인허가 데이터 동기화 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { findNearestStation, convertGRS80ToWGS84 } from '@/app/lead-manager/utils';
import { upsertLeadsByMgtNo } from '@/app/api/sync-utils';

const API_ENDPOINT = 'http://openapi.seoul.go.kr:8088';
const PAGE_SIZE = 1000;
const MAX_PAGES = 100; // 최대 100,000건으로 상향

export const dynamic = 'force-dynamic';
// 대량 데이터 처리를 위해 타임아웃 연장 (Vercel 기본 10초 → 60초)
export const maxDuration = 60;

function parseRows(rows: any[]) {
  return rows
    .filter((row: any) => row.BPLCNM && !(row.DTLSTATENM || '').includes('폐업'))
    .map((row: any) => {
      const rawX = parseFloat(row.X);
      const rawY = parseFloat(row.Y);

      let lat = null;
      let lng = null;
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
        biz_name: row.BPLCNM,
        road_address: row.RDNWHLADDR || row.SITEWHLADDR || '',
        lot_address: row.SITEWHLADDR || '',
        phone: row.SITETEL || '',
        medical_subject: row.UPTAENM || '의원',
        service_name: '의원',
        service_id: '01_01_02_P',
        category: 'HEALTH',
        latitude: lat,
        longitude: lng,
        nearest_station: nearest ? nearest.station.name : null,
        station_lines: nearest ? nearest.station.lines : null,
        station_distance: nearest ? Math.round(nearest.distance) : null,
        status: 'NEW',
        operating_status: row.TRDSTATENM || '영업중',
        detailed_status: row.DTLSTATENM || null,
        mgt_no: row.MGTNO || null,
        biz_id: row.BRNO || null,
        license_date: row.APVPERMYMD || null,
      };
    });
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const sync = searchParams.get('sync') === 'true';

  // [수정 1] 대시보드에서 주입한 apiKey 쿼리 파라미터 읽기 (기존에는 무시됨)
  const apiKey =
    searchParams.get('apiKey') ||
    process.env.SEOUL_DATA_CLINIC_API_KEY ||
    process.env.SEOUL_DATA_API_KEY ||
    '';

  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: '서울 데이터 API 키가 설정되지 않았습니다. .env.local을 확인하세요.' },
      { status: 500 }
    );
  }

  try {
    // [수정 2] 전체 페이지 순회 (기존에는 1페이지 100건만 가져옴)
    let allLeads: any[] = [];
    let totalCount = 0;

    // 첫 1건으로 총 건수 파악
    const firstUrl = `${API_ENDPOINT}/${apiKey}/json/LOCALDATA_010102/1/1`;
    console.log(`[Seoul Clinic API] 총 건수 확인 중...`);

    const firstRes = await fetch(firstUrl, { cache: 'no-store' });
    if (!firstRes.ok) throw new Error(`API 응답 오류: ${firstRes.status}`);
    const firstData = await firstRes.json();

    if (!firstData.LOCALDATA_010102) {
      const code = firstData.RESULT?.CODE || 'UNKNOWN';
      const msg = firstData.RESULT?.MESSAGE || '데이터를 가져올 수 없습니다.';
      console.error(`[Seoul Clinic API] API 오류: [${code}] ${msg}`);
      return NextResponse.json({ success: false, error: `[${code}] ${msg}` });
    }

    totalCount = parseInt(firstData.LOCALDATA_010102.list_total_count) || 0;
    const totalPages = Math.min(Math.ceil(totalCount / PAGE_SIZE), MAX_PAGES);

    console.log(`[Seoul Clinic API] 총 ${totalCount}건, ${totalPages}페이지 동기화 시작`);

    // 병렬 페이지 순회 (5페이지씩 묶어서 처리)
    const CHUNK_SIZE = 5;
    for (let i = 1; i <= totalPages; i += CHUNK_SIZE) {
      const pagePromises = [];
      for (let j = 0; j < CHUNK_SIZE && i + j <= totalPages; j++) {
        const page = i + j;
        const startIndex = (page - 1) * PAGE_SIZE + 1;
        const endIndex = page * PAGE_SIZE;
        const url = `${API_ENDPOINT}/${apiKey}/json/LOCALDATA_010102/${startIndex}/${endIndex}`;

        const fetchPromise = fetch(url, { cache: 'no-store' })
          .then(async res => {
            if (!res.ok) {
              console.error(`[Seoul Clinic API] 페이지 ${page} 실패: ${res.status}`);
              return [];
            }
            const data = await res.json();
            const rows = data.LOCALDATA_010102?.row || [];
            return parseRows(rows);
          })
          .catch(err => {
            console.error(`[Seoul Clinic API] 페이지 ${page} 오류:`, err);
            return [];
          });
        pagePromises.push(fetchPromise);
      }
      
      const results = await Promise.all(pagePromises);
      results.forEach((parsed, index) => {
        allLeads = allLeads.concat(parsed);
        console.log(`[Seoul Clinic API] 페이지 ${i + index}/${totalPages} 완료 (${parsed.length}건 유효)`);
      });
    }

    // [수정 3] organization_id 포함하여 Supabase에 저장 (기존에는 누락되어 RLS로 안 보임)
    let savedCount = 0;
    let errorMsg: string | null = null;

    if (sync && allLeads.length > 0) {
      const supabase = await createClient();

      // 현재 로그인 사용자의 organization_id 조회
      const { data: { user } } = await supabase.auth.getUser();
      let orgId: string | null = null;

      if (user?.id) {
        const { data: member } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', user.id)
          .single();
        orgId = member?.organization_id || null;
      }

      console.log(`[Seoul Clinic API] organization_id: ${orgId}, 저장 시작 (${allLeads.length}건)`);

      // organization_id 주입
      const dbLeads = allLeads.map((lead) => ({
        ...lead,
        ...(orgId ? { organization_id: orgId } : {}),
      }));

      const { error: dbError } = await upsertLeadsByMgtNo(supabase, dbLeads);

      if (dbError) {
        console.error('[Seoul Clinic API] DB 저장 오류:', dbError);
        errorMsg = dbError.message;
      } else {
        savedCount = dbLeads.length;
        console.log(`[Seoul Clinic API] DB 저장 완료: ${savedCount}건`);
      }
    }

    return NextResponse.json({
      success: !errorMsg,
      totalCount,
      fetchedCount: allLeads.length,
      savedCount: sync ? savedCount : 0,
      error: errorMsg || undefined,
      leads: allLeads,
    });

  } catch (error) {
    console.error('[Seoul Clinic API] 오류:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
