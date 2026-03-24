'use client';

/**
 * 지도 포커스 컨트롤러 컴포넌트
 * focusLead가 변경되면 해당 위치로 지도를 이동하고 줌인
 */

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import { Lead } from '../types';

interface MapFocusControllerProps {
  focusLead?: Lead | null;
  targetLocation?: { lat: number; lng: number; zoom?: number } | null;
  onFocusClear?: () => void;
}

export default function MapFocusController({ focusLead, targetLocation, onFocusClear }: MapFocusControllerProps) {
  const map = useMap();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // 1. 리드 기반 포커스
    if (focusLead?.latitude && focusLead?.longitude && !hasProcessed.current) {
      map.flyTo([focusLead.latitude, focusLead.longitude], 17, {
        duration: 1.5,
      });

      hasProcessed.current = true;
      setTimeout(() => {
        onFocusClear?.();
        hasProcessed.current = false;
      }, 2000);
    }
    
    // 2. 직접 좌표 기반 포커스 (검색 결과 등)
    if (targetLocation && !hasProcessed.current) {
      map.flyTo([targetLocation.lat, targetLocation.lng], targetLocation.zoom || 17, {
        duration: 1.5,
      });

      hasProcessed.current = true;
      setTimeout(() => {
        onFocusClear?.();
        hasProcessed.current = false;
      }, 2000);
    }
  }, [focusLead, targetLocation, map, onFocusClear]);

  return null;
}
