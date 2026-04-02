/**
 * 엑셀 셀 배경색(ARGB)을 기반으로 인벤토리 상태 판별 유틸리티
 */

import { AvailabilityStatus } from '../types';

/**
 * ARGB 색상 코드를 분석하여 상태를 반환합니다.
 * @param argb - 셀의 배경색 ARGB 코드 (예: 'FFFF0000')
 * @returns AvailabilityStatus
 */
export function mapColorToStatus(argb?: string): AvailabilityStatus {
  if (!argb) return 'AVAILABLE'; // 색상이 없으면 가용

  const color = argb.toUpperCase();

  // 노란형광색 (Yellow/Highlighter Yellow) 계열
  // 엑셀 표준 노랑: FFFF00, 밝은 노랑: FFFFCC 등
  if (
    color.includes('FFFF00') || 
    color.includes('FFFFCC') || 
    color.includes('FFFFFF00') ||
    color.includes('FFFFFF99')
  ) {
    return 'RESERVED';
  }

  // 분홍색 (Pink/Rose/Magenta) 계열
  // 엑셀 표준 분홍: FFC0CB, 마젠타: FF00FF 등
  if (
    color.includes('FFC0CB') || 
    color.includes('FFFFC0CB') || 
    color.includes('FFFF00FF') || 
    color.includes('FFFF66CC') ||
    color.includes('FFFDEDEC') || // 연한 분홍
    color.includes('FFFFB6C1')    // Light Pink
  ) {
    return 'OCCUPIED';
  }

  // 그 외의 경우 기본값 가용
  return 'AVAILABLE';
}

/**
 * 엑셀 헤더에서 목표 날짜(오늘 + 15일)와 가장 유사한 컬럼 인덱스를 찾습니다.
 * @param headers - 엑셀 헤더 배열
 * @param targetDate - 목표 날짜 객체
 * @returns 해당 컬럼의 0-based 인덱스 (못 찾으면 -1)
 */
export function findTargetDateColumnIndex(headers: string[], targetDate: Date): number {
  const targetMonth = targetDate.getMonth() + 1;
  const targetDay = targetDate.getDate();

  // "04/17", "4/17", "4-17", "4월 17일" 등 다양한 형식 시도
  const patterns = [
    `${targetMonth}/${targetDay}`,
    `${String(targetMonth).padStart(2, '0')}/${String(targetDay).padStart(2, '0')}`,
    `${targetMonth}-${targetDay}`,
    `${targetMonth}월 ${targetDay}일`
  ];

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i]?.trim();
    if (!header) continue;

    if (patterns.some(p => header.includes(p))) {
      return i;
    }
  }

  // 정확히 일치하는 날짜가 없으면 "MM/DD" 형식의 첫 번째 날짜 컬럼을 찾습니다.
  const datePattern = /\d{1,2}[\/\-\.월]\s?\d{1,2}/;
  for (let i = 0; i < headers.length; i++) {
    if (datePattern.test(headers[i])) {
      // 날짜 컬럼이긴 한데 목표 날짜는 아니면 로그를 남길 수 있음
      // 여기서는 일단 첫 번째 만나는 날짜 컬럼을 반환하거나 -1을 유지
    }
  }

  return -1;
}
