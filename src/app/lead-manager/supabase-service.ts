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
import { RegionCode, getRegionPrefixes } from './region-utils';
import { ActivityService } from './activity-service';
import { chunkArray } from '@/lib/utils/array-utils';

interface SaveLeadsResult {
  success: boolean;
  message: string;
  newCount: number;
  skippedCount: number;
  newLeads: Lead[];
}

/**
 * 관리번호(MGTNO) 목록을 기준으로 이미 존재하는 리드의 관리번호 목록을 반환
 */
export async function checkExistingLeadsByMgtNo(
  mgtNos: string[],
  organizationId: string | null
): Promise<Set<string>> {
  if (mgtNos.length === 0) return new Set();
  
  const supabase = getSupabase();
  const existing = new Set<string>();

  for (const chunk of chunkArray([...new Set(mgtNos)], 500)) {
    let query = supabase
      .from('leads')
      .select('mgt_no')
      .in('mgt_no', chunk);

    if (organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('[Supabase] checkExistingLeadsByMgtNo Error:', error);
      continue;
    }

    (data || []).forEach((item: { mgt_no: string }) => {
      if (item.mgt_no) existing.add(item.mgt_no);
    });
  }

  return existing;
}

/**
 * 리드를 데이터베이스에 저장 (신규 데이터만, 중복 체크)
 */
