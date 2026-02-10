/**
 * 서울 지하철 광고 영업 시스템 - Supabase 서비스
 * 리드 데이터 저장/조회/업데이트
 */

import { getSupabase } from '@/lib/supabase/utils';
import { Lead, LeadStatus, Settings, BusinessCategory } from './types';
import { DEFAULT_SETTINGS } from './constants';
import { getOrganizationId } from './auth-service';
import { createLeadKey } from './lead-utils';
import { removeDuplicateLeads } from './deduplication-utils';
import { isAddressInRegions, RegionCode, getRegionPrefixes } from './region-utils';

/**
 * 리드 저장 결과 타입
 */
export interface SaveLeadsResult {
  success: boolean;
  message: string;
  newCount: number;
  skippedCount: number;
  newLeads: Lead[];
}

/**
 * 리드를 데이터베이스에 저장 (신규 데이터만, 중복 체크)
 * @param leads - 저장할 리드 목록
 * @param onProgress - 진행 상황 콜백
 */
export async function saveLeads(
  leads: Lead[],
  onProgress?: (current: number, total: number, status: string) => void,
  organizationId?: string | null
): Promise<SaveLeadsResult> {
  try {
    const supabase = getSupabase();

    // 조직 ID 가져오기 (전달되지 않은 경우)
    const orgId = organizationId ?? await getOrganizationId();

    onProgress?.(0, leads.length, '기존 데이터 확인 중...');

    // 기존 데이터 조회 (상호명 + 주소로 중복 체크)
    const { data: existingData, error: fetchError } = await supabase
      .from('leads')
      .select('biz_name, road_address, biz_id, service_id, category');

    if (fetchError) {
      const errorMsg = fetchError.message || fetchError.code || '알 수 없는 오류 - 테이블이 존재하는지 확인하세요';
      return { success: false, message: errorMsg, newCount: 0, skippedCount: 0, newLeads: [] };
    }

    // 기존 데이터 키 세트 생성 (상호명 + 주소 조합)
    const existingSet = new Set<string>();
    const existingBizIds = new Set<string>(); // 사업자 ID도 체크
    (existingData || []).forEach(row => {
      const key = createLeadKey(row.biz_name, row.road_address, row.biz_id);
      existingSet.add(key);
      if (row.biz_id) {
        existingBizIds.add(row.biz_id);
      }
    });

    // 신규 데이터만 필터링 (상호명 + 주소 기준 중복 체크)
    const deduplicationResult = removeDuplicateLeads(leads, {
      checkBizId: true,
      checkSimilarity: false // 유사도 체크는 성능상 비활성화
    });

    // DB 중복 필터링 적용
    const realNewLeads: Lead[] = [];
    const dbDuplicates: Lead[] = [];

    deduplicationResult.uniqueLeads.forEach(lead => {
      const key = createLeadKey(lead.bizName, lead.roadAddress, lead.bizId);
      // 키 또는 사업자등록번호로 중복 확인 (기존 데이터와 비교)
      if (existingSet.has(key) || (lead.bizId && existingBizIds.has(lead.bizId))) {
        dbDuplicates.push(lead);
      } else {
        realNewLeads.push(lead);
      }
    });

    const newLeads = realNewLeads;
    const skippedLeads = [...deduplicationResult.duplicates, ...dbDuplicates];

    if (newLeads.length === 0) {
      return {
        success: true,
        message: '신규 데이터가 없습니다.',
        newCount: 0,
        skippedCount: skippedLeads.length,
        newLeads: [],
      };
    }

    // 배치로 저장 (50건씩)
    const BATCH_SIZE = 50;
    let savedCount = 0;

    for (let i = 0; i < newLeads.length; i += BATCH_SIZE) {
      const batch = newLeads.slice(i, i + BATCH_SIZE);

      onProgress?.(savedCount, newLeads.length, `저장 중... (${savedCount}/${newLeads.length})`);

      // Lead 객체를 DB 스키마에 맞게 변환
      const dbLeads = batch.map(lead => ({
        biz_name: lead.bizName,
        biz_id: lead.bizId || null,
        license_date: lead.licenseDate || null,
        road_address: lead.roadAddress || null,
        lot_address: lead.lotAddress || null,
        coord_x: lead.coordX || null,
        coord_y: lead.coordY || null,
        latitude: lead.latitude || null,
        longitude: lead.longitude || null,
        phone: lead.phone || null,
        medical_subject: lead.medicalSubject || null,
        category: lead.category || 'HEALTH',
        service_id: lead.serviceId || null,
        service_name: lead.serviceName || null,
        nearest_station: lead.nearestStation || null,
        station_distance: lead.stationDistance ? Math.round(lead.stationDistance) : null,
        station_lines: lead.stationLines || null,
        status: lead.status || 'NEW',
        notes: lead.notes || null,
        organization_id: orgId,
      }));

      const { error } = await supabase
        .from('leads')
        .insert(dbLeads);

      if (error) {
        // 에러는 상위에서 처리

        // 테이블이 없는 경우 안내 메시지
        if (error.message.includes('relation') || error.code === '42P01') {
          return {
            success: false,
            message: '테이블이 없습니다. Supabase에서 supabase-schema.sql을 실행하세요.',
            newCount: savedCount,
            skippedCount: skippedLeads.length,
            newLeads: newLeads.slice(0, savedCount),
          };
        }

        // UNIQUE 제약조건 위반 시 (중복 데이터) - 개별 삽입 시도
        if (error.code === '23505') {
          // 중복 데이터는 스킵
          for (const dbLead of dbLeads) {
            const { error: singleError } = await supabase
              .from('leads')
              .insert(dbLead);
            if (!singleError) {
              savedCount++;
            }
          }
          continue;
        }
        return {
          success: false,
          message: `저장 오류: ${error.message} (코드: ${error.code || 'unknown'})`,
          newCount: savedCount,
          skippedCount: skippedLeads.length,
          newLeads: newLeads.slice(0, savedCount),
        };
      }

      savedCount += batch.length;
    }

    onProgress?.(newLeads.length, newLeads.length, '저장 완료!');

    return {
      success: true,
      message: `신규 ${newLeads.length}건 저장, 기존 ${skippedLeads.length}건 스킵`,
      newCount: newLeads.length,
      skippedCount: skippedLeads.length,
      newLeads,
    };
  } catch (error) {
    // 에러는 상위에서 처리
    return { success: false, message: (error as Error).message, newCount: 0, skippedCount: 0, newLeads: [] };
  }
}

