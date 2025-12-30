/**
 * 서울 지하철 광고 영업 시스템 - 타입 정의
 */

// 리드 상태 타입
export type LeadStatus = 'NEW' | 'PROPOSAL_SENT' | 'CONTACTED' | 'CONTRACTED';

// 상태별 색상 매핑
export const STATUS_COLORS: Record<LeadStatus, { bg: string; text: string; border: string }> = {
  NEW: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
  PROPOSAL_SENT: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  CONTACTED: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
  CONTRACTED: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
};

// 상태별 라벨
export const STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: '신규',
  PROPOSAL_SENT: '제안 발송',
  CONTACTED: '컨택 완료',
  CONTRACTED: '계약 성사',
};

// 리드(병원) 데이터 타입
export interface Lead {
  id: string;
  bizName: string;           // 사업장명 (병원명)
  bizId?: string;            // 사업자등록번호
  licenseDate?: string;      // 인허가일자
  roadAddress?: string;      // 도로명 주소
  lotAddress?: string;       // 지번 주소
  coordX?: number;           // 원본 X 좌표 (GRS80)
  coordY?: number;           // 원본 Y 좌표 (GRS80)
  latitude?: number;         // 위도 (WGS84)
  longitude?: number;        // 경도 (WGS84)
  phone?: string;            // 전화번호
  medicalSubject?: string;   // 진료과목
  nearestStation?: string;   // 가장 가까운 역
  stationDistance?: number;  // 역까지 거리 (미터)
  stationLines?: string[];   // 해당 역 노선들
  status: LeadStatus;        // 리드 상태
  notes?: string;            // 메모
  createdAt?: string;        // 생성일
  updatedAt?: string;        // 수정일
}

// 지하철역 타입
export interface SubwayStation {
  name: string;
  lat: number;
  lng: number;
  lines: string[];
}

// 노선별 색상
export const LINE_COLORS: Record<string, string> = {
  '1': '#0052A4',   // 1호선 - 파랑
  '2': '#00A84D',   // 2호선 - 녹색
  '3': '#EF7C1C',   // 3호선 - 주황
  '4': '#00A5DE',   // 4호선 - 하늘색
  '5': '#996CAC',   // 5호선 - 보라
  '6': '#CD7C2F',   // 6호선 - 황토
  '7': '#747F00',   // 7호선 - 올리브
  '8': '#E6186C',   // 8호선 - 분홍
  '9': '#BDB092',   // 9호선 - 금색
  'S': '#77C4A3',   // 신분당선 - 빨강
  'K': '#7CA8D5',   // 경의중앙선 - 청록
  'A': '#0090D2',   // 공항철도 - 파랑
  'B': '#F5A200',   // 분당선 - 노랑
  'G': '#6EBE46',   // 경춘선 - 연두
  'I': '#FA5F2C',   // 인천1호선 - 주황
  'U': '#B0CE18',   // 우이신설선 - 연두
  'W': '#76A4D6',   // 서해선 - 파랑
};

// 뷰 모드 타입
export type ViewMode = 'grid' | 'list' | 'map';

// 검색 기준 타입
export type SearchType = 'license_date' | 'modified_date';

// 설정 타입
export interface Settings {
  apiKey: string;
  corsProxy: string;
  searchType: SearchType;
  regionCode: string;
}

// API 응답 타입
export interface ApiResponse {
  success: boolean;
  data: Lead[];
  totalCount: number;
  message?: string;
}

// 지역 코드 매핑
export const REGION_CODES: Record<string, string> = {
  '6110000': '서울특별시',
  '6410000': '경기도',
  '6280000': '인천광역시',
};
