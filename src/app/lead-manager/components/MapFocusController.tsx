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
  onFocusClear?: () => void;
}

export default function MapFocusController({ focusLead, onFocusClear }: MapFocusControllerProps) {
  const map = useMap();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (focusLead?.latitude && focusLead?.longitude && !hasProcessed.current) {
      // 해당 위치로 부드럽게 이동하고 줌인
      map.flyTo([focusLead.latitude, focusLead.longitude], 17, {
        duration: 1.5,  // 애니메이션 시간 (초)
      });

      // 포커스 처리 완료 표시
      hasProcessed.current = true;

      // 애니메이션 완료 후 focusLead 클리어 (다음 클릭을 위해)
      setTimeout(() => {
        onFocusClear?.();
        hasProcessed.current = false;
      }, 2000);
    }
  }, [focusLead, map, onFocusClear]);

  return null;
}
