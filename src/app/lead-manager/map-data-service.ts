/**
 * 지도 데이터 최적화 서비스
 * 공간 인덱싱, 클러스터링, 캐싱
 */

import { Lead } from './types';

// 공간 해시 그리드
class SpatialHashGrid {
  private cellSize: number;
  private grid: Map<string, Lead[]> = new Map();

  constructor(cellSize: number = 0.001) { // 약 100m 그리드
    this.cellSize = cellSize;
  }

  private getCellKey(lat: number, lng: number): string {
    const x = Math.floor(lng / this.cellSize);
    const y = Math.floor(lat / this.cellSize);
    return `${x},${y}`;
  }

  insert(lead: Lead): void {
    if (!lead.lat || !lead.lng) return;

    const key = this.getCellKey(lead.lat, lead.lng);
    
    if (!this.grid.has(key)) {
      this.grid.set(key, []);
    }
    
    this.grid.get(key)!.push(lead);
  }

  query(bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  }): Lead[] {
    const results: Lead[] = [];
    
    const minX = Math.floor(bounds.minLng / this.cellSize);
    const maxX = Math.floor(bounds.maxLng / this.cellSize);
    const minY = Math.floor(bounds.minLat / this.cellSize);
    const maxY = Math.floor(bounds.maxLat / this.cellSize);

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const key = `${x},${y}`;
        const cell = this.grid.get(key);
        
        if (cell) {
          results.push(...cell);
        }
      }
    }

    return results.filter(lead => 
      lead.lat! >= bounds.minLat &&
      lead.lat! <= bounds.maxLat &&
      lead.lng! >= bounds.minLng &&
      lead.lng! <= bounds.maxLng
    );
  }

  clear(): void {
    this.grid.clear();
  }
}

// 마커 클러스터링 알고리즘
class MarkerClusterer {
  private maxDistance: number;
  private minClusterSize: number;

  constructor(maxDistance: number = 0.002, minClusterSize: number = 5) { // 약 200m
    this.maxDistance = maxDistance;
    this.minClusterSize = minClusterSize;
  }

  cluster(leads: Lead[]): Array<{
    type: 'marker' | 'cluster';
    leads: Lead[];
    position: [number, number];
  }> {
    const clusters: Array<{
      leads: Lead[];
      position: [number, number];
    }> = [];
    const processed = new Set<string>();

    leads.forEach(lead => {
      if (processed.has(lead.id)) return;

      const nearbyLeads = this.findNearbyLeads(lead, leads, processed);
      
      if (nearbyLeads.length >= this.minClusterSize) {
        const position = this.calculateClusterCenter(nearbyLeads);
        clusters.push({
          leads: nearbyLeads,
          position,
        });
        
        nearbyLeads.forEach(l => processed.add(l.id));
      } else {
        clusters.push({
          leads: [lead],
          position: [lead.lat!, lead.lng!],
        });
        processed.add(lead.id);
      }
    });

    return clusters.map(cluster => ({
      type: cluster.leads.length === 1 ? 'marker' : 'cluster',
      leads: cluster.leads,
      position: cluster.position,
    }));
  }

  private findNearbyLeads(
    targetLead: Lead,
    allLeads: Lead[],
    processed: Set<string>
  ): Lead[] {
    const nearby: Lead[] = [targetLead];
    const toCheck = [targetLead];
    const checked = new Set<string>([targetLead.id]);

    while (toCheck.length > 0) {
      const current = toCheck.pop()!;
      
      allLeads.forEach(lead => {
        if (checked.has(lead.id) || processed.has(lead.id)) return;

        const distance = this.calculateDistance(
          current.lat!,
          current.lng!,
          lead.lat!,
          lead.lng!
        );

        if (distance <= this.maxDistance) {
          nearby.push(lead);
          toCheck.push(lead);
          checked.add(lead.id);
        }
      });
    }

    return nearby;
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // 지구 반지름 (미터)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  private calculateClusterCenter(leads: Lead[]): [number, number] {
    const avgLat = leads.reduce((sum, lead) => sum + lead.lat!, 0) / leads.length;
    const avgLng = leads.reduce((sum, lead) => sum + lead.lng!, 0) / leads.length;
    return [avgLat, avgLng];
  }
}

// 지도 데이터 캐시
class MapDataCache {
  private cache = new Map<string, {
    data: any;
    timestamp: number;
    accessCount: number;
  }>();
  private maxCacheSize = 100;
  private cacheTimeout = 5 * 60 * 1000; // 5분

  set(key: string, data: any): void {
    // LRU 정책
    if (this.cache.size >= this.maxCacheSize) {
      const leastUsed = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.accessCount - b.accessCount)[0];
      
      this.cache.delete(leastUsed[0]);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      accessCount: 0,
    });
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    
    if (!item) return null;

    // 만료 체크
    if (Date.now() - item.timestamp > this.cacheTimeout) {
      this.cache.delete(key);
      return null;
    }

    item.accessCount++;
    return item.data;
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): { size: number; hitRate: number } {
    // 단순화된 통계
    return {
      size: this.cache.size,
      hitRate: 0, // 실제 구현에서는 히트/미스 카운트 필요
    };
  }
}

/**
 * 최적화된 지도 데이터 서비스
 */
export class MapDataService {
  private spatialGrid: SpatialHashGrid;
  private clusterer: MarkerClusterer;
  private cache: MapDataCache;
  private leads: Lead[] = [];

