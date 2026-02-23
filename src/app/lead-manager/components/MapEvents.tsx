'use client';

import { useMapEvents } from 'react-leaflet';

interface MapEventsProps {
    onZoomEnd: (zoom: number) => void;
}

/**
 * Leaflet 지도의 이벤트를 감지하여 콜백을 실행하는 컴포넌트
 * MapContainer 내부에서 사용되어야 합니다.
 */
export default function MapEvents({ onZoomEnd }: MapEventsProps) {
    useMapEvents({
        zoomend: (e) => {
            onZoomEnd(e.target.getZoom());
        },
    });

    return null;
}