/**
 * 지역 코드를 주소 접두어로 변환 (다양한 형식 지원)
 * @deprecated region-utils.ts 사용 권장
 */
const REGION_CODE_TO_PREFIX: Record<string, string[]> = {
  '6110000': ['서울특별시', '서울'],
  '6410000': ['경기도', '경기'],
};

/**
 * 주소가 해당 지역에 속하는지 확인
 * @deprecated region-utils.ts 사용 권장
 */
const isAddressInRegion = (address: string, regionCode: string): boolean => {
  const prefixes = REGION_CODE_TO_PREFIX[regionCode];
  if (!prefixes) return false;

  return prefixes.some(prefix => address.includes(prefix));
};

/**
 * 리드 목록 조회
 * @param filters - 필터 조건
 */
export async function getLeads(filters?: {
  status?: LeadStatus;
  category?: BusinessCategory;
  nearestStation?: string;
  startDate?: string;
  endDate?: string;
  regions?: string[];  // 지역 코드 배열 (예: ['6110000', '6410000'])
  searchQuery?: string; // 검색어
  page?: number;       // 페이지 번호 (1부터 시작)
  pageSize?: number;   // 페이지 크기 (기본값: 50)
}): Promise<{ success: boolean; leads: Lead[]; count: number; message?: string }> {
  try {
    const supabase = getSupabase();

    // 페이지네이션 기본값
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .order('license_date', { ascending: false, nullsFirst: false });

    // 필터 적용
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.category && filters.category !== 'ALL') {
      query = query.eq('category', filters.category);
    }
    if (filters?.nearestStation) {
      query = query.eq('nearest_station', filters.nearestStation);
    }
    if (filters?.startDate) {
      query = query.gte('license_date', filters.startDate);
    }
    if (filters?.endDate) {
      query = query.lte('license_date', filters.endDate);
    }

    // 검색어 필터 (서버 사이드)
    if (filters?.searchQuery) {
      const q = filters.searchQuery;
      // 상호명, 주소, 가까운 역, 지번 주소 검색
      // 참고: road_address 등은 null일 수 있으므로 검색 시 주의 필요하지만 ilike는 null 무시
      query = query.or(`biz_name.ilike.%${q}%,road_address.ilike.%${q}%,lot_address.ilike.%${q}%,nearest_station.ilike.%${q}%`);
    }

    // 지역 필터 적용 (서버 사이드)
    if (filters?.regions && filters.regions.length > 0) {
      // 지역 코드에 해당하는 주소 접두어 가져오기
      // 예: '6110000' -> ['서울특별시', '서울']
      const prefixes: string[] = [];
      // region-utils의 getRegionPrefixes 사용

      // region-utils의 getRegionPrefixes 사용
      // filters.regions는 string[]이지만 RegionCode[]로 캐스팅 필요할 수 있음
      const regionPrefixes = getRegionPrefixes(filters.regions as RegionCode[]);

      if (regionPrefixes.length > 0) {
        // OR 조건 생성: road_address.ilike.접두어%
        // lot_address도 체크하고 싶다면 복잡해지지만, 보통 road_address가 메인
        const orConditions = regionPrefixes
          .map(prefix => `road_address.ilike.${prefix}%`)
          .join(',');

        query = query.or(orConditions);
      }
    }

    // 페이지네이션 적용
    const { data, count, error } = await query.range(from, to);

    if (error) {
      console.error('리드 조회 오류:', error);
      return { success: false, leads: [], count: 0, message: error.message };
    }

    // DB 데이터를 Lead 객체로 변환
    let leads: Lead[] = (data || []).map(row => ({
      id: row.id,
      bizName: row.biz_name,
      bizId: row.biz_id,
      licenseDate: row.license_date,
      roadAddress: row.road_address,
      lotAddress: row.lot_address,
      coordX: row.coord_x,
      coordY: row.coord_y,
      latitude: row.latitude,
      longitude: row.longitude,
      phone: row.phone,
      medicalSubject: row.medical_subject,
      category: (row.category as BusinessCategory) || 'HEALTH',
      serviceId: row.service_id,
      serviceName: row.service_name,
      nearestStation: row.nearest_station,
      stationDistance: row.station_distance,
      stationLines: row.station_lines,
      status: row.status as LeadStatus,
      notes: row.notes,
      assignedTo: row.assigned_to,
      assignedToName: row.assigned_to_name,
      assignedAt: row.assigned_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    // 현재 페이지 내 중복 제거 (global 중복 제거는 페이지네이션과 호환되지 않음)
    // 필요 시 removeDuplicateLeads 호출. 여기서는 페이지 내 중복만 제거하거나
    // DB 차원에서 중복이 없다고 가정 (deleteDuplicateLeadsFromDB 사용 권장)
    const { uniqueLeads } = removeDuplicateLeads(leads, {
      checkBizId: true,
      checkSimilarity: false
    });

    return {
      success: true,
      leads: uniqueLeads,
      count: count || 0
    };
  } catch (error) {
    console.error('리드 조회 중 오류:', error);
    return { success: false, leads: [], count: 0, message: (error as Error).message };
  }
}

/**
 * 리드 상태 업데이트
 * @param leadId - 리드 ID
 * @param status - 새 상태
 *
 * CONTACTED(컨택완료) 상태로 변경 시 현재 사용자를 담당자로 자동 지정
 */
export async function updateLeadStatus(
  leadId: string,
  status: LeadStatus
): Promise<{ success: boolean; message: string; assignedToName?: string }> {
  try {
    const supabase = getSupabase();

    // 업데이트할 데이터
    const updateData: {
      status: LeadStatus;
      assigned_to?: string;
      assigned_to_name?: string;
      assigned_at?: string;
    } = { status };

    // 컨택완료 상태로 변경 시 담당자 자동 지정
    if (status === 'CONTACTED') {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        updateData.assigned_to = user.id;
        updateData.assigned_to_name = user.user_metadata?.full_name || user.email || '알 수 없음';
        updateData.assigned_at = new Date().toISOString();
      }
    }

    const { error } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', leadId);

    if (error) {
      console.error('상태 업데이트 오류:', error);
      return { success: false, message: error.message };
    }

    const message = status === 'CONTACTED' && updateData.assigned_to_name
      ? `컨택완료! 담당자: ${updateData.assigned_to_name}`
      : '상태가 업데이트되었습니다.';

    return {
      success: true,
      message,
      assignedToName: updateData.assigned_to_name,
    };
  } catch (error) {
    console.error('상태 업데이트 중 오류:', error);
    return { success: false, message: (error as Error).message };
  }
}

/**
 * 리드 메모 업데이트
 * @param leadId - 리드 ID
 * @param notes - 메모 내용
 */
export async function updateLeadNotes(
  leadId: string,
  notes: string
): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = getSupabase();

    const { error } = await supabase
      .from('leads')
      .update({ notes })
      .eq('id', leadId);

    if (error) {
      console.error('메모 업데이트 오류:', error);
      return { success: false, message: error.message };
    }

    return { success: true, message: '메모가 저장되었습니다.' };
  } catch (error) {
    console.error('메모 업데이트 중 오류:', error);
    return { success: false, message: (error as Error).message };
  }
}

