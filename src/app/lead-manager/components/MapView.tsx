'use client';

/**
 * 맵 뷰 컴포넌트
 * Leaflet 지도에 병원 위치 표시
 */

import React, { useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';

import { Lead, LeadStatus, STATUS_COLORS, STATUS_LABELS, LINE_COLORS } from '../types';
import { SUBWAY_STATIONS } from '../constants';
import { formatDistance, formatPhoneNumber } from '../utils';

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
const Marker = dynamic(
  () => import('react-leaflet').then(mod => mod.Marker),
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

// 지도 포커스 컨트롤러 컴포넌트 (useMap 사용)
const MapFocusController = dynamic(
  () => import('./MapFocusController'),
  { ssr: false }
);

export default function MapView({ leads, onStatusChange, onListView, focusLead, onFocusClear }: MapViewProps) {
  const [isClient, setIsClient] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

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

      <style jsx global>{`
        .leaflet-container {
          height: calc(100vh - 280px);
          min-height: 500px;
          border-radius: 0.75rem;
          z-index: 1;
        }
        .station-marker {
          display: flex;
          align-items: center;
          gap: 2px;
          background: white;
          padding: 2px 6px;
          border-radius: 4px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          font-size: 11px;
          font-weight: 600;
          white-space: nowrap;
        }
        .line-badge {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 10px;
          font-weight: bold;
        }
      `}</style>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <MapContainer
          center={[center.lat, center.lng]}
          zoom={zoomLevel}
          scrollWheelZoom={true}
        >
          {/* 지도 포커스 컨트롤러 */}
          <MapFocusController focusLead={focusLead} onFocusClear={onFocusClear} />

          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* 지하철역 마커 */}
          {SUBWAY_STATIONS.map(station => (
            <Marker
              key={station.name}
              position={[station.lat, station.lng]}
              icon={createStationIcon(station.name, station.lines)}
            >
              <Popup>
                <div className="text-center">
                  <strong>{station.name}역</strong>
                  <div className="flex justify-center gap-1 mt-1">
                    {station.lines.map(line => (
                      <span
                        key={line}
                        className="w-5 h-5 rounded-full text-white text-xs flex items-center justify-center font-bold"
                        style={{ backgroundColor: LINE_COLORS[line] || '#888' }}
                      >
                        {line}
                      </span>
                    ))}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

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
                <Popup>
                  <LeadPopup lead={lead} onStatusChange={onStatusChange} onListView={onListView} />
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>

      {/* 범례 */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 z-10">
        <h4 className="text-sm font-semibold text-slate-700 mb-2">범례</h4>
        <div className="space-y-1.5">
          {(['NEW', 'PROPOSAL_SENT', 'CONTACTED', 'CONTRACTED'] as LeadStatus[]).map(status => (
            <div key={status} className="flex items-center gap-2 text-sm">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getStatusColor(status) }}
              />
              <span className="text-slate-600">{STATUS_LABELS[status]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 통계 */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3 z-10">
        <p className="text-sm text-slate-600">
          지도 표시: <strong>{validLeads.length}</strong>건
        </p>
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

// 지하철역 아이콘 생성
function createStationIcon(name: string, lines: string[]) {
  if (typeof window === 'undefined') return undefined;

  const L = require('leaflet');

  const linesHtml = lines
    .slice(0, 2)
    .map(
      line =>
        `<span class="line-badge" style="background-color: ${LINE_COLORS[line] || '#888'}">${line}</span>`
    )
    .join('');

  return L.divIcon({
    className: 'station-marker-wrapper',
    html: `<div class="station-marker">${linesHtml}<span>${name}</span></div>`,
    iconSize: [80, 24],
    iconAnchor: [40, 12],
  });
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
            {lead.nearestStation}역 {lead.stationDistance && `(${formatDistance(lead.stationDistance)})`}
          </p>
        )}
      </div>

      <select
        value={lead.status}
        onChange={(e) => onStatusChange(lead.id, e.target.value as LeadStatus)}
        className="w-full text-sm px-2 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
