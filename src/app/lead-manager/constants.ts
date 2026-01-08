/**
 * 서울 지하철 광고 영업 시스템 - 상수 정의
 */

import { SubwayStation, Settings } from './types';

// 기본 API 키 (deprecated - 서버에서 환경변수로 관리됨)
// 환경변수 LOCALDATA_API_KEY에 설정하세요
export const DEFAULT_API_KEY = 'hxOJfL8Q8p70CnIkVXfHy5UFw3yVBh7MPRQwQy0l2QI=';

// CORS 프록시 옵션
export const CORS_PROXIES = [
  { label: '로컬 프록시 (추천)', value: '/api/proxy?url=' },
  { label: 'corsproxy.io', value: 'https://corsproxy.io/?' },
  { label: 'allorigins.win', value: 'https://api.allorigins.win/raw?url=' },
];

// 기본 설정
export const DEFAULT_SETTINGS: Settings = {
  apiKey: DEFAULT_API_KEY,
  corsProxy: '/api/proxy?url=',
  searchType: 'modified_date',
  regionCode: '6110000',
  regionCodes: ['6110000', '6410000'], // 서울, 경기도
};

// LocalData API 엔드포인트 (TO0 = 통합조회)
export const API_ENDPOINT = 'http://www.localdata.go.kr/platform/rest/TO0/openDataApi';