/**
 * 사용자 설정 저장
 * @param settings - 설정 정보
 */
export async function saveSettings(settings: Settings): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = getSupabase();

    // 현재 사용자 ID 가져오기
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id || null;

    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: userId,
        api_key: settings.apiKey,
        cors_proxy: settings.corsProxy,
        search_type: settings.searchType,
        region_code: settings.regionCode,
      }, {
        onConflict: 'user_id',
      });

    if (error) {
      console.error('설정 저장 오류:', error);
      return { success: false, message: error.message };
    }

    return { success: true, message: '설정이 저장되었습니다.' };
  } catch (error) {
    console.error('설정 저장 중 오류:', error);
    return { success: false, message: (error as Error).message };
  }
}

/**
 * 사용자 설정 조회
 */
export async function getSettings(): Promise<{ success: boolean; settings: Settings }> {
  try {
    const supabase = getSupabase();

    // 현재 사용자 ID 가져오기
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    let query = supabase.from('user_settings').select('*');

    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      query = query.is('user_id', null);
    }

    const { data, error } = await query.limit(1).single();

    if (error || !data) {
      // 설정이 없으면 기본값 반환
      return { success: true, settings: DEFAULT_SETTINGS };
    }

    return {
      success: true,
      settings: {
        apiKey: data.api_key || DEFAULT_SETTINGS.apiKey,
        corsProxy: data.cors_proxy || DEFAULT_SETTINGS.corsProxy,
        searchType: data.search_type || DEFAULT_SETTINGS.searchType,
        regionCode: data.region_code || DEFAULT_SETTINGS.regionCode,
      },
    };
  } catch (error) {
    console.error('설정 조회 중 오류:', error);
    return { success: true, settings: DEFAULT_SETTINGS };
  }
}

