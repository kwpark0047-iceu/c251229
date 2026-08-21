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
  proposals: { active: 'var(--metro-line3)', glow: 'rgba(239, 122, 53, 0.3)' },
  'floor-plans': { active: 'var(--metro-line1)', glow: 'rgba(238, 45, 66, 0.3)' },
  'contracts': { active: 'var(--metro-line7)', glow: 'rgba(116, 127, 0, 0.3)' },
  'admin': { active: '#1e293b', glow: 'rgba(30, 41, 59, 0.3)' },
};

// 지역 선택 옵션
export const REGION_OPTIONS = [
  { code: '6110000', name: '서울', color: 'var(--metro-line1)' },
  { code: '6410000', name: '경기', color: 'var(--metro-line3)' },
];

// CORS 프록시 옵션
export const CORS_PROXIES = [
  { label: '로컬 프록시 (추천)', value: '/api/proxy?url=' },
  { label: 'corsproxy.io', value: 'https://corsproxy.io/?' },
  { label: 'allorigins.win', value: 'https://api.allorigins.win/raw?url=' },
];

// 기본 설정
export const DEFAULT_SETTINGS: Settings = {
  apiKey: '', // basic auth 토큰 형태가 아님 - 실제 인증은 Supabase RLS를 통해 처리
  corsProxy: '/api/proxy?url=',
  searchType: 'license_date',
  regionCode: '6110000',
  regionCodes: ['6110000', '6410000', '6280000'], // 서울, 경기도, 인천
};

// 좌표 변환을 위한 proj4 정의
// 좌표계: EPSG:5174 (Korea 2000 / Central Belt), EPSG:5181, EPSG:5179, WGS84
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
