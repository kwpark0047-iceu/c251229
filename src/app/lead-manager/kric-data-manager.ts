/**
 * KRIC API 기반 지하철 노선 데이터 관리
 * 실시간 노선 정보 업데이트 및 캐싱
 */

import { useState, useEffect, useCallback } from 'react';
import {
  fetchAllSeoulSubwayRoutes,
  fetchAllSeoulStationInfo,
  convertKRICToSubwayStation,
  convertKRICStationInfoToSubwayStation,
  generateLineRoutes,
  getKRICServiceKey,
  validateServiceKey,
  KRICStation,
  KRICStationInfo,
  LINE_COLORS,
  LINE_CODES
} from './kric-api';
import { SUBWAY_EXITS } from './data/subway-exits';
import { normalizeLineCode } from './utils/subway-utils';


// 캐시 관리
interface CacheData {
  data: any;
  timestamp: number;
  ttl: number;
}

class DataCache {
  private cache = new Map<string, CacheData>();

  set(key: string, data: any, ttl: number = 3600000) { // 1시간 기본
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  clear() {
    this.cache.clear();
  }
}

const cache = new DataCache();

// KRIC 기반 지하철 데이터 관리자
export class KRICSubwayDataManager {
  private static instance: KRICSubwayDataManager;
  private isInitialized = false;
  private lastUpdateTime = 0;
  private serviceKey: string | null = null;
  private pendingRequest: Promise<any> | null = null;

  static getInstance(): KRICSubwayDataManager {
    if (!KRICSubwayDataManager.instance) {
      KRICSubwayDataManager.instance = new KRICSubwayDataManager();
    }
    return KRICSubwayDataManager.instance;
  }

  private constructor() { }

  /**
   * 데이터 매니저 초기화
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.serviceKey = getKRICServiceKey();

      // API 키 유효성 검증
      const isValid = await validateServiceKey(this.serviceKey);
      if (!isValid) {
        throw new Error('Invalid KRIC API service key');
      }

      this.isInitialized = true;
      console.log('✅ KRIC Subway Data Manager initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize KRIC Subway Data Manager:', error);
      throw error;
    }
  }

  /**
   * 전체 노선 데이터 가져오기 (캐시 활용)
   */
  async getAllSubwayData(forceRefresh = false): Promise<{
    stations: Array<{ name: string; lat: number; lng: number; lines: string[]; address?: string; phone?: string; facilities?: string }>;
    routes: Record<string, { color: string; coords: [number, number][] }>;
  }> {
    const cacheKey = 'kric_all_subway_data';

    if (!forceRefresh) {
      const cached = cache.get(cacheKey);
      if (cached) {
        console.log('📦 Using cached subway data');
        return cached;
      }
    }

    if (this.pendingRequest) {
      console.log('⏳ Waiting for pending subway data request...');
      return this.pendingRequest;
    }

    this.pendingRequest = (async () => {
      try {
        console.log('🔄 Fetching fresh subway data from KRIC API...');

        // 노선 정보와 역사 정보를 병렬로 가져오기
        const [kricStations, kricStationInfos] = await Promise.all([
          fetchAllSeoulSubwayRoutes(this.serviceKey!),
          fetchAllSeoulStationInfo(this.serviceKey!)
        ]);

        // 1. 노선 정보 데이터 정규화 및 병합
        const allKricStations: KRICStation[] = Object.values(kricStations).flat();
        const basicStations = convertKRICToSubwayStation(allKricStations);
        const detailedStations = convertKRICStationInfoToSubwayStation(kricStationInfos);

        let mergedStations = this.mergeStationData(basicStations, detailedStations);
        let routes = generateLineRoutes(kricStations);

        // 2. 지능형 노선별 폴백 (API 결과가 부족한 노선에 대해 정적 데이터 적용)
        try {
          const { TOTAL_SUBWAY_STATIONS } = await import('./data/stations');
          const { generateSubwayRoutes } = await import('./utils/subway-utils');
          const staticRoutes = generateSubwayRoutes();

          // KRIC에서 누락된 노선(routes에 없거나 역이 적은 경우)을 정적 데이터로 보충
          Object.entries(staticRoutes).forEach(([lineCode, data]) => {
            // KRIC 응답에 해당 노선이 없거나, 정적 데이터의 역 개수가 현저히 많은 경우 폴백
            if (!routes[lineCode] || routes[lineCode].coords.length < data.coords.length * 0.5) {
              console.log(`⚠️ Line ${lineCode}: Falling back to static route data`);
              routes[lineCode] = data;
            }
          });

          // KRIC에서 누락된 역사 정보 보충
          const kricStationNames = new Set(mergedStations.map(s => s.name));
          TOTAL_SUBWAY_STATIONS.forEach(staticStation => {
            if (!kricStationNames.has(staticStation.name)) {
              mergedStations.push({
                ...staticStation,
                address: '정보 없음',
                phone: '',
                facilities: ''
              });
            }
          });
        } catch (fallbackError) {
          console.error('⚠️ Failed to apply partial static fallback:', fallbackError);
        }

        const result = { stations: mergedStations, routes };

        // 30분 캐시
        cache.set(cacheKey, result, 1800000);
        this.lastUpdateTime = Date.now();

        if (mergedStations.length > 0) {
          console.log(`✅ Loaded ${mergedStations.length} stations and ${Object.keys(routes).length} lines`);
        }
        return result;

      } catch (error) {
        console.error('❌ Failed to fetch subway data:', error);

        // 캐시된 데이터가 있으면 반환
        const cached = cache.get(cacheKey);
        if (cached) {
          console.log('📦 Falling back to cached data');
          return cached;
        }

        // 정적 데이터로 최종 fallback
        console.log('📦 Falling back to static data');
        const { SUBWAY_STATIONS } = await import('./constants');
        const { generateSubwayRoutes } = await import('./utils/subway-utils');

        return {
          stations: SUBWAY_STATIONS,
          routes: generateSubwayRoutes()
        };
      } finally {
        this.pendingRequest = null;
      }
    })();

    return this.pendingRequest;
  }