/**
 * 중복 리드 삭제 (상호명 + 주소 기준)
 * 같은 상호명+주소 조합의 데이터 중 가장 오래된 것만 남기고 삭제
 */
export async function deleteDuplicateLeadsFromDB(): Promise<{
  success: boolean;
  message: string;
  removedCount: number;
}> {
  try {
    const supabase = getSupabase();

    // 모든 리드 조회
    const { data: allLeads, error: fetchError } = await supabase
      .from('leads')
      .select('id, biz_name, road_address, created_at')
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('리드 조회 오류:', fetchError);
      return { success: false, message: fetchError.message, removedCount: 0 };
    }

    if (!allLeads || allLeads.length === 0) {
      return { success: true, message: '리드가 없습니다.', removedCount: 0 };
    }

    // 중복 찾기 (상호명 + 주소 기준, 첫 번째 등록된 것만 유지)
    const seen = new Map<string, string>(); // key -> first id
    const duplicateIds: string[] = [];

    allLeads.forEach(lead => {
      const key = createLeadKey(lead.biz_name, lead.road_address);
      if (seen.has(key)) {
        // 이미 있으면 중복 - 삭제 대상
        duplicateIds.push(lead.id);
      } else {
        // 처음 보는 것 - 유지
        seen.set(key, lead.id);
      }
    });

    if (duplicateIds.length === 0) {
      return { success: true, message: '중복 데이터가 없습니다.', removedCount: 0 };
    }

    // 중복 삭제 진행

    // 배치로 삭제 (100건씩)
    const BATCH_SIZE = 100;
    let removedCount = 0;

    for (let i = 0; i < duplicateIds.length; i += BATCH_SIZE) {
      const batch = duplicateIds.slice(i, i + BATCH_SIZE);

      const { error: deleteError } = await supabase
        .from('leads')
        .delete()
        .in('id', batch);

      if (deleteError) {
        console.error('삭제 오류:', deleteError);
        return {
          success: false,
          message: `삭제 오류: ${deleteError.message}`,
          removedCount,
        };
      }

      removedCount += batch.length;
    }

    return {
      success: true,
      message: `중복 리드 ${removedCount}건 삭제 완료`,
      removedCount,
    };
  } catch (error) {
    console.error('중복 삭제 중 오류:', error);
    return { success: false, message: (error as Error).message, removedCount: 0 };
  }
}

