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

// ============================================
// 광고 인벤토리 타입
// ============================================

export type AvailabilityStatus = 'AVAILABLE' | 'RESERVED' | 'OCCUPIED';

export const AVAILABILITY_LABELS: Record<AvailabilityStatus, string> = {
  AVAILABLE: '가용',
  RESERVED: '예약',
  OCCUPIED: '사용중',
};
export const AVAILABILITY_STATUS_LABELS = AVAILABILITY_LABELS;

export const AVAILABILITY_COLORS: Record<AvailabilityStatus, { bg: string; text: string; border: string }> = {
  AVAILABLE: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  RESERVED: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
  OCCUPIED: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
};
export const AVAILABILITY_STATUS_COLORS = AVAILABILITY_COLORS;

// 광고 유형 라벨
export const AD_TYPE_LABELS: Record<string, string> = {
  'poster': '포스터',
  'digital': '디지털 사이니지',
  'wraparound': '랩핑 광고',
  'pillar': '기둥 광고',
  'escalator': '에스컬레이터 핸드레일',
  'floor': '바닥 광고',
  'screen_door': '스크린도어',
  'lightbox': '라이트박스',
  '포스터': '포스터',
  '디지털': '디지털 사이니지',
  '랩핑': '랩핑 광고',
  '기둥': '기둥 광고',
  '에스컬레이터': '에스컬레이터',
  '바닥': '바닥 광고',
  '스크린도어': '스크린도어',
  '라이트박스': '라이트박스',
};

export interface AdInventory {
  id: string;
  stationName: string;
  locationCode: string;
  adType: string;
  adSize?: string;
  priceMonthly?: number;
  priceWeekly?: number;
  availabilityStatus: AvailabilityStatus;
  availableFrom?: string;
  availableTo?: string;
  floorPlanUrl?: string;
  spotPositionX?: number;
  spotPositionY?: number;
  description?: string;
  trafficDaily?: number;
  demographics?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FloorPlan {
  id: string;
  stationName: string;
  floorName: string;
  imageUrl: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
}

// ============================================
// 제안서 타입
// ============================================

export type ProposalStatus = 'DRAFT' | 'SENT' | 'VIEWED' | 'ACCEPTED' | 'REJECTED';

export const PROPOSAL_STATUS_LABELS: Record<ProposalStatus, string> = {
  DRAFT: '작성중',
  SENT: '발송됨',
  VIEWED: '열람됨',
  ACCEPTED: '수락됨',
  REJECTED: '거절됨',
};

export const PROPOSAL_STATUS_COLORS: Record<ProposalStatus, { bg: string; text: string }> = {
  DRAFT: { bg: 'bg-gray-100', text: 'text-gray-700' },
  SENT: { bg: 'bg-blue-100', text: 'text-blue-700' },
  VIEWED: { bg: 'bg-purple-100', text: 'text-purple-700' },
  ACCEPTED: { bg: 'bg-green-100', text: 'text-green-700' },
  REJECTED: { bg: 'bg-red-100', text: 'text-red-700' },
};

export interface EffectAnalysis {
  dailyImpressions: number;
  monthlyReach: number;
  targetDemographics: string[];
  competitorAnalysis?: string;
  expectedROI?: string;
}

export interface Proposal {
  id: string;
  leadId: string;
  title: string;
  greetingMessage?: string;
  inventoryIds: string[];
  inventory?: AdInventory[];
  totalPrice?: number;
  discountRate?: number;
  finalPrice?: number;
  effectAnalysis?: EffectAnalysis;
  pdfUrl?: string;
  status: ProposalStatus;
  sentAt?: string;
  viewedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================
// CRM 타입
// ============================================

export type CallOutcome =
  | 'NO_ANSWER'
  | 'REJECTED'
  | 'INTERESTED'
  | 'CALLBACK_REQUESTED'
  | 'MEETING_SCHEDULED'
  | 'OTHER';

export const CALL_OUTCOME_LABELS: Record<CallOutcome, string> = {
  NO_ANSWER: '부재중',
  REJECTED: '거절',
  INTERESTED: '관심',
  CALLBACK_REQUESTED: '콜백 요청',
  MEETING_SCHEDULED: '미팅 잡힘',
  OTHER: '기타',
};

export const CALL_OUTCOME_COLORS: Record<CallOutcome, { bg: string; text: string }> = {
  NO_ANSWER: { bg: 'bg-gray-100', text: 'text-gray-700' },
  REJECTED: { bg: 'bg-red-100', text: 'text-red-700' },
  INTERESTED: { bg: 'bg-green-100', text: 'text-green-700' },
  CALLBACK_REQUESTED: { bg: 'bg-yellow-100', text: 'text-yellow-700' },
  MEETING_SCHEDULED: { bg: 'bg-blue-100', text: 'text-blue-700' },
  OTHER: { bg: 'bg-purple-100', text: 'text-purple-700' },
};

export interface CallLog {
  id: string;
  leadId: string;
  calledAt: string;
  durationSeconds?: number;
  outcome: CallOutcome;
  contactPerson?: string;
  notes?: string;
  nextAction?: string;
  nextContactDate?: string;
  createdAt?: string;
}

export type ProgressStep =
  | 'PROPOSAL_SENT'
  | 'FIRST_CALL'
  | 'MEETING_SCHEDULED'
  | 'CONTRACT_SIGNED';

export const PROGRESS_STEP_LABELS: Record<ProgressStep, string> = {
  PROPOSAL_SENT: '제안서 발송',
  FIRST_CALL: '1차 통화',
  MEETING_SCHEDULED: '미팅 잡힘',
  CONTRACT_SIGNED: '계약 성사',
};

export const PROGRESS_STEPS: ProgressStep[] = [
  'PROPOSAL_SENT',
  'FIRST_CALL',
  'MEETING_SCHEDULED',
  'CONTRACT_SIGNED',
];

export interface SalesProgress {
  id: string;
  leadId: string;
  step: ProgressStep;
  completedAt?: string;
  notes?: string;
}

// ============================================
// 확장된 Lead 타입 (CRM 포함)
// ============================================

export interface LeadWithCRM extends Lead {
  email?: string;
  contactPerson?: string;
  preferredContactTime?: string;
  budgetRange?: string;
  callLogs?: CallLog[];
  proposals?: Proposal[];
  salesProgress?: SalesProgress[];
  matchingInventory?: AdInventory[];
}

// ============================================
// 엑셀 업로드 타입
// ============================================

export interface ExcelUploadResult {
  success: boolean;
  fileName: string;
  rowCount: number;
  successCount: number;
  errorCount: number;
  errors: { row: number; message: string }[];
}

export interface ExcelInventoryRow {
  stationName: string;
  locationCode: string;
  adType: string;
  adSize?: string;
  priceMonthly?: number;
  priceWeekly?: number;
  availabilityStatus?: AvailabilityStatus;
  description?: string;
}
