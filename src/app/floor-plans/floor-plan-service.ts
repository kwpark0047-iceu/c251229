/**
 * 지하철 역사 도면 페이지 - DB 서비스
 * 도면 및 광고 위치 CRUD 작업
 */

import { getSupabase } from '@/lib/supabase/utils';
import {
  FloorPlan,
  FloorPlanInput,
  AdPosition,
  AdPositionInput,
  MetroLine,
  PlanType,
} from './types';

// ============================================
// 도면 CRUD
// ============================================

/**
 * 노선별 도면 목록 조회
 */
export async function getFloorPlansByLine(
  lineNumber: MetroLine,
  planType?: PlanType
): Promise<FloorPlan[]> {
  const supabase = getSupabase();

  let query = supabase
    .from('floor_plans')
    .select('*')
    .eq('line_number', lineNumber)
    .order('sort_order', { ascending: true });

  if (planType) {
    query = query.eq('plan_type', planType);
  }

  const { data, error } = await query;

  if (error) {
    console.error('도면 조회 오류:', error);
    throw new Error(error.message);
  }

  if (!data || data.length === 0) {
    console.warn(`[getFloorPlansByLine] No plans found for line: ${lineNumber}, type: ${planType}`);
  }

  return (data || []).map(mapDbToFloorPlan);
}

/**
 * 역명으로 도면 조회
 */
export async function getFloorPlanByStation(
  stationName: string,
  lineNumber: MetroLine,
  planType: PlanType
): Promise<FloorPlan | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('floor_plans')
    .select('*')
    .eq('station_name', stationName)
    .eq('line_number', lineNumber)
    .eq('plan_type', planType)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null; // 데이터 없음
    console.error('도면 조회 오류:', error);
    throw new Error(error.message);
  }

  return data ? mapDbToFloorPlan(data) : null;
}

/**
 * ID로 도면 조회
 */
export async function getFloorPlanById(id: string): Promise<FloorPlan | null> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('floor_plans')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('도면 조회 오류:', error);
    throw new Error(error.message);
  }

  return data ? mapDbToFloorPlan(data) : null;
}

/**
 * 모든 도면 조회
 */
export async function getAllFloorPlans(): Promise<FloorPlan[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('floor_plans')
    .select('*')
    .order('line_number', { ascending: true })
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('전체 도면 조회 오류:', error);
    throw new Error(error.message);
  }

  return (data || []).map(mapDbToFloorPlan);
}

/**
 * 도면 저장 (upsert)
 */
export async function saveFloorPlan(input: FloorPlanInput): Promise<FloorPlan> {
  const supabase = getSupabase();

  const dbData = {
    station_name: input.stationName,
    line_number: input.lineNumber,
    plan_type: input.planType,
    floor_name: input.floorName || 'B1',
    image_url: input.imageUrl,
    thumbnail_url: input.thumbnailUrl,
    storage_path: input.storagePath,
    file_name: input.fileName,
    file_size: input.fileSize,
    width: input.width,
    height: input.height,
    sort_order: input.sortOrder || 0,
  };

  const { data, error } = await supabase
    .from('floor_plans')
    .upsert(dbData, {
      onConflict: 'station_name,line_number,plan_type,floor_name',
    })
    .select()
    .single();

  if (error) {
    console.error('도면 저장 오류:', error);
    throw new Error(error.message);
  }

  return mapDbToFloorPlan(data);
}

/**
 * 도면 일괄 저장
 */
export async function saveFloorPlansBatch(
  inputs: FloorPlanInput[],
  onProgress?: (current: number, total: number) => void
): Promise<{ success: number; failed: number }> {
  const supabase = getSupabase();
  let success = 0;
  let failed = 0;

  const BATCH_SIZE = 50;

  for (let i = 0; i < inputs.length; i += BATCH_SIZE) {
    const batch = inputs.slice(i, i + BATCH_SIZE);

    const dbDataBatch = batch.map(input => ({
      station_name: input.stationName,
      line_number: input.lineNumber,
      plan_type: input.planType,
      floor_name: input.floorName || 'B1',
      image_url: input.imageUrl,
      thumbnail_url: input.thumbnailUrl,
      storage_path: input.storagePath,
      file_name: input.fileName,
      file_size: input.fileSize,
      width: input.width,
      height: input.height,
      sort_order: input.sortOrder || 0,
    }));

    const { error } = await supabase
      .from('floor_plans')
      .upsert(dbDataBatch, {
        onConflict: 'station_name,line_number,plan_type,floor_name',
      });

    if (error) {
      console.error('도면 배치 저장 오류:', error);
      failed += batch.length;
    } else {
      success += batch.length;
    }

    onProgress?.(Math.min(i + BATCH_SIZE, inputs.length), inputs.length);
  }

  return { success, failed };
}

/**
 * 도면 삭제
 */
export async function deleteFloorPlan(id: string): Promise<void> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from('floor_plans')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('도면 삭제 오류:', error);
    throw new Error(error.message);
  }
}

// ============================================
// 광고 위치 CRUD
// ============================================