  /**
   * 기본 역 정보와 상세 역 정보 병합
   */
  private mergeStationData(
    basicStations: Array<{ name: string; lat: number; lng: number; lines: string[] }>,
    detailedStations: Array<{ name: string; lat: number; lng: number; lines: string[]; address?: string; phone?: string; facilities?: string }>
  ): Array<{ name: string; lat: number; lng: number; lines: string[]; address?: string; phone?: string; facilities?: string }> {
    const stationMap = new Map();

    // 기본 정보로 맵 초기화
    basicStations.forEach(station => {
      stationMap.set(station.name, { ...station });
    });

    // 상세 정보로 병합
    detailedStations.forEach(detailed => {
      const existing = stationMap.get(detailed.name);
      if (existing) {
        // 좌표가 더 정확한 경우(상세 데이터가 있고 0,0이 아닌 경우) 업데이트
        if (detailed.lat !== 0 && detailed.lng !== 0) {
          existing.lat = detailed.lat;
          existing.lng = detailed.lng;
        }
        // 추가 정보 병합
        existing.address = detailed.address || existing.address;
        existing.phone = detailed.phone || existing.phone;
        existing.facilities = detailed.facilities || existing.facilities;

        // 노선 정보 병합
        const existingLines = new Set(existing.lines);
        detailed.lines.forEach(line => existingLines.add(line));
        existing.lines = Array.from(existingLines);
      } else if (detailed.lat !== 0 && detailed.lng !== 0) {
        // 새로운 역 추가 (유효한 좌표가 있을 때만)
        stationMap.set(detailed.name, { ...detailed });
      }
    });

    return Array.from(stationMap.values());
  }

  /**
   * 특정 노선 데이터만 가져오기
   */
  async getLineData(lineCode: string): Promise<{
    stations: KRICStation[];
    route: { color: string; coords: [number, number][] };
  }> {
    const cacheKey = `kric_line_${lineCode}`;

    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const { fetchSubwayRouteInfo, AREA_CODES } = await import('./kric-api');
      const stations = await fetchSubwayRouteInfo(
        this.serviceKey!,
        AREA_CODES.SEOUL,
        lineCode
      );

      const { generateLineRoutes } = await import('./kric-api');
      const routes = generateLineRoutes({ [lineCode]: stations });
      const route = routes[lineCode];

      const result = { stations, route };
      cache.set(cacheKey, result, 3600000); // 1시간 캐시

      return result;
    } catch (error) {
      console.error(`❌ Failed to fetch line ${lineCode} data:`, error);
      throw error;
    }
  }

  /**
   * 마지막 업데이트 시간
   */
  getLastUpdateTime(): number {
    return this.lastUpdateTime;
  }

  /**
   * 캐시 초기화
   */
  clearCache(): void {
    cache.clear();
    console.log('🗑️ KRIC Subway Data cache cleared');
  }

  /**
   * 데이터 상태 정보
   */
  getStatus(): {
    isInitialized: boolean;
    lastUpdateTime: number;
    cacheSize: number;
  } {
    return {
      isInitialized: this.isInitialized,
      lastUpdateTime: this.lastUpdateTime,
      cacheSize: (cache as any).cache.size,
    };
  }