  constructor() {
    this.spatialGrid = new SpatialHashGrid();
    this.clusterer = new MarkerClusterer();
    this.cache = new MapDataCache();
  }

  /**
   * 리드 데이터 설정
   */
  setLeads(leads: Lead[]): void {
    this.leads = leads;
    this.spatialGrid.clear();
    
    leads.forEach(lead => {
      this.spatialGrid.insert(lead);
    });

    // 캐시 무효화
    this.cache.clear();
  }

  /**
   * 경계 내 리드 조회 (공간 인덱싱 활용)
   */
  getLeadsInBounds(bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  }): Lead[] {
    const cacheKey = `bounds-${bounds.minLat}-${bounds.maxLat}-${bounds.minLng}-${bounds.maxLng}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    const leads = this.spatialGrid.query(bounds);
    this.cache.set(cacheKey, leads);
    
    return leads;
  }

  /**
   * 클러스터링된 마커 생성
   */
  getClusteredMarkers(
    bounds: {
      minLat: number;
      maxLat: number;
      minLng: number;
      maxLng: number;
    },
    zoom: number
  ): Array<{
    type: 'marker' | 'cluster';
    leads: Lead[];
    position: [number, number];
  }> {
    const cacheKey = `cluster-${bounds.minLat}-${bounds.maxLat}-${bounds.minLng}-${bounds.maxLng}-${zoom}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    const leadsInBounds = this.getLeadsInBounds(bounds);
    
    // 확대 수준에 따라 클러스터링 조정
    const maxDistance = zoom < 12 ? 0.005 : zoom < 15 ? 0.002 : 0.001;
    const minClusterSize = zoom < 12 ? 10 : zoom < 15 ? 5 : 3;
    
    this.clusterer = new MarkerClusterer(maxDistance, minClusterSize);
    const clusters = this.clusterer.cluster(leadsInBounds);
    
    this.cache.set(cacheKey, clusters);
    return clusters;
  }

  /**
   * 가장 가까운 리드 검색
   */
  findNearestLeads(
    centerLat: number,
    centerLng: number,
    radius: number = 1000, // 미터
    limit: number = 10
  ): Lead[] {
    const cacheKey = `nearest-${centerLat}-${centerLng}-${radius}-${limit}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    // 대략적인 경계 계산
    const latDelta = radius / 111000; // 약 1도 = 111km
    const lngDelta = radius / (111000 * Math.cos(centerLat * Math.PI / 180));

    const bounds = {
      minLat: centerLat - latDelta,
      maxLat: centerLat + latDelta,
      minLng: centerLng - lngDelta,
      maxLng: centerLng + lngDelta,
    };

    const candidates = this.getLeadsInBounds(bounds);
    
    // 정확한 거리 계산 및 정렬
    const withDistance = candidates.map(lead => ({
      lead,
      distance: this.calculateDistance(centerLat, centerLng, lead.lat!, lead.lng!),
    }));

    const filtered = withDistance
      .filter(item => item.distance <= radius)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit)
      .map(item => item.lead);

    this.cache.set(cacheKey, filtered);
    return filtered;
  }

  /**
   * 리드 통계 계산
   */
  getStats(bounds?: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  }): {
    total: number;
    byStatus: Record<string, number>;
    byCategory: Record<string, number>;
    byStation: Record<string, number>;
  } {
    const cacheKey = `stats-${bounds ? JSON.stringify(bounds) : 'all'}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    const leads = bounds ? this.getLeadsInBounds(bounds) : this.leads;

    const stats = {
      total: leads.length,
      byStatus: leads.reduce((acc, lead) => {
        acc[lead.status] = (acc[lead.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byCategory: leads.reduce((acc, lead) => {
        acc[lead.category] = (acc[lead.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byStation: leads.reduce((acc, lead) => {
        acc[lead.nearestStation] = (acc[lead.nearestStation] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };

    this.cache.set(cacheKey, stats);
    return stats;
  }

  /**
   * 열맵 데이터 생성
   */
  getHeatmapData(bounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  }): Array<{ lat: number; lng: number; intensity: number }> {
    const cacheKey = `heatmap-${bounds.minLat}-${bounds.maxLat}-${bounds.minLng}-${bounds.maxLng}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached) {
      return cached;
    }

    const leads = this.getLeadsInBounds(bounds);
    
    // 그리드 기반 열맵 데이터 생성
    const gridSize = 0.001; // 약 100m
    const grid = new Map<string, number>();

    leads.forEach(lead => {
      const x = Math.floor(lead.lng! / gridSize);
      const y = Math.floor(lead.lat! / gridSize);
      const key = `${x},${y}`;
      
      grid.set(key, (grid.get(key) || 0) + 1);
    });

    const heatmapData = Array.from(grid.entries()).map(([key, count]) => {
      const [x, y] = key.split(',').map(Number);
      return {
        lat: y * gridSize + gridSize / 2,
        lng: x * gridSize + gridSize / 2,
        intensity: Math.min(count / 10, 1), // 최대 강도 1로 정규화
      };
    });

    this.cache.set(cacheKey, heatmapData);
    return heatmapData;
  }

  /**
   * 캐시 관리
   */
  clearCache(): void {
    this.cache.clear();
  }

  getCacheStats(): { size: number; hitRate: number } {
    return this.cache.getStats();
  }

  /**
   * 거리 계산 (Haversine 공식)
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // 지구 반지름 (미터)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}

// 싱글톤 인스턴스
export const mapDataService = new MapDataService();