/**
 * 도면별 광고 위치 조회
 */
export async function getAdPositionsByFloorPlan(floorPlanId: string): Promise<AdPosition[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('floor_plan_ad_positions')
    .select(`
      *,
      inventory:ad_inventory(*)
    `)
    .eq('floor_plan_id', floorPlanId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('광고 위치 조회 오류:', error);
    throw new Error(error.message);
  }

  return (data || []).map(mapDbToAdPosition);
}

/**
 * 광고 위치 생성
 */
export async function createAdPosition(input: AdPositionInput): Promise<AdPosition> {
  const supabase = getSupabase();

  const dbData = {
    floor_plan_id: input.floorPlanId,
    inventory_id: input.inventoryId,
    position_x: input.positionX,
    position_y: input.positionY,
    label: input.label,
    ad_code: input.adCode,
    marker_color: input.markerColor || '#3CB54A',
    marker_size: input.markerSize || 24,
  };

  const { data, error } = await supabase
    .from('floor_plan_ad_positions')
    .insert(dbData)
    .select()
    .single();

  if (error) {
    console.error('광고 위치 생성 오류:', error);
    throw new Error(error.message);
  }

  return mapDbToAdPosition(data);
}

/**
 * 광고 위치 수정
 */
export async function updateAdPosition(
  id: string,
  input: Partial<AdPositionInput>
): Promise<AdPosition> {
  const supabase = getSupabase();

  const dbData: Record<string, unknown> = {};
  if (input.inventoryId !== undefined) dbData.inventory_id = input.inventoryId;
  if (input.positionX !== undefined) dbData.position_x = input.positionX;
  if (input.positionY !== undefined) dbData.position_y = input.positionY;
  if (input.label !== undefined) dbData.label = input.label;
  if (input.adCode !== undefined) dbData.ad_code = input.adCode;
  if (input.markerColor !== undefined) dbData.marker_color = input.markerColor;
  if (input.markerSize !== undefined) dbData.marker_size = input.markerSize;

  const { data, error } = await supabase
    .from('floor_plan_ad_positions')
    .update(dbData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('광고 위치 수정 오류:', error);
    throw new Error(error.message);
  }

  return mapDbToAdPosition(data);
}

/**
 * 광고 위치 삭제
 */
export async function deleteAdPosition(id: string): Promise<void> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from('floor_plan_ad_positions')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('광고 위치 삭제 오류:', error);
    throw new Error(error.message);
  }
}

/**
 * 광고 위치에 인벤토리 연결
 */
export async function linkPositionToInventory(
  positionId: string,
  inventoryId: string
): Promise<void> {
  const supabase = getSupabase();

  const { error } = await supabase
    .from('floor_plan_ad_positions')
    .update({ inventory_id: inventoryId })
    .eq('id', positionId);

  if (error) {
    console.error('인벤토리 연결 오류:', error);
    throw new Error(error.message);
  }
}

// ============================================
// 통계
// ============================================

/**
 * 노선별 도면 개수 조회
 */
export async function getFloorPlanCounts(): Promise<Record<MetroLine, { station_layout: number; psd: number }>> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('floor_plans')
    .select('line_number, plan_type');

  if (error) {
    console.error('도면 통계 조회 오류:', error);
    // 컬럼이 없는 경우(스키마 미적용) 에러 메시지 상세화
    if (error.code === 'PGRST204' || error.message.includes('column')) {
      throw new Error('데이터베이스 스키마가 최신 버전이 아닙니다. migrations 폴더의 SQL을 실행해 주세요.');
    }
    throw new Error(`도면 통계 조회 오류: ${error.message}`);
  }

  const counts: Record<string, { station_layout: number; psd: number }> = {};
  const lines: MetroLine[] = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'S', 'K', 'A', 'B'];

  lines.forEach(line => {
    counts[line] = { station_layout: 0, psd: 0 };
  });

  (data || []).forEach(row => {
    const line = row.line_number as MetroLine;
    const type = row.plan_type as PlanType;
    if (line && counts[line] && type) {
      counts[line][type]++;
    }
  });

  return counts as Record<MetroLine, { station_layout: number; psd: number }>;
}

// ============================================
// DB → 타입 매핑
// ============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbToFloorPlan(row: any): FloorPlan {
  return {
    id: row.id,
    stationName: row.station_name,
    lineNumber: row.line_number,
    planType: row.plan_type,
    floorName: row.floor_name,
    imageUrl: row.image_url,
    thumbnailUrl: row.thumbnail_url,
    storagePath: row.storage_path,
    fileName: row.file_name,
    fileSize: row.file_size,
    width: row.width,
    height: row.height,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDbToAdPosition(row: any): AdPosition {
  return {
    id: row.id,
    floorPlanId: row.floor_plan_id,
    inventoryId: row.inventory_id,
    positionX: parseFloat(row.position_x),
    positionY: parseFloat(row.position_y),
    label: row.label,
    adCode: row.ad_code,
    markerColor: row.marker_color,
    markerSize: row.marker_size,
    inventory: row.inventory,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
