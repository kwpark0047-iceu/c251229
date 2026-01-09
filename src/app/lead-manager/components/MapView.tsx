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
const SUBWAY_LINE_ROUTES: Record<string, { color: string; coords: [number, number][] }> = {
  '1': {
    color: '#0052A4',
    coords: [
      [37.580702, 127.046989], // 청량리
      [37.571607, 126.991570], // 종로3가
      [37.570028, 126.982730], // 종각
      [37.565712, 126.977041], // 시청
      [37.554648, 126.970702], // 서울역
      [37.529849, 126.964561], // 용산
      [37.513294, 126.942526], // 노량진
    ],
  },
  '2': {
    color: '#00A84D',
    coords: [
      // 순환선 - 내선순환
      [37.565712, 126.977041], // 시청
      [37.566014, 126.982618], // 을지로입구
      [37.566512, 126.991806], // 을지로3가
      [37.567109, 126.998167], // 을지로4가
      [37.565138, 127.007896], // 동대문역사문화공원
      [37.561432, 127.037522], // 왕십리
      [37.544580, 127.055914], // 성수
      [37.540372, 127.070149], // 건대입구
      [37.535288, 127.086065], // 구의
      [37.534896, 127.094330], // 강변
      [37.521419, 127.102131], // 잠실나루
      [37.513282, 127.100150], // 잠실
      [37.511687, 127.086162], // 잠실새내
      [37.510997, 127.073642], // 종합운동장
      [37.508844, 127.063214], // 삼성
      [37.504503, 127.049008], // 선릉
      [37.500622, 127.036456], // 역삼
      [37.497945, 127.027621], // 강남
      [37.493415, 127.014626], // 교대
      [37.491897, 127.007917], // 서초
      [37.481426, 126.997596], // 방배
      [37.476538, 126.981544], // 사당
      [37.477500, 126.963600], // 낙성대
      [37.481100, 126.952400], // 서울대입구
      [37.481700, 126.941300], // 봉천
      [37.487200, 126.929300], // 신림
      [37.502800, 126.911900], // 신대방
      [37.508700, 126.891200], // 신도림
      [37.517800, 126.894700], // 문래
      [37.524900, 126.896100], // 영등포구청
      [37.533547, 126.902556], // 당산
      [37.549500, 126.913600], // 합정
      [37.556823, 126.923778], // 홍대입구
      [37.555199, 126.936664], // 신촌
      [37.556896, 126.946317], // 이대
      [37.557157, 126.956019], // 아현
      [37.559762, 126.963531], // 충정로
      [37.565712, 126.977041], // 시청 (순환)
    ],
  },
  '3': {
    color: '#EF7C1C',
    coords: [
      [37.676407, 126.743806], // 대화
      [37.674600, 126.753100], // 주엽
      [37.669400, 126.762300], // 정발산
      [37.663000, 126.771500], // 마두
      [37.658300, 126.780600], // 백석
      [37.654300, 126.793700], // 대곡
      [37.650800, 126.834200], // 화정
      [37.644100, 126.853900], // 원당
      [37.638600, 126.872600], // 원흥
      [37.630300, 126.884800], // 삼송
      [37.618800, 126.895400], // 지축
      [37.611100, 126.915600], // 구파발
      [37.619500, 126.921800], // 연신내
      [37.610000, 126.929700], // 불광
      [37.600700, 126.934900], // 녹번
      [37.589100, 126.943800], // 홍제
      [37.582400, 126.950400], // 무악재
      [37.575000, 126.959200], // 독립문
      [37.576700, 126.974300], // 경복궁
      [37.576400, 126.984300], // 안국
      [37.571607, 126.991570], // 종로3가
      [37.561457, 126.994217], // 충무로
      [37.547024, 127.000000], // 동국대입구
      [37.534500, 127.008000], // 약수
      [37.526600, 127.019900], // 금호
      [37.527026, 127.028311], // 압구정
      [37.516778, 127.019998], // 신사
      [37.511369, 127.014213], // 잠원
      [37.504811, 127.004943], // 고속터미널
      [37.493415, 127.014626], // 교대
      [37.484926, 127.016158], // 남부터미널
      [37.484147, 127.034530], // 양재
      [37.486431, 127.046616], // 매봉
      [37.490856, 127.054434], // 도곡
      [37.494243, 127.063343], // 대치
      [37.496996, 127.071406], // 학여울
      [37.491810, 127.079372], // 대청
      [37.483681, 127.085689], // 일원
      [37.487425, 127.101899], // 수서
      [37.492522, 127.118234], // 가락시장
    ],
  },
  '4': {
    color: '#00A5DE',
    coords: [
      [37.655779, 127.061352], // 노원
      [37.648200, 127.064500], // 상계
      [37.638600, 127.055800], // 수유 방면
      [37.625700, 127.046900], // 쌍문
      [37.613208, 127.030012], // 미아사거리
      [37.603407, 127.025189], // 길음
      [37.592703, 127.016539], // 성신여대입구
      [37.588447, 127.006314], // 한성대입구
      [37.582290, 127.001867], // 혜화
      [37.571197, 127.009305], // 동대문
      [37.565138, 127.007896], // 동대문역사문화공원
      [37.561457, 126.994217], // 충무로
      [37.560830, 126.985797], // 명동
      [37.554648, 126.970702], // 서울역
      [37.544547, 126.973090], // 숙대입구
      [37.534847, 126.973135], // 삼각지
      [37.529896, 126.964561], // 신용산
      [37.525800, 126.964300], // 이촌
      [37.513500, 126.978300], // 동작
      [37.502700, 126.980100], // 총신대입구
      [37.476538, 126.981544], // 사당
    ],
  },
  '5': {
    color: '#996CAC',
    coords: [
      [37.561863, 126.800941], // 김포공항
      [37.566961, 126.836445], // 마곡나루
      [37.559100, 126.851100], // 발산
      [37.550400, 126.868500], // 우장산
      [37.547100, 126.883600], // 화곡
      [37.545200, 126.896400], // 까치산
      [37.552600, 126.916300], // 신정
      [37.561500, 126.926800], // 목동
      [37.555800, 126.937100], // 오목교
      [37.548700, 126.944400], // 양평
      [37.544174, 126.951593], // 공덕
      [37.539165, 126.945731], // 마포
      [37.527026, 126.932750], // 여의나루
      [37.521433, 126.924388], // 여의도
      [37.524900, 126.934200], // 샛강
      [37.532900, 126.952700], // 신길
      [37.538900, 126.959100], // 영등포시장
      [37.545800, 126.967700], // 영등포구청
      [37.556200, 126.971500], // 양평
      [37.565100, 126.971600], // 신길동
      [37.571524, 126.976812], // 광화문
      [37.571607, 126.991570], // 종로3가
      [37.567109, 126.998167], // 을지로4가
      [37.565138, 127.007896], // 동대문역사문화공원
      [37.561432, 127.037522], // 왕십리
      [37.557720, 127.051890], // 마장
      [37.553440, 127.063570], // 답십리
      [37.550320, 127.073550], // 장한평
      [37.548580, 127.085980], // 군자
      [37.547720, 127.094710], // 아차산
      [37.545069, 127.103038], // 광나루
      [37.538594, 127.123820], // 천호
      [37.535241, 127.132233], // 강동
    ],
  },
  '6': {
    color: '#CD7C2F',
    coords: [
      [37.619300, 126.932600], // 응암
      [37.606700, 126.922200], // 역촌
      [37.598800, 126.917400], // 불광
      [37.588900, 126.915900], // 독바위
      [37.581300, 126.912800], // 연신내
      [37.576995, 126.899414], // 디지털미디어시티
      [37.568300, 126.900500], // 월드컵경기장
      [37.563100, 126.913000], // 마포구청
      [37.553700, 126.921800], // 망원
      [37.547800, 126.933400], // 합정
      [37.548700, 126.941900], // 상수
      [37.545200, 126.949700], // 광흥창
      [37.543900, 126.957300], // 대흥
      [37.544174, 126.951593], // 공덕
      [37.539142, 126.961685], // 효창공원앞
      [37.534847, 126.973135], // 삼각지
      [37.534406, 126.994597], // 이태원
      [37.539680, 126.998352], // 한강진
      [37.546900, 127.003200], // 버티고개
      [37.553700, 127.007100], // 약수
      [37.561100, 127.016500], // 청구
      [37.564800, 127.024400], // 신당
      [37.570600, 127.036600], // 동묘앞
      [37.580500, 127.045200], // 창신
      [37.592700, 127.043800], // 보문
      [37.605600, 127.039500], // 안암
      [37.619900, 127.057900], // 고려대
      [37.633700, 127.069500], // 월곡
      [37.644100, 127.074100], // 상월곡
      [37.653000, 127.079900], // 돌곶이
      [37.664300, 127.080800], // 석계
    ],
  },
  '7': {
    color: '#747F00',
    coords: [
      [37.679700, 126.745900], // 장암
      [37.668200, 126.756400], // 도봉산
      [37.655779, 127.061352], // 노원
      [37.641700, 127.072300], // 마들
      [37.627900, 127.076700], // 먹골
      [37.613200, 127.078300], // 중화
      [37.598800, 127.078800], // 상봉
      [37.589000, 127.081100], // 면목
      [37.573100, 127.085600], // 사가정
      [37.556900, 127.082100], // 용마산
      [37.548800, 127.078100], // 중곡
      [37.540372, 127.070149], // 건대입구
      [37.531428, 127.066314], // 뚝섬유원지
      [37.519835, 127.053521], // 청담
      [37.517012, 127.041238], // 강남구청
      [37.514682, 127.031989], // 학동
      [37.511187, 127.021617], // 논현
      [37.504811, 127.004943], // 고속터미널
      [37.502800, 126.993500], // 내방
      [37.498800, 126.982400], // 이수
      [37.490500, 126.971400], // 남성
      [37.481100, 126.952400], // 숭실대입구
      [37.472700, 126.941400], // 상도
      [37.464500, 126.933100], // 장승배기
      [37.455800, 126.921800], // 신대방삼거리
      [37.447200, 126.907400], // 보라매
      [37.444600, 126.896700], // 신풍
      [37.445100, 126.883100], // 대림
      [37.445400, 126.868500], // 남구로
      [37.442700, 126.854000], // 가산디지털단지
    ],
  },
  '8': {
    color: '#E6186C',
    coords: [
      [37.550388, 127.127475], // 암사
      [37.538594, 127.123820], // 천호
      [37.532700, 127.117800], // 강동구청
      [37.525600, 127.112200], // 몽촌토성
      [37.513282, 127.100150], // 잠실
      [37.505558, 127.106824], // 석촌
      [37.492522, 127.118234], // 가락시장
      [37.485266, 127.122645], // 문정
      [37.470048, 127.126609], // 복정
      [37.432882, 127.129009], // 모란
    ],
  },
  '9': {
    color: '#BDB092',
    coords: [
      [37.561863, 126.800941], // 김포공항
      [37.566961, 126.836445], // 마곡나루
      [37.550705, 126.865133], // 등촌
      [37.546937, 126.874916], // 염창
      [37.533547, 126.902556], // 당산
      [37.521433, 126.924388], // 여의도
      [37.513294, 126.942526], // 노량진
      [37.504400, 126.954200], // 흑석
      [37.499100, 126.968100], // 동작
      [37.495100, 126.981700], // 구반포
      [37.493200, 126.993200], // 신반포
      [37.504811, 127.004943], // 고속터미널
      [37.502192, 127.017827], // 사평
      [37.504856, 127.025174], // 신논현
      [37.507129, 127.034026], // 언주
      [37.510404, 127.043240], // 선정릉
      [37.510936, 127.044859], // 삼성중앙
      [37.514826, 127.057678], // 봉은사
      [37.510997, 127.073642], // 종합운동장
      [37.503700, 127.086400], // 삼전
      [37.501200, 127.099600], // 석촌고분
      [37.503200, 127.112100], // 석촌
      [37.508700, 127.126900], // 송파나루
      [37.519300, 127.136900], // 한성백제
      [37.532400, 127.139600], // 올림픽공원
      [37.545200, 127.143800], // 둔촌오륜
      [37.558100, 127.150200], // 중앙보훈병원
    ],
  },
};

// 노선 표시 여부 상태
const DEFAULT_VISIBLE_LINES = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

export default function MapView({ leads, onStatusChange, onListView, focusLead, onFocusClear }: MapViewProps) {
  const [isClient, setIsClient] = useState(false);
  const [, setSelectedLead] = useState<Lead | null>(null);
  const [visibleLines, setVisibleLines] = useState<string[]>(DEFAULT_VISIBLE_LINES);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 클라이언트 hydration 감지용
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
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
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

          {/* 지하철역 마커 (심플 원형) */}
          {SUBWAY_STATIONS.map(station => (
            <CircleMarker
              key={station.name}
              center={[station.lat, station.lng]}
              radius={5}
              fillColor={LINE_COLORS[station.lines[0]] || '#888'}
              fillOpacity={0.9}
              color="#fff"
              weight={1}
            >
              <Tooltip direction="top" offset={[0, -5]} opacity={0.9}>
                <span className="font-medium">{station.name}역</span>
              </Tooltip>
            </CircleMarker>
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
