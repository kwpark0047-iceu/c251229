import { SubwayStation } from '../types';
import { TOTAL_SUBWAY_STATIONS } from '../data/stations';
import { LINE_SEQUENCES } from '../data/line-sequences';

export type RouteData = {
    color: string;
    coords: [number, number][];
};

/**
 * 노선별 대표 색상 정의
 */
export const SUBWAY_LINE_COLORS: Record<string, string> = {
    '1': '#0052A4', '2': '#00A84D', '3': '#EF7C1C', '4': '#00A5DE',
    '5': '#996CAC', '6': '#CD7E2F', '7': '#727FB8', '8': '#E6186A', '9': '#BAB135',
    'S': '#D4003A', 'B': '#F5A200', 'K': '#77BB4A', 'G': '#807DB8', 'A': '#009D3E',
    'I1': '#7CA8D5', 'I2': '#ED8B00', 'Ui': '#B0CE18', 'Si': '#6789CA', 'Kg': '#003DA5',
    'W': '#81A914', 'E': '#6FB245', 'U': '#FDA600', 'GTX-A': '#9B2247'
};

/**
 * 역 데이터를 기반으로 노선별 경로 데이터를 생성합니다.
 * line-sequences.ts의 표준 시퀀스를 사용하여 스파이더 웹 현상을 방지합니다.
 */
export const generateSubwayRoutes = (): Record<string, RouteData> => {
    const routes: Record<string, RouteData> = {};

    // 1~9호선 및 주요 지선 처리 (시퀀스 기반)
    Object.entries(LINE_SEQUENCES).forEach(([key, sequence]) => {
        // baseLineCode: '1-incheon' -> '1', '2-main' -> '2'
        const baseLineCode = key.split('-')[0];
        const color = SUBWAY_LINE_COLORS[baseLineCode] || '#999999';

        const coords = (sequence as string[])
            .map(name => {
                // stations.ts의 역 이름과 비교하여 좌표 추출
                const station = TOTAL_SUBWAY_STATIONS.find(s => s.name === name && s.lines.includes(baseLineCode));
                // 1호문의 경우 인천 1호선과 겹칠 수 있으므로 baseLineCode 일치 여부 확인
                return station ? ([station.lat, station.lng] as [number, number]) : null;
            })
            .filter((coord): coord is [number, number] => !!coord);

        if (coords.length > 1) {
            routes[key] = { color, coords };
        }
    });

    // 나머지 기타 노선들 처리 (시퀀스가 명시되지 않은 수도권 전철)
    const handledBaseCodes = new Set(Object.keys(LINE_SEQUENCES).map(key => key.split('-')[0]));
    const otherCodes = ['S', 'B', 'K', 'G', 'A', 'I1', 'I2', 'Ui', 'Si', 'Kg', 'W', 'E', 'U', 'GTX-A'];

    otherCodes.forEach(lineCode => {
        if (handledBaseCodes.has(lineCode)) return;

        const lineStations = TOTAL_SUBWAY_STATIONS.filter(s => s.lines.includes(lineCode));
        if (lineStations.length <= 1) return;

        const color = SUBWAY_LINE_COLORS[lineCode] || '#999999';
        const coords: [number, number][] = lineStations.map(s => [s.lat, s.lng]);
        routes[lineCode] = { color, coords };
    });

    return routes;
};
