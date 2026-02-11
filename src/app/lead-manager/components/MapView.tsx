'use client';

/**
 * 맵 뷰 컴포넌트
 * Leaflet 지도에 병원 위치 표시
 */

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

import { Lead, LeadStatus, STATUS_LABELS, LINE_COLORS } from '../types';
import { SUBWAY_STATIONS } from '../constants';
import { formatDistance, formatPhoneNumber } from '../utils';
import StationLabels, { StationLayer, StationToggle } from './StationLabels';
import {
  getRealtimeSubwayData,
  initializeSubwayData,
  useSubwayDataRefresh,
  KRIC_LINE_COLORS,
  getLineDisplayName as getKRICDisplayName
} from '../kric-data-manager';
import { generateSubwayRoutes } from '../utils/subway-utils';
import './MapView.css';

interface MapViewProps {
  leads: Lead[];
  onStatusChange: (leadId: string, status: LeadStatus) => void;
  onListView?: () => void;
  focusLead?: Lead | null;  // 포커스할 리드
  onFocusClear?: () => void;  // 포커스 해제 콜백
}

// Leaflet은 SSR에서 작동하지 않으므로 동적 임포트
const MapContainer = dynamic(
  () => import('react-leaflet').then(mod => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then(mod => mod.TileLayer),
  { ssr: false }
);

const Popup = dynamic(
  () => import('react-leaflet').then(mod => mod.Popup),
  { ssr: false }
);
const CircleMarker = dynamic(
  () => import('react-leaflet').then(mod => mod.CircleMarker),
  { ssr: false }
);
const Polyline = dynamic(
  () => import('react-leaflet').then(mod => mod.Polyline),
  { ssr: false }
);
const Tooltip = dynamic(
  () => import('react-leaflet').then(mod => mod.Tooltip),
  { ssr: false }
);

// 지도 포커스 컨트롤러 컴포넌트 (useMap 사용)
const MapFocusController = dynamic(
  () => import('./MapFocusController'),
  { ssr: false }
);

// 서울 지하철 노선 좌표 (공공데이터포털 서울교통공사 역 좌표 기준)
// 이제 generateSubwayRoutes()를 통해 동적으로 생성됩니다.
const SUBWAY_LINE_ROUTES = {}; // 하드코딩 제거됨

// 노선 표시 여부 상태
// 노선 표시 여부 상태 (기본적으로 모든 노선 표시)
const DEFAULT_VISIBLE_LINES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'S', 'B', 'K', 'G', 'A', 'I1', 'I2', 'Ui', 'Si', 'Kg', 'W', 'E', 'U', 'GTX-A'];

