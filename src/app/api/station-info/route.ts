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
  '9': 'S1',
  '1001': 'S1', '1002': 'S1', '1003': 'S1', '1004': 'S1',
  '1005': 'S1', '1006': 'S1', '1007': 'S1', '1008': 'S1',
  '1009': 'S1',
  '1077': 'NS', // 신분당선
  '1085': 'KR', // 수인분당선
  '1063': 'KR', // 경의중앙선
  '1067': 'KR', // 경춘선
  '1065': 'AP', // 공항철도
  '1099': 'UI', // 의정부경전철
  '1086': 'WS', // 서해선
  '1087': 'GC', // 김포골드라인
  '1092': 'UI', // 우이신설선
  '1093': 'SL', // 신림선
  '1081': 'KR', // 경강선
  'S': 'NS', // 신분당선 (레거시)
  'K': 'KR', // 경의중앙선 (레거시)
  'A': 'AP', // 공항철도 (레거시)
  'B': 'KR', // 분당선 (레거시)
  'G': 'KR', // 경춘선 (레거시)
  'U': 'UI', // 우이신설선 (레거시)
  'W': 'WS', // 서해선 (레거시)
};

// 노선코드 매핑 (KRIC API 파라미터용)
const LINE_CODES: Record<string, string> = {
  '1': '1', '2': '2', '3': '3', '4': '4',
  '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
  '1001': '1', '1002': '2', '1003': '3', '1004': '4',
  '1005': '5', '1006': '6', '1007': '7', '1008': '8',
  '1009': '9',
  '1077': 'D1', // 신분당선
  '1085': 'B1', // 수인분당선
  '1063': 'K1', // 경의중앙선
  '1067': 'G1', // 경춘선
  '1065': 'A1', // 공항철도
  '1087': 'G1', // 김포골드라인
  '1092': 'UI', // 우이신설선
  '1093': 'SL', // 신림선
  '1081': 'K1', // 경강선
  'S': 'D1',
  'K': 'K1',
  'A': 'A1',
  'B': 'B1',
  'G': 'G1',
  'U': 'UI',
  'W': 'WE',
};

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const line = searchParams.get('line') || '1';
  const stationName = searchParams.get('station');

  // KRIC_API_KEY로 통합 사용
  const apiKey = process.env.KRIC_API_KEY || process.env.NEXT_PUBLIC_KRIC_API_KEY;

  if (!apiKey) {
    console.error('[Station Info API] Error: KRIC_API_KEY is missing');
    return NextResponse.json(
      { error: 'API 키가 설정되지 않았습니다. Vercel 환경변수 KRIC_API_KEY를 확인하세요.' },
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
