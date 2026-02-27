'use client';

/**
 * 맵 뷰 컴포넌트
 * Leaflet 지도에 병원 위치 표시
 */

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';

import { Lead, LeadStatus, STATUS_LABELS, LINE_COLORS, STATUS_METRO_COLORS } from '../types';
import { SUBWAY_STATIONS } from '../constants';
import { formatDistance, formatPhoneNumber } from '../utils';
import StationLabels, { StationLayer, StationToggle } from './StationLabels';
import { MessageSquare, ChevronDown } from 'lucide-react';
import {
  getRealtimeSubwayData,
  initializeSubwayData,
  useSubwayDataRefresh,
  KRIC_LINE_COLORS,
  getLineDisplayName as getKRICDisplayName
} from '../kric-data-manager';
import { generateSubwayRoutes, SUBWAY_LINE_COLORS } from '../utils/subway-utils';
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

// 신규 생성한 MapEvents 컴포닉트 동적 임포트
const MapEvents = dynamic(
  () => import('./MapEvents'),
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

  // 지도 초기 줌 레벨
  const defaultZoom = focusLead?.latitude && focusLead?.longitude ? 17 : 14;

  // 현재 지도 줌 레벨 추적용 상태
  const [currentZoom, setCurrentZoom] = useState(defaultZoom);

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

  if (!isClient) {
    return (
      <div className="bg-slate-900 rounded-xl h-[calc(100vh-280px)] md:h-[calc(100vh-320px)] min-h-[400px] flex items-center justify-center border border-slate-800">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-t-blue-500 border-slate-700 animate-spin" />
          <p className="text-slate-400 font-medium">네오-서울 수송망 동기화 중...</p>
        </div>
      </div>
    );
  }

  // 줌 레벨 기반 업체명 표시 여부 (12 이상에서 표시)
  const showLeadLabels = currentZoom >= 12;

  return (
    <div className="relative group/map">
      <div className="bg-[#0b0c10] rounded-2xl border border-slate-800 shadow-2xl overflow-hidden h-[calc(100vh-280px)] md:h-[calc(100vh-320px)] min-h-[450px]">
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={defaultZoom}
          scrollWheelZoom={true}
        >
          <MapEvents onZoomEnd={setCurrentZoom} />
          {/* 지도 포커스 컨트롤러 */}
          <MapFocusController focusLead={focusLead} onFocusClear={onFocusClear} />

          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          {/* 지하철역 레이블 */}
          {showStationLabels && subwayData && (
            <StationLayer
              stations={subwayData.stations}
              routes={subwayData.routes}
              visibleLines={visibleLines}
              showLabels={currentZoom >= 14}
              size={currentZoom >= 16 ? 'medium' : 'small'}
              maxVisible={currentZoom >= 15 ? 400 : 150}
            />
          )}

          {/* 지하철 노선 (본선 및 지선 모두 포함) */}
          {subwayData?.routes && (
            Object.entries(subwayData.routes)
              .filter(([lineCode]) => {
                // '2-seongsu' 등에서도 기본 노선명 '2'를 추출하여 가시성 체크
                const baseLineCode = lineCode.split('-')[0];
                const displayName = getKRICDisplayName(baseLineCode);
                return visibleLines.includes(displayName);
              })
              .map(([lineKey, route]: [string, any]) => {
                if (!route.coords || route.coords.length < 2) return null;
                return (
                  <Polyline
                    key={lineKey}
                    positions={route.coords}
                    pathOptions={{
                      color: route.color,
                      weight: currentZoom >= 15 ? 5 : 3,
                      opacity: 0.8,
                      className: 'subway-line-glow',
                    }}
                    eventHandlers={{
                      mouseover: (e) => {
                        e.target.setStyle({ weight: 8, opacity: 1 });
                      },
                      mouseout: (e) => {
                        e.target.setStyle({ weight: currentZoom >= 15 ? 5 : 3, opacity: 0.8 });
                      }
                    }}
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
                radius={isFocused ? 14 : (currentZoom >= 15 ? 10 : 7)}
                fillColor={isFocused ? '#FF0000' : getStatusColor(lead.status)}
                fillOpacity={isFocused ? 1 : 0.8}
                color="#FFFFFF"
                weight={2}
                eventHandlers={{
                  click: () => setSelectedLead(lead),
                }}
              >
                <Tooltip
                  direction="top"
                  offset={[0, -10]}
                  permanent={true}
                  className={`lead-tooltip ${isFocused ? 'focused' : ''}`}
                  opacity={1}
                >
                  <div className="lead-label-content">
                    <span className="biz-name">{lead.bizName}</span>
                    {currentZoom >= 17 && <span className="subject">{lead.medicalSubject}</span>}
                  </div>
                </Tooltip>
                <Popup>
                  <LeadPopup lead={lead} onStatusChange={onStatusChange} onListView={onListView} />
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      {/* 모바일 최적화된 컨트롤 레이어 */}
      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-2">
        {/* KRIC 데이터 로딩 상태 */}
        {isLoadingSubwayData && (
          <div className="bg-black/60 backdrop-blur-md rounded-lg border border-blue-500/30 p-2.5 flex items-center gap-2 shadow-lg animate-pulse">
            <div className="relative w-3.5 h-3.5">
              <div className="absolute inset-0 rounded-full border-2 border-blue-500/20" />
              <div className="absolute inset-0 rounded-full border-2 border-t-blue-500 animate-spin" />
            </div>
            <span className="text-[10px] sm:text-xs font-bold text-blue-400 tracking-tight">STATION DATA SYNC...</span>
          </div>
        )}

        {/* 지도 표시 통계 (모바일에서는 작게) */}
        <div className="bg-black/60 backdrop-blur-md rounded-lg border border-slate-700 p-2 shadow-lg">
          <p className="text-[10px] font-mono text-slate-400 leading-tight">
            NODES: <span className="text-white font-bold">{validLeads.length}</span><br />
            LINES: <span className="text-white font-bold">{subwayData?.stations.length || 0}</span>
          </p>
        </div>
      </div>

      {/* 우상단 조작 패널 */}
      <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2 items-end">
        <div className="bg-black/60 backdrop-blur-md rounded-xl border border-slate-700 p-1.5 shadow-xl">
          <StationToggle
            showLabels={showStationLabels}
            onToggle={setShowStationLabels}
          />
        </div>
      </div>

      {/* 하단 통합 컨트롤 패널 (모바일 대응) */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] w-[calc(100%-2rem)] max-w-2xl px-4">
        <div className="bg-black/80 backdrop-blur-xl rounded-2xl border border-slate-700 p-3 shadow-2xl flex flex-col gap-3">
          {/* 노선 필터 */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar scroll-smooth">
            {subwayData?.routes && (() => {
              const sortOrder = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'S', 'B', 'K', 'G', 'A', 'I1', 'I2', 'Ui', 'Si', 'Kg', 'W', 'E', 'U', 'GTX-A'];
              const allLineKeys = Object.keys(subwayData.routes).map(k => k.split('-')[0]);
              const sortedLineKeys = Array.from(new Set(allLineKeys)).sort((a, b) => {
                const idxA = sortOrder.indexOf(getKRICDisplayName(a));
                const idxB = sortOrder.indexOf(getKRICDisplayName(b));
                if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                return a.localeCompare(b);
              });

              return sortedLineKeys.map(baseCode => {
                const displayName = getKRICDisplayName(baseCode);
                const isActive = visibleLines.includes(displayName);
                const color = SUBWAY_LINE_COLORS[baseCode] || '#999999';
                return (
                  <button
                    key={baseCode}
                    onClick={() => {
                      setVisibleLines(prev => isActive ? prev.filter(l => l !== displayName) : [...prev, displayName]);
                    }}
                    className={`
                      flex-shrink-0 min-w-[28px] h-[28px] rounded-full flex items-center justify-center text-[10px] font-bold transition-all border
                      ${isActive ? 'text-white shadow-[0_0_10px_rgba(255,255,255,0.2)] scale-110' : 'bg-slate-800 text-slate-500 border-slate-700'}
                    `}
                    style={{
                      backgroundColor: isActive ? color : undefined,
                      borderColor: isActive ? color : undefined
                    }}
                  >
                    {displayName}
                  </button>
                );
              });
            })()}
          </div>

          {/* 범례 및 상태 요약 */}
          <div className="flex items-center justify-between px-1 border-t border-slate-700/50 pt-2.5">
            <div className="flex gap-3">
              {(['NEW', 'PROPOSAL_SENT', 'CONTACTED'] as LeadStatus[]).map(status => (
                <div key={status} className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: getStatusColor(status) }} />
                  <span className="text-[10px] font-bold text-slate-400">{STATUS_LABELS[status].split(' ')[0]}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Antigravity Geo-System</p>
          </div>
        </div>
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
  const statusColor = STATUS_METRO_COLORS[lead.status];

  return (
    <div className="min-w-[240px] p-1 bg-[#0b0c10] text-[#c5c6c7]">
      <div className="mb-3">
        <button
          onClick={() => onListView?.()}
          className="text-lg font-black text-white leading-tight hover:text-blue-400 transition-colors text-left"
          title={`${lead.bizName} - 리스트에서 보기`}
        >
          {lead.bizName}
        </button>
        {lead.medicalSubject && (
          <p className="text-[10px] font-bold text-blue-500/80 uppercase tracking-tighter mt-0.5">{lead.medicalSubject}</p>
        )}
      </div>

      <div className="space-y-2 mb-4">
        {lead.roadAddress && (
          <div className="flex items-start gap-2">
            <span className="text-xs">📍</span>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">{lead.roadAddress}</p>
          </div>
        )}
        {lead.phone && (
          <div className="flex items-center gap-2">
            <span className="text-xs">📞</span>
            <a href={`tel:${lead.phone}`} className="text-xs font-bold text-blue-400 hover:underline">
              {formatPhoneNumber(lead.phone)}
            </a>
          </div>
        )}
        {lead.nearestStation && (
          <div className="flex items-center gap-2">
            <span className="text-xs">🚉</span>
            <p className="text-xs font-semibold text-slate-300">
              {lead.nearestStation.endsWith('역') ? lead.nearestStation : lead.nearestStation + '역'}
              <span className="text-[10px] text-slate-500 font-normal ml-1">
                ({lead.stationDistance && formatDistance(lead.stationDistance)})
              </span>
            </p>
          </div>
        )}
      </div>

      <div className="relative">
        <select
          id={`lead-status-popup-${lead.id}`}
          name="status"
          value={lead.status}
          onChange={(e) => onStatusChange(lead.id, e.target.value as LeadStatus)}
          className="w-full text-xs font-bold px-3 py-2.5 rounded-lg border appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
          style={{
            background: statusColor.bg,
            color: 'white',
            borderColor: statusColor.border,
          }}
          title="리드 상태 변경"
        >
          {(['NEW', 'PROPOSAL_SENT', 'CONTACTED', 'CONTRACTED'] as LeadStatus[]).map(status => (
            <option key={status} value={status} className="bg-[#0b0c10] text-white">
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/50">
          <ChevronDown className="w-3 h-3" />
        </div>
      </div>
    </div>
  );
}
