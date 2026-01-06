'use client';

/**
 * 도면 뷰어 컴포넌트
 * 이미지 줌/팬 및 광고 위치 마커 표시
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Maximize2,
  Move,
  MapPin,
} from 'lucide-react';
import { FloorPlan, AdPosition, METRO_LINE_COLORS } from '../types';

interface FloorPlanViewerProps {
  plan: FloorPlan | null;
  adPositions?: AdPosition[];
  onDownload?: (plan: FloorPlan) => void;
  onPositionClick?: (position: AdPosition) => void;
  isEditing?: boolean;
  onAddPosition?: (x: number, y: number) => void;
}

export default function FloorPlanViewer({
  plan,
  adPositions = [],
  onDownload,
  onPositionClick,
  isEditing = false,
  onAddPosition,
}: FloorPlanViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);

  const lineColor = plan ? METRO_LINE_COLORS[plan.lineNumber] : '#3CB54A';

  // 줌 레벨 조정
  const handleZoom = useCallback((delta: number) => {
    setScale((prev) => Math.max(0.25, Math.min(4, prev + delta)));
  }, []);

  // 리셋
  const handleReset = useCallback(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, []);

  // 드래그 시작
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // 좌클릭만
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  }, [position]);

  // 드래그 중
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  // 드래그 종료
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 휠 줌
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    handleZoom(delta);
  }, [handleZoom]);

  // 이미지 클릭 (편집 모드에서 마커 추가)
  const handleImageClick = useCallback((e: React.MouseEvent<HTMLImageElement>) => {
    if (!isEditing || !onAddPosition) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    onAddPosition(x, y);
  }, [isEditing, onAddPosition]);

  // 전체 화면 토글
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  }, [isFullscreen]);

  // 키보드 단축키
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '+' || e.key === '=') handleZoom(0.1);
      if (e.key === '-') handleZoom(-0.1);
      if (e.key === '0') handleReset();
      if (e.key === 'Escape' && isFullscreen) toggleFullscreen();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleZoom, handleReset, isFullscreen, toggleFullscreen]);

  if (!plan) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[var(--bg-tertiary)]">
        <div className="text-center text-[var(--text-muted)]">
          <MapPin className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>도면을 선택하세요</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 flex flex-col bg-[var(--bg-tertiary)] overflow-hidden"
    >
      {/* 툴바 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <h2
            className="text-lg font-bold"
            style={{ color: lineColor }}
          >
            {plan.stationName}
          </h2>
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
            {plan.planType === 'psd' ? 'PSD도면' : '역구내도면'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* 줌 컨트롤 */}
          <button
            onClick={() => handleZoom(-0.1)}
            className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
            title="축소 (-)"
          >
            <ZoomOut className="w-4 h-4 text-[var(--text-muted)]" />
          </button>
          <span className="px-2 text-sm text-[var(--text-muted)] min-w-[50px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={() => handleZoom(0.1)}
            className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
            title="확대 (+)"
          >
            <ZoomIn className="w-4 h-4 text-[var(--text-muted)]" />
          </button>

          <div className="w-px h-5 bg-[var(--border-subtle)] mx-2" />

          <button
            onClick={handleReset}
            className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
            title="리셋 (0)"
          >
            <RotateCcw className="w-4 h-4 text-[var(--text-muted)]" />
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
            title="전체화면"
          >
            <Maximize2 className="w-4 h-4 text-[var(--text-muted)]" />
          </button>

          {onDownload && (
            <>
              <div className="w-px h-5 bg-[var(--border-subtle)] mx-2" />
              <button
                onClick={() => onDownload(plan)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-white text-sm font-medium"
                style={{ background: lineColor }}
              >
                <Download className="w-4 h-4" />
                다운로드
              </button>
            </>
          )}
        </div>
      </div>

      {/* 뷰어 영역 */}
      <div
        className="flex-1 relative overflow-hidden cursor-move"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        {/* 드래그 가이드 */}
        {isDragging && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 text-white text-xs">
            <Move className="w-3 h-3" />
            드래그하여 이동
          </div>
        )}

        {/* 이미지 및 마커 */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          }}
        >
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={plan.imageUrl}
              alt={`${plan.stationName} ${plan.planType}`}
              className={`max-w-none ${isEditing ? 'cursor-crosshair' : ''}`}
              draggable={false}
              onClick={handleImageClick}
              style={{
                maxHeight: '80vh',
              }}
            />

            {/* 광고 위치 마커 */}
            {adPositions.map((pos) => (
              <button
                key={pos.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onPositionClick?.(pos);
                }}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 transition-transform hover:scale-125"
                style={{
                  left: `${pos.positionX}%`,
                  top: `${pos.positionY}%`,
                }}
                title={pos.label || pos.adCode || '광고 위치'}
              >
                <div
                  className="flex items-center justify-center rounded-full shadow-lg border-2 border-white"
                  style={{
                    width: pos.markerSize,
                    height: pos.markerSize,
                    background: pos.markerColor,
                  }}
                >
                  <MapPin className="w-3 h-3 text-white" />
                </div>
                {pos.label && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-0.5 rounded bg-black/75 text-white text-xs whitespace-nowrap">
                    {pos.label}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 하단 정보 */}
      <div className="px-4 py-2 border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)]/30 text-xs text-[var(--text-muted)]">
        <div className="flex items-center justify-between">
          <span>
            {plan.width && plan.height && `${plan.width} × ${plan.height}px`}
            {plan.fileSize && ` • ${(plan.fileSize / 1024 / 1024).toFixed(1)}MB`}
          </span>
          <span>마우스 휠로 줌, 드래그로 이동</span>
        </div>
      </div>
    </div>
  );
}
