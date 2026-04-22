/**
 * 역사별 정보 서비스
 * KRIC API를 활용한 역사 편의시설 정보 조회
 */

// 역사 정보 타입
export interface StationInfo {
  stinCd: string;        // 역코드
  stinNm: string;        // 역명
  lnCd: string;          // 노선코드
  railOprIsttCd: string; // 철도운영기관코드
  // 편의시설 정보
  exitCnt?: number;      // 출구 수
  elvtrCnt?: number;     // 엘리베이터 수
  escltCnt?: number;     // 에스컬레이터 수
  whlchLftCnt?: number;  // 휠체어리프트 수
  toiletCnt?: number;    // 화장실 수
  nrsgRoomYn?: string;   // 수유실 유무
  atmYn?: string;        // ATM 유무
  storeYn?: string;      // 편의점 유무
  lockYn?: string;       // 물품보관함 유무
  // 위치 정보
  lat?: number;          // 위도
  lot?: number;          // 경도
  // 연락처
  telNo?: string;        // 전화번호
  addr?: string;         // 주소
}

// API 응답 타입
export interface StationInfoResponse {
  success: boolean;
  data: StationInfo[] | StationInfo;
  line?: string;
  railOprIsttCd?: string;
  lnCd?: string;
  error?: string;
}

// 노선별 역사 정보 조회
export async function getStationInfoByLine(line: string): Promise<StationInfoResponse> {
  try {
    const response = await fetch(`/api/station-info?line=${encodeURIComponent(line)}`);

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        data: [],
        error: errorData.error || `HTTP Error: ${response.status}`,
      };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[Station Info Service] Error:', error);
    return {
      success: false,
      data: [],
      error: '역사 정보를 가져오는 중 오류가 발생했습니다.',
    };
  }
}

// 특정 역사 정보 조회
export async function getStationInfo(
  line: string,
  stationName: string
): Promise<StationInfoResponse> {
  try {
    const params = new URLSearchParams({
      line,
      station: stationName,
    });

    const response = await fetch(`/api/station-info?${params.toString()}`);

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        data: [],
        error: errorData.error || `HTTP Error: ${response.status}`,
      };
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[Station Info Service] Error:', error);
    return {
      success: false,
      data: [],
      error: '역사 정보를 가져오는 중 오류가 발생했습니다.',
    };
  }
}

// 서울 전용 역사 상세 정보 조회 (서울 데이터 API 활용)
export async function getSeoulStationInfo(stationName: string): Promise<any> {
  try {
    const response = await fetch(`/api/seoul-data?service=arrival&query=${encodeURIComponent(stationName)}`);
    if (!response.ok) return null;
    return await response.json();
  } catch (error) {
    console.error('[Station Info Service] Seoul API Error:', error);
    return null;
  }
}

// 편의시설 아이콘 매핑
export const FACILITY_ICONS: Record<string, { icon: string; label: string }> = {
  elvtrCnt: { icon: '🛗', label: '엘리베이터' },
  escltCnt: { icon: '↗️', label: '에스컬레이터' },
  whlchLftCnt: { icon: '♿', label: '휠체어리프트' },
  toiletCnt: { icon: '🚻', label: '화장실' },
  nrsgRoomYn: { icon: '🍼', label: '수유실' },
  atmYn: { icon: '🏧', label: 'ATM' },
  storeYn: { icon: '🏪', label: '편의점' },
  lockYn: { icon: '🔐', label: '물품보관함' },
  exitCnt: { icon: '🚪', label: '출구' },
};

// 편의시설 요약 생성
export function getFacilitySummary(station: StationInfo): string[] {
  const facilities: string[] = [];

  if (station.elvtrCnt && station.elvtrCnt > 0) {
    facilities.push(`엘리베이터 ${station.elvtrCnt}대`);
  }
  if (station.escltCnt && station.escltCnt > 0) {
    facilities.push(`에스컬레이터 ${station.escltCnt}대`);
  }
  if (station.whlchLftCnt && station.whlchLftCnt > 0) {
    facilities.push(`휠체어리프트 ${station.whlchLftCnt}대`);
  }
  if (station.toiletCnt && station.toiletCnt > 0) {
    facilities.push(`화장실 ${station.toiletCnt}개`);
  }
  if (station.exitCnt && station.exitCnt > 0) {
    facilities.push(`출구 ${station.exitCnt}개`);
  }
  if (station.nrsgRoomYn === 'Y') {
    facilities.push('수유실');
  }
  if (station.atmYn === 'Y') {
    facilities.push('ATM');
  }
  if (station.storeYn === 'Y') {
    facilities.push('편의점');
  }
  if (station.lockYn === 'Y') {
    facilities.push('물품보관함');
  }

  return facilities;
}
