import { SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { geocodeAddress } from '@/lib/geocoding';
import { findNearestStation } from '@/app/lead-manager/utils';
import { calculateLeadScore } from '@/lib/lead-scoring';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** 현재 로그인 사용자의 organization_id를 조회 */
export async function getOrgId(supabase: SupabaseClient): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) return null;
  const { data: member } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();
  return member?.organization_id || null;
}

/**
 * 조회 전용 라우트 공통 가드: 로그인 필수
 * 미인증이면 401 응답을 반환하고, 인증되면 null을 반환합니다.
 */
export async function requireUser(supabase: SupabaseClient): Promise<NextResponse | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 });
  }
  return null;
}

/**
 * 동기화(쓰기) 라우트 공통 가드: 로그인 + 소속 조직 필수
 * 실패 시 errorResponse에 401/403 응답이 담깁니다.
 */
export async function requireSyncAuth(
  supabase: SupabaseClient
): Promise<{ orgId: string; errorResponse: null } | { orgId: null; errorResponse: NextResponse }> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) {
    return {
      orgId: null,
      errorResponse: NextResponse.json({ success: false, error: '로그인이 필요합니다.' }, { status: 401 }),
    };
  }
  const { data: member } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();
  if (!member?.organization_id) {
    return {
      orgId: null,
      errorResponse: NextResponse.json(
        { success: false, error: '소속 조직이 없습니다. 관리자에게 문의하세요.' },
        { status: 403 }
      ),
    };
  }
  return { orgId: member.organization_id, errorResponse: null };
}

/** upsertLeadsByMgtNo 실행 결과 집계 */
export interface UpsertLeadsResult {
  savedCount: number;      // inserted + updated
  insertedCount: number;
  updatedCount: number;
  skippedCount: number;    // UNIQUE 충돌(23505)로 건너뛴 건수
  failedCount: number;     // 그 외 오류로 실패한 건수
  error: { message: string } | null;
}

const SELECT_BATCH = 500;  // .in() 조회 분할 크기 (URL 길이 제한 방지)
const WRITE_BATCH = 25;    // 동시 쓰기 요청 수 제한

/**
 * mgt_no (관리번호)를 기준으로 리드 데이터를 수동 병합(Upsert)하는 유틸리티
 *
 * Supabase의 .upsert()는 테이블에 명시적인 UNIQUE 제약조건이 필요합니다.
 * leads 테이블은 mgt_no 대신 (biz_name_normalized, road_address_normalized, organization_id)의
 * UNIQUE INDEX를 사용하므로, mgt_no로 .upsert() 호출 시 제약조건 예외가 발생합니다.
 * 이를 우회하여 기존 데이터를 조회 후 개별 update/insert 처리합니다.
 *
 * Supabase 쿼리는 실패해도 reject되지 않고 { error }를 반환하므로
 * 각 결과를 직접 검사하여 실제 성공/중복/실패 건수를 집계합니다.
 */
export async function upsertLeadsByMgtNo(supabase: SupabaseClient, leads: any[]): Promise<UpsertLeadsResult> {
  const result: UpsertLeadsResult = {
    savedCount: 0, insertedCount: 0, updatedCount: 0, skippedCount: 0, failedCount: 0, error: null,
  };
  if (!leads || leads.length === 0) return result;

  const mgtNos = leads.map(l => l.mgt_no).filter(Boolean);

  try {
    // 1. 기존 mgt_no 데이터 조회 (배치 분할)
    const existingMap = new Map<string, string>();
    for (let i = 0; i < mgtNos.length; i += SELECT_BATCH) {
      const chunk = mgtNos.slice(i, i + SELECT_BATCH);
      const { data, error } = await supabase
        .from('leads')
        .select('id, mgt_no')
        .in('mgt_no', chunk);
      if (error) throw error;
      data?.forEach(e => existingMap.set(e.mgt_no, e.id));
    }

    // 2. Insert 및 Update 분리
    const toInsert: any[] = [];
    const toUpdate: { id: string; data: any }[] = [];

    for (const lead of leads) {
      // 2-1. 지오코딩 펄백 (위경도가 없지만 주소가 있는 경우)
      if (!lead.latitude && lead.road_address) {
        const geo = await geocodeAddress(lead.road_address);
        if (geo) {
          lead.latitude = geo.lat;
          lead.longitude = geo.lng;
          
          // 지오코딩 성공 시 가장 가까운 역 다시 계산
          const nearest = findNearestStation(geo.lat, geo.lng);
          if (nearest) {
            lead.nearest_station = nearest.station.name;
            lead.station_lines = nearest.station.lines;
            lead.station_distance = Math.round(nearest.distance);
          }
          await delay(100); // 카카오 API Rate Limit 보호
        }
      }

      // 2-2. 리드 스코어링 산출
      const scoringResult = calculateLeadScore({
        distance: lead.station_distance,
        category: lead.category,
        phone: lead.phone,
        address: lead.road_address || lead.lot_address,
        bizName: lead.biz_name,
      });
      // DB에 lead_score, lead_grade 컬럼이 존재하지 않아 에러 방지(경기도 동기화 이슈와 동일)
      // lead.lead_score = scoringResult.score;
      // lead.lead_grade = scoringResult.grade;

      const existingId = lead.mgt_no ? existingMap.get(lead.mgt_no) : undefined;
      if (existingId) {
        // 기존 데이터 업데이트 (status는 변경하지 않음 - 영업 진행 상태 유지)
        const { status: _status, ...updateData } = lead;
        toUpdate.push({ id: existingId, data: updateData });
      } else {
        toInsert.push(lead);
      }
    }

    // 3. 배치 업데이트 실행
    for (let i = 0; i < toUpdate.length; i += WRITE_BATCH) {
      const results = await Promise.all(
        toUpdate.slice(i, i + WRITE_BATCH).map(u => supabase.from('leads').update(u.data).eq('id', u.id))
      );
      for (const r of results) {
        if (r.error) result.failedCount++;
        else result.updatedCount++;
      }
    }

    // 4. 대량(Bulk) Insert 실행
    // 500건씩 묶어서 한 번에 insert 시도
    const BULK_INSERT_BATCH = 500;
    for (let i = 0; i < toInsert.length; i += BULK_INSERT_BATCH) {
      const chunk = toInsert.slice(i, i + BULK_INSERT_BATCH);
      const { error } = await supabase.from('leads').insert(chunk);
      
      if (!error) {
        result.insertedCount += chunk.length;
      } else {
        // Bulk Insert 실패 시 (예: UNIQUE 제약조건 충돌 등), 단건 인서트로 Fallback 처리
        console.warn(`[sync-utils] Bulk Insert 실패, 단건 처리로 Fallback 진행 (${chunk.length}건) - ${error.message}`);
        
        for (let j = 0; j < chunk.length; j += WRITE_BATCH) {
          const fallbackChunk = chunk.slice(j, j + WRITE_BATCH);
          const results = await Promise.all(
            fallbackChunk.map(lead => supabase.from('leads').insert(lead))
          );
          
          for (const r of results) {
            if (!r.error) result.insertedCount++;
            else if (r.error.code === '23505') result.skippedCount++;
            else result.failedCount++;
          }
        }
      }
    }

    result.savedCount = result.insertedCount + result.updatedCount;
    return result;
  } catch (err: any) {
    result.error = err;
    return result;
  }
}
