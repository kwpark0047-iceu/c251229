/**
 * 서울 지하철 광고 영업 시스템 - 인벤토리 서비스
 * 광고매체 재고 관리, 엑셀 업로드, 지리적 매칭
 */

import ExcelJS from 'exceljs';
import { getSupabase } from '@/lib/supabase/utils';
import {
  AdInventory,
  AvailabilityStatus,
  FloorPlan,
  ExcelUploadResult,
  ExcelInventoryRow,
  Lead,
} from './types';
import { calculateDistance } from './utils';
import { SUBWAY_STATIONS } from './constants';
import { getOrganizationId } from './auth-service';

// ============================================
// 엑셀 파싱 및 업로드
// ============================================

/**
 * 엑셀 파일에서 인벤토리 데이터 파싱
 * @param buffer - 엑셀 파일 버퍼
 * @param defaultMediaType - 기본 매체 유형 (광고유형 컬럼이 없을 때 사용)
 */
export async function parseInventoryExcel(buffer: ArrayBuffer, defaultMediaType?: string): Promise<ExcelInventoryRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets[0];

  // 전체 데이터를 배열로 변환 (ExcelJS row.values는 1-indexed이므로 0번째 요소 제거)
  const rawData: unknown[][] = [];
  worksheet.eachRow((row) => {
    const values = row.values as unknown[];
    // ExcelJS는 1-indexed 배열을 반환하므로 첫 번째 요소(undefined) 제거
    rawData.push(values.slice(1));
  });

  // 디버그 로그 제거 (필요시 개발 환경에서만 활성화)

  // 헤더 행 찾기 (역사, 유형, 위치명 등이 포함된 행)
  let headerRowIndex = -1;
  let headers: string[] = [];

  for (let i = 0; i < Math.min(10, rawData.length); i++) {
    const row = rawData[i];
    if (!row || !Array.isArray(row)) continue;

    const rowStr = row.map(cell => String(cell || '').toLowerCase()).join(',');
    // 역사, 유형, 위치명, 단가 중 2개 이상 포함하면 헤더 행
    const hasStation = rowStr.includes('역사') || rowStr.includes('역명');
    const hasType = rowStr.includes('유형') || rowStr.includes('광고유형');
    const hasLocation = rowStr.includes('위치명') || rowStr.includes('위치코드');
    const hasPrice = rowStr.includes('단가');

    if ((hasStation && hasType) || (hasStation && hasLocation) || (hasType && hasLocation) || (hasStation && hasPrice)) {
      headerRowIndex = i;
      headers = row.map(cell => String(cell || '').trim());
      // 헤더 발견
      break;
    }
  }

  if (headerRowIndex === -1) {
    console.error('헤더 행을 찾을 수 없습니다. 첫 번째 행을 헤더로 사용합니다.');
    headerRowIndex = 0;
    headers = (rawData[0] || []).map(cell => String(cell || '').trim());
  }

  // 헤더 이후의 데이터를 객체 배열로 변환
  const jsonData: Record<string, unknown>[] = [];
  for (let i = headerRowIndex + 1; i < rawData.length; i++) {
    const row = rawData[i];
    if (!row || !Array.isArray(row) || row.every(cell => !cell)) continue;

    const obj: Record<string, unknown> = {};
    headers.forEach((header, idx) => {
      if (header && row[idx] !== undefined) {
        obj[header] = row[idx];
      }
    });

    // 빈 객체가 아닌 경우에만 추가
    if (Object.keys(obj).length > 0) {
      jsonData.push(obj);
    }
  }

  // 파싱 완료
  }

  return jsonData.map((row, index) => {
    const keys = Object.keys(row);

    // 더 유연한 컬럼 매칭 함수
    const getValueByKey = (targetKeys: string[]): string => {
      for (const targetKey of targetKeys) {
        // 정확히 일치하는 키 찾기
        if (row[targetKey] !== undefined && row[targetKey] !== null && row[targetKey] !== '') {
          return String(row[targetKey]).trim();
        }
        // 부분 일치 (공백 제거 후)
        const normalizedTarget = targetKey.replace(/\s+/g, '').toLowerCase();
        for (const key of keys) {
          const normalizedKey = key.replace(/\s+/g, '').toLowerCase();
          if (normalizedKey === normalizedTarget || normalizedKey.includes(normalizedTarget) || normalizedTarget.includes(normalizedKey)) {
            if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
              return String(row[key]).trim();
            }
          }
        }
      }
      return '';
    };

    // 역명: 역사, 역명
    const stationName = getValueByKey(['역사', '역명', 'station_name', '역이름']);
    // 위치코드: 위치명
    const locationCode = getValueByKey(['위치명', '위치코드', 'location_code']);
    // 광고유형: 유형 (없으면 기본 매체유형 사용)
    const adTypeFromExcel = getValueByKey(['유형', '광고유형', 'ad_type', '타입']);
    const adType = adTypeFromExcel || defaultMediaType || '';
    // 추가 정보
    const line = getValueByKey(['호선']);
    const grade = getValueByKey(['등급']);

    // 날짜 컬럼 확인하여 가용 상태 결정 (MM/DD 또는 숫자/문자가 있는 날짜 컬럼)
    // 날짜 컬럼에 값이 있으면 계약됨(OCCUPIED), 없으면 가용(AVAILABLE)
    let hasOccupiedDate = false;
    for (const key of keys) {
      // 날짜 패턴 확인 (01/05, 02/15 등) 또는 미사용 컬럼 제외
      if (/^\d{2}\/\d{2}$/.test(key)) {
        const cellValue = row[key];
        // 값이 있으면 (null, undefined, '' 제외) 계약된 것으로 판단
        if (cellValue !== null && cellValue !== undefined && cellValue !== '') {
          hasOccupiedDate = true;
          break;
        }
      }
    }

    // 상태 컬럼이 있으면 우선 사용, 없으면 날짜 컬럼 기반으로 판단
    const statusFromExcel = getValueByKey(['상태', 'status']);
    let availabilityStatus: AvailabilityStatus;
    if (statusFromExcel) {
      availabilityStatus = mapAvailabilityStatus(statusFromExcel);
    } else {
      availabilityStatus = hasOccupiedDate ? 'OCCUPIED' : 'AVAILABLE';
    }

    // 디버깅: 첫 3개 행
    // 파싱 진행 중 (디버그 로그 제거)

    // 설명에 호선, 등급, 메모 포함
    const memo = getValueByKey(['메모', '설명', 'description']);
    const descParts = [];
    if (line) descParts.push(`${line}호선`);
    if (grade) descParts.push(`${grade}등급`);
    if (memo) descParts.push(memo);

    return {
      stationName,
      locationCode,
      adType,
      adSize: getValueByKey(['크기(mm)', '크기', 'ad_size']) || undefined,
      priceMonthly: parseFloat(String(getValueByKey(['단가(월)', '월단가', 'price_monthly'])).replace(/,/g, '')) || undefined,
      priceWeekly: parseFloat(String(getValueByKey(['단가(주)', '주단가', 'price_weekly'])).replace(/,/g, '')) || undefined,
      availabilityStatus,
      description: descParts.length > 0 ? descParts.join(' / ') : undefined,
    };
  });
}

