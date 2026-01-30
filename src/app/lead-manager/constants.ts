/**
 * 서울 지하철 광고 영업 시스템 - 상수 정의
 */

import { SubwayStation, SUBWAY_STATIONS } from '@/lib/constants';
import { Settings } from './types';
export { SUBWAY_STATIONS };

// 메트로 라인 색상 (탭용)
export const METRO_TAB_COLORS = {
  leads: { active: 'var(--metro-line2)', glow: 'rgba(60, 181, 74, 0.3)' },
  inventory: { active: 'var(--metro-line4)', glow: 'rgba(50, 164, 206, 0.3)' },
  schedule: { active: 'var(--metro-line5)', glow: 'rgba(153, 108, 172, 0.3)' },
};

// 지역 선택 옵션
export const REGION_OPTIONS = [
  { code: '6110000', name: '서울', color: 'var(--metro-line1)' },
  { code: '6410000', name: '경기', color: 'var(--metro-line3)' },
];

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
  regionCodes: ['6110000', '6410000', '6280000'], // 서울, 경기도, 인천
};

// LocalData API 엔드포인트 (TO0 = 통합조회)
export const API_ENDPOINT = 'http://www.localdata.go.kr/platform/rest/TO0/openDataApi';


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
