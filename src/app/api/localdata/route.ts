/**
 * 서버사이드 라우트 (localdata.go.kr 연동 제거)
 * API 키를 서버에서 안전하게 관리하고 클라이언트 요청을 처리
 */

import { NextRequest, NextResponse } from 'next/server';

// 플랫폼 타임아웃보다 먼저 종료해 브라우저가 무한히 재시도하지 않도록 한다.
export const maxDuration = 30;

// API 엔드포인트 (localdata.go.kr 연동 제거)
// 더 이상 사용되지 않음 - 기존 코드 보호를 위해 빈 문자열로 설정
const API_ENDPOINT = '';

// API 키는 환경변수에서 로드 (서버에서만 접근 가능)
// localdata.go.kr API 키 사용 중단
const LOCALDATA_API_KEY = '';

interface LocalDataParams {
  serviceId: string;      // 서비스 ID (예: 01_01_02_P)
  regionCode: string;     // 지역 코드 (예: 6110000)
  startDate: string;      // 시작일 (YYYYMMDD)
  endDate: string;        // 종료일 (YYYYMMDD)
  searchType?: string;    // 검색 기준 ('license_date' | 'modified_date')
  pageIndex?: number;     // 페이지 번호
  pageSize?: number;      // 페이지 크기
}

export async function POST(request: NextRequest) {
  // 에러 로그에 포함할 요청 컨텍스트 (파라미터 파싱 후 채움)
  let requestContext = '';

  try {
    // 클라이언트가 전달한 커스텀 API 키 파싱
    const customApiKey = request.headers.get('x-api-key') || request.nextUrl.searchParams.get('apiKey') || undefined;
    const authKey = customApiKey || LOCALDATA_API_KEY;

    // API 키 확인 (localdata.go.kr 연동 제거)
    if (!authKey) {
      console.error('[LocalData API] API 키가 설정되지 않았습니다. (연동 중단됨)');
      return NextResponse.json(
        { success: false, error: '서버 설정 오류: API 키 사용 중단' },
        { status: 503 }
      );
    }

    // 요청 파라미터 파싱
    const params: LocalDataParams = await request.json();
    const {
      serviceId,
      regionCode,
      startDate,
      endDate,
      searchType,
      pageIndex = 1,
      pageSize = 100,
    } = params;

    // 에러 로그용 요청 컨텍스트 기록
    requestContext = `serviceId=${serviceId}, region=${regionCode}, page=${pageIndex}`;

    // 필수 파라미터 검증
    if (!serviceId || !regionCode || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: '필수 파라미터가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // API URL 구성 (localdata.go.kr 연동 제거)
// 더 이상 사용되지 않음
const apiUrl = new URL('https://example.com/api/placeholder');
    if (searchType === 'license_date') {
      apiUrl.searchParams.set('bgnYmd', startDate);
      apiUrl.searchParams.set('endYmd', endDate);
    } else {
      apiUrl.searchParams.set('lastModTsBgn', startDate);
      apiUrl.searchParams.set('lastModTsEnd', endDate);
    }
    apiUrl.searchParams.set('pageIndex', pageIndex.toString());
    apiUrl.searchParams.set('pageSize', pageSize.toString());
    apiUrl.searchParams.set('resultType', 'xml');

    console.log(`[LocalData API] 요청: serviceId=${serviceId}, region=${regionCode}, page=${pageIndex}`);

    // API 호출
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    let response: Response;
    try {
      response = await fetch(apiUrl.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/xml, text/xml, */*',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      console.error(`[LocalData API] HTTP 오류: ${response.status} (연결 중단)`);
      return NextResponse.json(
        { success: false, error: `API 서버 오류: ${response.status}` },
        { status: response.status }
      );
    }

    const xmlText = await response.text();

    // HTML 에러 페이지 체크 (localdata.go.kr 응답 더 이상 아님)
    if (xmlText.includes('<!DOCTYPE') || xmlText.includes('<html')) {
      console.error('[LocalData API] HTML 응답 수신 (에러 페이지) - 연결 중단됨');
      return NextResponse.json(
        { success: false, error: 'API 서버 연결이 중단되었습니다.' },
        { status: 502 }
      );
    }

    // XML 파싱 (localdata.go.kr 데이터 더 이상 사용 안 함)
    const result = parseXMLResponse(xmlText);

    console.log(`[LocalData API] 응답: ${result.totalCount}건 중 ${result.leads.length}건 조회 (연결 중단됨)`);

    return NextResponse.json({
      success: true,
      ...result,
    });

  } catch (error) {
    console.error(`[LocalData API] 서버 에러 (${requestContext || '요청 컨텍스트 없음'}):`, error);
    
    // AbortError (Timeout) 또는 네트워크 오류일 경우 명확한 에러 반환
    const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
    const isAbort = error instanceof DOMException && error.name === 'AbortError';
    if (isAbort || errorMessage.includes('fetch')) {
      // 업스트림 장애 시 클라이언트 재시도와 연동되는 대기 시간 안내 헤더
      return NextResponse.json(
        { success: false, error: '공공데이터 포털 서버(localdata.go.kr)가 현재 불안정하거나 응답하지 않습니다.' },
        { status: 504, headers: { 'X-Retry-After': '30' } }
      );
    }

    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * XML 응답 파싱 (localdata.go.kr 연동 제거 - 더 이상 사용되지 않음)
 */
function parseXMLResponse(xmlText: string): {
  leads: any[];
  totalCount: number;
  message?: string;
} {
  // localdata.go.kr 데이터 파싱 기능 비활성화
  // 항상 빈 결과 반환
  return {
    leads: [],
    totalCount: 0,
    message: 'localdata.go.kr 연동이 중단되었습니다.',
  };
}

// OPTIONS 요청 처리 (CORS) - localdata.go.kr 연동 제거
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