export default function MapView({ leads, onStatusChange, onListView, focusLead, onFocusClear }: MapViewProps) {
  const [isClient, setIsClient] = useState(false);
  const [, setSelectedLead] = useState<Lead | null>(null);
  const [visibleLines, setVisibleLines] = useState<string[]>(DEFAULT_VISIBLE_LINES);
  const [showStationLabels, setShowStationLabels] = useState(true);
  const [subwayData, setSubwayData] = useState<any>(null);
  const [isLoadingSubwayData, setIsLoadingSubwayData] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 클라이언트 hydration 감지용
    setIsClient(true);
  }, []);

  // KRIC 지하철 데이터 로드
  useEffect(() => {
    const loadSubwayData = async () => {
      if (!isClient) return;

      setIsLoadingSubwayData(true);
      try {
        const data = await getRealtimeSubwayData();

        // 데이터 유효성 검증
        if (!data || !data.stations || data.stations.length === 0) {
          throw new Error('KRIC data is empty or invalid');
        }

        setSubwayData(data);
        console.log(`✅ KRIC subway data loaded: ${data.stations.length} stations, ${Object.keys(data.routes || {}).length} routes`);
      } catch (error) {
        console.error('❌ Failed to load KRIC subway data:', error);
        // 기존 TOTAL_SUBWAY_STATIONS로 fallback (더 풍부한 데이터)
        console.log('📦 Falling back to static subway data (Full)');

        const routes = generateSubwayRoutes();
        const { TOTAL_SUBWAY_STATIONS } = await import('../data/stations');
        setSubwayData({
          stations: TOTAL_SUBWAY_STATIONS,
          routes: routes
        });

        // 폴백 데이터의 노선들도 보이도록 자동 활성화
        const fallbackLines = Object.keys(routes).map(line => getKRICDisplayName(line));
        setVisibleLines(prev => Array.from(new Set([...prev, ...fallbackLines])));
      } finally {
        setIsLoadingSubwayData(false);
      }
    };

    loadSubwayData();
  }, [isClient]);

  // 유효한 좌표가 있는 리드만 필터링
  const validLeads = leads.filter(lead => lead.latitude && lead.longitude);

  // 지도 중심점 계산 (focusLead가 있으면 해당 위치, 없으면 평균)
  const center = focusLead?.latitude && focusLead?.longitude
    ? { lat: focusLead.latitude, lng: focusLead.longitude }
    : validLeads.length > 0
      ? {
        lat: validLeads.reduce((sum, l) => sum + (l.latitude || 0), 0) / validLeads.length,
        lng: validLeads.reduce((sum, l) => sum + (l.longitude || 0), 0) / validLeads.length,
      }
      : { lat: 37.5012, lng: 127.0396 }; // 강남역

  // 줌 레벨 (focusLead가 있으면 더 높은 줌)
  const zoomLevel = focusLead?.latitude && focusLead?.longitude ? 17 : 14;

  if (!isClient) {
    return (
      <div className="bg-slate-100 rounded-xl h-[calc(100vh-280px)] min-h-[500px] flex items-center justify-center">
        <p className="text-slate-500">지도를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Leaflet CSS */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin=""
      />


      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={zoomLevel}
          scrollWheelZoom={true}
        >
          {/* 지도 포커스 컨트롤러 */}
          <MapFocusController focusLead={focusLead} onFocusClear={onFocusClear} />

          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          />

          {/* 지하철역 레이블 */}
          {showStationLabels && subwayData && (
            <StationLayer
              stations={subwayData.stations}
              routes={subwayData.routes}
              visibleLines={visibleLines}
              showLabels={true}
              size="small"
              maxVisible={200}
            />
          )}

// 하단 노선 토글 버튼 및 맵 렌더링 수정
          {/* 지하철 노선 */}
          {subwayData?.routes && (
            Object.entries(subwayData.routes)
              .filter(([lineCode]) => {
                // KRIC 코드(1001) -> 약어(1) 변환 후 필터 확인
                const displayName = getKRICDisplayName(lineCode);
                return visibleLines.includes(displayName);
              })
              .map(([lineCode, route]: [string, any]) => {
                if (!route.coords || route.coords.length < 2) return null;
                return (
                  <Polyline
                    key={lineCode}
                    positions={route.coords}
                    color={route.color}
                    weight={5}
                    opacity={0.8}
                  />
                );
              })
          )}

          {/* 병원 마커 */}
          {validLeads.map(lead => {
            const isFocused = focusLead?.id === lead.id;
            return (
              <CircleMarker
                key={lead.id}
                center={[lead.latitude!, lead.longitude!]}
                radius={isFocused ? 14 : 8}
                fillColor={isFocused ? '#FF0000' : getStatusColor(lead.status)}
                fillOpacity={isFocused ? 1 : 0.8}
                color={isFocused ? '#FF0000' : getStatusColor(lead.status)}
                weight={isFocused ? 4 : 2}
                eventHandlers={{
                  click: () => setSelectedLead(lead),
                }}
              >
                <Tooltip
                  direction="top"
                  offset={[0, -10]}
                  permanent={true}
                  className="lead-tooltip"
                >
                  {lead.bizName}
                </Tooltip>
                <Popup>
                  <LeadPopup lead={lead} onStatusChange={onStatusChange} onListView={onListView} />
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      {/* 범례 */}
      <div className="absolute bottom-4 left-4 map-control-panel p-3 z-[1000]">
        <h4 className="text-sm font-semibold text-slate-200 mb-2">범례</h4>
        <div className="space-y-1.5">
          {(['NEW', 'PROPOSAL_SENT', 'CONTACTED', 'CONTRACTED'] as LeadStatus[]).map(status => (
            <div key={status} className="flex items-center gap-2 text-sm">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getStatusColor(status) }}
              />
              <span className="text-slate-400">{STATUS_LABELS[status]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 노선 표시 토글 */}
      <div className="absolute bottom-4 left-36 map-control-panel p-3 z-[1000] max-w-[calc(100%-10rem)] overflow-x-auto">
        <h4 className="text-sm font-semibold text-slate-200 mb-2">노선 표시</h4>
        <div className="flex flex-wrap gap-1 min-w-max">
          {subwayData?.routes && Object.entries(subwayData.routes).map(([lineCode, route]: [string, any]) => {
            const displayName = getKRICDisplayName(lineCode);
            return (
              <button
                key={lineCode}
                onClick={() => {
                  setVisibleLines(prev =>
                    prev.includes(displayName)
                      ? prev.filter(l => l !== displayName)
                      : [...prev, displayName]
                  );
                }}
                className={`w-7 h-7 rounded-full text-[10px] font-bold flex items-center justify-center transition-all ${visibleLines.includes(displayName)
                  ? 'text-white shadow-md'
                  : 'bg-slate-700 text-slate-400'
                  }`}
                style={{
                  backgroundColor: visibleLines.includes(displayName) ? route.color : undefined
                }}
                title={displayName + '호선'}
              >
                {displayName}
              </button>
            );
          })}
        </div>
      </div>

      {/* KRIC 데이터 로딩 상태 표시 */}
      {isLoadingSubwayData && (
        <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3 z-10">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600">지하철 데이터 로딩 중...</span>
          </div>
        </div>
      )}

      {/* 역사명 토글 */}
      <div className="absolute top-4 right-4 map-control-panel p-3 z-[1000]">
        <StationToggle
          showLabels={showStationLabels}
          onToggle={setShowStationLabels}
        />
      </div>

      {/* 통계 */}
      <div className="absolute top-4 right-32 map-control-panel p-3 z-[1000]">
        <p className="text-sm text-slate-300">
          지도 표시: <strong className="text-white">{validLeads.length}</strong>건
        </p>
        {subwayData && (
          <p className="text-sm text-slate-300">
            지하철역: <strong className="text-white">{subwayData.stations.length}</strong>개
          </p>
        )}
      </div>
    </div>
  );
}

// 상태별 색상 반환
function getStatusColor(status: LeadStatus): string {
  switch (status) {
    case 'NEW':
      return '#EF4444'; // red
    case 'PROPOSAL_SENT':
      return '#3B82F6'; // blue
    case 'CONTACTED':
      return '#F97316'; // orange
    case 'CONTRACTED':
      return '#22C55E'; // green
    default:
      return '#6B7280'; // gray
  }
}

// 리드 팝업 컴포넌트
interface LeadPopupProps {
  lead: Lead;
  onStatusChange: (leadId: string, status: LeadStatus) => void;
  onListView?: () => void;
}

function LeadPopup({ lead, onStatusChange, onListView }: LeadPopupProps) {
  return (
    <div className="min-w-[200px]">
      <button
        onClick={() => onListView?.()}
        className="font-semibold text-slate-800 mb-1 text-left hover:text-blue-600 hover:underline transition-colors"
        title={`${lead.bizName} - 리스트에서 보기`}
      >
        {lead.bizName}
      </button>

      {lead.medicalSubject && (
        <p className="text-xs text-slate-500 mb-2">{lead.medicalSubject}</p>
      )}

      <div className="text-sm space-y-1 mb-3">
        {lead.roadAddress && (
          <p className="text-slate-600">{lead.roadAddress}</p>
        )}
        {lead.phone && (
          <p>
            <a href={`tel:${lead.phone}`} className="text-blue-600 hover:underline">
              {formatPhoneNumber(lead.phone)}
            </a>
          </p>
        )}
        {lead.nearestStation && (
          <p className="text-slate-600">
            {lead.nearestStation.endsWith('역') ? lead.nearestStation : lead.nearestStation + '역'} {lead.stationDistance && `(${formatDistance(lead.stationDistance)})`}
          </p>
        )}
      </div>

      <select
        value={lead.status}
        onChange={(e) => onStatusChange(lead.id, e.target.value as LeadStatus)}
        className="w-full text-sm px-2 py-1 border border-slate-700 bg-slate-800 text-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        title="리드 상태 변경"
      >
        {(['NEW', 'PROPOSAL_SENT', 'CONTACTED', 'CONTRACTED'] as LeadStatus[]).map(status => (
          <option key={status} value={status}>
            {STATUS_LABELS[status]}
          </option>
        ))}
      </select>
    </div>
  );
}
