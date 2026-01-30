/**
 * 역사 도면 최적화 컴포넌트
 * 타일링, 줌 레벨별 로딩, 캐싱
 */

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import OptimizedImage from '@/app/shared/OptimizedImage';
import { cn } from '@/lib/utils';

interface FloorPlanViewerProps {
  floorPlanUrl: string;
  stationName: string;
  line: string;
  floor: string;
  className?: string;
}

// 타일 정보
interface TileInfo {
  x: number;
  y: number;
  zoom: number;
  url: string;
  loaded: boolean;
  loading: boolean;
  error: boolean;
}

// 타일 캐시
class TileCache {
  private cache = new Map<string, HTMLImageElement>();
  private maxCacheSize = 500;

  set(key: string, image: HTMLImageElement): void {
    if (this.cache.size >= this.maxCacheSize) {
      this.cache.delete(this.cache.keys().next().value as string);
    }
    this.cache.set(key, image);
  }

  get(key: string): HTMLImageElement | undefined {
    return this.cache.get(key);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

export default function FloorPlanViewer({
  floorPlanUrl,
  stationName,
  line,
  floor,
  className,
}: FloorPlanViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [tiles, setTiles] = useState<TileInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tileCache = useRef(new TileCache());
  const animationFrameRef = useRef<number>();

  // 타일 크기
  const TILE_SIZE = 256;
  const MAX_ZOOM = 4;
  const MIN_ZOOM = 0.5;

  // 타일 URL 생성
  const getTileUrl = useCallback((x: number, y: number, zoomLevel: number): string => {
    // CDN을 통한 타일 최적화
    const baseUrl = floorPlanUrl.split('?')[0];
    const params = new URLSearchParams({
      w: TILE_SIZE.toString(),
      h: TILE_SIZE.toString(),
      q: '80',
      f: 'webp',
      crop: `${x * TILE_SIZE},${y * TILE_SIZE},${TILE_SIZE},${TILE_SIZE}`,
    });

    return `${baseUrl}?${params.toString()}`;
  }, [floorPlanUrl]);

  // 보이는 타일 계산
  const getVisibleTiles = useCallback((): TileInfo[] => {
    if (!containerRef.current) return [];

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();

    const startX = Math.floor(-pan.x / (TILE_SIZE * zoom));
    const startY = Math.floor(-pan.y / (TILE_SIZE * zoom));
    const endX = Math.ceil((rect.width - pan.x) / (TILE_SIZE * zoom));
    const endY = Math.ceil((rect.height - pan.y) / (TILE_SIZE * zoom));

    const visibleTiles: TileInfo[] = [];

    for (let x = startX; x <= endX; x++) {
      for (let y = startY; y <= endY; y++) {
        const key = `${x}-${y}-${zoom}`;
        const url = getTileUrl(x, y, zoom);

        visibleTiles.push({
          x,
          y,
          zoom,
          url,
          loaded: tileCache.current.has(key),
          loading: false,
          error: false,
        });
      }
    }

    return visibleTiles;
  }, [pan, zoom, getTileUrl]);

  // 타일 로딩
  const loadTiles = useCallback(async (tilesToLoad: TileInfo[]) => {
    const loadPromises = tilesToLoad.map(async (tile) => {
      const key = `${tile.x}-${tile.y}-${tile.zoom}`;

      if (tileCache.current.has(key)) {
        return { ...tile, loaded: true };
      }

      try {
        const img = new Image();
        img.src = tile.url;

        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });

        tileCache.current.set(key, img);
        return { ...tile, loaded: true };
      } catch (error) {
        console.error(`Failed to load tile ${key}:`, error);
        return { ...tile, error: true };
      }
    });

    const results = await Promise.allSettled(loadPromises);
    return results.map((result, index) =>
      result.status === 'fulfilled' ? result.value : tilesToLoad[index]
    );
  }, []);

  // 캔버스 렌더링
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');

    if (!canvas || !ctx) return;

    const container = containerRef.current;
    if (!container) return;

    // 캔버스 크기 설정
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    // 캔버스 초기화
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 배경
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 타일 렌더링
    tiles.forEach(tile => {
      const key = `${tile.x}-${tile.y}-${tile.zoom}`;
      const img = tileCache.current.get(key);

      if (img) {
        const x = tile.x * TILE_SIZE * zoom + pan.x;
        const y = tile.y * TILE_SIZE * zoom + pan.y;

        ctx.drawImage(
          img,
          x,
          y,
          TILE_SIZE * zoom,
          TILE_SIZE * zoom
        );
      }
    });

