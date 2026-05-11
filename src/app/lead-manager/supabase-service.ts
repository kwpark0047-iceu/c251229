/**
 * ?쒖슱 吏?섏쿋 愿묎퀬 ?곸뾽 ?쒖뒪??- Supabase ?쒕퉬??
 * 由щ뱶 ?곗씠?????조회/?낅뜲?댄듃
 */

import { getSupabase } from '@/lib/supabase/utils';
import { Lead, LeadStatus, Settings, BusinessCategory } from './types';
import { DEFAULT_SETTINGS } from './constants';
import { getOrganizationId } from './auth-service';
import { createLeadKey } from './lead-utils';
import { removeDuplicateLeads } from './deduplication-utils';
import { isAddressInRegions, RegionCode, getRegionPrefixes } from './region-utils';
import { ActivityService } from './activity-service';

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
  let query = supabase
    .from('leads')
    .select('mgt_no')
    .in('mgt_no', mgtNos);

  if (organizationId) {
    query = query.eq('organization_id', organizationId);
  }

  const { data, error } = await query;
    
  if (error) {
    console.error('[Supabase] checkExistingLeadsByMgtNo Error:', error);
    return new Set();
  }
  return new Set((data || []).map((item: { mgt_no: string }) => item.mgt_no));
}

/**
 * 由щ뱶瑜??곗씠?곕쿋?댁뒪?????(신규 ?곗씠?곕쭔, 以묐났 泥댄겕)
 */
