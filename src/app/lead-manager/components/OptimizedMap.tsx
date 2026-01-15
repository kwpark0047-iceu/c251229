/**
 * 최적화된 지도 컴포넌트
 * 마커 클러스터링, 가상화, 캐싱 적용
 */

'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Lead } from '../types';
import { useDebounce, useThrottle } from '../hooks/usePerformance';

// 동적 임포트로 SSR 방지
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false });
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false });
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false });

interface OptimizedMapProps {
  leads: Lead[];
  selectedLeads: Set<string>;
  onSelectLead: (id: string) => void;
  center?: [number, number];
  zoom?: number;
  searchQuery?: string;
  statusFilter?: string[];
  clusterRadius?: number;
  maxZoom?: number;
}

// 마커 클러스터 클래스
class MarkerCluster {
  private clusters: Map<string, { leads: Lead[]; position: [number, number] }> = new Map();
  private radius: number;

  constructor(radius: number = 50) {
    this.radius = radius;
  }

  cluster(leads: Lead[]): Map<string, { leads: Lead[]; position: [number, number] }> {
    this.clusters.clear();

    leads.forEach(lead => {
      if (!lead.lat || !lead.lng) return;

      const gridKey = this.getGridKey(lead.lat, lead.lng);
      
      if (!this.clusters.has(gridKey)) {
        this.clusters.set(gridKey, {
          leads: [],
          position: [lead.lat, lead.lng],
        });
      }

      this.clusters.get(gridKey)!.leads.push(lead);
    });

    // 클러스터 중심점 계산
    this.clusters.forEach(cluster => {
      const avgLat = cluster.leads.reduce((sum, lead) => sum + lead.lat!, 0) / cluster.leads.length;
      const avgLng = cluster.leads.reduce((sum, lead) => sum + lead.lng!, 0) / cluster.leads.length;
      cluster.position = [avgLat, avgLng];
    });

    return this.clusters;
  }

  private getGridKey(lat: number, lng: number): string {
    const latGrid = Math.floor(lat / this.radius) * this.radius;
    const lngGrid = Math.floor(lng / this.radius) * this.radius;
    return `${latGrid},${lngGrid}`;
  }
}

// 캐싱된 마커 컴포넌트
const CachedMarker = React.memo(({ 
  lead, 
  isSelected, 
  onSelect 
}: {
  lead: Lead;
  isSelected: boolean;
  onSelect: () => void;
}) => {
  const markerRef = useRef<any>(null);

  useEffect(() => {
    if (markerRef.current && isSelected) {
      markerRef.current.openPopup();
    }
  }, [isSelected]);

  if (!lead.lat || !lead.lng) return null;

  return (
    <Marker
      ref={markerRef}
      position={[lead.lat, lead.lng]}
      eventHandlers={{
        click: onSelect,
      }}
    >
      <Popup>
        <div className="p-2 min-w-48">
          <h3 className="font-semibold text-sm mb-1">{lead.bizName}</h3>
          <p className="text-xs text-gray-600 mb-1">{lead.roadAddress}</p>
          <p className="text-xs text-gray-500">{lead.bizType}</p>
          <div className="mt-2 flex justify-between items-center">
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
              {lead.nearestStation}
            </span>
            <span className="text-xs text-gray-500">{lead.distance}m</span>
          </div>
        </div>
      </Popup>
    </Marker>
  );
});

CachedMarker.displayName = 'CachedMarker';

// 클러스터 마커 컴포넌트
const ClusterMarker = React.memo(({ 
  cluster, 
  onSelect 
}: {
  cluster: { leads: Lead[]; position: [number, number] };
  onSelect: () => void;
}) => {
  const leadCount = cluster.leads.length;
  const size = Math.min(30 + leadCount * 2, 60); // 동적 크기

  return (
    <Marker
      position={cluster.position}
      eventHandlers={{
        click: onSelect,
      }}
    >
      <Popup>
        <div className="p-2">
          <h3 className="font-semibold text-sm mb-2">
            클러스터 ({leadCount}개 리드)
          </h3>
          <div className="max-h-32 overflow-y-auto">
            {cluster.leads.slice(0, 5).map((lead, index) => (
              <div key={lead.id} className="text-xs py-1 border-b last:border-b-0">
                <div className="font-medium">{lead.bizName}</div>
                <div className="text-gray-500">{lead.nearestStation}</div>
              </div>
            ))}
            {leadCount > 5 && (
              <div className="text-xs text-gray-500 py-1">
                그 외 {leadCount - 5}개...
              </div>
            )}
          </div>
        </div>
      </Popup>
    </Marker>
  );
});

ClusterMarker.displayName = 'ClusterMarker';