    // 로딩 인디케이터
    const loadingTiles = tiles.filter(tile => !tile.loaded && !tile.error);
    if (loadingTiles.length > 0) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.font = '14px sans-serif';
      ctx.fillText(
        `Loading tiles... (${tiles.filter(t => t.loaded).length}/${tiles.length})`,
        10,
        20
      );
    }
  }, [tiles, pan, zoom]);

  // 타일 업데이트
  useEffect(() => {
    const visibleTiles = getVisibleTiles();
    setTiles(visibleTiles);

    // 타일 로딩
    const tilesToLoad = visibleTiles.filter(tile => !tile.loaded && !tile.error);
    if (tilesToLoad.length > 0) {
      setIsLoading(true);
      loadTiles(tilesToLoad).then(loadedTiles => {
        setTiles(loadedTiles);
        setIsLoading(false);
      });
    }
  }, [getVisibleTiles, loadTiles]);

  // 캔버스 렌더링
  useEffect(() => {
    const animate = () => {
      renderCanvas();
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [renderCanvas]);

  // 마우스 이벤트 핸들러
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({
      x: e.clientX - pan.x,
      y: e.clientY - pan.y,
    });
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;

    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 휠 이벤트 핸들러 (확대/축소)
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * delta));

    // 마우스 위치 기준 확대/축소
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const scale = newZoom / zoom;

      setPan({
        x: mouseX - (mouseX - pan.x) * scale,
        y: mouseY - (mouseY - pan.y) * scale,
      });
    }

    setZoom(newZoom);
  }, [zoom, pan]);

  // 컨트롤 버튼 핸들러
  const handleZoomIn = useCallback(() => {
    const newZoom = Math.min(MAX_ZOOM, zoom * 1.2);
    setZoom(newZoom);
  }, [zoom]);

  const handleZoomOut = useCallback(() => {
    const newZoom = Math.max(MIN_ZOOM, zoom / 1.2);
    setZoom(newZoom);
  }, [zoom]);

  const handleReset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  return (
    <div className={cn('relative bg-gray-100 rounded-lg overflow-hidden', className)}>
      {/* 도면 뷰어 */}
      <div
        ref={containerRef}
        className="relative w-full h-full cursor-move"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
        />

        {/* 로딩 오버레이 */}
        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
              <p className="text-gray-600">도면을 불러오는 중...</p>
            </div>
          </div>
        )}
      </div>

      {/* 컨트롤 버튼 */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button
          onClick={handleZoomIn}
          className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-100 transition-colors"
          title="확대"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
          </svg>
        </button>

        <button
          onClick={handleZoomOut}
          className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-100 transition-colors"
          title="축소"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
          </svg>
        </button>

        <button
          onClick={handleReset}
          className="p-2 bg-white rounded-lg shadow-md hover:bg-gray-100 transition-colors"
          title="초기화"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* 정보 패널 */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-md p-3">
        <div className="text-sm space-y-1">
          <div className="font-medium">{stationName}역</div>
          <div className="text-gray-600">{line}호선 {floor}층</div>
          <div className="text-gray-500">확대: {(zoom * 100).toFixed(0)}%</div>
        </div>
      </div>

      {/* 미니맵 */}
      <div className="absolute bottom-4 right-4 w-32 h-32 bg-white rounded-lg shadow-md overflow-hidden">
        <OptimizedImage
          src={floorPlanUrl}
          alt={`${stationName}역 ${floor}층 미니맵`}
          className="w-full h-full object-cover"
          width={128}
          height={128}
          quality={60}
        />

        {/* 현재 보이는 영역 표시 */}
        <div
          className="absolute border-2 border-blue-500 bg-blue-500 bg-opacity-20"
          style={{
            left: `${Math.max(0, (-pan.x / zoom) / 100) * 100}%`,
            top: `${Math.max(0, (-pan.y / zoom) / 100) * 100}%`,
            width: `${Math.min(100, (containerRef.current?.clientWidth || 0) / zoom / 100) * 100}%`,
            height: `${Math.min(100, (containerRef.current?.clientHeight || 0) / zoom / 100) * 100}%`,
          }}
        />
      </div>
    </div>
  );
}