export async function saveLeads(
  leads: Lead[],
  onProgress?: (current: number, total: number, status: string) => void,
  organizationId?: string | null
): Promise<SaveLeadsResult> {
  try {
    const supabase = getSupabase();

    // ?쒖쇅 ?ㅼ썙???뺤쓽 (?섎즺湲곌? 寃?????욎씠??鍮꾪?寃??낆쥌)
    const excludeKeywords = [
      '약국', '편의점', '세븐일레븐', '씨유', '지에스', 'GS25', 'CU', '7-ELEVEN',
      '이마트', '안경', '콘택트', '안경원', '다이소', '올리브영', '롭스', '랄라블라'
    ];

    // 조직 ID 가져오기(전달되지 않은 경우)
    const orgId = organizationId ?? await getOrganizationId();

    onProgress?.(0, leads.length, '비타겟 업종 필터링 중...');

    // 0. 비타겟 업종 필터링(HEALTH 카테고리에만 적용)
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

    // 2. 관리번호가 없는 리드용 상호명/주소 기반 중복 체크(필요한 경우만)
    // 성능을 위해 입력 데이터와 매칭 가능한 기존 데이터만 조회
    const leadsWithoutMgtNo = filteredLeads.filter(l => !l.mgtNo || !existingMgtNoSet.has(l.mgtNo));
    
    let existingKeySet = new Set<string>();
    let existingBizIdSet = new Set<string>();

    if (leadsWithoutMgtNo.length > 0) {
      // 상호명 목록으로 필터링해 최소한의 데이터만 가져옴
      const bizNames = [...new Set(leadsWithoutMgtNo.map(l => l.bizName))];
      let existingQuery = supabase
        .from('leads')
        .select('biz_name, road_address, biz_id')
        .in('biz_name', bizNames.slice(0, 500));

      if (orgId) {
        existingQuery = existingQuery.eq('organization_id', orgId);
      }

      const { data: existingData } = await existingQuery;

      (existingData || []).forEach((row: any) => {
        existingKeySet.add(createLeadKey(row.biz_name, row.road_address, row.biz_id));
        if (row.biz_id) existingBizIdSet.add(row.biz_id);
      });
    }

    // 신규 데이터만 필터링
    const realNewLeads: Lead[] = [];
    const dbDuplicates: Lead[] = [];

    filteredLeads.forEach(lead => {
      // 愿由щ쾲?몃줈 우선 체크
      if (lead.mgtNo && existingMgtNoSet.has(lead.mgtNo)) {
        dbDuplicates.push(lead);
        return;
      }

      const key = createLeadKey(lead.bizName, lead.roadAddress, lead.bizId);
      if (existingKeySet.has(key) || (lead.bizId && existingBizIdSet.has(lead.bizId))) {
        dbDuplicates.push(lead);
      } else {
        realNewLeads.push(lead);
      }
    });

    // 이미 중복 제거 (유입된 데이터들 사이의 중복)
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
        // 에러는 상위에서 처리

        // 테이블이 없는 경우 안내 메시지
        if (error.message.includes('relation') || error.code === '42P01') {
          return {
            success: false,
            message: '테이블이 없습니다. Supabase에서 supabase-schema.sql을 실행하세요',
            newCount: savedCount,
            skippedCount: skippedLeads.length,
            newLeads: newLeads.slice(0, savedCount),
          };
        }

        // UNIQUE 제약조건 위반 (중복 데이터) - 개별 삽입 시도
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

    // 활동 로그 기록
    ActivityService.trackLeadImport(newLeads.length, leads[0]?.category || 'OTHER');

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
const REGION_CODE_TO_PREFIX: Record<string, string[]> = {
  '6110000': ['서울특별시', '서울'],
  '6410000': ['경기도', '경기'],
};


/**
 * 由щ뱶 紐⑸줉 조회
 * @param filters - ?꾪꽣 議곌굔
 */
export async function getLeads(filters?: {
  status?: LeadStatus;
  category?: BusinessCategory;
  nearestStation?: string;
  startDate?: string;
  endDate?: string;
  regions?: string[];  // 吏??코드 諛곗뿴 (?? ['6110000', '6410000'])
  searchQuery?: string; // 寃?됱뼱
  page?: number;       // ?섏씠吏 踰덊샇 (1遺???쒖옉)
  pageSize?: number;   // ?섏씠吏 ?ш린 (湲곕낯媛? 50)
}): Promise<{ success: boolean; leads: Lead[]; count: number; message?: string }> {
  try {
    const supabase = getSupabase();

    // ?섏씠吏?ㅼ씠??湲곕낯媛?
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 50;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .order('license_date', { ascending: false, nullsFirst: false });

    // ?꾪꽣 ?곸슜
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

    // 寃?됱뼱 ?꾪꽣 (?쒕쾭 ?ъ씠??
    if (filters?.searchQuery) {
      const q = filters.searchQuery;
      // ?곹샇紐? 二쇱냼, 媛源뚯슫 ?? 吏踰?二쇱냼 寃??
      // 李멸퀬: road_address ?깆? null?????덉쑝誘濡?寃????二쇱쓽 ?꾩슂?섏?留?ilike??null 臾댁떆
      query = query.or(`biz_name.ilike.%${q}%,road_address.ilike.%${q}%,lot_address.ilike.%${q}%,nearest_station.ilike.%${q}%`);
    }

    // 吏???꾪꽣 ?곸슜 (?쒕쾭 ?ъ씠??
    if (filters?.regions && filters.regions.length > 0) {
      // 吏??코드???대떦?섎뒗 二쇱냼 ?묐몢??媛?몄삤湲?
      // ?? '6110000' -> ['?쒖슱?밸퀎??, '?쒖슱']
      const prefixes: string[] = [];
      // region-utils??getRegionPrefixes ?ъ슜

      // region-utils??getRegionPrefixes ?ъ슜
      // filters.regions??string[]?댁?留?RegionCode[]濡?罹먯뒪???꾩슂?????덉쓬
      const regionPrefixes = getRegionPrefixes(filters.regions as RegionCode[]);

      if (regionPrefixes.length > 0) {
        // OR 議곌굔 ?앹꽦: road_address.ilike.?묐몢??
        // lot_address??泥댄겕?섍퀬 ?띕떎硫?蹂듭옟?댁?吏留? 蹂댄넻 road_address媛 硫붿씤
        const orConditions = regionPrefixes
          .map(prefix => `road_address.ilike.${prefix}%`)
          .join(',');

        query = query.or(orConditions);
      }
    }

    // ?섏씠吏?ㅼ씠???곸슜
    const { data, count, error } = await query.range(from, to);

    if (error) {
      console.error('由щ뱶 조회 ?ㅻ쪟:', error);
      return { success: false, leads: [], count: 0, message: error.message };
    }

    // DB ?곗씠?곕? Lead 媛앹껜濡?蹂??
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
      notes: row.notes,
      assignedTo: row.assigned_to,
      assignedToName: row.assigned_to_name,
      assignedAt: row.assigned_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    // ?꾩옱 ?섏씠吏 ??以묐났 ?쒓굅 (global 以묐났 ?쒓굅???섏씠吏?ㅼ씠?섍낵 ?명솚?섏? ?딆쓬)
    // ?꾩슂 ??removeDuplicateLeads ?몄텧. ?ш린?쒕뒗 ?섏씠吏 ??以묐났留??쒓굅?섍굅??
    // DB 李⑥썝?먯꽌 以묐났???녿떎怨?媛??(deleteDuplicateLeadsFromDB ?ъ슜 沅뚯옣)
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
    console.error('由щ뱶 조회 以??ㅻ쪟:', error);
    return { success: false, leads: [], count: 0, message: (error as Error).message };
  }
}

/**
 * 由щ뱶 ?곹깭 ?낅뜲?댄듃
 * @param leadId - 由щ뱶 ID
 * @param status - ???곹깭
 *
 * CONTACTED(而⑦깮?꾨즺) ?곹깭濡?蹂寃????꾩옱 ?ъ슜?먮? ?대떦?먮줈 ?먮룞 吏??
 */
export async function updateLeadStatus(
  leadId: string,
  status: LeadStatus
): Promise<{ success: boolean; message: string; assignedToName?: string }> {
  try {
    const supabase = getSupabase();

    // ?낅뜲?댄듃???곗씠??
    const updateData: {
      status: LeadStatus;
      assigned_to?: string;
      assigned_to_name?: string;
      assigned_at?: string;
    } = { status };

    // 而⑦깮?꾨즺 ?곹깭濡?蹂寃????대떦???먮룞 吏??
    if (status === 'CONTACTED') {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        updateData.assigned_to = user.id;
        updateData.assigned_to_name = user.user_metadata?.full_name || user.email || '?????놁쓬';
        updateData.assigned_at = new Date().toISOString();
      }
    }

    const { error } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', leadId);

    if (error) {
      console.error('?곹깭 ?낅뜲?댄듃 ?ㅻ쪟:', error);
      return { success: false, message: error.message };
    }

    // 활동 로그 기록 (媛꾨떒 ?뺣낫 조회瑜??꾪빐 leadId ?쒖슜)
    ActivityService.trackLeadStatusChange(leadId, '由щ뱶', undefined, status);

    const message = status === 'CONTACTED' && updateData.assigned_to_name
      ? `而⑦깮?꾨즺! ?대떦?? ${updateData.assigned_to_name}`
      : '?곹깭媛 ?낅뜲?댄듃?섏뿀?듬땲??';

    return {
      success: true,
      message,
      assignedToName: updateData.assigned_to_name,
    };
  } catch (error) {
    console.error('?곹깭 ?낅뜲?댄듃 以??ㅻ쪟:', error);
    return { success: false, message: (error as Error).message };
  }
}

/**
 * 由щ뱶 硫붾え ?낅뜲?댄듃
 * @param leadId - 由щ뱶 ID
 * @param notes - 硫붾え ?댁슜
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
      console.error('硫붾え ?낅뜲?댄듃 ?ㅻ쪟:', error);
      return { success: false, message: error.message };
    }

    // 활동 로그 기록
    ActivityService.trackLeadNoteUpdate(leadId, '由щ뱶');

    return { success: true, message: '硫붾え媛 ??λ릺?덉뒿?덈떎.' };
  } catch (error) {
    console.error('硫붾え ?낅뜲?댄듃 以??ㅻ쪟:', error);
    return { success: false, message: (error as Error).message };
  }
}

/**
 * ?ъ슜???ㅼ젙 ???
 * @param settings - ?ㅼ젙 ?뺣낫
 */
export async function saveSettings(settings: Settings): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = getSupabase();

    // ?꾩옱 ?ъ슜??ID 媛?몄삤湲?
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
      console.error('?ㅼ젙 ????ㅻ쪟:', error);
      return { success: false, message: error.message };
    }

    return { success: true, message: '?ㅼ젙????λ릺?덉뒿?덈떎.' };
  } catch (error) {
    console.error('?ㅼ젙 ???以??ㅻ쪟:', error);
    return { success: false, message: (error as Error).message };
  }
}

