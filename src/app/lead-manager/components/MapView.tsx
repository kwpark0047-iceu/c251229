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

// 서울 지하철 노선 좌표 (주요역 기준 간략화)
const SUBWAY_LINE_ROUTES: Record<string, { color: string; coords: [number, number][] }> = {
  '1': {
    color: '#0052A4',
    coords: [
      [37.6019, 127.0372], // 창동
      [37.5894, 127.0457], // 석계
      [37.5803, 127.0470], // 청량리
      [37.5712, 127.0097], // 동대문
      [37.5660, 126.9772], // 종로3가
      [37.5559, 126.9723], // 서울역
      [37.5151, 126.9072], // 영등포
      [37.5030, 126.8820], // 구로
    ],
  },
  '2': {
    color: '#00A84D',
    coords: [
      [37.5443, 127.0557], // 건대입구
      [37.5410, 127.0441], // 성수
      [37.5614, 127.0370], // 왕십리
      [37.5665, 127.0089], // 신당
      [37.5660, 126.9772], // 을지로
      [37.5559, 126.9723], // 시청
      [37.5571, 126.9250], // 신촌
      [37.5568, 126.9232], // 이대
      [37.5563, 126.9103], // 아현
      [37.5348, 126.9026], // 당산
      [37.5172, 126.9102], // 영등포구청
      [37.5013, 126.9474], // 신림
      [37.4815, 126.9527], // 서울대입구
      [37.4766, 126.9617], // 낙성대
      [37.4762, 126.9814], // 사당
      [37.4844, 127.0343], // 잠실새내
      [37.5133, 127.1000], // 잠실
      [37.5352, 127.0744], // 뚝섬
      [37.5443, 127.0557], // 건대입구 (순환)
    ],
  },
  '3': {
    color: '#EF7C1C',
    coords: [
      [37.6532, 126.9165], // 대화
      [37.6198, 126.9214], // 정발산
      [37.5985, 126.9155], // 화정
      [37.5833, 126.9015], // 원당
      [37.5778, 126.9426], // 연신내
      [37.5718, 126.9532], // 불광
      [37.5635, 126.9664], // 독립문
      [37.5596, 126.9725], // 경복궁
      [37.5517, 127.0073], // 종로3가
      [37.5406, 127.0047], // 충무로
      [37.5253, 127.0236], // 약수
      [37.5008, 127.0377], // 고속터미널
      [37.4856, 127.0341], // 교대
      [37.4686, 127.0402], // 양재
      [37.4395, 127.0551], // 수서
    ],
  },
  '4': {
    color: '#00A5DE',
    coords: [
      [37.6531, 127.0606], // 당고개
      [37.6323, 127.0741], // 상계
      [37.6065, 127.0553], // 노원
      [37.5960, 127.0476], // 미아사거리
      [37.5803, 127.0470], // 혜화
      [37.5659, 127.0041], // 동대문
      [37.5608, 127.0010], // 동대문역사문화공원
      [37.5611, 126.9975], // 충무로
      [37.5559, 126.9723], // 서울역
      [37.5330, 126.9696], // 숙대입구
      [37.5101, 126.9441], // 사당
      [37.4504, 126.9018], // 과천
      [37.3947, 126.9635], // 안산
    ],
  },
  '5': {
    color: '#996CAC',
    coords: [
      [37.5613, 127.1807], // 상일동
      [37.5455, 127.1289], // 강동
      [37.5392, 127.1237], // 천호
      [37.5284, 127.1262], // 광나루
      [37.5442, 127.0563], // 군자
      [37.5615, 127.0369], // 왕십리
      [37.5649, 126.9786], // 동대문역사문화공원
      [37.5611, 126.9457], // 충정로
      [37.5568, 126.9232], // 애오개
      [37.5348, 126.9015], // 여의도
      [37.5302, 126.8946], // 여의나루
      [37.5513, 126.8671], // 발산
      [37.5618, 126.8088], // 김포공항
    ],
  },
  '7': {
    color: '#747F00',
    coords: [
      [37.6754, 127.0554], // 장암
      [37.6407, 127.0718], // 도봉산
      [37.6065, 127.0553], // 노원
      [37.5688, 127.0931], // 중곡
      [37.5443, 127.0557], // 건대입구
      [37.5354, 127.0957], // 뚝섬유원지
      [37.5142, 127.0630], // 청담
      [37.4957, 127.0285], // 논현
      [37.5030, 126.8820], // 온수
      [37.4789, 126.8567], // 부천시청
    ],
  },
  '8': {
    color: '#E6186C',
    coords: [
      [37.5517, 127.1435], // 암사
      [37.5392, 127.1237], // 천호
      [37.5185, 127.1126], // 잠실
      [37.5020, 127.1127], // 석촌
      [37.4921, 127.1184], // 송파
      [37.4849, 127.1265], // 가락시장
      [37.4768, 127.1274], // 문정
      [37.4540, 127.1473], // 복정
      [37.4364, 127.1395], // 산성
      [37.4309, 127.1289], // 모란
    ],
  },
  '9': {
    color: '#BDB092',
    coords: [
      [37.5567, 127.0859], // 중앙보훈병원
      [37.5202, 127.0553], // 봉은사
      [37.5087, 127.0443], // 신논현
      [37.5008, 127.0377], // 고속터미널
      [37.5020, 127.0249], // 사평
      [37.4929, 127.0127], // 흑석
      [37.5117, 126.9538], // 노량진
      [37.5270, 126.9291], // 여의도
      [37.5607, 126.8272], // 마곡나루
      [37.5618, 126.8088], // 김포공항
    ],
  },
};

