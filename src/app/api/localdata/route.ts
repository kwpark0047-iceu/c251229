/**
 * LocalData API 서버사이드 라우트
 * API 키를 서버에서 안전하게 관리하고 클라이언트 요청을 처리
 */

import { NextRequest, NextResponse } from 'next/server';

// 환경변수에서 API 키 로드 (서버에서만 접근 가능)
const LOCALDATA_API_KEY = process.env.LOCALDATA_API_KEY;
const API_ENDPOINT = 'http://www.localdata.go.kr/platform/rest/TO0/openDataApi';

interface LocalDataParams {
  serviceId: string;      // 서비스 ID (예: 01_01_02_P)
  regionCode: string;     // 지역 코드 (예: 6110000)
  startDate: string;      // 시작일 (YYYYMMDD)
  endDate: string;        // 종료일 (YYYYMMDD)
  pageIndex?: number;     // 페이지 번호
  pageSize?: number;      // 페이지 크기
}

export async function POST(request: NextRequest) {
  try {
    // API 키 확인
    if (!LOCALDATA_API_KEY) {
      console.error('[LocalData API] API 키가 설정되지 않았습니다.');
      return NextResponse.json(
        { success: false, error: 'API 키가 서버에 설정되지 않았습니다. 관리자에게 문의하세요.' },
        { status: 500 }
      );
    }

    // 요청 파라미터 파싱
    const params: LocalDataParams = await request.json();
    const {
      serviceId,
      regionCode,
      startDate,
      endDate,
      pageIndex = 1,
      pageSize = 100,
    } = params;

    // 필수 파라미터 검증
    if (!serviceId || !regionCode || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: '필수 파라미터가 누락되었습니다.' },
        { status: 400 }
      );
    }

    // API URL 구성 (API 키는 서버에서만 사용)
    const apiUrl = new URL(API_ENDPOINT);
    apiUrl.searchParams.set('authKey', LOCALDATA_API_KEY);
    apiUrl.searchParams.set('opnSvcId', serviceId);
    apiUrl.searchParams.set('localCode', regionCode);
    apiUrl.searchParams.set('lastModTsBgn', startDate);
    apiUrl.searchParams.set('lastModTsEnd', endDate);
    apiUrl.searchParams.set('pageIndex', pageIndex.toString());
    apiUrl.searchParams.set('pageSize', pageSize.toString());
    apiUrl.searchParams.set('resultType', 'xml');

    console.log(`[LocalData API] 요청: serviceId=${serviceId}, region=${regionCode}, page=${pageIndex}`);

    // API 호출
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(apiUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/xml, text/xml, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error(`[LocalData API] HTTP 오류: ${response.status}`);
      return NextResponse.json(
        { success: false, error: `API 서버 오류: ${response.status}` },
        { status: response.status }
      );
    }

    const xmlText = await response.text();

    // HTML 에러 페이지 체크
    if (xmlText.includes('<!DOCTYPE') || xmlText.includes('<html')) {
      console.error('[LocalData API] HTML 응답 수신 (에러 페이지)');
      return NextResponse.json(
        { success: false, error: 'API 서버에서 에러 페이지를 반환했습니다.' },
        { status: 502 }
      );
    }

    // XML 파싱
    const result = parseXMLResponse(xmlText);

    console.log(`[LocalData API] 응답: ${result.totalCount}건 중 ${result.leads.length}건 조회`);

    return NextResponse.json({
      success: true,
      ...result,
    });

  } catch (error) {
    console.error('[LocalData API] 오류:', error);

    if ((error as Error).name === 'AbortError') {
      return NextResponse.json(
        { success: false, error: 'API 요청 시간 초과 (30초)' },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * XML 응답 파싱
 */
function parseXMLResponse(xmlText: string): {
  leads: RawLead[];
  totalCount: number;
  message?: string;
} {
  // 간단한 XML 파싱 (DOMParser는 서버에서 사용 불가하므로 정규식 사용)
  const leads: RawLead[] = [];

  // 결과 코드 확인
  const codeMatch = xmlText.match(/<code>(\d+)<\/code>/);
  const resultCode = codeMatch ? codeMatch[1] : null;

  if (resultCode !== '00') {
    const msgMatch = xmlText.match(/<message>([^<]*)<\/message>/);
    return {
      leads: [],
      totalCount: 0,
      message: `API 오류 (${resultCode}): ${msgMatch?.[1] || '알 수 없는 오류'}`,
    };
  }

  // 전체 건수
  const totalMatch = xmlText.match(/<totalCount>(\d+)<\/totalCount>/);
  const totalCount = totalMatch ? parseInt(totalMatch[1]) : 0;

  // 각 row 파싱
  const rowRegex = /<row>([\s\S]*?)<\/row>/g;
  let match;

  while ((match = rowRegex.exec(xmlText)) !== null) {
    const rowXml = match[1];
    const lead = parseRowXml(rowXml);
    if (lead) {
      leads.push(lead);
    }
  }

  return { leads, totalCount };
}

interface RawLead {
  bizName: string;
  bizId?: string;
  licenseDate?: string;
  roadAddress?: string;
  lotAddress?: string;
  coordX?: number;
  coordY?: number;
  phone?: string;
  medicalSubject?: string;
}

/**
 * 개별 row XML 파싱
 */
function parseRowXml(rowXml: string): RawLead | null {
  const getValue = (tagName: string): string => {
    const regex = new RegExp(`<${tagName}>([^<]*)</${tagName}>`);
    const match = rowXml.match(regex);
    return match ? match[1].trim() : '';
  };

  const bizName = getValue('bplcNm');
  if (!bizName) return null;

  return {
    bizName,
    bizId: getValue('brno') || undefined,
    licenseDate: getValue('apvPermYmd') || getValue('dcbYmd') || undefined,
    roadAddress: getValue('rdnWhlAddr') || undefined,
    lotAddress: getValue('sitWhlAddr') || undefined,
    coordX: parseFloat(getValue('x')) || undefined,
    coordY: parseFloat(getValue('y')) || undefined,
    phone: getValue('siteTel') || undefined,
    medicalSubject: getValue('medicalSubject') || getValue('uptaeNm') || undefined,
  };
}

// OPTIONS 요청 처리 (CORS)
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