  /**
   * 위치와 주소를 기반으로 최적의 인근 역사 검색 (가중치 적용)
   */
  async findNearbyStation(
    lat: number,
    lng: number,
    address?: string
  ): Promise<{ station: any; distance: number } | null> {
    const data = await this.getAllSubwayData();
    const stations = data.stations;

    if (!stations || stations.length === 0) return null;

    const { calculateDistance, extractDistrict, extractNeighborhood } = await import('./utils');
    const bizDistrict = extractDistrict(address);
    const bizNeighborhood = extractNeighborhood(address);

    let bestMatch: { station: any; distance: number; score: number } | null = null;

    for (const station of stations) {
      if (!station.lat || !station.lng) continue;

      // 1. 물리적 거리 계산 (미터)
      const physicalDistance = calculateDistance(lat, lng, station.lat, station.lng);

      // 최대 3km 이내 역만 고려
      if (physicalDistance > 3000) continue;

      // 2. 주소지 보정 (Score 기반)
      let discountFactor = 1.0;

      if (address && station.address) {
        const stationDistrict = extractDistrict(station.address);
        const stationNeighborhood = extractNeighborhood(station.address);

        // '동'이 일치하면 거리를 25% 가상 할인 (강력한 매칭)
        if (bizNeighborhood && stationNeighborhood && bizNeighborhood === stationNeighborhood) {
          discountFactor *= 0.75;
        }
        // '구'가 일치하면 거리를 10% 할인
        else if (bizDistrict && stationDistrict && bizDistrict === stationDistrict) {
          discountFactor *= 0.90;
        }
      }

      const weightedDistance = physicalDistance * discountFactor;

      if (!bestMatch || weightedDistance < bestMatch.score) {
        bestMatch = { station, distance: physicalDistance, score: weightedDistance };
      }
    }

    return bestMatch ? { station: bestMatch.station, distance: bestMatch.distance } : null;
  }

  /**
   * 특정 역사와 좌표를 기준으로 가장 가까운 출구 번호 검색
   */
  async findNearestExit(
    stationName: string,
    lat: number,
    lng: number
  ): Promise<string | null> {
    const stationExits = SUBWAY_EXITS.filter(exit => 
      exit.stationName === stationName || 
      exit.stationName === stationName.replace(/역$/, '')
    );

    if (stationExits.length === 0) return null;

    const { calculateDistance } = await import('./utils');
    let nearestExit: string | null = null;
    let minDistance = Infinity;

    for (const exit of stationExits) {
      const distance = calculateDistance(lat, lng, exit.lat, exit.lng);
      if (distance < minDistance) {
        minDistance = distance;
        nearestExit = exit.exitNo;
      }
    }

    return nearestExit;
  }
}


// 싱글톤 인스턴스
export const subwayDataManager = KRICSubwayDataManager.getInstance();

/**
 * 초기화 함수
 */
export async function initializeSubwayData(): Promise<void> {
  try {
    await subwayDataManager.initialize();
    await subwayDataManager.getAllSubwayData();
  } catch (error) {
    console.error('Failed to initialize subway data:', error);
    throw error;
  }
}

/**
 * 실시간 노선 데이터 가져오기
 */
export async function getRealtimeSubwayData(forceRefresh = false) {
  return subwayDataManager.getAllSubwayData(forceRefresh);
}

/**
 * 노선별 색상 정보 (KRIC 기준)
 */
export const KRIC_LINE_COLORS = {
  '1001': '#0052A4', // 1호선
  '1002': '#00A84D', // 2호선
  '1003': '#EF7C1C', // 3호선
  '1004': '#00A5DE', // 4호선
  '1005': '#996CAC', // 5호선
  '1006': '#CD7E2F', // 6호선
  '1007': '#727FB8', // 7호선
  '1008': '#E6186A', // 8호선
  '1009': '#BAB135', // 9호선
  '1077': '#D4003A', // 신분당선
  '1085': '#F5A200', // 수인분당선
  '1063': '#77BB4A', // 경의중앙선
  '1067': '#807DB8', // 경춘선
  '1065': '#009D3E', // 공항철도
  '1099': '#FDA600', // 의정부경전철
  '1086': '#6FB245', // 에버라인
  '1087': '#A17800', // 김포골드라인
  '1090': '#81A914', // 서해선
  '1061': '#7CA8D5', // 인천 1호선
  '1069': '#ED8B00', // 인천 2호선
  '1092': '#B0CE18', // 우이신설선
  '1093': '#6789CA', // 신림선
  '1081': '#003DA5', // 경강선
  'S': '#D4003A',    // 신분당선 (Local)
  'B': '#F5A200',    // 수인분당선 (Local)
  'K': '#77BB4A',    // 경의중앙선 (Local)
  'G': '#807DB8',    // 경춘선 (Local)
  'A': '#009D3E',    // 공항철도 (Local)
  'Ui': '#B0CE18',   // 우이신설 (Local)
  'Si': '#6789CA',   // 신림선 (Local)
  'Kg': '#003DA5',   // 경강선 (Local)
  'W': '#81A914',    // 서해선 (Local)
  'E': '#6FB245',    // 에버라인 (Local)
  'U': '#FDA600',    // 의정부 (Local)
} as const;

/**
 * 노선코드를 간단한 라인명으로 변환 (subway-utils의 normalizeLineCode로 대체)
 */
export function getLineDisplayName(lineCode: string): string {
  return normalizeLineCode(lineCode);
}

/**
 * 데이터 새로고침 훅
 */
export function useSubwayDataRefresh() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await subwayDataManager.getAllSubwayData(true);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Failed to refresh subway data:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // 초기 로드
    refresh();

    // 30분마다 자동 새로고침
    const interval = setInterval(refresh, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [refresh]);

  return { isRefreshing, lastUpdate, refresh };
}