/**
 * 상태 문자열을 AvailabilityStatus로 변환
 */
function mapAvailabilityStatus(status: string): AvailabilityStatus {
  const statusMap: Record<string, AvailabilityStatus> = {
    '가용': 'AVAILABLE',
    '예약': 'RESERVED',
    '사용중': 'OCCUPIED',
    'available': 'AVAILABLE',
    'reserved': 'RESERVED',
    'occupied': 'OCCUPIED',
  };
  return statusMap[status?.toLowerCase()] || 'AVAILABLE';
}

/**
 * 엑셀 파일 업로드 및 DB 저장
 * @param file - 엑셀 파일
 * @param onProgress - 진행 상황 콜백
 * @param defaultMediaType - 기본 매체 유형 (광고유형 컬럼이 없을 때 사용)
 */
export async function uploadInventoryExcel(
  file: File,
  onProgress?: (current: number, total: number) => void,
  defaultMediaType?: string
): Promise<ExcelUploadResult> {
  try {
    const buffer = await file.arrayBuffer();
    const rows = await parseInventoryExcel(buffer, defaultMediaType);

    if (rows.length === 0) {
      return {
        success: false,
        fileName: file.name,
        rowCount: 0,
        successCount: 0,
        errorCount: 0,
        errors: [{ row: 0, message: '데이터가 없습니다.' }],
      };
    }

    const supabase = getSupabase();
    const orgId = await getOrganizationId();
    const errors: { row: number; message: string }[] = [];
    let successCount = 0;

    // 배치로 저장
    const BATCH_SIZE = 50;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      onProgress?.(i, rows.length);

      const dbRows = batch.map((row, idx) => {
        // 필수 필드 검증
        if (!row.stationName || !row.locationCode || !row.adType) {
          errors.push({
            row: i + idx + 2, // 엑셀 행 번호 (헤더 포함)
            message: '필수 필드 누락 (역명, 위치코드, 광고유형)',
          });
          return null;
        }

        return {
          station_name: row.stationName,
          location_code: row.locationCode,
          ad_type: row.adType,
          ad_size: row.adSize || null,
          price_monthly: row.priceMonthly || null,
          price_weekly: row.priceWeekly || null,
          availability_status: row.availabilityStatus || 'AVAILABLE',
          description: row.description || null,
          organization_id: orgId,
        };
      }).filter(Boolean);

      if (dbRows.length > 0) {
        const { error } = await supabase
          .from('ad_inventory')
          .upsert(dbRows, { onConflict: 'station_name,location_code' });

        if (error) {
          errors.push({ row: i + 1, message: error.message });
        } else {
          successCount += dbRows.length;
        }
      }
    }

    onProgress?.(rows.length, rows.length);

    // 업로드 기록 저장
    await supabase.from('excel_uploads').insert({
      file_name: file.name,
      file_size: file.size,
      row_count: rows.length,
      success_count: successCount,
      error_count: errors.length,
      errors: errors.length > 0 ? errors : null,
    });

    return {
      success: errors.length === 0,
      fileName: file.name,
      rowCount: rows.length,
      successCount,
      errorCount: errors.length,
      errors,
    };
  } catch (error) {
    return {
      success: false,
      fileName: file.name,
      rowCount: 0,
      successCount: 0,
      errorCount: 1,
      errors: [{ row: 0, message: (error as Error).message }],
    };
  }
}

