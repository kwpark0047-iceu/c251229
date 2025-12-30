/**
 * 서울 지하철 광고 영업 시스템 - Supabase 서비스
 * 리드 데이터 저장/조회/업데이트
 */

import { createClient } from '@/lib/supabase/client';
import { Lead, LeadStatus, Settings, BusinessCategory } from './types';
import { DEFAULT_SETTINGS } from './constants';

/**
 * Supabase 클라이언트 인스턴스 가져오기
 */
function getSupabase() {
  return createClient();
}

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
  onProgress?: (current: number, total: number, status: string) => void
): Promise<SaveLeadsResult> {
  try {
    const supabase = getSupabase();

    onProgress?.(0, leads.length, '기존 데이터 확인 중...');

    // 기존 데이터 조회 (biz_name + road_address 조합으로 중복 체크)
    const { data: existingData, error: fetchError } = await supabase
      .from('leads')
      .select('biz_name, road_address');

    if (fetchError) {
      console.error('기존 데이터 조회 오류:', fetchError);
      return { success: false, message: fetchError.message, newCount: 0, skippedCount: 0, newLeads: [] };
    }

    // 기존 데이터 키 세트 생성
    const existingSet = new Set<string>();
    (existingData || []).forEach(row => {
      const key = `${row.biz_name || ''}|${row.road_address || ''}`;
      existingSet.add(key);
    });

    console.log(`기존 데이터: ${existingSet.size}건`);

    // 신규 데이터만 필터링
    const newLeads: Lead[] = [];
    const skippedLeads: Lead[] = [];

    leads.forEach(lead => {
      const key = `${lead.bizName}|${lead.roadAddress || ''}`;
      if (existingSet.has(key)) {
        skippedLeads.push(lead);
      } else {
        newLeads.push(lead);
      }
    });

    console.log(`신규 데이터: ${newLeads.length}건, 중복: ${skippedLeads.length}건`);

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
        station_distance: lead.stationDistance || null,
        station_lines: lead.stationLines || null,
        status: lead.status,
        notes: lead.notes || null,
      }));

      const { error } = await supabase
        .from('leads')
        .insert(dbLeads);

      if (error) {
        console.error('리드 저장 오류:', error);
        return {
          success: false,
          message: `저장 오류: ${error.message}`,
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
    console.error('리드 저장 중 오류:', error);
    return { success: false, message: (error as Error).message, newCount: 0, skippedCount: 0, newLeads: [] };
  }
}

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
}): Promise<{ success: boolean; leads: Lead[]; message?: string }> {
  try {
    const supabase = getSupabase();

    let query = supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false });

    // 필터 적용
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.category) {
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

    const { data, error } = await query;

    if (error) {
      console.error('리드 조회 오류:', error);
      return { success: false, leads: [], message: error.message };
    }

    // DB 데이터를 Lead 객체로 변환
    const leads: Lead[] = (data || []).map(row => ({
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
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return { success: true, leads };
  } catch (error) {
    console.error('리드 조회 중 오류:', error);
    return { success: false, leads: [], message: (error as Error).message };
  }
}

/**
 * 리드 상태 업데이트
 * @param leadId - 리드 ID
 * @param status - 새 상태
 */
export async function updateLeadStatus(
  leadId: string,
  status: LeadStatus
): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = getSupabase();

    const { error } = await supabase
      .from('leads')
      .update({ status })
      .eq('id', leadId);

    if (error) {
      console.error('상태 업데이트 오류:', error);
      return { success: false, message: error.message };
    }

    return { success: true, message: '상태가 업데이트되었습니다.' };
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

    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: null, // 익명 사용자
        api_key: settings.apiKey,
        cors_proxy: settings.corsProxy,
        search_type: settings.searchType,
        region_code: settings.regionCode,
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

    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .limit(1)
      .single();

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