// 주요 서울 지하철역 데이터 (공공데이터포털 서울교통공사 좌표 기준)
export const SUBWAY_STATIONS: SubwayStation[] = [
  // 2호선 강남권 (정확한 좌표)
  { name: '강남', lat: 37.497945, lng: 127.027621, lines: ['2', 'S'] },
  { name: '역삼', lat: 37.500622, lng: 127.036456, lines: ['2'] },
  { name: '선릉', lat: 37.504503, lng: 127.049008, lines: ['2', 'K'] },
  { name: '삼성', lat: 37.508844, lng: 127.063214, lines: ['2'] },
  { name: '종합운동장', lat: 37.510997, lng: 127.073642, lines: ['2', '9'] },
  { name: '신논현', lat: 37.504856, lng: 127.025174, lines: ['9', 'S'] },
  { name: '교대', lat: 37.493415, lng: 127.014626, lines: ['2', '3'] },
  { name: '서초', lat: 37.491897, lng: 127.007917, lines: ['2'] },
  { name: '방배', lat: 37.481426, lng: 126.997596, lines: ['2'] },
  { name: '사당', lat: 37.476538, lng: 126.981544, lines: ['2', '4'] },

  // 2호선 홍대/신촌권 (정확한 좌표)
  { name: '홍대입구', lat: 37.556823, lng: 126.923778, lines: ['2', 'A', 'K'] },
  { name: '신촌', lat: 37.555199, lng: 126.936664, lines: ['2'] },
  { name: '이대', lat: 37.556896, lng: 126.946317, lines: ['2'] },
  { name: '아현', lat: 37.557157, lng: 126.956019, lines: ['2'] },
  { name: '충정로', lat: 37.559762, lng: 126.963531, lines: ['2', '5'] },

  // 2호선 시청/을지로권 (정확한 좌표)
  { name: '시청', lat: 37.565712, lng: 126.977041, lines: ['1', '2'] },
  { name: '을지로입구', lat: 37.566014, lng: 126.982618, lines: ['2'] },
  { name: '을지로3가', lat: 37.566512, lng: 126.991806, lines: ['2', '3'] },
  { name: '을지로4가', lat: 37.567109, lng: 126.998167, lines: ['2', '5'] },
  { name: '동대문역사문화공원', lat: 37.565138, lng: 127.007896, lines: ['2', '4', '5'] },

  // 2호선 성수/건대권 (정확한 좌표)
  { name: '성수', lat: 37.544580, lng: 127.055914, lines: ['2'] },
  { name: '건대입구', lat: 37.540372, lng: 127.070149, lines: ['2', '7'] },
  { name: '구의', lat: 37.535288, lng: 127.086065, lines: ['2'] },
  { name: '강변', lat: 37.534896, lng: 127.094330, lines: ['2'] },
  { name: '잠실나루', lat: 37.521419, lng: 127.102131, lines: ['2'] },
  { name: '잠실', lat: 37.513282, lng: 127.100150, lines: ['2', '8'] },
  { name: '잠실새내', lat: 37.511687, lng: 127.086162, lines: ['2'] },
  { name: '종합운동장', lat: 37.510997, lng: 127.073642, lines: ['2', '9'] },

  // 3호선 (정확한 좌표)
  { name: '압구정', lat: 37.527026, lng: 127.028311, lines: ['3'] },
  { name: '신사', lat: 37.516778, lng: 127.019998, lines: ['3'] },
  { name: '잠원', lat: 37.511369, lng: 127.014213, lines: ['3'] },
  { name: '고속터미널', lat: 37.504811, lng: 127.004943, lines: ['3', '7', '9'] },
  { name: '남부터미널', lat: 37.484926, lng: 127.016158, lines: ['3'] },
  { name: '양재', lat: 37.484147, lng: 127.034530, lines: ['3', 'S'] },
  { name: '매봉', lat: 37.486431, lng: 127.046616, lines: ['3'] },
  { name: '도곡', lat: 37.490856, lng: 127.054434, lines: ['3', 'B'] },
  { name: '대치', lat: 37.494243, lng: 127.063343, lines: ['3'] },
  { name: '학여울', lat: 37.496996, lng: 127.071406, lines: ['3'] },
  { name: '대청', lat: 37.491810, lng: 127.079372, lines: ['3'] },
  { name: '일원', lat: 37.483681, lng: 127.085689, lines: ['3'] },
  { name: '수서', lat: 37.487425, lng: 127.101899, lines: ['3', 'B'] },

  // 7호선 강남권 (정확한 좌표)
  { name: '논현', lat: 37.511187, lng: 127.021617, lines: ['7'] },
  { name: '학동', lat: 37.514682, lng: 127.031989, lines: ['7'] },
  { name: '강남구청', lat: 37.517012, lng: 127.041238, lines: ['7', 'B'] },
  { name: '청담', lat: 37.519835, lng: 127.053521, lines: ['7'] },
  { name: '뚝섬유원지', lat: 37.531428, lng: 127.066314, lines: ['7'] },

  // 분당선 강남권 (정확한 좌표)
  { name: '선정릉', lat: 37.510404, lng: 127.043240, lines: ['B', '9'] },
  { name: '한티', lat: 37.498687, lng: 127.050319, lines: ['B'] },
  { name: '압구정로데오', lat: 37.527335, lng: 127.040354, lines: ['B'] },

  // 신분당선 (정확한 좌표)
  { name: '신사', lat: 37.516778, lng: 127.019998, lines: ['3', 'S'] },
  { name: '판교', lat: 37.394780, lng: 127.111217, lines: ['S'] },
  { name: '정자', lat: 37.366136, lng: 127.108597, lines: ['S', 'B'] },

  // 1호선 주요역 (정확한 좌표)
  { name: '서울역', lat: 37.554648, lng: 126.970702, lines: ['1', '4', 'A', 'K'] },
  { name: '종각', lat: 37.570028, lng: 126.982730, lines: ['1'] },
  { name: '종로3가', lat: 37.571607, lng: 126.991570, lines: ['1', '3', '5'] },
  { name: '종로5가', lat: 37.571256, lng: 127.000063, lines: ['1'] },
  { name: '동대문', lat: 37.571197, lng: 127.009305, lines: ['1', '4'] },
  { name: '용산', lat: 37.529849, lng: 126.964561, lines: ['1', 'K'] },

  // 4호선 주요역 (정확한 좌표)
  { name: '명동', lat: 37.560830, lng: 126.985797, lines: ['4'] },
  { name: '충무로', lat: 37.561457, lng: 126.994217, lines: ['3', '4'] },
  { name: '혜화', lat: 37.582290, lng: 127.001867, lines: ['4'] },
  { name: '한성대입구', lat: 37.588447, lng: 127.006314, lines: ['4'] },
  { name: '성신여대입구', lat: 37.592703, lng: 127.016539, lines: ['4'] },
  { name: '길음', lat: 37.603407, lng: 127.025189, lines: ['4'] },
  { name: '미아사거리', lat: 37.613208, lng: 127.030012, lines: ['4'] },
  { name: '노원', lat: 37.655779, lng: 127.061352, lines: ['4', '7'] },

  // 5호선 주요역 (정확한 좌표)
  { name: '광화문', lat: 37.571524, lng: 126.976812, lines: ['5'] },
  { name: '여의도', lat: 37.521433, lng: 126.924388, lines: ['5', '9'] },
  { name: '여의나루', lat: 37.527026, lng: 126.932750, lines: ['5'] },
  { name: '마포', lat: 37.539165, lng: 126.945731, lines: ['5'] },
  { name: '공덕', lat: 37.544174, lng: 126.951593, lines: ['5', '6', 'A', 'K'] },
  { name: '광나루', lat: 37.545069, lng: 127.103038, lines: ['5'] },
  { name: '천호', lat: 37.538594, lng: 127.123820, lines: ['5', '8'] },
  { name: '강동', lat: 37.535241, lng: 127.132233, lines: ['5'] },

  // 6호선 주요역 (정확한 좌표)
  { name: '이태원', lat: 37.534406, lng: 126.994597, lines: ['6'] },
  { name: '한강진', lat: 37.539680, lng: 126.998352, lines: ['6'] },
  { name: '삼각지', lat: 37.534847, lng: 126.973135, lines: ['4', '6'] },
  { name: '효창공원앞', lat: 37.539142, lng: 126.961685, lines: ['6', 'K'] },

  // 8호선 주요역 (정확한 좌표)
  { name: '암사', lat: 37.550388, lng: 127.127475, lines: ['8'] },
  { name: '석촌', lat: 37.505558, lng: 127.106824, lines: ['8'] },
  { name: '가락시장', lat: 37.492522, lng: 127.118234, lines: ['3', '8'] },
  { name: '문정', lat: 37.485266, lng: 127.122645, lines: ['8'] },
  { name: '복정', lat: 37.470048, lng: 127.126609, lines: ['8', 'B'] },
  { name: '모란', lat: 37.432882, lng: 127.129009, lines: ['8', 'B'] },

  // 9호선 주요역 (정확한 좌표)
  { name: '언주', lat: 37.507129, lng: 127.034026, lines: ['9'] },
  { name: '봉은사', lat: 37.514826, lng: 127.057678, lines: ['9'] },
  { name: '삼성중앙', lat: 37.510936, lng: 127.044859, lines: ['9'] },
  { name: '선정릉', lat: 37.510404, lng: 127.043240, lines: ['B', '9'] },
  { name: '신논현', lat: 37.504856, lng: 127.025174, lines: ['9', 'S'] },
  { name: '사평', lat: 37.502192, lng: 127.017827, lines: ['9'] },
  { name: '노량진', lat: 37.513294, lng: 126.942526, lines: ['1', '9'] },
  { name: '당산', lat: 37.533547, lng: 126.902556, lines: ['2', '9'] },
  { name: '염창', lat: 37.546937, lng: 126.874916, lines: ['9'] },
  { name: '등촌', lat: 37.550705, lng: 126.865133, lines: ['9'] },
  { name: '마곡나루', lat: 37.566961, lng: 126.836445, lines: ['9', 'A'] },
  { name: '김포공항', lat: 37.561863, lng: 126.800941, lines: ['5', '9', 'A'] },

  // 경의중앙선 주요역 (정확한 좌표)
  { name: '왕십리', lat: 37.561432, lng: 127.037522, lines: ['2', '5', 'K', 'B'] },
  { name: '청량리', lat: 37.580702, lng: 127.046989, lines: ['1', 'K', 'G'] },
  { name: '회기', lat: 37.589641, lng: 127.057862, lines: ['1', 'K'] },
  { name: 'DMC', lat: 37.576995, lng: 126.899414, lines: ['6', 'A', 'K'] },

  // 공항철도 (정확한 좌표)
  { name: '디지털미디어시티', lat: 37.576995, lng: 126.899414, lines: ['6', 'A', 'K'] },
  { name: '마곡나루', lat: 37.566961, lng: 126.836445, lines: ['9', 'A'] },
  { name: '김포공항', lat: 37.561863, lng: 126.800941, lines: ['5', '9', 'A'] },

  // 수도권 주요역 (정확한 좌표)
  { name: '수원', lat: 37.266300, lng: 127.000000, lines: ['1', 'B'] },
  { name: '분당', lat: 37.382797, lng: 127.123173, lines: ['B'] },
  { name: '야탑', lat: 37.411252, lng: 127.127049, lines: ['B'] },
  { name: '일산', lat: 37.677232, lng: 126.769349, lines: ['3'] },
  { name: '대화', lat: 37.676407, lng: 126.743806, lines: ['3'] },
];

// 좌표 변환을 위한 proj4 정의
// LocalData API는 EPSG:5174 (Korea 2000 / Central Belt) 좌표계 사용
export const PROJ4_DEFS = {
  // EPSG:5174 - 중부원점TM (Bessel 타원체, 서울/경기 지역)
  EPSG5174: '+proj=tmerc +lat_0=38 +lon_0=127.0028902777778 +k=1 +x_0=200000 +y_0=500000 +ellps=bessel +units=m +no_defs +towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43',
  // EPSG:5181 - 중부원점TM (GRS80 타원체)
  EPSG5181: '+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=500000 +ellps=GRS80 +units=m +no_defs',
  // EPSG:5179 - 통합기준점 (전국)
  EPSG5179: '+proj=tmerc +lat_0=38 +lon_0=127.5 +k=0.9996 +x_0=1000000 +y_0=2000000 +ellps=GRS80 +units=m +no_defs',
  // WGS84
  WGS84: '+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs',
};
