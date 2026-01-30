/**
 * 지하철 역사 도면 페이지 - 타입 정의
 */

import { AdInventory } from '../lead-manager/types';
import { METRO_LINES, METRO_LINE_NAMES, METRO_LINE_COLORS, MetroLine } from '@/lib/constants';
export type { MetroLine };
export { METRO_LINES, METRO_LINE_NAMES, METRO_LINE_COLORS };

// ============================================
// 기본 타입
// ============================================

// 도면 유형
export type PlanType = 'station_layout' | 'psd';

// 도면 유형 라벨
export const PLAN_TYPE_LABELS: Record<PlanType, string> = {
  'station_layout': '역구내도면',
  'psd': 'PSD도면',
};

// ============================================
// 도면 관련 타입
// ============================================

// 도면 데이터
export interface FloorPlan {
  id: string;
  stationName: string;
  lineNumber: MetroLine;
  planType: PlanType;
  floorName: string;
  imageUrl: string;
  thumbnailUrl?: string;
  storagePath?: string;
  fileName?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  sortOrder: number;
  createdAt?: string;
  updatedAt?: string;
}

// 도면 입력 데이터
export interface FloorPlanInput {
  stationName: string;
  lineNumber: MetroLine;
  planType: PlanType;
  floorName?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  storagePath?: string;
  fileName?: string;
  fileSize?: number;
  width?: number;
  height?: number;
  sortOrder?: number;
}

// 광고 위치 마커
export interface AdPosition {
  id: string;
  floorPlanId: string;
  inventoryId?: string;
  positionX: number;  // 0-100 %
  positionY: number;  // 0-100 %
  label?: string;
  adCode?: string;
  markerColor: string;
  markerSize: number;
  inventory?: AdInventory;  // JOIN된 데이터
  createdAt?: string;
  updatedAt?: string;
}

// 광고 위치 입력 데이터
export interface AdPositionInput {
  floorPlanId: string;
  inventoryId?: string;
  positionX: number;
  positionY: number;
  label?: string;
  adCode?: string;
  markerColor?: string;
  markerSize?: number;
}

// ============================================
// Storage 관련 타입
// ============================================

// Storage 업로드 결과
export interface StorageResult {
  success: boolean;
  storagePath?: string;
  publicUrl?: string;
  error?: string;
}

// 일괄 업로드 결과
export interface BulkUploadResult {
  success: boolean;
  uploaded: number;
  failed: number;
  results: {
    fileName: string;
    success: boolean;
    storagePath?: string;
    publicUrl?: string;
    error?: string;
  }[];
}

// 파일 파싱 결과
export interface ParsedFloorPlanFile {
  lineNumber: MetroLine;
  planType: PlanType;
  stationName: string;
  sortOrder: number;
  pageNumber?: number;
  fileName: string;
  fullPath: string;
}

// ============================================
// 다운로드 관련 타입
// ============================================

// 다운로드 옵션
export interface DownloadOptions {
  format: 'individual' | 'zip';
  quality?: number;  // 1-100
  maxWidth?: number;
  includeMetadata?: boolean;
}

// 다운로드 진행 상태
export interface DownloadProgress {
  total: number;
  current: number;
  currentFile?: string;
  status: 'preparing' | 'downloading' | 'compressing' | 'complete' | 'error';
  error?: string;
}

// ============================================
// 선택 관련 타입
// ============================================

// 선택된 도면
export interface FloorPlanSelection {
  id: string;
  userId: string;
  floorPlanIds: string[];
  selectionName?: string;
  createdAt?: string;
}

// 뷰 모드
export type ViewMode = 'grid' | 'list' | 'viewer';

// ============================================
// 유틸리티 함수
// ============================================

/**
 * 폴더명에서 노선 번호와 도면 유형 파싱
 */
export function parseFolderName(folderName: string): { lineNumber: MetroLine; planType: PlanType } | null {
  const match = folderName.match(/지하철_(\d+)호선_(역구내도면|PSD도면)/);
  if (!match) return null;

  const lineNumber = match[1] as MetroLine;
  if (!METRO_LINES.includes(lineNumber)) return null;

  const planType: PlanType = match[2] === 'PSD도면' ? 'psd' : 'station_layout';
  return { lineNumber, planType };
}

/**
 * 파일명에서 역명과 정렬 순서 파싱
 */
export function parseFileName(fileName: string): { stationName: string; sortOrder: number; pageNumber?: number } | null {
  // 패턴: {순번}_{역명}[-{페이지}].JPG
  const match = fileName.match(/^(\d+)_(.+?)(?:-(\d+))?\.JPG$/i);
  if (!match) return null;

  const sortOrder = parseInt(match[1], 10);
  const stationName = match[2];
  const pageNumber = match[3] ? parseInt(match[3], 10) : undefined;

  // 표지와 노선도는 건너뜀
  if (stationName === '표지' || stationName === '노선도') return null;

  return { stationName, sortOrder, pageNumber };
}

/**
 * 전체 파일 경로 파싱
 */
export function parseFloorPlanPath(folderName: string, fileName: string, fullPath: string): ParsedFloorPlanFile | null {
  const folderInfo = parseFolderName(folderName);
  if (!folderInfo) return null;

  const fileInfo = parseFileName(fileName);
  if (!fileInfo) return null;

  return {
    ...folderInfo,
    ...fileInfo,
    fileName,
    fullPath,
  };
}

/**
 * 역명에 페이지 번호 추가
 */
export function getStationDisplayName(stationName: string, pageNumber?: number): string {
  if (pageNumber && pageNumber > 1) {
    return `${stationName} (${pageNumber})`;
  }
  return stationName;
}

/**
 * 파일 크기 포맷팅
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