// ============================================
// CRUD 연산
// ============================================

/**
 * 인벤토리 조회
 */
export async function getInventory(filters?: {
  stationName?: string;
  adType?: string;
  status?: AvailabilityStatus;
  minPrice?: number;
  maxPrice?: number;
}): Promise<{ success: boolean; inventory: AdInventory[]; message?: string }> {
  try {
    const supabase = getSupabase();

    let query = supabase
      .from('ad_inventory')
      .select('*')
      .order('station_name', { ascending: true });

    if (filters?.stationName) {
      query = query.eq('station_name', filters.stationName);
    }
    if (filters?.adType) {
      query = query.eq('ad_type', filters.adType);
    }
    if (filters?.status) {
      query = query.eq('availability_status', filters.status);
    }
    if (filters?.minPrice) {
      query = query.gte('price_monthly', filters.minPrice);
    }
    if (filters?.maxPrice) {
      query = query.lte('price_monthly', filters.maxPrice);
    }

    const { data, error } = await query;

    if (error) {
      return { success: false, inventory: [], message: error.message };
    }

    const inventory: AdInventory[] = (data || []).map(mapInventoryFromDB);
    return { success: true, inventory };
  } catch (error) {
    return { success: false, inventory: [], message: (error as Error).message };
  }
}

/**
 * 단일 인벤토리 생성
 */
