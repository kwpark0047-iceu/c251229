/**
 * 서울 지하철 광고 영업 시스템 - 타입 정의
 */

import { METRO_LINE_COLORS as LINE_COLORS, SubwayStation } from '@/lib/constants';
export type { SubwayStation };
export { LINE_COLORS };

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

// 상태별 메트로 라인 색상 (Neo-Seoul Transit Design)
export const STATUS_METRO_COLORS: Record<LeadStatus, { bg: string; text: string; border: string; glow: string }> = {
  NEW: {
    bg: 'rgba(60, 181, 74, 0.15)',
    text: 'var(--metro-line2)',
    border: 'rgba(60, 181, 74, 0.4)',
    glow: 'rgba(60, 181, 74, 0.2)',
  },
  PROPOSAL_SENT: {
    bg: 'rgba(50, 164, 206, 0.15)',
    text: 'var(--metro-line4)',
    border: 'rgba(50, 164, 206, 0.4)',
    glow: 'rgba(50, 164, 206, 0.2)',
  },
  CONTACTED: {
    bg: 'rgba(153, 51, 153, 0.15)',
    text: 'var(--metro-line5)',
    border: 'rgba(153, 51, 153, 0.4)',
    glow: 'rgba(153, 51, 153, 0.2)',
  },
  CONTRACTED: {
    bg: 'rgba(239, 124, 61, 0.15)',
    text: 'var(--metro-line3)',
    border: 'rgba(239, 124, 61, 0.4)',
    glow: 'rgba(239, 124, 61, 0.2)',
  },
};

// 리드(사업장) 데이터 타입
export interface Lead {
  id: string;
  bizName: string;           // 사업장명
  bizId?: string;            // 사업자등록번호
  licenseDate?: string;      // 인허가일자
  roadAddress?: string;      // 도로명 주소
  lotAddress?: string;       // 지번 주소
  coordX?: number;           // 원본 X 좌표 (GRS80)
  coordY?: number;           // 원본 Y 좌표 (GRS80)
  latitude?: number;         // 위도 (WGS84)
  longitude?: number;        // 경도 (WGS84)
  phone?: string;            // 전화번호
  medicalSubject?: string;   // 진료과목/업태명
  category?: BusinessCategory; // 업종 카테고리
  serviceId?: string;        // API 서비스 ID
  serviceName?: string;      // 서비스명 (병원, 약국 등)
  nearestStation?: string;   // 가장 가까운 역
  stationDistance?: number;  // 역까지 거리 (미터)
  stationLines?: string[];   // 해당 역 노선들
  status: LeadStatus;        // 리드 상태
  notes?: string;            // 메모
  assignedTo?: string;       // 담당 영업사원 ID
  assignedToName?: string;   // 담당 영업사원 이름/이메일
  assignedAt?: string;       // 담당자 지정 시간
  createdAt?: string;        // 생성일
  updatedAt?: string;        // 수정일
}


// 뷰 모드 및 탭 타입
export type ViewMode = 'grid' | 'list' | 'map';
export type MainTab = 'leads' | 'inventory' | 'schedule';

// 검색 기준 타입
export type SearchType = 'license_date' | 'modified_date';

