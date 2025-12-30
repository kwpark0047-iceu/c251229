/**
 * 서울 지하철 광고 영업 시스템 - 상수 정의
 */

import { SubwayStation, Settings } from './types';

// 기본 API 키
export const DEFAULT_API_KEY = 'hxOJfL8Q8p70CnIkVXfHy5UFw3yVBh7MPRQwQy0l2QI=';

// CORS 프록시 옵션
export const CORS_PROXIES = [
  { label: 'corsproxy.io (추천)', value: 'https://corsproxy.io/?' },
  { label: 'allorigins.win', value: 'https://api.allorigins.win/raw?url=' },
];

// 기본 설정
export const DEFAULT_SETTINGS: Settings = {
  apiKey: DEFAULT_API_KEY,
  corsProxy: CORS_PROXIES[0].value,
  searchType: 'license_date',
  regionCode: '6110000',
};

// LocalData API 엔드포인트
export const API_ENDPOINT = 'http://www.localdata.go.kr/platform/rest/01_01_02_P/openDataApi';

// 주요 서울 지하철역 데이터
export const SUBWAY_STATIONS: SubwayStation[] = [
  // 2호선 강남권
  { name: '강남', lat: 37.4979, lng: 127.0276, lines: ['2', 'S'] },
  { name: '역삼', lat: 37.5006, lng: 127.0365, lines: ['2'] },
  { name: '선릉', lat: 37.5045, lng: 127.0490, lines: ['2', 'K'] },
  { name: '삼성', lat: 37.5088, lng: 127.0632, lines: ['2'] },
  { name: '종합운동장', lat: 37.5104, lng: 127.0736, lines: ['2', '9'] },
  { name: '신논현', lat: 37.5048, lng: 127.0252, lines: ['9'] },
  { name: '교대', lat: 37.4934, lng: 127.0146, lines: ['2', '3'] },
  { name: '서초', lat: 37.4919, lng: 127.0078, lines: ['2'] },
  { name: '방배', lat: 37.4814, lng: 126.9976, lines: ['2'] },
  { name: '사당', lat: 37.4765, lng: 126.9815, lines: ['2', '4'] },

  // 2호선 홍대/신촌권
  { name: '홍대입구', lat: 37.5570, lng: 126.9237, lines: ['2', 'A', 'K'] },
  { name: '신촌', lat: 37.5552, lng: 126.9366, lines: ['2'] },
  { name: '이대', lat: 37.5569, lng: 126.9463, lines: ['2'] },
  { name: '아현', lat: 37.5572, lng: 126.9560, lines: ['2'] },
  { name: '충정로', lat: 37.5598, lng: 126.9635, lines: ['2', '5'] },

  // 2호선 시청/을지로권
  { name: '시청', lat: 37.5656, lng: 126.9769, lines: ['1', '2'] },
  { name: '을지로입구', lat: 37.5660, lng: 126.9823, lines: ['2'] },
  { name: '을지로3가', lat: 37.5665, lng: 126.9918, lines: ['2', '3'] },
  { name: '을지로4가', lat: 37.5671, lng: 126.9982, lines: ['2', '5'] },
  { name: '동대문역사문화공원', lat: 37.5654, lng: 127.0072, lines: ['2', '4', '5'] },

  // 2호선 성수/건대권
  { name: '성수', lat: 37.5445, lng: 127.0559, lines: ['2'] },
  { name: '건대입구', lat: 37.5403, lng: 127.0701, lines: ['2', '7'] },
  { name: '구의', lat: 37.5353, lng: 127.0861, lines: ['2'] },
  { name: '강변', lat: 37.5349, lng: 127.0943, lines: ['2'] },
  { name: '잠실나루', lat: 37.5214, lng: 127.1021, lines: ['2'] },
  { name: '잠실', lat: 37.5132, lng: 127.1001, lines: ['2', '8'] },

  // 3호선
  { name: '압구정', lat: 37.5270, lng: 127.0283, lines: ['3'] },
  { name: '신사', lat: 37.5168, lng: 127.0199, lines: ['3'] },
  { name: '잠원', lat: 37.5114, lng: 127.0142, lines: ['3'] },
  { name: '고속터미널', lat: 37.5048, lng: 127.0049, lines: ['3', '7', '9'] },
  { name: '양재', lat: 37.4842, lng: 127.0345, lines: ['3', 'S'] },
  { name: '도곡', lat: 37.4909, lng: 127.0544, lines: ['3', 'B'] },
  { name: '대치', lat: 37.4942, lng: 127.0633, lines: ['3'] },
  { name: '학여울', lat: 37.4970, lng: 127.0714, lines: ['3'] },

  // 7호선 강남권
  { name: '논현', lat: 37.5112, lng: 127.0216, lines: ['7'] },
  { name: '학동', lat: 37.5147, lng: 127.0320, lines: ['7'] },
  { name: '강남구청', lat: 37.5170, lng: 127.0412, lines: ['7', 'B'] },
  { name: '청담', lat: 37.5198, lng: 127.0535, lines: ['7'] },

  // 분당선 강남권
  { name: '선정릉', lat: 37.5104, lng: 127.0432, lines: ['B'] },
  { name: '한티', lat: 37.4987, lng: 127.0503, lines: ['B'] },

  // 신분당선
  { name: '신논현', lat: 37.5048, lng: 127.0252, lines: ['S'] },
  { name: '판교', lat: 37.3948, lng: 127.1112, lines: ['S'] },
  { name: '정자', lat: 37.3661, lng: 127.1086, lines: ['S', 'B'] },

  // 1호선 주요역
  { name: '서울역', lat: 37.5547, lng: 126.9707, lines: ['1', '4', 'A', 'K'] },
  { name: '종각', lat: 37.5700, lng: 126.9827, lines: ['1'] },
  { name: '종로3가', lat: 37.5710, lng: 126.9916, lines: ['1', '3', '5'] },
  { name: '동대문', lat: 37.5712, lng: 127.0093, lines: ['1', '4'] },
  { name: '용산', lat: 37.5299, lng: 126.9648, lines: ['1', 'K'] },

  // 4호선 주요역
  { name: '명동', lat: 37.5608, lng: 126.9858, lines: ['4'] },
  { name: '충무로', lat: 37.5615, lng: 126.9942, lines: ['3', '4'] },
  { name: '혜화', lat: 37.5823, lng: 127.0019, lines: ['4'] },
  { name: '한성대입구', lat: 37.5884, lng: 127.0063, lines: ['4'] },

  // 5호선 주요역
  { name: '광화문', lat: 37.5715, lng: 126.9768, lines: ['5'] },
  { name: '종로3가', lat: 37.5710, lng: 126.9916, lines: ['1', '3', '5'] },
  { name: '여의도', lat: 37.5214, lng: 126.9244, lines: ['5', '9'] },
  { name: '여의나루', lat: 37.5270, lng: 126.9327, lines: ['5'] },
  { name: '마포', lat: 37.5393, lng: 126.9457, lines: ['5'] },
  { name: '공덕', lat: 37.5442, lng: 126.9515, lines: ['5', '6', 'A', 'K'] },

  // 6호선 주요역
  { name: '이태원', lat: 37.5344, lng: 126.9946, lines: ['6'] },
  { name: '한강진', lat: 37.5397, lng: 126.9983, lines: ['6'] },
  { name: '삼각지', lat: 37.5348, lng: 126.9731, lines: ['4', '6'] },

  // 9호선 주요역
  { name: '신논현', lat: 37.5048, lng: 127.0252, lines: ['9'] },
  { name: '언주', lat: 37.5071, lng: 127.0340, lines: ['9'] },
  { name: '선정릉', lat: 37.5104, lng: 127.0432, lines: ['9', 'B'] },
  { name: '봉은사', lat: 37.5148, lng: 127.0577, lines: ['9'] },

  // 경의중앙선 주요역
  { name: '왕십리', lat: 37.5614, lng: 127.0375, lines: ['2', '5', 'K', 'B'] },
  { name: '청량리', lat: 37.5807, lng: 127.0470, lines: ['1', 'K', 'G'] },

  // 수도권 주요역
  { name: '수원', lat: 37.2663, lng: 127.0000, lines: ['1', 'B'] },
  { name: '분당', lat: 37.3828, lng: 127.1232, lines: ['B'] },
  { name: '일산', lat: 37.6772, lng: 126.7693, lines: ['3'] },
];

// 좌표 변환을 위한 proj4 정의
export const PROJ4_DEFS = {
  GRS80: '+proj=tmerc +lat_0=38 +lon_0=127.5 +k=0.9996 +x_0=1000000 +y_0=2000000 +ellps=GRS80 +units=m +no_defs',
  WGS84: '+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs',
};
