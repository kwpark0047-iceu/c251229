/**
 * KRIC API 기반 지하철 노선 데이터 관리
 * 실시간 노선 정보 업데이트 및 캐싱
 */

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
  
  static getInstance(): KRICSubwayDataManager {
    if (!KRICSubwayDataManager.instance) {
      KRICSubwayDataManager.instance = new KRICSubwayDataManager();
    }
    return KRICSubwayDataManager.instance;
  }
  
  private constructor() {}
  
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
    
    try {
      console.log('🔄 Fetching fresh subway data from KRIC API...');
      
      // 노선 정보와 역사 정보를 병렬로 가져오기
      const [kricStations, kricStationInfos] = await Promise.all([
        fetchAllSeoulSubwayRoutes(this.serviceKey!),
        fetchAllSeoulStationInfo(this.serviceKey!)
      ]);
      
      // 노선 정보로 기본 역 데이터 생성
      const basicStations = convertKRICToSubwayStation(
        Object.values(kricStations).flat()
      );
      
      // 상세 역사 정보로 추가 데이터 병합
      const detailedStations = convertKRICStationInfoToSubwayStation(kricStationInfos);
      
      // 두 데이터를 병합하여 최종 역 정보 생성
      const mergedStations = this.mergeStationData(basicStations, detailedStations);
      
      const routes = generateLineRoutes(kricStations);
      
      const result = { stations: mergedStations, routes };
      
      // 30분 캐시
      cache.set(cacheKey, result, 1800000);
      this.lastUpdateTime = Date.now();
      
      console.log(`✅ Loaded ${mergedStations.length} stations and ${Object.keys(routes).length} lines`);
      return result;
      
    } catch (error) {
      console.error('❌ Failed to fetch subway data:', error);
      
      // 캐시된 데이터가 있으면 반환
      const cached = cache.get(cacheKey);
      if (cached) {
        console.log('📦 Falling back to cached data');
        return cached;
      }
      
      throw error;
    }
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
        // 좌표가 더 정확한 경우 업데이트
        if (detailed.lat && detailed.lng) {
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
      } else {
        // 새로운 역 추가
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
  '1090': '#0079C2', // 서해선
} as const;

/**
 * 노선코드를 간단한 라인명으로 변환
 */
export function getLineDisplayName(lineCode: string): string {
  const lineNames: Record<string, string> = {
    '1001': '1',      // 1호선
    '1002': '2',      // 2호선
    '1003': '3',      // 3호선
    '1004': '4',      // 4호선
    '1005': '5',      // 5호선
    '1006': '6',      // 6호선
    '1007': '7',      // 7호선
    '1008': '8',      // 8호선
    '1009': '9',      // 9호선
    '1077': 'S',      // 신분당선
    '1085': 'B',      // 수인분당선
    '1063': 'K',      // 경의중앙선
    '1067': 'G',      // 경춘선
    '1065': 'A',      // 공항철도
    '1099': 'U',      // 의정부경전철
    '1086': 'E',      // 에버라인
    '1087': 'G',      // 김포골드라인
    '1090': 'W',      // 서해선
  };
  
  return lineNames[lineCode] || lineCode;
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