// 노선 표시 여부 상태
const DEFAULT_VISIBLE_LINES = ['2', '5', '7', '8'];

export default function MapView({ leads, onStatusChange, onListView, focusLead, onFocusClear }: MapViewProps) {
  const [isClient, setIsClient] = useState(false);
  const [, setSelectedLead] = useState<Lead | null>(null);
  const [visibleLines, setVisibleLines] = useState<string[]>(DEFAULT_VISIBLE_LINES);

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
        .station-marker-wrapper {
          background: transparent !important;
          border: none !important;
        }
        .station-icon-container {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }
        .station-pin {
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
          transition: transform 0.2s ease;
        }
        .station-pin:hover {
          transform: scale(1.1);
        }
        .station-label {
          position: absolute;
          left: 28px;
          top: 4px;
          background: white;
          padding: 3px 8px;
          border-radius: 6px;
          box-shadow: 0 2px 6px rgba(0,0,0,0.2);
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: max-content;
        }
        .station-name {
          font-size: 12px;
          font-weight: 700;
          color: #1e293b;
          white-space: nowrap;
        }
        .line-badges {
          display: flex;
          gap: 2px;
        }
        .line-badge {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 9px;
          font-weight: bold;
        }
        .lead-tooltip {
          background: white !important;
          border: 1px solid #e2e8f0 !important;
          border-radius: 6px !important;
          padding: 4px 8px !important;
          font-size: 12px !important;
          font-weight: 600 !important;
          color: #334155 !important;
          box-shadow: 0 2px 8px rgba(0,0,0,0.15) !important;
          white-space: nowrap !important;
        }
        .lead-tooltip::before {
          border-top-color: white !important;
        }
        .leaflet-tooltip-top:before {
          border-top-color: #e2e8f0 !important;
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

          {/* 지하철 노선 */}
          {Object.entries(SUBWAY_LINE_ROUTES).map(([lineNumber, route]) => (
            visibleLines.includes(lineNumber) && (
              <Polyline
                key={`line-${lineNumber}`}
                positions={route.coords}
                pathOptions={{
                  color: route.color,
                  weight: 5,
                  opacity: 0.8,
                }}
              />
            )
          ))}

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

      {/* 노선 표시 토글 */}
      <div className="absolute bottom-4 left-36 bg-white rounded-lg shadow-lg p-3 z-10">
        <h4 className="text-sm font-semibold text-slate-700 mb-2">노선 표시</h4>
        <div className="flex flex-wrap gap-1">
          {Object.entries(SUBWAY_LINE_ROUTES).map(([lineNumber, route]) => (
            <button
              key={lineNumber}
              onClick={() => {
                setVisibleLines(prev =>
                  prev.includes(lineNumber)
                    ? prev.filter(l => l !== lineNumber)
                    : [...prev, lineNumber]
                );
              }}
              className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
                visibleLines.includes(lineNumber)
                  ? 'text-white shadow-md'
                  : 'bg-gray-200 text-gray-500'
              }`}
              style={{
                backgroundColor: visibleLines.includes(lineNumber) ? route.color : undefined,
              }}
            >
              {lineNumber}
            </button>
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

// 지하철역 아이콘 생성 (개선된 버전)
function createStationIcon(name: string, lines: string[]) {
  if (typeof window === 'undefined') return undefined;

  const L = require('leaflet');

  // 노선 뱃지 HTML 생성
  const linesHtml = lines
    .slice(0, 3)
    .map(
      line =>
        `<span class="line-badge" style="background-color: ${LINE_COLORS[line] || '#888'}">${line}</span>`
    )
    .join('');

  return L.divIcon({
    className: 'station-marker-wrapper',
    html: `
      <div class="station-icon-container">
        <div class="station-pin">
          <svg width="24" height="32" viewBox="0 0 24 32" fill="none">
            <path d="M12 0C5.373 0 0 5.373 0 12c0 9 12 20 12 20s12-11 12-20c0-6.627-5.373-12-12-12z" fill="${LINE_COLORS[lines[0]] || '#666'}"/>
            <circle cx="12" cy="12" r="6" fill="white"/>
            <text x="12" y="15" text-anchor="middle" font-size="8" font-weight="bold" fill="${LINE_COLORS[lines[0]] || '#666'}">${lines[0]}</text>
          </svg>
        </div>
        <div class="station-label">
          <span class="station-name">${name}</span>
          <div class="line-badges">${linesHtml}</div>
        </div>
      </div>
    `,
    iconSize: [100, 40],
    iconAnchor: [12, 32],
    popupAnchor: [0, -32],
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
            {lead.nearestStation.endsWith('역') ? lead.nearestStation : lead.nearestStation + '역'} {lead.stationDistance && `(${formatDistance(lead.stationDistance)})`}
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
