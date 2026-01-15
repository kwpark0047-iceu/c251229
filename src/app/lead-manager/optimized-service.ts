/**
 * 최적화된 API 서비스
 * 대용량 데이터 처리 성능 개선
 */

import { createClient } from '@/lib/supabase/client';
import { Lead, LeadStatus, BusinessCategory } from './types';

// 배치 처리 크기
const BATCH_SIZE = 50;
const CACHE_DURATION = 5 * 60 * 1000; // 5분

// 캐시 저장소
class DataCache {
  private cache = new Map<string, { data: any; timestamp: number }>();

  set(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > CACHE_DURATION) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

const dataCache = new DataCache();

/**
 * 최적화된 리드 조회
 */
export async function getLeadsOptimized(
  organizationId: string,
  statuses?: LeadStatus[],
  searchQuery?: string,
  page: number = 1,
  pageSize: number = 50
): Promise<{ leads: Lead[]; total: number; hasMore: boolean }> {
  const cacheKey = `leads-${organizationId}-${JSON.stringify(statuses)}-${searchQuery}-${page}`;
  const cached = dataCache.get(cacheKey);
  
  if (cached) {
    return cached;
  }

  const supabase = createClient();
  
  let query = supabase
    .from('leads')
    .select('*', { count: 'exact' })
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  // 상태 필터링
  if (statuses && statuses.length > 0) {
    query = query.in('status', statuses);
  }

  // 검색어 필터링
  if (searchQuery) {
    query = query.or(`biz_name.ilike.%${searchQuery}%,road_address.ilike.%${searchQuery}%`);
  }

  const { data, error, count } = await query;

  if (error) throw error;

  const result = {
    leads: data || [],
    total: count || 0,
    hasMore: (count || 0) > page * pageSize,
  };

  dataCache.set(cacheKey, result);
  return result;
}

/**
 * 배치 리드 저장
 */
export async function saveLeadsBatch(leads: Partial<Lead>[]): Promise<{ success: boolean; saved: number; errors: any[] }> {
  const supabase = createClient();
  const errors: any[] = [];
  let saved = 0;

  // 배치 단위로 처리
  for (let i = 0; i < leads.length; i += BATCH_SIZE) {
    const batch = leads.slice(i, i + BATCH_SIZE);
    
    try {
      // 중복 체크
      const { data: existing } = await supabase
        .from('leads')
        .select('biz_name, road_address')
        .in('biz_name', batch.map(l => l.bizName!))
        .in('road_address', batch.map(l => l.roadAddress!));

      const existingSet = new Set(
        existing?.map(item => `${item.biz_name}|${item.road_address}`) || []
      );

      // 중복되지 않은 데이터만 필터링
      const newLeads = batch.filter(lead => {
        const key = `${lead.bizName}|${lead.roadAddress}`;
        return !existingSet.has(key);
      });

      if (newLeads.length > 0) {
        const { error } = await supabase
          .from('leads')
          .insert(newLeads.map(lead => ({
            biz_name: lead.bizName,
            road_address: lead.roadAddress,
            biz_type: lead.bizType,
            category: lead.category,
            status: lead.status || 'NEW',
            nearest_station: lead.nearestStation,
            distance: lead.distance,
            lat: lead.lat,
            lng: lead.lng,
            organization_id: lead.organizationId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })));

        if (error) {
          errors.push(error);
        } else {
          saved += newLeads.length;
        }
      }
    } catch (error) {
      errors.push(error);
    }

    // 다음 배치를 위해 잠시 대기
    if (i + BATCH_SIZE < leads.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // 캐시 무효화
  dataCache.clear();

  return { success: errors.length === 0, saved, errors };
}

/**
 * 스트리밍 리드 가져오기
 */
export async function* streamLeads(
  organizationId: string,
  statuses?: LeadStatus[],
  searchQuery?: string
): AsyncGenerator<Lead[], void, unknown> {
  let page = 1;
  const pageSize = 100;

  while (true) {
    const { leads, hasMore } = await getLeadsOptimized(
      organizationId,
      statuses,
      searchQuery,
      page,
      pageSize
    );

    if (leads.length === 0) break;

    yield leads;

    if (!hasMore) break;

    page++;
  }
}

/**
 * 병렬 리드 상태 업데이트
 */
export async function updateLeadStatusesBatch(
  updates: { id: string; status: LeadStatus }[]
): Promise<{ success: boolean; updated: number; errors: any[] }> {
  const supabase = createClient();
  const errors: any[] = [];
  let updated = 0;

  // 병렬 처리 (최대 5개 동시)
  const chunks = [];
  for (let i = 0; i < updates.length; i += 5) {
    chunks.push(updates.slice(i, i + 5));
  }

  for (const chunk of chunks) {
    const promises = chunk.map(async ({ id, status }) => {
      try {
        const { error } = await supabase
          .from('leads')
          .update({
            status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (error) throw error;
        return { success: true, id };
      } catch (error) {
        return { success: false, id, error };
      }
    });

    const results = await Promise.allSettled(promises);
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value.success) {
        updated++;
      } else {
        errors.push(result.status === 'rejected' ? result.reason : result.value.error);
      }
    });
  }

  // 캐시 무효화
  dataCache.clear();

  return { success: errors.length === 0, updated, errors };
}

/**
 * 인덱싱된 검색
 */
export async function searchLeadsIndexed(
  organizationId: string,
  query: string,
  filters: {
    statuses?: LeadStatus[];
    categories?: BusinessCategory[];
    stations?: string[];
    distanceRange?: { min: number; max: number };
  } = {}
): Promise<Lead[]> {
  const cacheKey = `search-${organizationId}-${query}-${JSON.stringify(filters)}`;
  const cached = dataCache.get(cacheKey);
  
  if (cached) {
    return cached;
  }

  const supabase = createClient();
  
  // 기본 쿼리
  let dbQuery = supabase
    .from('leads')
    .select('*')
    .eq('organization_id', organizationId);

  // 텍스트 검색 (인덱스 활용)
  if (query) {
    dbQuery = dbQuery.or(`biz_name.ilike.%${query}%,road_address.ilike.%${query}%`);
  }

  // 상태 필터
  if (filters.statuses && filters.statuses.length > 0) {
    dbQuery = dbQuery.in('status', filters.statuses);
  }

  // 카테고리 필터
  if (filters.categories && filters.categories.length > 0) {
    dbQuery = dbQuery.in('category', filters.categories);
  }

  // 역사 필터
  if (filters.stations && filters.stations.length > 0) {
    dbQuery = dbQuery.in('nearest_station', filters.stations);
  }

  // 거리 범위 필터
  if (filters.distanceRange) {
    dbQuery = dbQuery
      .gte('distance', filters.distanceRange.min)
      .lte('distance', filters.distanceRange.max);
  }

  // 정렬 및 제한
  dbQuery = dbQuery
    .order('created_at', { ascending: false })
    .limit(500); // 최대 500개 결과

  const { data, error } = await dbQuery;

  if (error) throw error;

  const result = data || [];
  dataCache.set(cacheKey, result);
  return result;
}

/**
 * 통계 데이터 캐싱
 */
export async function getLeadStatsCached(organizationId: string): Promise<{
  total: number;
  byStatus: Record<LeadStatus, number>;
  byCategory: Record<BusinessCategory, number>;
  byStation: Record<string, number>;
  recentActivity: number;
}> {
  const cacheKey = `stats-${organizationId}`;
  const cached = dataCache.get(cacheKey);
  
  if (cached) {
    return cached;
  }

  const supabase = createClient();
  
  // 병렬로 통계 데이터 조회
  const [
    totalResult,
    statusResult,
    categoryResult,
    stationResult,
    recentResult,
  ] = await Promise.all([
    supabase.from('leads').select('id', { count: 'exact' }).eq('organization_id', organizationId),
    supabase.from('leads').select('status').eq('organization_id', organizationId),
    supabase.from('leads').select('category').eq('organization_id', organizationId),
    supabase.from('leads').select('nearest_station').eq('organization_id', organizationId),
    supabase
      .from('leads')
      .select('id', { count: 'exact' })
      .eq('organization_id', organizationId)
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const stats = {
    total: totalResult.count || 0,
    byStatus: statusResult.data?.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1;
      return acc;
    }, {} as Record<LeadStatus, number>) || {},
    byCategory: categoryResult.data?.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {} as Record<BusinessCategory, number>) || {},
    byStation: stationResult.data?.reduce((acc, item) => {
      acc[item.nearest_station] = (acc[item.nearest_station] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {},
    recentActivity: recentResult.count || 0,
  };

  dataCache.set(cacheKey, stats);
  return stats;
}

/**
 * 캐시 관리
 */
export function clearCache(): void {
  dataCache.clear();
}

export function getCacheInfo(): { size: number; keys: string[] } {
  return {
    size: dataCache.size(),
    keys: Array.from((dataCache as any).cache.keys()),
  };
}

/**
 * 데이터 압축 전송
 */
export async function getCompressedLeads(
  organizationId: string,
  compressionLevel: 'none' | 'basic' | 'full' = 'basic'
): Promise<{ leads: any; compressed: boolean; size: number }> {
  const { leads } = await getLeadsOptimized(organizationId);

  if (compressionLevel === 'none') {
    return { leads, compressed: false, size: JSON.stringify(leads).length };
  }

  // 기본 압축: 불필요한 필드 제거
  if (compressionLevel === 'basic') {
    const compressed = leads.map(lead => ({
      id: lead.id,
      bizName: lead.bizName,
      status: lead.status,
      nearestStation: lead.nearestStation,
      distance: lead.distance,
      createdAt: lead.createdAt,
    }));

    return {
      leads: compressed,
      compressed: true,
      size: JSON.stringify(compressed).length,
    };
  }

  // 전체 압축: 최소 필드만
  if (compressionLevel === 'full') {
    const compressed = leads.map(lead => ({
      id: lead.id,
      n: lead.bizName, // 필드명 축소
      s: lead.status,
      st: lead.nearestStation,
      d: lead.distance,
    }));

    return {
      leads: compressed,
      compressed: true,
      size: JSON.stringify(compressed).length,
    };
  }

  return { leads, compressed: false, size: 0 };
}
