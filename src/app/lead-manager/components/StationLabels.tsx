/**
 * 지하철 역사명 레이블 컴포넌트
 * 지도 위에 역사명 표시
 */

'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { SubwayStation } from '../types';
import { SUBWAY_STATIONS } from '../constants';
import { KRIC_LINE_COLORS, getLineDisplayName } from '../kric-data-manager';
import './station-labels.css';

// Leaflet 타입 및 라이브러리 임포트
// 클라이언트 사이드에서만 안전하게 실행되도록 처리
let L: any;
if (typeof window !== 'undefined') {
  L = require('leaflet');
}

interface StationLabelProps {
  station: {
    name: string;
    lat: number;
    lng: number;
    lines: string[];
    address?: string;
    phone?: string;
    facilities?: string;
  };
  showLabel?: boolean;
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

// 동적 임포트
const Marker = dynamic(
  () => import('react-leaflet').then(mod => mod.Marker),
  { ssr: false }
);

const Tooltip = dynamic(
  () => import('react-leaflet').then(mod => mod.Tooltip),
  { ssr: false }
);

export default function StationLabel({
  station,
  showLabel = true,
  size = 'medium',
  color = '#333'
}: StationLabelProps) {
  const [icon, setIcon] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && L) {
      const isTransfer = station.lines.length >= 2;
      const transferClass = isTransfer ? 'transfer' : '';

      const newIcon = L.divIcon({
        html: `
          <div class="station-label-container animate-antigravity" style="--line-color: ${color};">
            <div class="station-marker ${size} ${transferClass}" style="border-color: ${color};"></div>
            ${showLabel ? `
              <div class="station-name ${size}" style="border-color: ${color}66;">
                ${station.name}
              </div>
            ` : ''}
          </div>
        `,
        className: 'station-label-icon',
        iconSize: [100, 100],
        iconAnchor: [50, 50],
      });
      setIcon(newIcon);
    }
  }, [station.name, color, size, showLabel, station.lines.length]);

  if (!icon) return null;

  return (
    <Marker
      position={[station.lat, station.lng]}
      icon={icon}
    >
      <Tooltip
        permanent={false}
        direction="top"
        offset={[0, -10]}
        className="station-tooltip"
      >
        <div className="text-center">
          <div className="font-semibold">{station.name}</div>
          <div className="text-xs text-gray-600">
            {station.lines.join(', ')}호선
          </div>
          {station.address && (
            <div className="text-xs text-gray-500 mt-1">
              {station.address}
            </div>
          )}
          {station.phone && (
            <div className="text-xs text-blue-600 mt-1">
              {station.phone}
            </div>
          )}
        </div>
      </Tooltip>
    </Marker>
  );
}

/**
 * 지하철 역사명 레이어 컴포넌트
 * 모든 역사명을 한번에 표시
 */
interface StationLayerProps {
  stations?: Array<{
    name: string;
    lat: number;
    lng: number;
    lines: string[];
    address?: string;
    phone?: string;
    facilities?: string;
  }>;
  routes?: Record<string, { color: string; coords: [number, number][] }>;
  visibleLines?: string[];
  showLabels?: boolean;
  size?: 'small' | 'medium' | 'large';
  maxVisible?: number;
  clusterThreshold?: number;
}

