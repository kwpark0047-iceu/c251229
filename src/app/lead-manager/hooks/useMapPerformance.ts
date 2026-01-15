/**
 * 지도 성능 최적화 훅
 * 마커 관리, 캐싱, 가상화
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Lead } from '../types';

// 마커 캐시
class MarkerCache {
  private cache = new Map<string, any>();
  private maxCacheSize = 1000;

  set(key: string, marker: any): void {
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, marker);
  }

  get(key: string): any | undefined {
    return this.cache.get(key);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

// 지도 타일 캐시
class TileCache {
  private cache = new Map<string, HTMLImageElement>();
  private maxCacheSize = 500;

  set(key: string, tile: HTMLImageElement): void {
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, tile);
  }

  get(key: string): HTMLImageElement | undefined {
    return this.cache.get(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

// 공간 인덱스 (QuadTree)
class QuadTree {
  private bounds: { x: number; y: number; width: number; height: number };
  private capacity: number;
  private points: Lead[] = [];
  private divided = false;
  private northeast?: QuadTree;
  private northwest?: QuadTree;
  private southeast?: QuadTree;
  private southwest?: QuadTree;

  constructor(
    bounds: { x: number; y: number; width: number; height: number },
    capacity: number = 10
  ) {
    this.bounds = bounds;
    this.capacity = capacity;
  }

  insert(point: Lead): boolean {
    if (!this.contains(point)) {
      return false;
    }

    if (this.points.length < this.capacity) {
      this.points.push(point);
      return true;
    }

    if (!this.divided) {
      this.subdivide();
    }

    return (
      this.northeast!.insert(point) ||
      this.northwest!.insert(point) ||
      this.southeast!.insert(point) ||
      this.southwest!.insert(point)
    );
  }

  query(range: { x: number; y: number; width: number; height: number }): Lead[] {
    const found: Lead[] = [];

    if (!this.intersects(range)) {
      return found;
    }

    for (const point of this.points) {
      if (this.pointInRange(point, range)) {
        found.push(point);
      }
    }

    if (this.divided) {
      found.push(...this.northeast!.query(range));
      found.push(...this.northwest!.query(range));
      found.push(...this.southeast!.query(range));
      found.push(...this.southwest!.query(range));
    }

    return found;
  }

  private contains(point: Lead): boolean {
    return (
      point.lng! >= this.bounds.x &&
      point.lng! < this.bounds.x + this.bounds.width &&
      point.lat! >= this.bounds.y &&
      point.lat! < this.bounds.y + this.bounds.height
    );
  }

  private intersects(range: { x: number; y: number; width: number; height: number }): boolean {
    return !(
      range.x > this.bounds.x + this.bounds.width ||
      range.x + range.width < this.bounds.x ||
      range.y > this.bounds.y + this.bounds.height ||
      range.y + range.height < this.bounds.y
    );
  }

  private pointInRange(point: Lead, range: { x: number; y: number; width: number; height: number }): boolean {
    return (
      point.lng! >= range.x &&
      point.lng! <= range.x + range.width &&
      point.lat! >= range.y &&
      point.lat! <= range.y + range.height
    );
  }

  private subdivide(): void {
    const x = this.bounds.x;
    const y = this.bounds.y;
    const w = this.bounds.width / 2;
    const h = this.bounds.height / 2;

    this.northeast = new QuadTree({ x: x + w, y, width: w, height: h }, this.capacity);
    this.northwest = new QuadTree({ x, y, width: w, height: h }, this.capacity);
    this.southeast = new QuadTree({ x: x + w, y: y + h, width: w, height: h }, this.capacity);
    this.southwest = new QuadTree({ x, y: y + h, width: w, height: h }, this.capacity);

    this.divided = true;

    // 기존 포인트 재분배
    const existingPoints = [...this.points];
    this.points = [];
    existingPoints.forEach(point => this.insert(point));
  }
}

/**
 * 지도 마커 관리 훅
 */
