import { SubwayStation } from '../types';
import { TOTAL_SUBWAY_STATIONS } from '../data/stations';

// 노선별 색상 정의 (확장됨)
export const SUBWAY_LINE_COLORS: Record<string, string> = {
    // 1~9호선
    '1': '#0052A4',
    '2': '#00A84D',
    '3': '#EF7C1C',
    '4': '#00A5DE',
    '5': '#996CAC',
    '6': '#CD7C2F',
    '7': '#747F00',
    '8': '#E6186C',
    '9': '#BDB092',

    // 기타 수도권 노선
    'S': '#D4003B',   // 신분당선
    'B': '#F5A200',   // 수인분당선
    'K': '#77C4A3',   // 경의중앙선
    'G': '#0C8E72',   // 경춘선
    'A': '#0090D2',   // 공항철도
    'Ui': '#B0CE18',  // 우이신설선
    'Si': '#6789CA',  // 신림선
    'Kg': '#003DA5',  // 경강선
    'W': '#81A914',   // 서해선
    'E': '#56AC2D',   // 용인에버라인
    'U': '#FDA600',   // 의정부경전철
    'GTX-A': '#9A6292', // GTX-A
    'Incheon1': '#7CA8D5', // 인천1호선 (I1)
    'Incheon2': '#ED8B00', // 인천2호선 (I2)
    'I1': '#7CA8D5', // 인천1호선 (alias)
    'I2': '#ED8B00', // 인천2호선 (alias)
    'Shinbundang': '#D4003B', // 신분당선 (alias)
    'SuinBundang': '#F5A200', // 수인분당선 (alias)
    'GyeonguiJungang': '#77C4A3', // 경의중앙선 (alias)
    'Gyeongchun': '#0C8E72', // 경춘선 (alias)
    'Airport': '#0090D2', // 공항철도 (alias)
};

export interface RouteData {
    color: string;
    coords: [number, number][];
}

/**
 * 역 데이터를 기반으로 노선별 경로 데이터를 생성합니다.
 * stations.ts의 데이터가 노선별로 정렬되어 있다고 가정합니다.
 * 하나의 역이 여러 노선에 포함될 수 있으므로 (환승역), 
 * 각 노선별로 역을 필터링하여 순서대로 연결합니다.
 */
export const generateSubwayRoutes = (): Record<string, RouteData> => {
    const routes: Record<string, RouteData> = {};

    // 모든 노선 코드 추출 (중복 제거)
    const allLines = new Set<string>();
    TOTAL_SUBWAY_STATIONS.forEach(station => {
        station.lines.forEach(line => allLines.add(line));
    });

    // 각 노선별로 좌표 배열 생성
    Array.from(allLines).forEach(lineCode => {
        // 해당 노선에 속하는 역들을 찾음
        // 주의: TOTAL_SUBWAY_STATIONS 배열의 순서가 해당 노선의 역 순서와 일치해야 선이 예쁘게 그려짐
        // stations.ts 파일은 노선별로 그룹화되어 있으므로, 
        // 전체 리스트에서 해당 라인을 포함하는 역을 순서대로 추출하면 됨
        const stationPoints: [number, number][] = [];

        TOTAL_SUBWAY_STATIONS.forEach(station => {
            if (station.lines.includes(lineCode)) {
                stationPoints.push([station.lat, station.lng]);
            }
        });

        if (stationPoints.length > 1) {
            routes[lineCode] = {
                color: SUBWAY_LINE_COLORS[lineCode] || '#999999',
                coords: stationPoints
            };
        }
    });

    return routes;
};

/**
 * 노선 코드에 따른 표시 이름을 반환합니다.
 */
export const getLineDisplayName = (lineCode: string): string => {
    const displayNames: Record<string, string> = {
        '1': '1호선',
        '2': '2호선',
        '3': '3호선',
        '4': '4호선',
        '5': '5호선',
        '6': '6호선',
        '7': '7호선',
        '8': '8호선',
        '9': '9호선',
        'S': '신분당',
        'B': '수인분당',
        'K': '경의중앙',
        'G': '경춘',
        'A': '공항철도',
        'Ui': '우이신설',
        'Si': '신림',
        'Kg': '경강',
        'W': '서해',
        'E': '에버라인',
        'U': '의정부',
        'I1': '인천1호선',
        'I2': '인천2호선',
    };

    return displayNames[lineCode] || lineCode;
};
