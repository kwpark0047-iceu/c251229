import { NextRequest, NextResponse } from 'next/server';

/**
 * KRIC 역사별 정보 API 프록시
 * 서비스ID: convenientInfo
 * 오퍼레이션ID: stationInfo
 */

// 철도운영기관코드
const RAIL_OPR_CODES: Record<string, string> = {
  '1': 'S1', '2': 'S1', '3': 'S1', '4': 'S1',
  '5': 'S1', '6': 'S1', '7': 'S1', '8': 'S1',
  '9': 'S9',
  'S': 'NS', // 신분당선
  'K': 'KR', // 경의중앙선 (코레일)
  'A': 'AP', // 공항철도
  'B': 'KR', // 분당선 (코레일)
  'G': 'KR', // 경춘선 (코레일)
  'U': 'UI', // 우이신설선
  'W': 'WS', // 서해선
};

// 노선코드 매핑
const LINE_CODES: Record<string, string> = {
  '1': '1', '2': '2', '3': '3', '4': '4',
  '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
  'S': 'D1', // 신분당선
  'K': 'K1', // 경의중앙선
  'A': 'A1', // 공항철도
  'B': 'B1', // 분당선
  'G': 'G1', // 경춘선
  'U': 'UI', // 우이신설선
  'W': 'WE', // 서해선
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const line = searchParams.get('line') || '1';
  const stationName = searchParams.get('station');

  const apiKey = process.env.STATION_INFO_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: 'API 키가 설정되지 않았습니다.' },
      { status: 500 }
    );
  }

  try {
    const railOprIsttCd = RAIL_OPR_CODES[line] || 'S1';
    const lnCd = LINE_CODES[line] || line;

    // KRIC API 엔드포인트
    const baseUrl = 'https://openapi.kric.go.kr/openapi/convenientInfo/stationInfo';
    const params = new URLSearchParams({
      serviceKey: apiKey,
      format: 'JSON',
      railOprIsttCd,
      lnCd,
    });

    // 특정 역 검색 시 역명 파라미터 추가
    if (stationName) {
      params.append('stinNm', stationName);
    }

    const response = await fetch(`${baseUrl}?${params.toString()}`, {
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('[Station Info API] Error:', response.status, response.statusText);
      return NextResponse.json(
        { error: `API 요청 실패: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      data: data.body || data,
      line,
      railOprIsttCd,
      lnCd,
    });

  } catch (error) {
    console.error('[Station Info API] Error:', error);
    return NextResponse.json(
      { error: '역사 정보를 가져오는 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