// 설정 타입
export interface Settings {
  apiKey: string;
  corsProxy: string;
  searchType: SearchType;
  regionCode: string;      // 단일 지역 (하위 호환)
  regionCodes?: string[];  // 다중 지역 선택
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
// 업종 카테고리
// ============================================

export type BusinessCategory =
  | 'ALL'         // 전체 (조회 및 수집용)
  | 'HEALTH'      // 건강
  | 'ANIMAL'      // 동물
  | 'FOOD'        // 식품
  | 'CULTURE'     // 문화
  | 'LIVING'      // 생활
  | 'ENVIRONMENT' // 자원환경
  | 'OTHER';      // 기타

export const CATEGORY_LABELS: Record<BusinessCategory, string> = {
  ALL: '전체',
  HEALTH: '건강',
  ANIMAL: '동물',
  FOOD: '식품',
  CULTURE: '문화',
  LIVING: '생활',
  ENVIRONMENT: '자원환경',
  OTHER: '기타',
};

export const CATEGORY_COLORS: Record<BusinessCategory, { bg: string; text: string; border: string }> = {
  ALL: { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-300' },
  HEALTH: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300' },
  ANIMAL: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
  FOOD: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
  CULTURE: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
  LIVING: { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-300' },
  ENVIRONMENT: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300' },
  OTHER: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' },
};

// 카테고리별 LocalData API 서비스 ID
export interface ServiceIdInfo {
  id: string;
  name: string;
  category: BusinessCategory;
}

export const CATEGORY_SERVICE_IDS: Record<BusinessCategory, ServiceIdInfo[]> = {
  ALL: [], // 전체 카테고리는 개별 카테고리들을 순회하며 처리함
  HEALTH: [
    { id: '01_01_02_P', name: '병원', category: 'HEALTH' },
    { id: '01_01_03_P', name: '의원', category: 'HEALTH' },
    { id: '01_01_04_P', name: '치과', category: 'HEALTH' },
    { id: '01_01_05_P', name: '한의원', category: 'HEALTH' },
    { id: '01_01_01_P', name: '약국', category: 'HEALTH' },
    { id: '01_02_01_P', name: '안경업', category: 'HEALTH' },
  ],
  ANIMAL: [
    { id: '07_01_01_P', name: '동물병원', category: 'ANIMAL' },
    { id: '07_01_02_P', name: '동물판매업', category: 'ANIMAL' },
    { id: '07_01_03_P', name: '동물미용업', category: 'ANIMAL' },
    { id: '07_01_04_P', name: '동물위탁관리업', category: 'ANIMAL' },
  ],
  FOOD: [
    { id: '07_24_04_P', name: '일반음식점', category: 'FOOD' },
    { id: '07_24_05_P', name: '휴게음식점', category: 'FOOD' },
    { id: '07_24_01_P', name: '식품제조가공업', category: 'FOOD' },
    { id: '07_24_02_P', name: '즉석판매제조가공업', category: 'FOOD' },
  ],
  CULTURE: [
    { id: '06_01_01_P', name: '공연장', category: 'CULTURE' },
    { id: '06_01_02_P', name: '영화상영관', category: 'CULTURE' },
    { id: '06_02_01_P', name: '비디오물감상실', category: 'CULTURE' },
    { id: '06_03_01_P', name: '게임제공업', category: 'CULTURE' },
    { id: '06_04_01_P', name: '노래연습장업', category: 'CULTURE' },
  ],
  LIVING: [
    { id: '08_01_01_P', name: '숙박업', category: 'LIVING' },
    { id: '08_02_01_P', name: '목욕장업', category: 'LIVING' },
    { id: '08_02_02_P', name: '이용업', category: 'LIVING' },
    { id: '08_02_03_P', name: '미용업', category: 'LIVING' },
    { id: '08_02_04_P', name: '세탁업', category: 'LIVING' },
    { id: '08_03_01_P', name: '체육시설업', category: 'LIVING' },
  ],
  ENVIRONMENT: [
    { id: '03_01_01_P', name: '대기배출시설', category: 'ENVIRONMENT' },
    { id: '03_02_01_P', name: '폐기물처리업', category: 'ENVIRONMENT' },
  ],
  OTHER: [
    { id: '09_01_01_P', name: '기타', category: 'OTHER' },
  ],
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

export const AVAILABILITY_COLORS: Record<AvailabilityStatus, { bg: string; text: string; border: string }> = {
  AVAILABLE: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  RESERVED: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
  OCCUPIED: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
};

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

export type { FloorPlan } from '../shared/types';

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
  emailRecipient?: string;
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

// ============================================
// 업무/스케줄 타입
// ============================================

export type TaskType =
  | 'CALL'           // 전화
  | 'MEETING'        // 미팅
  | 'PROPOSAL'       // 제안서 작성
  | 'FOLLOW_UP'      // 후속 조치
  | 'CONTRACT'       // 계약 관련
  | 'OTHER';         // 기타

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  CALL: '전화',
  MEETING: '미팅',
  PROPOSAL: '제안서',
  FOLLOW_UP: '후속',
  CONTRACT: '계약',
  OTHER: '기타',
};

export const TASK_TYPE_COLORS: Record<TaskType, { bg: string; text: string; border: string }> = {
  CALL: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  MEETING: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
  PROPOSAL: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
  FOLLOW_UP: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
  CONTRACT: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  OTHER: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-300' },
};

export type TaskStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  PENDING: '대기',
  IN_PROGRESS: '진행중',
  COMPLETED: '완료',
  CANCELLED: '취소',
};

export const TASK_STATUS_COLORS: Record<TaskStatus, { bg: string; text: string }> = {
  PENDING: { bg: 'bg-slate-100', text: 'text-slate-700' },
  IN_PROGRESS: { bg: 'bg-blue-100', text: 'text-blue-700' },
  COMPLETED: { bg: 'bg-green-100', text: 'text-green-700' },
  CANCELLED: { bg: 'bg-red-100', text: 'text-red-700' },
};

export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: '낮음',
  MEDIUM: '보통',
  HIGH: '높음',
  URGENT: '긴급',
};

export const TASK_PRIORITY_COLORS: Record<TaskPriority, { bg: string; text: string }> = {
  LOW: { bg: 'bg-gray-100', text: 'text-gray-600' },
  MEDIUM: { bg: 'bg-blue-100', text: 'text-blue-600' },
  HIGH: { bg: 'bg-orange-100', text: 'text-orange-600' },
  URGENT: { bg: 'bg-red-100', text: 'text-red-600' },
};

export interface Task {
  id: string;
  leadId?: string;          // 연결된 리드 (선택)
  lead?: Lead;              // 리드 정보 (조인)
  taskType: TaskType;
  title: string;
  description?: string;
  dueDate: string;          // 예정일 (YYYY-MM-DD)
  dueTime?: string;         // 예정 시간 (HH:MM)
  status: TaskStatus;
  priority: TaskPriority;
  assignee?: string;        // 담당자
  reminderAt?: string;      // 알림 시간
  completedAt?: string;     // 완료 시간
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface TaskWithLead extends Task {
  lead?: Lead;
}

// 캘린더 이벤트 (콜로그의 next_contact_date + Task 통합)
export interface CalendarEvent {
  id: string;
  type: 'task' | 'callback';
  title: string;
  date: string;
  time?: string;
  leadId?: string;
  leadName?: string;
  taskType?: TaskType;
  priority?: TaskPriority;
  status?: TaskStatus;
  callOutcome?: CallOutcome;
}