export async function createInventory(
  inventory: Omit<AdInventory, 'id' | 'createdAt' | 'updatedAt'>
): Promise<{ success: boolean; inventory?: AdInventory; message: string }> {
  try {
    const supabase = getSupabase();
    const orgId = await getOrganizationId();

    const { data, error } = await supabase
      .from('ad_inventory')
      .insert({
        station_name: inventory.stationName,
        location_code: inventory.locationCode,
        ad_type: inventory.adType,
        ad_size: inventory.adSize || null,
        price_monthly: inventory.priceMonthly || null,
        price_weekly: inventory.priceWeekly || null,
        availability_status: inventory.availabilityStatus,
        available_from: inventory.availableFrom || null,
        available_to: inventory.availableTo || null,
        floor_plan_url: inventory.floorPlanUrl || null,
        spot_position_x: inventory.spotPositionX || null,
        spot_position_y: inventory.spotPositionY || null,
        description: inventory.description || null,
        traffic_daily: inventory.trafficDaily || null,
        demographics: inventory.demographics || null,
        organization_id: orgId,
      })
      .select()
      .single();

    if (error) {
      return { success: false, message: error.message };
    }

    return {
      success: true,
      inventory: mapInventoryFromDB(data),
      message: '인벤토리가 생성되었습니다.',
    };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

/**
 * 인벤토리 업데이트
 */
export async function updateInventory(
  id: string,
  updates: Partial<AdInventory>
): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = getSupabase();

    const dbUpdates: Record<string, unknown> = {};
    if (updates.stationName) dbUpdates.station_name = updates.stationName;
    if (updates.locationCode) dbUpdates.location_code = updates.locationCode;
    if (updates.adType) dbUpdates.ad_type = updates.adType;
    if (updates.adSize !== undefined) dbUpdates.ad_size = updates.adSize;
    if (updates.priceMonthly !== undefined) dbUpdates.price_monthly = updates.priceMonthly;
    if (updates.priceWeekly !== undefined) dbUpdates.price_weekly = updates.priceWeekly;
    if (updates.availabilityStatus) dbUpdates.availability_status = updates.availabilityStatus;
    if (updates.availableFrom !== undefined) dbUpdates.available_from = updates.availableFrom;
    if (updates.availableTo !== undefined) dbUpdates.available_to = updates.availableTo;
    if (updates.floorPlanUrl !== undefined) dbUpdates.floor_plan_url = updates.floorPlanUrl;
    if (updates.spotPositionX !== undefined) dbUpdates.spot_position_x = updates.spotPositionX;
    if (updates.spotPositionY !== undefined) dbUpdates.spot_position_y = updates.spotPositionY;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.trafficDaily !== undefined) dbUpdates.traffic_daily = updates.trafficDaily;
    if (updates.demographics !== undefined) dbUpdates.demographics = updates.demographics;

    const { error } = await supabase
      .from('ad_inventory')
      .update(dbUpdates)
      .eq('id', id);

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, message: '인벤토리가 업데이트되었습니다.' };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

/**
 * 인벤토리 상태 업데이트
 */
export async function updateInventoryStatus(
  id: string,
  status: AvailabilityStatus
): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = getSupabase();

    const { error } = await supabase
      .from('ad_inventory')
      .update({ availability_status: status })
      .eq('id', id);

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, message: '상태가 변경되었습니다.' };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

/**
 * 인벤토리 삭제
 */
export async function deleteInventory(id: string): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = getSupabase();

    const { error } = await supabase
      .from('ad_inventory')
      .delete()
      .eq('id', id);

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, message: '인벤토리가 삭제되었습니다.' };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

// ============================================
// 지리적 매칭
// ============================================

/**
 * 특정 역 주변 인벤토리 조회
 */
export async function findInventoryByStation(
  stationName: string
): Promise<AdInventory[]> {
  const result = await getInventory({
    stationName,
    status: 'AVAILABLE',
  });
  return result.inventory;
}

/**
 * 리드(병원) 위치 기반 인근 인벤토리 조회
 */
export async function findInventoryForLead(
  lead: Lead,
  maxDistanceMeters: number = 1000
): Promise<AdInventory[]> {
  if (!lead.latitude || !lead.longitude) {
    return [];
  }

  // 반경 내 역 찾기
  const nearbyStations = SUBWAY_STATIONS.filter(station => {
    const distance = calculateDistance(
      lead.latitude!,
      lead.longitude!,
      station.lat,
      station.lng
    );
    return distance <= maxDistanceMeters;
  });

  if (nearbyStations.length === 0) {
    return [];
  }

  // 해당 역들의 가용 인벤토리 조회
  const stationNames = nearbyStations.map(s => s.name);

  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('ad_inventory')
    .select('*')
    .in('station_name', stationNames)
    .eq('availability_status', 'AVAILABLE')
    .order('station_name');

  if (error || !data) {
    return [];
  }

  return data.map(mapInventoryFromDB);
}

/**
 * 여러 역의 가용 인벤토리 수 조회
 */