export default function OptimizedMap({
  leads,
  selectedLeads,
  onSelectLead,
  center = [37.5665, 126.9780], // 서울 시청
  zoom = 12,
  searchQuery,
  statusFilter,
  clusterRadius = 50,
  maxZoom = 18,
}: OptimizedMapProps) {
  const [map, setMap] = useState<any>(null);
  const [currentZoom, setCurrentZoom] = useState(zoom);
  const [visibleLeads, setVisibleLeads] = useState<Lead[]>([]);
  const [bounds, setBounds] = useState<any>(null);
  const markerCluster = useRef(new MarkerCluster(clusterRadius));
  const mapRef = useRef<any>(null);

  // 디바운스된 검색어
  const debouncedSearchQuery = useDebounce(searchQuery || '', 300);

  // 필터링된 리드 계산
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      if (!lead.lat || !lead.lng) return false;

      const matchesSearch = !debouncedSearchQuery || 
        lead.bizName.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        lead.roadAddress.toLowerCase().includes(debouncedSearchQuery.toLowerCase());

      const matchesStatus = !statusFilter || statusFilter.length === 0 || 
        statusFilter.includes(lead.status);

      return matchesSearch && matchesStatus;
    });
  }, [leads, debouncedSearchQuery, statusFilter]);

  // 쓰로틀된 경계 업데이트
  const updateBounds = useThrottle((newBounds: any) => {
    setBounds(newBounds);
    
    // 경계 내 리드 필터링
    if (newBounds && map) {
      const visible = filteredLeads.filter(lead => {
        return lead.lat! >= newBounds._southWest.lat &&
               lead.lat! <= newBounds._northEast.lat &&
               lead.lng! >= newBounds._southWest.lng &&
               lead.lng! <= newBounds._northEast.lng;
      });
      setVisibleLeads(visible);
    }
  }, 100);

  // 지도 이벤트 핸들러
  const handleMapEvents = useCallback((mapInstance: any) => {
    setMap(mapInstance);

    // 확대/축소 이벤트
    mapInstance.on('zoomend', () => {
      setCurrentZoom(mapInstance.getZoom());
      updateBounds(mapInstance.getBounds());
    });

    // 이동 이벤트
    mapInstance.on('moveend', () => {
      updateBounds(mapInstance.getBounds());
    });

    // 초기 경계 설정
    updateBounds(mapInstance.getBounds());
  }, [updateBounds]);

  // 확대/축소에 따른 클러스터링 전략 변경
  const shouldCluster = currentZoom < 15; // 15 이하에서만 클러스터링

  // 클러스터링된 마커 계산
  const clusteredMarkers = useMemo(() => {
    if (!shouldCluster) {
      return filteredLeads.map(lead => ({
        type: 'marker' as const,
        lead,
        position: [lead.lat!, lead.lng!],
      }));
    }

    const clusters = markerCluster.current.cluster(visibleLeads);
    return Array.from(clusters.entries()).map(([key, cluster]) => ({
      type: cluster.leads.length === 1 ? 'marker' as const : 'cluster' as const,
      lead: cluster.leads[0],
      cluster,
      position: cluster.position,
    }));
  }, [filteredLeads, visibleLeads, shouldCluster]);

  // 리드 선택 핸들러
  const handleLeadSelect = useCallback((leadId: string) => {
    onSelectLead(leadId);
    
    // 선택된 리드로 지도 이동
    const lead = leads.find(l => l.id === leadId);
    if (lead && lead.lat && lead.lng && map) {
      map.setView([lead.lat, lead.lng], Math.max(currentZoom, 16));
    }
  }, [leads, onSelectLead, map, currentZoom]);

  // 클러스터 선택 핸들러
  const handleClusterSelect = useCallback((cluster: { leads: Lead[]; position: [number, number] }) => {
    if (cluster.leads.length === 1) {
      handleLeadSelect(cluster.leads[0].id);
    } else {
      // 클러스터 확대
      if (map) {
        map.setView(cluster.position, Math.min(currentZoom + 2, maxZoom));
      }
    }
  }, [handleLeadSelect, map, currentZoom, maxZoom]);

  // 지도 중심점 자동 조정
  useEffect(() => {
    if (filteredLeads.length > 0 && map && !bounds) {
      const group = new (window as any).L.featureGroup(
        filteredLeads.map(lead => 
          (window as any).L.marker([lead.lat!, lead.lng!])
        )
      );
      
      if (group.getBounds().isValid()) {
        map.fitBounds(group.getBounds(), { padding: [50, 50] });
      }
    }
  }, [filteredLeads, map, bounds]);

  return (
    <div className="h-full w-full">
      {typeof window !== 'undefined' && (
        <MapContainer
          ref={mapRef}
          center={center}
          zoom={zoom}
          className="h-full w-full"
          whenCreated={handleMapEvents}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* 마커 렌더링 */}
          {clusteredMarkers.map((item, index) => {
            if (item.type === 'marker') {
              return (
                <CachedMarker
                  key={`marker-${item.lead.id}`}
                  lead={item.lead}
                  isSelected={selectedLeads.has(item.lead.id)}
                  onSelect={() => handleLeadSelect(item.lead.id)}
                />
              );
            } else {
              return (
                <ClusterMarker
                  key={`cluster-${index}`}
                  cluster={item.cluster}
                  onSelect={() => handleClusterSelect(item.cluster)}
                />
              );
            }
          })}
        </MapContainer>
      )}
      
      {/* 지도 통계 정보 */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-3 z-10">
        <div className="text-sm space-y-1">
          <div>총 리드: {filteredLeads.length.toLocaleString()}개</div>
          <div>표시 리드: {visibleLeads.length.toLocaleString()}개</div>
          <div>클러스터: {shouldCluster ? '활성' : '비활성'}</div>
          <div>확대 수준: {currentZoom}</div>
        </div>
      </div>

      {/* 검색 결과가 없을 때 */}
      {filteredLeads.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-90">
          <div className="text-center">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <p className="text-gray-500">검색 결과가 없습니다</p>
          </div>
        </div>
      )}
    </div>
  );
}
