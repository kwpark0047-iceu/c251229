import { SubwayStation } from '../types';
import { TOTAL_SUBWAY_STATIONS } from '../data/stations';
import { LINE_SEQUENCES } from '../data/line-sequences';
import { SUBWAY_LINE_ROUTES } from '@/lib/constants';

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
 * KRIC 노선 코드를 표준 짧은 코드로 변환 (예: 1001 -> 1)
 */
export const normalizeLineCode = (kricCode: string): string => {
    const kricToShort: Record<string, string> = {
        '1001': '1', '1002': '2', '1003': '3', '1004': '4',
        '1005': '5', '1006': '6', '1007': '7', '1008': '8', '1009': '9',
        '1077': 'S', '1085': 'B', '1063': 'K', '1067': 'G', '1065': 'A',
        '1099': 'U', '1086': 'E', '1087': 'G', '1090': 'W', '1061': 'I1',
        '1069': 'I2', '1092': 'Ui', '1093': 'Si', '1081': 'Kg'
    };
    return kricToShort[kricCode] || kricCode;
};

/**
 * 노선 코드를 표시용 이름으로 변환합니다 (예: 1 -> 1호선).
 */
export const getLineDisplayName = (lineCode: string): string => {
    const standardizedCode = normalizeLineCode(lineCode);
    const names: Record<string, string> = {
        '1': '1호선', '2': '2호선', '3': '3호선', '4': '4호선',
        '5': '5호선', '6': '6호선', '7': '7호선', '8': '8호선', '9': '9호선',
        'S': '신분당', 'B': '수인분당', 'K': '경의중앙', 'G': '경춘', 'A': '공항철도',
        'I1': '인천1호선', 'I2': '인천2호선', 'Ui': '우이신설', 'Si': '신림', 'Kg': '경강',
        'W': '서해', 'E': '에버라인', 'U': '의정부', 'GTX-A': 'GTX-A'
    };
    return names[standardizedCode] || standardizedCode;
};

/**
 * 역 데이터를 기반으로 노선별 경로 데이터를 생성합니다.
 * line-sequences.ts의 표준 시퀀스를 사용하여 스파이더 웹 현상을 방지합니다.
 */
export const generateSubwayRoutes = (): Record<string, RouteData> => {
    const routes: Record<string, RouteData> = {};

    // 1. 고정밀 외부 좌표 데이터(1~9호선 본선)를 우선 적용
    Object.entries(SUBWAY_LINE_ROUTES).forEach(([key, routeData]) => {
        routes[key] = {
            color: routeData.color,
            coords: routeData.coords
        };
    });

    // 2. 1~9호선의 지선 및 기타 시퀀스 명시 노선 처리 (시퀀스 기반)
    Object.entries(LINE_SEQUENCES).forEach(([key, sequence]) => {
        // baseLineCode: '1-incheon' -> '1', '2-main' -> '2'
        const baseLineCode = key.split('-')[0];
        
        // 이미 SUBWAY_LINE_ROUTES로 채워진 본선은 건너뜀
        // 1, 3, 4 등은 key가 동일하여 routes[key]로 걸러지지만,
        // 2호선은 '2'와 '2-main'으로 되어 있어 baseLineCode로 체크 필요
        if (routes[baseLineCode] && (key === baseLineCode || key.endsWith('-main'))) return;
        if (routes[key]) return;

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