export async function getAvailableCountByStation(): Promise<Record<string, number>> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('ad_inventory')
    .select('station_name')
    .eq('availability_status', 'AVAILABLE');

  if (error || !data) {
    return {};
  }

  const counts: Record<string, number> = {};
  data.forEach(row => {
    const station = row.station_name;
    counts[station] = (counts[station] || 0) + 1;
  });

  return counts;
}

// ============================================
// 배치도 관리
// ============================================

/**
 * 배치도 조회
 */
export async function getFloorPlan(
  stationName: string
): Promise<{ success: boolean; floorPlan?: FloorPlan }> {
  try {
    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('floor_plans')
      .select('*')
      .eq('station_name', stationName)
      .single();

    if (error || !data) {
      return { success: false };
    }

    return {
      success: true,
      floorPlan: {
        id: data.id,
        stationName: data.station_name,
        floorName: data.floor_name,
        imageUrl: data.image_url,
        thumbnailUrl: data.thumbnail_url,
        width: data.width,
        height: data.height,
      },
    };
  } catch {
    return { success: false };
  }
}

/**
 * 모든 배치도 조회
 */
export async function getAllFloorPlans(): Promise<FloorPlan[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('floor_plans')
    .select('*')
    .order('station_name');

  if (error || !data) {
    return [];
  }

  return data.map(row => ({
    id: row.id,
    stationName: row.station_name,
    floorName: row.floor_name,
    imageUrl: row.image_url,
    thumbnailUrl: row.thumbnail_url,
    width: row.width,
    height: row.height,
  }));
}

/**
 * 배치도 저장/업데이트
 */
export async function saveFloorPlan(
  stationName: string,
  imageUrl: string,
  options?: {
    floorName?: string;
    width?: number;
    height?: number;
  }
): Promise<{ success: boolean; message: string }> {
  try {
    const supabase = getSupabase();
    const orgId = await getOrganizationId();

    const { error } = await supabase
      .from('floor_plans')
      .upsert({
        station_name: stationName,
        image_url: imageUrl,
        floor_name: options?.floorName || 'B1',
        width: options?.width || null,
        height: options?.height || null,
        organization_id: orgId,
      }, { onConflict: 'station_name' });

    if (error) {
      return { success: false, message: error.message };
    }

    return { success: true, message: '배치도가 저장되었습니다.' };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

// ============================================
// 헬퍼 함수
// ============================================

/**
 * DB 레코드를 AdInventory 객체로 변환
 */
function mapInventoryFromDB(row: Record<string, unknown>): AdInventory {
  return {
    id: String(row.id),
    stationName: String(row.station_name),
    locationCode: String(row.location_code),
    adType: String(row.ad_type),
    adSize: row.ad_size ? String(row.ad_size) : undefined,
    priceMonthly: row.price_monthly ? Number(row.price_monthly) : undefined,
    priceWeekly: row.price_weekly ? Number(row.price_weekly) : undefined,
    availabilityStatus: (row.availability_status as AvailabilityStatus) || 'AVAILABLE',
    availableFrom: row.available_from ? String(row.available_from) : undefined,
    availableTo: row.available_to ? String(row.available_to) : undefined,
    floorPlanUrl: row.floor_plan_url ? String(row.floor_plan_url) : undefined,
    spotPositionX: row.spot_position_x ? Number(row.spot_position_x) : undefined,
    spotPositionY: row.spot_position_y ? Number(row.spot_position_y) : undefined,
    description: row.description ? String(row.description) : undefined,
    trafficDaily: row.traffic_daily ? Number(row.traffic_daily) : undefined,
    demographics: row.demographics ? String(row.demographics) : undefined,
    createdAt: row.created_at ? String(row.created_at) : undefined,
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

/**
 * 광고 유형 목록 조회
 */
export async function getAdTypes(): Promise<string[]> {
  const supabase = getSupabase();

  const { data } = await supabase
    .from('ad_inventory')
    .select('ad_type')
    .order('ad_type');

  if (!data) return [];

  const types = [...new Set(data.map(row => row.ad_type))];
  return types;
}

/**
 * 역 목록 조회 (인벤토리가 있는 역만)
 */
export async function getStationsWithInventory(): Promise<string[]> {
  const supabase = getSupabase();

  const { data } = await supabase
    .from('ad_inventory')
    .select('station_name')
    .order('station_name');

  if (!data) return [];

  const stations = [...new Set(data.map(row => row.station_name))];
  return stations;
}
