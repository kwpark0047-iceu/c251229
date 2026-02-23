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
 * stations.ts의 데이터가 노선별로 정렬되어 있다고 가정하지만,
 * 지선(Branch)이 혼합되어 있어 이를 분리하여 처리합니다.
 */
export const generateSubwayRoutes = (): Record<string, RouteData> => {
    const routes: Record<string, RouteData> = {};

    // 각 노선별로 특수 처리 로직 적용
    const lineCodes = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'S', 'B', 'K', 'G', 'A', 'I1', 'I2', 'Ui', 'Si', 'Kg', 'W', 'E', 'U', 'GTX-A'];

    lineCodes.forEach(lineCode => {
        let lineStations = TOTAL_SUBWAY_STATIONS.filter(station =>
            station.lines.includes(lineCode)
        );

        if (lineStations.length <= 1) return;

        const color = SUBWAY_LINE_COLORS[lineCode] || '#999999';

        // 2호선 특수 처리: 본선 루프, 성수지선, 신정지선 분리
        if (lineCode === '2') {
            // 본선 (순환)
            const mainLoopNames = [
                '시청', '을지로입구', '을지로3가', '을지로4가', '동대문역사문화공원', '신당', '상왕십리', '왕십리', '한양대', '뚝섬', '성수',
                '건대입구', '구의', '강변', '잠실나루', '잠실', '잠실새내', '종합운동장', '삼성', '선릉', '역삼', '강남', '교대', '서초', '방배',
                '사당', '낙성대', '서울대입구', '봉천', '신림', '신대방', '구로디지털단지', '대림', '신도림', '문래', '영등포구청', '당산', '합정',
                '홍대입구', '신촌', '이대', '아현', '충정로'
            ];
            const mainLoop = mainLoopNames
                .map(name => lineStations.find(s => s.name === name))
                .filter((s): s is SubwayStation => !!s)
                .map(s => [s.lat, s.lng] as [number, number]);

            if (mainLoop.length > 0) {
                mainLoop.push(mainLoop[0]); // 순환선 닫기
                routes['2'] = { color, coords: mainLoop };
            }

            // 성수지선 (성수-용답-신답-용두-신설동)
            const seongsuBranchNames = ['성수', '용답', '신답', '용두', '신설동'];
            const seongsuBranch = seongsuBranchNames
                .map(name => lineStations.find(s => s.name === name))
                .filter((s): s is SubwayStation => !!s)
                .map(s => [s.lat, s.lng] as [number, number]);

            if (seongsuBranch.length > 1) {
                routes['2-seongsu'] = { color, coords: seongsuBranch };
            }

            // 신정지선 (신도림-도림천-양천구청-신정네거리-까치산)
            const sinjeongBranchNames = ['신도림', '도림천', '양천구청', '신정네거리', '까치산'];
            const sinjeongBranch = sinjeongBranchNames
                .map(name => lineStations.find(s => s.name === name))
                .filter((s): s is SubwayStation => !!s)
                .map(s => [s.lat, s.lng] as [number, number]);

            if (sinjeongBranch.length > 1) {
                routes['2-sinjeong'] = { color, coords: sinjeongBranch };
            }
        }
        // 1호선 특수 처리: 구로역 분기 (소요산-인천, 구로-천안)
        else if (lineCode === '1') {
            const commonToGuro = lineStations.slice(0, lineStations.findIndex(s => s.name === '구로') + 1);
            const guroToIncheon = lineStations.filter(s =>
                lineStations.indexOf(s) > lineStations.findIndex(s2 => s2.name === '구로') &&
                lineStations.indexOf(s) <= lineStations.findIndex(s2 => s2.name === '인천')
            );
            const guroToCheonan = lineStations.filter(s =>
                ['구로', '가산디지털단지', '독산', '금천구청', '석수', '관악', '안양', '명학', '금정', '군포', '당정', '의왕', '성균관대', '화서', '수원', '세류', '병점', '세마', '오산대', '오산', '진위', '송탄', '서정리', '지제', '평택', '성환', '직산', '두정', '천안'].includes(s.name)
            );

            routes['1-main'] = { color, coords: commonToGuro.map(s => [s.lat, s.lng]) };
            routes['1-incheon'] = { color, coords: guroToIncheon.map(s => [s.lat, s.lng]) };
            // 구로역에서 가산디지털단지로 이어지도록 구로역 좌표를 앞에 추가
            const guro = lineStations.find(s => s.name === '구로');
            const cheonanCoords: [number, number][] = guro ? [[guro.lat, guro.lng]] : [];
            guroToCheonan.forEach(s => {
                if (s.name !== '구로') cheonanCoords.push([s.lat, s.lng]);
            });
            routes['1-cheonan'] = { color, coords: cheonanCoords };
        }
        // 5호선 특수 처리: 강동역 분기 (방화-강동-마천, 강동-하남검단산)
        else if (lineCode === '5') {
            const commonToGangdong = lineStations.slice(0, lineStations.findIndex(s => s.name === '강동') + 1);
            const gangdongToMacheon = [
                lineStations.find(s => s.name === '강동'),
                ...lineStations.filter(s => ['둔촌동', '올림픽공원', '방이', '오금', '개롱', '거여', '마천'].includes(s.name))
            ].filter((s): s is SubwayStation => !!s);

            const gangdongToHanam = lineStations.filter(s =>
                ['강동', '길동', '굽은다리', '명일', '고덕', '상일동', '강일', '미사', '하남풍산', '하남시청', '하남검단산'].includes(s.name)
            );

            routes['5-main'] = { color, coords: commonToGangdong.map(s => [s.lat, s.lng]) };
            routes['5-macheon'] = { color, coords: gangdongToMacheon.map(s => [s.lat, s.lng]) };
            routes['5-hanam'] = { color, coords: gangdongToHanam.map(s => [s.lat, s.lng]) };
        }
        // 일반 노선: 정적 데이터 순서대로 연결
        else {
            const stationPoints: [number, number][] = lineStations.map(station => [station.lat, station.lng]);
            routes[lineCode] = { color, coords: stationPoints };
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