export async function saveLeads(
  leads: Lead[],
  onProgress?: (current: number, total: number, status: string) => void,
  organizationId?: string | null
): Promise<SaveLeadsResult> {
  try {
    const supabase = getSupabase();

    // 제외 키워드 정의
    const excludeKeywords = [
      '약국', '편의점', '세븐일레븐', '씨유', '지에스', 'GS25', 'CU', '7-ELEVEN',
      '이마트', '안경', '콘택트', '안경원', '다이소', '올리브영', '롭스', '랄라블라'
    ];

    // 조직 ID 가져오기
    const orgId = organizationId ?? await getOrganizationId();
    
    console.log('[saveLeads] Starting save process:', {
      leadCount: leads.length,
      orgId
    });

    // 0. 비타겟 업종 필터링 (HEALTH 카테고리에만 적용)
    const filteredLeads = leads.filter(lead => {
      if (lead.category !== 'HEALTH') return true;
      const bizName = (lead.bizName || '').replace(/\s+/g, '');
      const subject = (lead.medicalSubject || '').replace(/\s+/g, '');
      const isExcluded = excludeKeywords.some(keyword => {
        const k = keyword.replace(/\s+/g, '');
        return bizName.includes(k) || subject.includes(k);
      });
      return !isExcluded;
    });

    onProgress?.(0, filteredLeads.length, '기존 데이터 확인 중...');

    // 1. 관리번호(MGTNO) 기반 중복 체크
    const mgtNos = filteredLeads.map(l => l.mgtNo).filter((no): no is string => !!no);
    const existingMgtNoSet = await checkExistingLeadsByMgtNo(mgtNos, orgId);

    // 2. 관리번호가 없는 리드용 상호명/주소 기반 중복 체크
    const leadsWithoutMgtNo = filteredLeads.filter(l => !l.mgtNo || !existingMgtNoSet.has(l.mgtNo));
    
    let existingKeySet = new Set<string>();
    let existingBizIdSet = new Set<string>();

    if (leadsWithoutMgtNo.length > 0) {
      const bizNames = [...new Set(leadsWithoutMgtNo.map(l => l.bizName))];
      for (const bizNameChunk of chunkArray(bizNames, 500)) {
        let existingQuery = supabase
          .from('leads')
          .select('biz_name, road_address, biz_id')
          .in('biz_name', bizNameChunk);

        if (orgId) {
          existingQuery = existingQuery.eq('organization_id', orgId);
        }

        const { data: existingData } = await existingQuery;

        (existingData || []).forEach((row: any) => {
          existingKeySet.add(createLeadKey(row.biz_name, row.road_address, row.biz_id));
          if (row.biz_id) existingBizIdSet.add(row.biz_id);
        });
      }
    }

    // 신규 데이터만 필터링
    const realNewLeads: Lead[] = [];
    const dbDuplicates: Lead[] = [];
    const seenMgtNos = new Set<string>();
    const seenKeys = new Set<string>();
    const seenBizIds = new Set<string>();

    filteredLeads.forEach(lead => {
      if (lead.mgtNo && existingMgtNoSet.has(lead.mgtNo)) {
        dbDuplicates.push(lead);
        return;
      }

      const key = createLeadKey(lead.bizName, lead.roadAddress, lead.bizId);
      const isDuplicateInDb = existingKeySet.has(key) || (lead.bizId && existingBizIdSet.has(lead.bizId));
      const isDuplicateInImport =
        (!!lead.mgtNo && seenMgtNos.has(lead.mgtNo)) ||
        seenKeys.has(key) ||
        (!!lead.bizId && seenBizIds.has(lead.bizId));

      if (isDuplicateInDb || isDuplicateInImport) {
        dbDuplicates.push(lead);
      } else {
        realNewLeads.push(lead);
        if (lead.mgtNo) seenMgtNos.add(lead.mgtNo);
        seenKeys.add(key);
        if (lead.bizId) seenBizIds.add(lead.bizId);
      }
    });

    const deduplicationResult = removeDuplicateLeads(realNewLeads, {
      checkBizId: true,
      checkSimilarity: false
    });

    const newLeads = deduplicationResult.uniqueLeads;
    const skippedLeads = [...dbDuplicates, ...deduplicationResult.duplicates];

    if (newLeads.length === 0) {
      return {
        success: true,
        message: '신규 데이터가 없습니다.',
        newCount: 0,
        skippedCount: skippedLeads.length,
        newLeads: [],
      };
    }

    // 한 번에 저장할 배치 크기를 늘려 DB 호출(왕복) 횟수를 대폭 줄임
    const BATCH_SIZE = 200;
    let savedCount = 0;

    for (let i = 0; i < newLeads.length; i += BATCH_SIZE) {
      const batch = newLeads.slice(i, i + BATCH_SIZE);

      onProgress?.(savedCount, newLeads.length, `저장 중... (${savedCount}/${newLeads.length})`);

      const dbLeads = batch.map(lead => ({
        biz_name: lead.bizName,
        biz_id: lead.bizId || null,
        license_date: lead.licenseDate || null,
        last_modified_date: lead.lastModifiedDate || null,
        road_address: lead.roadAddress || null,
        lot_address: lead.lotAddress || null,
        coord_x: lead.coordX || null,
        coord_y: lead.coordY || null,
        latitude: lead.latitude || null,
        longitude: lead.longitude || null,
        phone: lead.phone || null,
        medical_subject: lead.medicalSubject || null,
        mgt_no: lead.mgtNo || null,
        operating_status: lead.operatingStatus || null,
        detailed_status: lead.detailedStatus || null,
        category: lead.category || 'OTHER',
        service_id: lead.serviceId || null,
        service_name: lead.serviceName || null,
        nearest_station: lead.nearestStation || null,
        station_distance: lead.stationDistance ? Math.round(lead.stationDistance) : null,
        station_lines: lead.stationLines || null,
        nearest_exit_no: lead.nearestExitNo || null,
        status: lead.status || 'NEW',
        notes: lead.notes || null,
        organization_id: orgId,
      }));

      const { error } = await supabase
        .from('leads')
        .insert(dbLeads);

      if (error) {
        if (error.message.includes('relation') || error.code === '42P01') {
          return {
            success: false,
            message: '테이블이 없습니다. Supabase에서 supabase-schema.sql을 실행하세요',
            newCount: savedCount,
            skippedCount: skippedLeads.length,
            newLeads: newLeads.slice(0, savedCount),
          };
        }

        if (error.code === '23505') {
          console.warn(`[Supabase] 중복 키 에러(23505) 발생. ${dbLeads.length}건 배치에 대해 개별 삽입 시도...`);
          for (const dbLead of dbLeads) {
            const { error: singleError } = await supabase
              .from('leads')
              .insert(dbLead);
            if (!singleError) {
              savedCount++;
            } else if (singleError.code !== '23505') {
               console.error(`[Supabase] 개별 삽입 에러:`, singleError);
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
    ActivityService.trackLeadImport(newLeads.length, leads[0]?.category || 'OTHER');

    return {
      success: true,
      message: `신규 ${newLeads.length}건 저장, 기존 ${skippedLeads.length}건 스킵`,
      newCount: newLeads.length,
      skippedCount: skippedLeads.length,
      newLeads,
    };
  } catch (error) {
    return { success: false, message: (error as Error).message, newCount: 0, skippedCount: 0, newLeads: [] };
  }
}

/**
 * 리드 목록 조회
 */
export async function getLeads(filters?: {
  status?: LeadStatus;
  category?: BusinessCategory;
  nearestStation?: string;
  startDate?: string;
  endDate?: string;
  searchType?: 'license_date' | 'modified_date'; // 날짜 필터 기준 컬럼
  regions?: string[];
  serviceIds?: string[];
  searchQuery?: string;
  page?: number;
  pageSize?: number;
  userInfo?: any;
}): Promise<{ success: boolean; leads: Lead[]; count: number; message?: string }> {
  try {
    const supabase = getSupabase();

    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const user = filters?.userInfo;
    const isSuperAdmin = user?.isSuperAdmin || user?.email === 'kwpark0047@gmail.com';
    const organizationId = user?.organizationId;
    // searchType 기본값: license_date
    const dateColumn = filters?.searchType === 'modified_date' ? 'last_modified_date' : 'license_date';

    console.log('[getLeads] Querying with filters:', {
      category: filters?.category,
      regions: filters?.regions,
      status: filters?.status,
      searchType: filters?.searchType,
      dateColumn,
      isSuperAdmin,
      organizationId,
      page
    });

    let query = supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .order(dateColumn, { ascending: false, nullsFirst: false })

    if (!isSuperAdmin && organizationId) {
      query = query.eq('organization_id', organizationId);
    }

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters?.category && filters.category !== 'ALL') {
      query = query.eq('category', filters.category);
    }

    // 서비스(업종) 필터: 선택된 서비스 ID 목록에 포함된 리드만 조회
    if (filters?.serviceIds && filters.serviceIds.length > 0) {
      query = query.in('service_id', filters.serviceIds);
    }

    if (filters?.nearestStation) {
      query = query.eq('nearest_station', filters.nearestStation);
    }

    // 날짜 필터링: searchType에 따라 license_date 또는 last_modified_date 사용
    if (filters?.startDate) {
      // last_modified_date가 null인 경우(경기도 데이터)도 표시하기 위해 OR 조건 사용
      if (dateColumn === 'last_modified_date') {
        query = query.or(`${dateColumn}.gte.${filters.startDate},${dateColumn}.is.null`);
      } else {
        query = query.gte(dateColumn, filters.startDate);
      }
    }
    if (filters?.endDate) {
      if (dateColumn === 'last_modified_date') {
        query = query.or(`${dateColumn}.lte.${filters.endDate},${dateColumn}.is.null`);
      } else {
        query = query.lte(dateColumn, filters.endDate);
      }
    }

    // 검색어 필터링
    if (filters?.searchQuery) {
      const q = filters.searchQuery.trim().replace(/,/g, ' ');
      if (q) {
        // DB nearest_station은 "역" 없이 저장됨 ("강남역" → "강남" 기준 검색)
        const stationQ = q.endsWith('역') ? q.slice(0, -1) : q;

        // 노선명 → 노선 키 변환 ("2호선" → "2", "신분당선" → "S")
        const REVERSE_LINE: Record<string, string> = {
          '1호선': '1', '2호선': '2', '3호선': '3', '4호선': '4',
          '5호선': '5', '6호선': '6', '7호선': '7', '8호선': '8', '9호선': '9',
          '신분당선': 'S', '경의중앙선': 'K', '공항철도': 'A', '수인분당선': 'B',
          '경춘선': 'G', '인천1호선': 'I', '우이신설선': 'U', '서해선': 'W',
        };
        const lineKey = REVERSE_LINE[q] ?? null;

        const orParts = [
          `biz_name.ilike.%${q}%`,
          `road_address.ilike.%${q}%`,
          `lot_address.ilike.%${q}%`,
          `nearest_station.ilike.%${stationQ}%`,
          `phone.ilike.%${q}%`,
          `medical_subject.ilike.%${q}%`,
          `service_name.ilike.%${q}%`,
        ];
        if (lineKey) {
          // station_lines는 text[] 배열 — cs(contains) 연산자로 검색
          orParts.push(`station_lines.cs.{${lineKey}}`);
        }
        query = query.or(orParts.join(','));
      }
    }

    // 지역 필터 적용
    const allRegionsSelected = filters?.regions && filters.regions.length >= 2;
    if (filters?.regions && filters.regions.length > 0 && !allRegionsSelected) {
      const regionPrefixes = getRegionPrefixes(filters.regions as RegionCode[]);

      if (regionPrefixes.length > 0) {
        const conditions: string[] = [];
        regionPrefixes.forEach(prefix => {
          conditions.push(`road_address.ilike.%${prefix}%`);
          conditions.push(`lot_address.ilike.%${prefix}%`);
        });

        // 주소 누락 데이터 포함 (유실 방지)
        conditions.push('road_address.is.null');
        conditions.push('lot_address.is.null');

        query = query.or(conditions.join(','));
      }
    }

    // 서울 데이터 표시 필터: 영업중 + 최종수정일자(LASTMODTS) 3년 이내만 표시.
    // GG 데이터는 last_modified_date가 NULL이라 통과 (last_modified_date는 서울만 설정됨).
    // 서울 단독 선택 시에만 적용 (서울+경기 함께 선택 시에는 적용 안 함 — GG 데이터 유실 방지)
    const hasSeoul = filters?.regions?.includes('6110000') ?? false;
    const isSeoulOnly = hasSeoul && (filters?.regions?.length ?? 0) === 1;
    
    if (isSeoulOnly) {
      const d = new Date();
      d.setFullYear(d.getFullYear() - 3);
      const cutoff = d.toISOString().slice(0, 10);
      query = query.or(`and(operating_status.eq.영업중,last_modified_date.gte.${cutoff}),last_modified_date.is.null`);
    }

    const { data, count, error } = await query.range(from, to);

    if (error) {
      console.error('리드 조회 오류:', error);
      return { success: false, leads: [], count: 0, message: error.message };
    }

    let leads: Lead[] = (data || []).map((row: any) => ({
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
      nearestExitNo: row.nearest_exit_no,
      stationDistance: row.station_distance,
      stationLines: row.station_lines,
      mgtNo: row.mgt_no,
      operatingStatus: row.operating_status,
      detailedStatus: row.detailed_status,
      status: row.status as LeadStatus,
      leadScore: row.lead_score,
      leadGrade: row.lead_grade as Lead['leadGrade'],
      notes: row.notes,
      assignedTo: row.assigned_to,
      assignedToName: row.assigned_to_name,
      assignedAt: row.assigned_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      organizationId: row.organization_id,
    }));

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
 */
export async function updateLeadStatus(
  leadId: string,
  status: LeadStatus
): Promise<{ success: boolean; message: string; assignedToName?: string }> {
  try {
    const supabase = getSupabase();
    const updateData: any = { status };

    if (status === 'CONTACTED') {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        updateData.assigned_to = user.id;
        updateData.assigned_to_name = user.user_metadata?.full_name || user.email || '담당자없음';
        updateData.assigned_at = new Date().toISOString();
      }
    }

    const { error } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', leadId);

    if (error) return { success: false, message: error.message };
    ActivityService.trackLeadStatusChange(leadId, '리드', undefined, status);

    return {
      success: true,
      message: status === 'CONTACTED' && updateData.assigned_to_name
        ? `컨택완료! 담당자: ${updateData.assigned_to_name}`
        : '상태가 업데이트되었습니다.',
      assignedToName: updateData.assigned_to_name,
    };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

/**
 * 리드 메모 업데이트
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

    if (error) return { success: false, message: error.message };
    ActivityService.trackLeadNoteUpdate(leadId, '리드');
    return { success: true, message: '메모가 저장되었습니다.' };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

/**
 * 사용자 설정 저장
 */
export async function saveSettings(settings: Settings): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = getSupabase();
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
        // 다중 지역 선택 배열 저장 (JSON 직렬화)
        region_codes: settings.regionCodes ? JSON.stringify(settings.regionCodes) : null,
      }, {
        onConflict: 'user_id',
      });

    if (error) return { success: false, message: error.message };
    return { success: true, message: '설정이 저장되었습니다.' };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

/**
 * 사용자 설정 조회
 */
export async function getSettings(): Promise<{ success: boolean; settings: Settings }> {
  try {
    const supabase = getSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    let query = supabase.from('user_settings').select('*');
    if (userId) query = query.eq('user_id', userId);
    else query = query.is('user_id', null);

    const { data, error } = await query.maybeSingle();
    if (error || !data) return { success: true, settings: DEFAULT_SETTINGS };

    // region_codes 복원 (JSON 파싱)
    let regionCodes: string[] | undefined;
    if (data.region_codes) {
      try {
        regionCodes = JSON.parse(data.region_codes);
      } catch {
        regionCodes = undefined;
      }
    }

    return {
      success: true,
      settings: {
        apiKey: data.api_key || DEFAULT_SETTINGS.apiKey,
        corsProxy: data.cors_proxy || DEFAULT_SETTINGS.corsProxy,
        searchType: data.search_type || DEFAULT_SETTINGS.searchType,
        regionCode: data.region_code || DEFAULT_SETTINGS.regionCode,
        regionCodes: regionCodes || DEFAULT_SETTINGS.regionCodes,
      },
    };
  } catch (error) {
    return { success: true, settings: DEFAULT_SETTINGS };
  }
}

/**
 * 중복 리드 삭제
 */
export async function deleteDuplicateLeadsFromDB(): Promise<{
  success: boolean;
  message: string;
  removedCount: number;
}> {
  try {
    const supabase = getSupabase();
    const { data: allLeads, error: fetchError } = await supabase
      .from('leads')
      .select('id, biz_name, road_address, created_at')
      .order('created_at', { ascending: true });

    if (fetchError) return { success: false, message: fetchError.message, removedCount: 0 };
    if (!allLeads || allLeads.length === 0) return { success: true, message: '리드가 없습니다.', removedCount: 0 };

    const seen = new Map<string, string>();
    const duplicateIds: string[] = [];

    allLeads.forEach((lead: any) => {
      const key = createLeadKey(lead.biz_name, lead.road_address);
      if (seen.has(key)) duplicateIds.push(lead.id);
      else seen.set(key, lead.id);
    });

    if (duplicateIds.length === 0) return { success: true, message: '중복 데이터가 없습니다.', removedCount: 0 };

    const BATCH_SIZE = 100;
    let removedCount = 0;

    for (let i = 0; i < duplicateIds.length; i += BATCH_SIZE) {
      const batch = duplicateIds.slice(i, i + BATCH_SIZE);
      const { error: deleteError } = await supabase.from('leads').delete().in('id', batch);
      if (deleteError) return { success: false, message: deleteError.message, removedCount };
      removedCount += batch.length;
    }

    return { success: true, message: `중복 리드 ${removedCount}건 삭제 완료`, removedCount };
  } catch (error) {
    return { success: false, message: (error as Error).message, removedCount: 0 };
  }
}

/**
 * 리드 통계 조회
 */
export async function getLeadStats(): Promise<{
  total: number;
  byStatus: Record<LeadStatus, number>;
  byStation: { station: string; count: number }[];
}> {
  try {
    const supabase = getSupabase();
    const { count: total } = await supabase.from('leads').select('*', { count: 'exact', head: true });

    const byStatus: Record<LeadStatus, number> = { NEW: 0, PROPOSAL_SENT: 0, CONTACTED: 0, CONTRACTED: 0 };
    for (const status of ['NEW', 'PROPOSAL_SENT', 'CONTACTED', 'CONTRACTED'] as LeadStatus[]) {
      const { count } = await supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', status);
      byStatus[status] = count || 0;
    }

    const { data: stationData } = await supabase.from('leads').select('nearest_station').not('nearest_station', 'is', null);
    const stationCounts: Record<string, number> = {};
    (stationData || []).forEach((row: any) => {
      if (row.nearest_station) stationCounts[row.nearest_station] = (stationCounts[row.nearest_station] || 0) + 1;
    });

    const byStation = Object.entries(stationCounts)
      .map(([station, count]) => ({ station, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return { total: total || 0, byStatus, byStation };
  } catch (error) {
    return { total: 0, byStatus: { NEW: 0, PROPOSAL_SENT: 0, CONTACTED: 0, CONTRACTED: 0 }, byStation: [] };
  }
}

/**
 * 중복 리드 병합 (keep 리드 유지 + 나머지 삭제)
 * - organization_id 스코프 유지 (getLeads와 동일 패턴)
 * - 병합 가능한 필드만 업데이트하여 null 덮어쓰기 방지
 */
export async function mergeDuplicateLeadsInDB(
  keepId: string,
  removeIds: string[],
  mergedData: Partial<Lead>,
  userInfo?: any
): Promise<{ success: boolean; message: string; mergedCount: number }> {
  try {
    const supabase = getSupabase();

    const isSuperAdmin = userInfo?.isSuperAdmin || userInfo?.email === 'kwpark0047@gmail.com';
    const organizationId = userInfo?.organizationId;

    const updatePayload = {
      road_address: mergedData.roadAddress || null,
      lot_address: mergedData.lotAddress || null,
      coord_x: mergedData.coordX || null,
      coord_y: mergedData.coordY || null,
      latitude: mergedData.latitude || null,
      longitude: mergedData.longitude || null,
      phone: mergedData.phone || null,
      biz_id: mergedData.bizId || null,
      license_date: mergedData.licenseDate || null,
    };

    let updateQuery = supabase
      .from('leads')
      .update(updatePayload)
      .eq('id', keepId);

    if (!isSuperAdmin && organizationId) {
      updateQuery = updateQuery.eq('organization_id', organizationId);
    }

    const { error: updateError } = await updateQuery;

    if (updateError) {
      console.error('[Supabase] mergeDuplicateLeadsInDB Update Error:', updateError);
      return { success: false, message: `병합 대상 업데이트 실패: ${updateError.message}`, mergedCount: 0 };
    }

    // 나머지 중복 리드 배치 삭제
    let deletedCount = 0;
    for (let i = 0; i < removeIds.length; i += 100) {
      const batch = removeIds.slice(i, i + 100);

      let deleteQuery = supabase
        .from('leads')
        .delete()
        .in('id', batch);

      if (!isSuperAdmin && organizationId) {
        deleteQuery = deleteQuery.eq('organization_id', organizationId);
      }

      const { error: deleteError } = await deleteQuery;

      if (deleteError) {
        console.error('[Supabase] mergeDuplicateLeadsInDB Delete Error:', deleteError);
        return { success: false, message: `중복 리드 삭제 실패: ${deleteError.message}`, mergedCount: 0 };
      }

      deletedCount += batch.length;
    }

    return { success: true, message: `중복 리드 병합 완료 (${deletedCount}건 정리)`, mergedCount: deletedCount };
  } catch (error: any) {
    console.error('[Supabase] mergeDuplicateLeadsInDB Error:', error);
    return { success: false, message: error?.message || '병합 중 오류가 발생했습니다.', mergedCount: 0 };
  }
}

/**
 * 특정 리드 일괄 삭제 (organization_id 스코프 유지)
 */
export async function deleteLeadsByIds(
  ids: string[],
  userInfo?: any
): Promise<{ success: boolean; message: string; deletedCount: number }> {
  if (ids.length === 0) {
    return { success: true, message: '삭제할 리드가 없습니다.', deletedCount: 0 };
  }

  try {
    const supabase = getSupabase();

    const isSuperAdmin = userInfo?.isSuperAdmin || userInfo?.email === 'kwpark0047@gmail.com';
    const organizationId = userInfo?.organizationId;

    let deletedCount = 0;
    for (let i = 0; i < ids.length; i += 100) {
      const batch = ids.slice(i, i + 100);

      let deleteQuery = supabase
        .from('leads')
        .delete()
        .in('id', batch);

      if (!isSuperAdmin && organizationId) {
        deleteQuery = deleteQuery.eq('organization_id', organizationId);
      }

      const { error } = await deleteQuery;

      if (error) {
        console.error('[Supabase] deleteLeadsByIds Error:', error);
        return { success: false, message: `리드 삭제 실패: ${error.message}`, deletedCount: 0 };
      }

      deletedCount += batch.length;
    }

    return { success: true, message: `리드 ${deletedCount}건 삭제 완료`, deletedCount };
  } catch (error: any) {
    console.error('[Supabase] deleteLeadsByIds Error:', error);
    return { success: false, message: error?.message || '삭제 중 오류가 발생했습니다.', deletedCount: 0 };
  }
}