/**
 * 통계 조회
 */
export async function getLeadStats(): Promise<{
  total: number;
  byStatus: Record<LeadStatus, number>;
  byStation: { station: string; count: number }[];
}> {
  try {
    const supabase = getSupabase();

    // 전체 건수
    const { count: total } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });

    // 상태별 건수
    const byStatus: Record<LeadStatus, number> = {
      NEW: 0,
      PROPOSAL_SENT: 0,
      CONTACTED: 0,
      CONTRACTED: 0,
    };

    for (const status of ['NEW', 'PROPOSAL_SENT', 'CONTACTED', 'CONTRACTED'] as LeadStatus[]) {
      const { count } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('status', status);
      byStatus[status] = count || 0;
    }

    // 역별 건수 (상위 10개)
    const { data: stationData } = await supabase
      .from('leads')
      .select('nearest_station')
      .not('nearest_station', 'is', null);

    const stationCounts: Record<string, number> = {};
    (stationData || []).forEach(row => {
      const station = row.nearest_station;
      if (station) {
        stationCounts[station] = (stationCounts[station] || 0) + 1;
      }
    });

    const byStation = Object.entries(stationCounts)
      .map(([station, count]) => ({ station, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      total: total || 0,
      byStatus,
      byStation,
    };
  } catch (error) {
    console.error('통계 조회 중 오류:', error);
    return {
      total: 0,
      byStatus: { NEW: 0, PROPOSAL_SENT: 0, CONTACTED: 0, CONTRACTED: 0 },
      byStation: [],
    };
  }
}
