/**
 * 위마켓(Wemarket) 전역 공통 상수
 */

// 1. 지하철 노선 색상 (Metro Line Colors)
export const METRO_LINE_COLORS: Record<string, string> = {
    '1': '#0052A4',   // 1호선
    '2': '#00A84D',   // 2호선
    '3': '#EF7C1C',   // 3호선
    '4': '#00A5DE',   // 4호선
    '5': '#996CAC',   // 5호선
    '6': '#CD7C2F',   // 6호선
    '7': '#747F00',   // 7호선
    '8': '#E6186C',   // 8호선
    '9': '#BDB092',   // 9호선
    'S': '#D4003B',   // 신분당선
    'K': '#77C4A3',   // 경의중앙선
    'A': '#0090D2',   // 공항철도
    'B': '#FFB300',   // 수인분당선
    'G': '#6EBE46',   // 경춘선
    'I': '#FA5F2C',   // 인천1호선
    'U': '#B0CE18',   // 우이신설선
    'W': '#76A4D6',   // 서해선
};

// 하위 호환성을 위한 별칭
export const LINE_COLORS = METRO_LINE_COLORS;

// 지원하는 노선 목록
export const METRO_LINES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'S', 'K', 'A', 'B'] as const;
export type MetroLine = (typeof METRO_LINES)[number];

// 노선 이름 매핑
export const METRO_LINE_NAMES: Record<string, string> = {
    '1': '1호선',
    '2': '2호선',
    '3': '3호선',
    '4': '4호선',
    '5': '5호선',
    '6': '6호선',
    '7': '7호선',
    '8': '8호선',
    '9': '9호선',
    'S': '신분당선',
    'K': '경의중앙선',
    'A': '공항철도',
    'B': '수인분당선',
};

// 2. 지하철 역 주요 데이터 (좌표 포함)
export interface SubwayStation {
    name: string;
    lat: number;
    lng: number;
    lines: string[];
}

export const SUBWAY_STATIONS: SubwayStation[] = [
    // 2호선 주요역
    { name: '강남', lat: 37.497945, lng: 127.027621, lines: ['2', 'S'] },
    { name: '역삼', lat: 37.500622, lng: 127.036456, lines: ['2'] },
    { name: '선릉', lat: 37.504503, lng: 127.049008, lines: ['2', 'K'] },
    { name: '삼성', lat: 37.508844, lng: 127.063214, lines: ['2'] },
    { name: '교대', lat: 37.493415, lng: 127.014626, lines: ['2', '3'] },
    { name: '잠실', lat: 37.513282, lng: 127.100150, lines: ['2', '8'] },
    { name: '성수', lat: 37.544580, lng: 127.055914, lines: ['2'] },
    { name: '건대입구', lat: 37.540372, lng: 127.070149, lines: ['2', '7'] },
    { name: '홍대입구', lat: 37.556823, lng: 126.923778, lines: ['2', 'A', 'K'] },
    { name: '신촌', lat: 37.555199, lng: 126.936664, lines: ['2'] },
    { name: '을지로입구', lat: 37.566014, lng: 126.982618, lines: ['2'] },
    { name: '시청', lat: 37.565712, lng: 126.977041, lines: ['1', '2'] },

    // 1호선 & 4호선
    { name: '서울역', lat: 37.554648, lng: 126.970702, lines: ['1', '4', 'A', 'K'] },
    { name: '명동', lat: 37.560830, lng: 126.985797, lines: ['4'] },
    { name: '용산', lat: 37.529849, lng: 126.964561, lines: ['1', 'K'] },

    // 3호선 & 7호선 & 9호선
    { name: '고속터미널', lat: 37.504811, lng: 127.004943, lines: ['3', '7', '9'] },
    { name: '신사', lat: 37.516778, lng: 127.019998, lines: ['3', 'S'] },
    { name: '압구정', lat: 37.527026, lng: 127.028311, lines: ['3'] },
    { name: '여의도', lat: 37.521433, lng: 126.924388, lines: ['5', '9'] },
    { name: '노량진', lat: 37.513294, lng: 126.942526, lines: ['1', '9'] },
];

// 3. 역사별 특색 및 유동인구 통계 (Marketing Info)
export const STATION_MARKETING_INFO: Record<string, { trafficDaily: number; characteristics: string }> = {
    '강남': { trafficDaily: 120000, characteristics: '강남 상권 중심, 2030 직장인/학생 밀집 지역' },
    '역삼': { trafficDaily: 85000, characteristics: '스타트업/IT 기업 밀집, 젊은 직장인 주 이용' },
    '선릉': { trafficDaily: 75000, characteristics: '대기업 본사 밀집, 고소득 직장인층' },
    '삼성': { trafficDaily: 110000, characteristics: 'COEX/무역센터 인근, 비즈니스/관광객 다수' },
    '교대': { trafficDaily: 70000, characteristics: '법원/검찰청 인근, 전문직 종사자 다수' },
    '홍대입구': { trafficDaily: 130000, characteristics: '청년 문화 중심지, 1020 유동인구 최다' },
    '신촌': { trafficDaily: 90000, characteristics: '대학가 상권, 학생/젊은층 밀집' },
    '여의도': { trafficDaily: 100000, characteristics: '금융가 중심, 고소득 직장인층' },
    '잠실': { trafficDaily: 115000, characteristics: '롯데타워/잠실운동장, 쇼핑/엔터테인먼트 중심' },
    '명동': { trafficDaily: 95000, characteristics: '관광/쇼핑 중심지, 외국인 관광객 다수' },
    '서울역': { trafficDaily: 140000, characteristics: 'KTX 환승역, 전국 유동인구 집중' },
    '고속터미널': { trafficDaily: 125000, characteristics: '버스터미널 환승, 장거리 이동객 다수' },
};
