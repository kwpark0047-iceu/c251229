'use client';

/**
 * 지도 포커스 컨트롤러 컴포넌트
 * focusLead가 변경되면 해당 위치로 지도를 이동하고 줌인
 */

import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import { Lead } from '../types';
import { isValidCoordinates } from '../utils/coordinates';

interface MapFocusControllerProps {
  focusLead?: Lead | null;
  targetLocation?: { lat: number; lng: number; zoom?: number } | null;
  onFocusClear?: () => void;
}

export default function MapFocusController({ focusLead, targetLocation, onFocusClear }: MapFocusControllerProps) {
  const map = useMap();
  const onClear = useRef(onFocusClear);
  useEffect(() => { onClear.current = onFocusClear; }, [onFocusClear]);
  const validLead = focusLead && isValidCoordinates(focusLead.latitude, focusLead.longitude);
  const latitude = validLead ? focusLead.latitude : targetLocation?.lat;
  const longitude = validLead ? focusLead.longitude : targetLocation?.lng;
  const requestedZoom = validLead ? 17 : targetLocation?.zoom ?? 17;
  const zoom = Number.isFinite(requestedZoom) && requestedZoom >= 0 && requestedZoom <= 22 ? requestedZoom : 17;

  useEffect(() => {
    if (!isValidCoordinates(latitude, longitude)) return;
    map.flyTo([latitude!, longitude!], zoom, { duration: 1.5 });
    // 새 검색이나 화면 이탈 시 이전 완료 작업이 현재 선택을 지우지 않도록 취소한다.
    const timer = setTimeout(() => onClear.current?.(), 2000);
    return () => clearTimeout(timer);
  }, [latitude, longitude, zoom, map]);

  return null;
}
