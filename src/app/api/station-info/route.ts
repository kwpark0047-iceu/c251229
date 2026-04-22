import { NextRequest, NextResponse } from 'next/server';
import { getKricCodes } from '@/lib/kric-codes';

/**
 * KRIC 역사별 정보 API 프록시 (캐싱 지원)
 * 서비스ID: convenientInfo
 * 오퍼레이션ID: stationInfo
 */

// 캐시 유효 시간 (초) - 1시간 (3600초)
const CACHE_TTL = 3600;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const line = searchParams.get('line') || '1';
  const stationName = searchParams.get('station');

  // API 키 확인 (새로 발급받은 공공데이터 포털 키 우선)
  const apiKey = process.env.DATAGOKR_API_KEY ||
    process.env.KRIC_API_KEY ||
    process.env.NEXT_PUBLIC_KRIC_API_KEY ||
    process.env.STATION_INFO_API_KEY;

  if (!apiKey) {
    console.error('[Station Info API] Error: No API Key found');
    return NextResponse.json(
      { error: 'API 키가 설정되지 않았습니다.' },
      { status: 500 }
    );
  }

  try {
    const { railOprIsttCd, lnCd } = getKricCodes(line);

    const baseUrl = 'https://openapi.kric.go.kr/openapi/convenientInfo/stationInfo';
    const params = new URLSearchParams({
      serviceKey: apiKey,
      format: 'JSON',
      railOprIsttCd,
      lnCd,
    });

    if (stationName) {
      params.append('stinNm', stationName);
    }

    const apiUrl = `${baseUrl}?${params.toString()}`;

    // 로깅 (보안을 위해 API 키 마스킹)
    console.log(`[Station Info API] Request: railOprIsttCd=${railOprIsttCd}, lnCd=${lnCd}, station=${stationName || 'ALL'}`);

    // fetch with cache tags or revalidate
    let upstreamResponse;
    let isSeoulDataUsed = false;

    // 서울 지하철(S1)이고 노선이 1~9호선인 경우 서울 데이터 API 활용 시도 (선택적)
    // 여기서는 KRIC를 주 데이터로 유지하되, 향후 확장성을 위해 구조만 잡음
    
    upstreamResponse = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
      },
      next: {
        revalidate: CACHE_TTL,
        tags: ['kric-station-info', `station-${stationName || 'all'}`]
      }
    });

    if (!upstreamResponse.ok) {
      const errorText = await upstreamResponse.text();
      console.error(`[Station Info API] Upstream Error (${line}):`, upstreamResponse.status, errorText);

      // 500 에러 대신 success: false를 반환하여 클라이언트 측 중단 방지
      return NextResponse.json(
        {
          success: false,
          error: `KRIC API 요청 실패 (${upstreamResponse.status})`,
          details: errorText,
          fallback_data: true // 클라이언트에게 폴백 사용 권장
        },
        { status: 200 } // HTTP 상태 코드는 200으로 반환하여 Axios 500 에러 방지
      );
    }

    const textData = await upstreamResponse.text();
    let data;
    try {
      if (textData.trim().startsWith('<')) {
        // XML 또는 HTML 에러 페이지가 돌아온 경우
        throw new Error('Invalid JSON format (received XML/HTML)');
      }
      data = JSON.parse(textData);
    } catch (e) {
      console.error(`[Station Info API] Data Format Error (${line}):`, e instanceof Error ? e.message : 'Unknown error');
      return NextResponse.json(
        {
          success: false,
          error: 'API 응답 형식이 올바르지 않습니다.',
          details: textData.substring(0, 200),
          is_html_error: textData.trim().startsWith('<')
        },
        { status: 200 }
      );
    }

    // KRIC API 결과 코드 체크
    if (data.header && data.header.resultCode !== '00') {
      const isAuthError = ['10', '20', '30'].includes(data.header.resultCode);
      console.error(`[Station Info API] KRIC Logic Error (${line}):`, data.header.resultMsg);

      return NextResponse.json(
        {
          success: false,
          error: `KRIC API 오류: ${data.header.resultMsg}`,
          code: data.header.resultCode,
          is_auth_error: isAuthError
        },
        { status: 200 }
      );
    }

    // 결과 반환 (캐시 정보 포함)
    const rawBody = data.body || [];
    const formattedData = Array.isArray(rawBody) ? rawBody : [rawBody];

    return NextResponse.json({
      success: true,
      data: formattedData,
      line,
      railOprIsttCd,
      lnCd,
      _metadata: {
        cached_at: new Date().toISOString(),
        ttl: CACHE_TTL,
        count: formattedData.length
      }
    });

  } catch (error) {
    console.error('[Station Info API] Internal Exception:', error);
    return NextResponse.json(
      {
        success: false,
        error: '서버 내부 오류가 발생했습니다.',
        details: (error as Error).message
      },
      { status: 200 } // 안정성을 위해 200으로 반환
    );
  }
}