export function StationLayer({
  stations = [],
  routes = {},
  visibleLines = ['1', '2', '3', '4', '5', '6', '7', '8', '9'],
  showLabels = true,
  size = 'medium',
  maxVisible = 50,
  clusterThreshold = 5
}: StationLayerProps) {
  // 표시할 역 필터링
  const visibleStations = stations.filter(station => {
    // 좌표가 유효하지 않은 경우 제외
    if (station.lat === 0 && station.lng === 0) return false;

    // station.lines에 있는 값이 '1001'일 수도 있고 '1'일 수도 있으므로 둘 다 체크
    return station.lines.some(line => {
      const displayName = getLineDisplayName(line); // 1001 -> 1
      return visibleLines.includes(displayName) || visibleLines.includes(line);
    });
  });

  // 너무 많은 역이 표시될 경우 제한 (성능 최적화)
  const displayStations = visibleStations.length > maxVisible
    ? visibleStations.slice(0, maxVisible)
    : visibleStations;

  // 노선별 색상 (KRIC 표준 색상 적용)
  const getLineColor = (lines: string[]) => {
    // 첫 번째 노선 색상 사용 (KRIC 표준 매핑 우선)
    for (const line of lines) {
      if (KRIC_LINE_COLORS[line as keyof typeof KRIC_LINE_COLORS]) {
        return KRIC_LINE_COLORS[line as keyof typeof KRIC_LINE_COLORS];
      }
    }

    const fallbackColors: Record<string, string> = {
      '1': '#0052A4', '2': '#00A84D', '3': '#EF7C1C', '4': '#00A5DE',
      '5': '#996CAC', '6': '#CD7E2F', '7': '#727FB8', '8': '#E6186A', '9': '#BAB135',
    };

    const firstLineShort = lines.find(line => fallbackColors[line]);
    return firstLineShort ? fallbackColors[firstLineShort] : '#333';
  };

  return (
    <>
      {displayStations.map((station: any) => (
        <StationLabel
          key={`${station.name}-${station.lines.join('-')}`}
          station={station}
          showLabel={showLabels}
          size={size}
          color={getLineColor(station.lines)}
        />
      ))}
    </>
  );
}

/**
 * 주요 역사만 표시하는 컴포넌트
 */
interface MajorStationsProps {
  showLabels?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export function MajorStations({
  showLabels = true,
  size = 'medium'
}: MajorStationsProps) {
  // 주요 역만 필터링 (환승역, 대표역 등)
  const majorStations = SUBWAY_STATIONS.filter((station: any) =>
    station.lines.length >= 2 || // 환승역
    ['강남', '역삼', '선릉', '홍대입구', '신촌', '시청', '서울역', '잠실', '교대'].includes(station.name) // 대표역
  );

  return (
    <>
      {majorStations.map((station: any) => (
        <StationLabel
          key={station.name}
          station={station}
          showLabel={showLabels}
          size={size}
        />
      ))}
    </>
  );
}

/**
 * 특정 노선 역사만 표시하는 컴포넌트
 */
interface LineStationsProps {
  line: string;
  showLabels?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export function LineStations({
  line,
  showLabels = true,
  size = 'medium'
}: LineStationsProps) {
  const lineStations = SUBWAY_STATIONS.filter((station: any) =>
    station.lines.includes(line)
  );

  const lineColors: Record<string, string> = {
    '1': '#0052A4',
    '2': '#00A84D',
    '3': '#EF7C1C',
    '4': '#00A5DE',
    '5': '#996CAC',
    '6': '#CD7E2F',
    '7': '#727FB8',
    '8': '#E6186A',
    '9': '#BAB135',
    'S': '#D4003A',
    'K': '#77BB4A',
    'B': '#F5A200',
    'A': '#009D3E',
    'G': '#807DB8',
  };

  return (
    <>
      {lineStations.map((station) => (
        <StationLabel
          key={station.name}
          station={station}
          showLabel={showLabels}
          size={size}
          color={lineColors[line] || '#333'}
        />
      ))}
    </>
  );
}

/**
 * 역사명 토글 컴포넌트
 */
interface StationToggleProps {
  onToggle: (showLabels: boolean) => void;
  showLabels: boolean;
  disabled?: boolean;
}

export function StationToggle({
  onToggle,
  showLabels,
  disabled = false
}: StationToggleProps) {
  return (
    <div className="flex items-center space-x-2 p-2 bg-white rounded-lg shadow-md">
      <span className="text-sm font-medium text-gray-700">역사명</span>
      <button
        onClick={() => onToggle(!showLabels)}
        disabled={disabled}
        title={showLabels ? "역사명 숨기기" : "역사명 표시하기"}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full transition-colors
          ${showLabels ? 'bg-blue-600' : 'bg-gray-200'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white transition-transform
            ${showLabels ? 'translate-x-6' : 'translate-x-1'}
          `}
        />
      </button>
    </div>
  );
}
