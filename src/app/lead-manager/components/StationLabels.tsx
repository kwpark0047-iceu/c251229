/**
 * 지하철 역사명 레이블 컴포넌트
 * 지도 위에 역사명 표시
 */

'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { SubwayStation } from '../types';
import './station-labels.css';

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
  const icon = L.divIcon({
    html: `
      <div class="station-label-container" style="
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        transform: translate(-50%, -100%);
      ">
        <div class="station-marker ${size}" style="
          background: white;
          border: 2px solid ${color};
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        "></div>
        ${showLabel ? `
          <div class="station-name ${size}" style="
            background: white;
            padding: 2px 6px;
            border-radius: 4px;
            font-weight: 600;
            color: ${color};
            white-space: nowrap;
            box-shadow: 0 1px 3px rgba(0,0,0,0.2);
            margin-top: 2px;
            border: 1px solid rgba(0,0,0,0.1);
          ">
            ${station.name}
          </div>
        ` : ''}
      </div>
    `,
    className: 'station-label-icon',
    iconSize: [size === 'small' ? 40 : size === 'medium' ? 50 : 60, 
               size === 'small' ? 30 : size === 'medium' ? 40 : 50],
    iconAnchor: [size === 'small' ? 20 : size === 'medium' ? 25 : 30, 
               size === 'small' ? 30 : size === 'medium' ? 40 : 50],
  });

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
  const visibleStations = stations.filter(station => 
    station.lines.some(line => visibleLines.includes(line))
  );

  // 너무 많은 역이 표시될 경우 제한
  const displayStations = visibleStations.length > maxVisible 
    ? visibleStations.slice(0, maxVisible)
    : visibleStations;

  // 노선별 색상
  const getLineColor = (lines: string[]) => {
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
      'S': '#D4003A', // 신분당선
      'K': '#77BB4A', // 경의중앙선
      'B': '#F5A200', // 분당선
      'A': '#009D3E', // 공항철도
      'G': '#807DB8', // 경춘선
      'U': '#FDA600', // 의정부경전철
      'E': '#6FB245', // 에버라인
      'W': '#0079C2', // 서해선
    };

    // 첫 번째 노선 색상 사용
    const firstLine = lines.find(line => lineColors[line]);
    return firstLine ? lineColors[firstLine] : '#333';
  };

  return (
    <>
      {displayStations.map((station) => (
        <StationLabel
          key={station.name}
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
  const majorStations = SUBWAY_STATIONS.filter(station => 
    station.lines.length >= 2 || // 환승역
    ['강남', '역삼', '선릉', '홍대입구', '신촌', '시청', '서울역', '잠실', '교대'].includes(station.name) // 대표역
  );

  return (
    <>
      {majorStations.map((station) => (
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
  const lineStations = SUBWAY_STATIONS.filter(station => 
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