export function useMapMarkers(leads: Lead[], maxVisibleMarkers: number = 1000) {
  const [visibleLeads, setVisibleLeads] = useState<Lead[]>([]);
  const [hiddenLeadsCount, setHiddenLeadsCount] = useState(0);
  const markerCache = useRef(new MarkerCache());
  const quadTree = useRef<QuadTree | null>(null);

  // QuadTree 초기화
  useEffect(() => {
    if (leads.length > 0) {
      // 서울 지역 기준 경계
      const bounds = {
        x: 126.8, // 최서 경도
        y: 37.4,  // 최남 위도
        width: 0.5, // 경도 범위
        height: 0.3, // 위도 범위
      };
      quadTree.current = new QuadTree(bounds, 10);

      leads.forEach(lead => {
        if (lead.lat && lead.lng) {
          quadTree.current!.insert(lead);
        }
      });
    }
  }, [leads]);

  // 경계 내 리드 조회
  const getLeadsInBounds = useCallback((bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => {
    if (!quadTree.current) return [];

    return quadTree.current.query(bounds);
  }, []);

  // 가시성 업데이트
  const updateVisibility = useCallback((bounds: any) => {
    if (!bounds) return;

    const queryBounds = {
      x: bounds._southWest.lng,
      y: bounds._southWest.lat,
      width: bounds._northEast.lng - bounds._southWest.lng,
      height: bounds._northEast.lat - bounds._southWest.lat,
    };

    const leadsInBounds = getLeadsInBounds(queryBounds);

    if (leadsInBounds.length <= maxVisibleMarkers) {
      setVisibleLeads(leadsInBounds);
      setHiddenLeadsCount(0);
    } else {
      // 샘플링
      const sampleSize = maxVisibleMarkers;
      const step = Math.floor(leadsInBounds.length / sampleSize);
      const sampled = leadsInBounds.filter((_, index) => index % step === 0).slice(0, sampleSize);
      
      setVisibleLeads(sampled);
      setHiddenLeadsCount(leadsInBounds.length - sampleSize);
    }
  }, [getLeadsInBounds, maxVisibleMarkers]);

  return {
    visibleLeads,
    hiddenLeadsCount,
    updateVisibility,
    markerCache: markerCache.current,
  };
}

/**
 * 지도 타일 프리로딩 훅
 */
export function useTilePreloading(map: any, zoomLevels: number[] = [10, 11, 12, 13, 14, 15]) {
  const tileCache = useRef(new TileCache());
  const preloadQueue = useRef<string[]>([]);

  const preloadTiles = useCallback((center: [number, number], zoom: number) => {
    if (!map) return;

    const tileSize = 256;
    const worldSize = tileSize * Math.pow(2, zoom);
    
    const centerPixelX = ((center[1] + 180) / 360) * worldSize;
    const centerPixelY = ((90 - center[0]) / 180) * worldSize;

    // 주변 타일 좌표 계산
    const tileX = Math.floor(centerPixelX / tileSize);
    const tileY = Math.floor(centerPixelY / tileSize);

    // 3x3 타일 프리로드
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const x = tileX + dx;
        const y = tileY + dy;
        const key = `${zoom}-${x}-${y}`;

        if (!tileCache.current.has(key)) {
          preloadQueue.current.push(key);
          
          const img = new Image();
          img.onload = () => {
            tileCache.current.set(key, img);
          };
          img.src = `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
        }
      }
    }
  }, [map]);

  // 확대/축소 시 타일 프리로드
  useEffect(() => {
    if (map) {
      map.on('moveend', () => {
        const center = map.getCenter();
        const zoom = map.getZoom();
        preloadTiles([center.lat, center.lng], zoom);
      });
    }
  }, [map, preloadTiles]);

  return {
    preloadTiles,
    cacheSize: tileCache.current.size(),
  };
}

/**
 * 지도 성능 모니터링 훅
 */
export function useMapPerformance() {
  const [metrics, setMetrics] = useState({
    markerCount: 0,
    renderTime: 0,
    memoryUsage: 0,
    fps: 60,
  });

  const measureRenderTime = useCallback((fn: () => void) => {
    const start = performance.now();
    fn();
    const end = performance.now();
    
    setMetrics(prev => ({
      ...prev,
      renderTime: end - start,
    }));
  }, []);

  const updateMarkerCount = useCallback((count: number) => {
    setMetrics(prev => ({
      ...prev,
      markerCount: count,
    }));
  }, []);

  const measureFPS = useCallback(() => {
    let lastTime = performance.now();
    let frames = 0;

    const measure = () => {
      frames++;
      const currentTime = performance.now();

      if (currentTime >= lastTime + 1000) {
        const fps = Math.round((frames * 1000) / (currentTime - lastTime));
        
        setMetrics(prev => ({
          ...prev,
          fps,
        }));

        frames = 0;
        lastTime = currentTime;
      }

      requestAnimationFrame(measure);
    };

    requestAnimationFrame(measure);
  }, []);

  // 메모리 사용량 측정
  useEffect(() => {
    const measureMemory = () => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        setMetrics(prev => ({
          ...prev,
          memoryUsage: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
        }));
      }
    };

    const interval = setInterval(measureMemory, 5000);
    return () => clearInterval(interval);
  }, []);

  return {
    metrics,
    measureRenderTime,
    updateMarkerCount,
    measureFPS,
  };
}

/**
 * 지도 상태 관리 훅
 */
export function useMapState() {
  const [state, setState] = useState({
    center: [37.5665, 126.9780] as [number, number],
    zoom: 12,
    bounds: null as any,
    isLoading: false,
    error: null as string | null,
  });

  const updateCenter = useCallback((center: [number, number]) => {
    setState(prev => ({ ...prev, center }));
  }, []);

  const updateZoom = useCallback((zoom: number) => {
    setState(prev => ({ ...prev, zoom }));
  }, []);

  const updateBounds = useCallback((bounds: any) => {
    setState(prev => ({ ...prev, bounds }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, isLoading: loading }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const reset = useCallback(() => {
    setState({
      center: [37.5665, 126.9780],
      zoom: 12,
      bounds: null,
      isLoading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    updateCenter,
    updateZoom,
    updateBounds,
    setLoading,
    setError,
    reset,
  };
}

/**
 * 지도 이벤트 최적화 훅
 */
export function useMapEvents(map: any) {
  const eventHandlers = useRef<Map<string, Function>>(new Map());

  const addEventHandler = useCallback((event: string, handler: Function) => {
    if (map) {
      map.on(event, handler);
      eventHandlers.current.set(event, handler);
    }
  }, [map]);

  const removeEventHandler = useCallback((event: string) => {
    if (map && eventHandlers.current.has(event)) {
      map.off(event, eventHandlers.current.get(event)!);
      eventHandlers.current.delete(event);
    }
  }, [map]);

  const removeAllEventHandlers = useCallback(() => {
    eventHandlers.current.forEach((handler, event) => {
      if (map) {
        map.off(event, handler);
      }
    });
    eventHandlers.current.clear();
  }, [map]);

  // 컴포넌트 언마운트 시 이벤트 정리
  useEffect(() => {
    return removeAllEventHandlers;
  }, [removeAllEventHandlers]);

  return {
    addEventHandler,
    removeEventHandler,
    removeAllEventHandlers,
  };
}