/**
 * ?ъ슜???ㅼ젙 조회
 */
export async function getSettings(): Promise<{ success: boolean; settings: Settings }> {
  try {
    const supabase = getSupabase();

    // ?꾩옱 ?ъ슜??ID 媛?몄삤湲?
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    let query = supabase.from('user_settings').select('*');

    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      query = query.is('user_id', null);
    }

    const { data, error } = await query.maybeSingle();

    if (error || !data) {
      // ?ㅼ젙???놁쑝硫?湲곕낯媛?諛섑솚
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
    console.error('?ㅼ젙 조회 以??ㅻ쪟:', error);
    return { success: true, settings: DEFAULT_SETTINGS };
  }
}

/**
 * 以묐났 由щ뱶 ??젣 (?곹샇紐?+ 二쇱냼 湲곗?)
 * 媛숈? ?곹샇紐?二쇱냼 議고빀???곗씠??以?媛???ㅻ옒??寃껊쭔 ?④린怨???젣
 */
export async function deleteDuplicateLeadsFromDB(): Promise<{
  success: boolean;
  message: string;
  removedCount: number;
}> {
  try {
    const supabase = getSupabase();

    // 紐⑤뱺 由щ뱶 조회
    const { data: allLeads, error: fetchError } = await supabase
      .from('leads')
      .select('id, biz_name, road_address, created_at')
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('由щ뱶 조회 ?ㅻ쪟:', fetchError);
      return { success: false, message: fetchError.message, removedCount: 0 };
    }

    if (!allLeads || allLeads.length === 0) {
      return { success: true, message: '由щ뱶媛 ?놁뒿?덈떎.', removedCount: 0 };
    }

    // 以묐났 李얘린 (?곹샇紐?+ 二쇱냼 湲곗?, 泥?踰덉㎏ ?깅줉??寃껊쭔 ?좎?)
    const seen = new Map<string, string>(); // key -> first id
    const duplicateIds: string[] = [];

    allLeads.forEach((lead: any) => {
      const key = createLeadKey(lead.biz_name, lead.road_address);
      if (seen.has(key)) {
        // ?대? ?덉쑝硫?以묐났 - ??젣 ???
        duplicateIds.push(lead.id);
      } else {
        // 泥섏쓬 蹂대뒗 寃?- ?좎?
        seen.set(key, lead.id);
      }
    });

    if (duplicateIds.length === 0) {
      return { success: true, message: '以묐났 ?곗씠?곌? ?놁뒿?덈떎.', removedCount: 0 };
    }

    // 以묐났 ??젣 吏꾪뻾

    // 諛곗튂濡???젣 (100건씩)
    const BATCH_SIZE = 100;
    let removedCount = 0;

    for (let i = 0; i < duplicateIds.length; i += BATCH_SIZE) {
      const batch = duplicateIds.slice(i, i + BATCH_SIZE);

      const { error: deleteError } = await supabase
        .from('leads')
        .delete()
        .in('id', batch);

      if (deleteError) {
        console.error('??젣 ?ㅻ쪟:', deleteError);
        return {
          success: false,
          message: `??젣 ?ㅻ쪟: ${deleteError.message}`,
          removedCount,
        };
      }

      removedCount += batch.length;
    }

    return {
      success: true,
      message: `以묐났 由щ뱶 ${removedCount}嫄???젣 ?꾨즺`,
      removedCount,
    };
  } catch (error) {
    console.error('以묐났 ??젣 以??ㅻ쪟:', error);
    return { success: false, message: (error as Error).message, removedCount: 0 };
  }
}

/**
 * ?듦퀎 조회
 */
export async function getLeadStats(): Promise<{
  total: number;
  byStatus: Record<LeadStatus, number>;
  byStation: { station: string; count: number }[];
}> {
  try {
    const supabase = getSupabase();

    // ?꾩껜 嫄댁닔
    const { count: total } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });

    // ?곹깭蹂?嫄댁닔
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

    // ??퀎 嫄댁닔 (?곸쐞 10媛?
    const { data: stationData } = await supabase
      .from('leads')
      .select('nearest_station')
      .not('nearest_station', 'is', null);

    const stationCounts: Record<string, number> = {};
    (stationData || []).forEach((row: any) => {
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
    console.error('?듦퀎 조회 以??ㅻ쪟:', error);
    return {
      total: 0,
      byStatus: { NEW: 0, PROPOSAL_SENT: 0, CONTACTED: 0, CONTRACTED: 0 },
      byStation: [],
    };
  }
}
