/**
 * 역사 도면 최적화 컴포넌트
 * 캔버스 기반 고성능 렌더링, 줌/팬, 광고 마커 통합
 */

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { FloorPlan, AdPosition } from '../types';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  MapPin,
  Move,
  Download
} from 'lucide-react';

interface FloorPlanViewerProps {
  plan: FloorPlan | null;
  adPositions?: AdPosition[];
  onPositionClick?: (position: AdPosition) => void;
  onDownload?: (plan: FloorPlan) => void;
  className?: string;
}

export default function OptimizedFloorPlanViewer({
  plan,
  adPositions = [],
  onPositionClick,
  onDownload,
  className,
}: FloorPlanViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const animationFrameRef = useRef<number>();
  const lastMousePos = useRef({ x: 0, y: 0 });

  const MAX_ZOOM = 5;
  const MIN_ZOOM = 0.2;

  // 이미지 로딩
  useEffect(() => {
    if (!plan?.imageUrl) return;

    setIsLoading(true);
    const img = new Image();
    img.src = plan.imageUrl;
    img.onload = () => {
      imageRef.current = img;
      setIsLoading(false);
      handleReset();
    };
    img.onerror = () => {
      console.error('Failed to load floor plan image');
      setIsLoading(false);
    };

    return () => {
      imageRef.current = null;
    };
  }, [plan?.imageUrl]);

  // 캔버스 렌더링 로직
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const img = imageRef.current;

    if (!canvas || !ctx || !img) return;

    // 캔버스 크기 동기화
    const { clientWidth, clientHeight } = containerRef.current!;
    if (canvas.width !== clientWidth || canvas.height !== clientHeight) {
      canvas.width = clientWidth;
      canvas.height = clientHeight;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 1. 도면 이미지 그리기
    const drawW = img.width * zoom;
    const drawH = img.height * zoom;
    const drawX = pan.x + (canvas.width - drawW) / 2;
    const drawY = pan.y + (canvas.height - drawH) / 2;

    ctx.drawImage(img, drawX, drawY, drawW, drawH);

    // 2. 광고 마커 그리기
    adPositions.forEach(pos => {
      const centerX = drawX + (pos.positionX / 100) * drawW;
      const centerY = drawY + (pos.positionY / 100) * drawH;
      const size = pos.markerSize || 24;
      const scaledSize = size * Math.sqrt(zoom);

      ctx.shadowBlur = 10;
      ctx.shadowColor = `${pos.markerColor}66`;

      ctx.beginPath();
      ctx.arc(centerX, centerY, scaledSize / 2, 0, Math.PI * 2);
      ctx.fillStyle = pos.markerColor;
      ctx.fill();

      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      ctx.shadowBlur = 0;

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(centerX, centerY, scaledSize / 6, 0, Math.PI * 2);
      ctx.fill();

      if (zoom > 1.5 && pos.label) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.max(10, 8 * zoom)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.fillText(pos.label, centerX, centerY + scaledSize);
      }
    });

  }, [adPositions, pan, zoom]);

  // 애니메이션 루프
  useEffect(() => {
    const loop = () => {
      render();
      animationFrameRef.current = requestAnimationFrame(loop);
    };
    animationFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameRef.current!);
  }, [render]);

  // 마우스 클릭 시 마커 체크
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (isDragging) return;

    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const drawW = imageRef.current.width * zoom;
    const drawH = imageRef.current.height * zoom;
    const drawX = pan.x + (canvas.width - drawW) / 2;
    const drawY = pan.y + (canvas.height - drawH) / 2;

    for (let i = adPositions.length - 1; i >= 0; i--) {
      const pos = adPositions[i];
      const centerX = drawX + (pos.positionX / 100) * drawW;
      const centerY = drawY + (pos.positionY / 100) * drawH;
      const radius = (pos.markerSize || 24) * Math.sqrt(zoom) / 2 + 5;

      const dist = Math.sqrt((mouseX - centerX) ** 2 + (mouseY - centerY) ** 2);
      if (dist <= radius) {
        onPositionClick?.(pos);
        break;
      }
    }
  }, [adPositions, zoom, pan, isDragging, onPositionClick]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    lastMousePos.current = { x: e.clientX, y: e.clientY };
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom * delta));

    const rect = containerRef.current!.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const ratio = newZoom / zoom;
    setPan({
      x: mouseX - (mouseX - pan.x) * ratio,
      y: mouseY - (mouseY - pan.y) * ratio
    });
    setZoom(newZoom);
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  if (!plan) return null;

  return (
    <div className={cn('relative flex-1 bg-[var(--bg-tertiary)] overflow-hidden flex flex-col', className)}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[var(--bg-secondary)]/50 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">
            {plan.stationName} <span className="text-sm font-medium text-[var(--text-muted)] ml-1">{plan.floorName}층</span>
          </h2>
          <div className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/5 text-[var(--text-muted)] border border-white/5 uppercase">
            {plan.planType === 'psd' ? 'PSD 도면' : '역구조 도면'}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button onClick={() => setZoom(z => Math.max(MIN_ZOOM, z - 0.2))} className="p-2 rounded-xl hover:bg-white/5 transition-colors group" title="축소">
            <ZoomOut className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)]" />
          </button>
          <div className="px-3 py-1 bg-white/5 rounded-lg text-xs font-bold text-[var(--text-secondary)] min-w-[50px] text-center border border-white/5">
            {Math.round(zoom * 100)}%
          </div>
          <button onClick={() => setZoom(z => Math.min(MAX_ZOOM, z + 0.2))} className="p-2 rounded-xl hover:bg-white/5 transition-colors group" title="확대">
            <ZoomIn className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)]" />
          </button>

          <div className="w-px h-4 bg-white/10 mx-1" />

          <button onClick={handleReset} className="p-2 rounded-xl hover:bg-white/5 transition-colors group" title="초기화">
            <RotateCcw className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)]" />
          </button>
          <button onClick={toggleFullscreen} className="p-2 rounded-xl hover:bg-white/5 transition-colors group" title="전체화면">
            <Maximize2 className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)]" />
          </button>

          {onDownload && (
            <>
              <div className="w-px h-4 bg-white/10 mx-1" />
              <button
                onClick={() => onDownload(plan)}
                className="p-2 rounded-xl hover:bg-white/5 transition-colors group"
                title="다운로드"
              >
                <Download className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-primary)]" />
              </button>
            </>
          )}
        </div>
      </div>

      <div
        ref={containerRef}
        className="flex-1 relative cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleCanvasClick}
      >
        <canvas ref={canvasRef} className="w-full h-full" />

        {isLoading && (
          <div className="absolute inset-0 bg-[var(--bg-tertiary)]/80 backdrop-blur-sm flex items-center justify-center z-20">
            <div className="flex flex-col items-center gap-4">
              <div id="loading-spinner" className="w-10 h-10 border-4 border-[var(--metro-line2)]/20 border-t-[var(--metro-line2)] rounded-full" />
              <p className="text-sm font-bold text-[var(--text-secondary)] tracking-tight animate-pulse">도면 렌더링 최적화 중...</p>
            </div>
          </div>
        )}

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 text-[10px] text-white/60 font-medium flex items-center gap-2 pointer-events-none transition-opacity duration-300 animate-float-subtle">
          <Move className="w-3 h-3" />
          휠로 확대/축소하고 드래그하여 이동하세요
        </div>

        {!isLoading && imageRef.current && (
          <div className="absolute bottom-6 right-6 w-32 h-32 glass-card-elevated border border-white/10 shadow-floating overflow-hidden group animate-float-subtle">
            <div className="relative w-full h-full p-2 opacity-60 group-hover:opacity-100 transition-opacity">
              <img
                src={plan.imageUrl}
                alt="Minimap"
                className="w-full h-full object-contain pointer-events-none"
              />
              <div
                className="absolute border-2 border-[var(--metro-line2)] bg-[var(--metro-line2)]/10 pointer-events-none transition-all duration-200"
                style={{
                  left: `${Math.max(0, ((-pan.x / zoom) / (imageRef.current?.width || 1)) * 100 + 50 - (50 / zoom))}%`,
                  top: `${Math.max(0, ((-pan.y / zoom) / (imageRef.current?.height || 1)) * 100 + 50 - (50 / zoom))}%`,
                  width: `${Math.min(100, (containerRef.current?.clientWidth || 0) / (imageRef.current?.width || 1) / zoom * 100)}%`,
                  height: `${Math.min(100, (containerRef.current?.clientHeight || 0) / (imageRef.current?.height || 1) / zoom * 100)}%`,
                }}
              />
            </div>
            <div className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-black/40 text-[8px] font-black text-white/40 uppercase">Map</div>
          </div>
        )}
      </div>

      <div className="px-4 py-2 border-t border-white/5 bg-[var(--bg-secondary)]/30 backdrop-blur-sm flex justify-between items-center text-[10px] text-[var(--text-muted)] font-medium">
        <div className="flex items-center gap-3">
          <span>{plan.fileName}</span>
          <span className="w-px h-2 bg-white/10" />
          <span>{imageRef.current ? `${imageRef.current.width} x ${imageRef.current.height} PX` : '--'}</span>
        </div>
        <div>
          Performance: Canvas Optimized 🚀
        </div>
      </div>
    </div>
  );
}
