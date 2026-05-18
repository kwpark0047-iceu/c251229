import { NextRequest, NextResponse } from 'next/server';
import { getSeoulClinicLicenseData } from '@/lib/seoul-data-api';

const LOCALDATA_API_ENDPOINT = 'http://www.localdata.go.kr/platform/rest/TO0/openDataApi';

export async function POST(request: NextRequest) {
  try {
    const { apiType, apiKey } = await request.json();

    if (!apiType || !apiKey) {
      return NextResponse.json({ success: false, error: 'apiType and apiKey are required' }, { status: 400 });
    }

    const startTime = Date.now();

    if (apiType === 'seoul') {
      // 서울 열린데이터 광장 의원 데이터 1건 조회 테스트
      const result = await getSeoulClinicLicenseData(1, 1, apiKey);
      const latency = Date.now() - startTime;

      if (result && result.leads) {
        return NextResponse.json({
          success: true,
          message: `연결 성공 (조회 건수: ${result.totalCount.toLocaleString()}건)`,
          latency,
          details: {
            totalCount: result.totalCount,
            sample: result.leads[0]?.BPLCNM || '데이터 없음'
          }
        });
      } else {
        return NextResponse.json({
          success: false,
          error: '서울 데이터 API가 빈 결과를 반환했거나 결과 형식이 올바르지 않습니다.',
          latency
        });
      }
    } else if (apiType === 'localdata') {
      // LocalData.go.kr 의원 데이터 1건 조회 테스트
      const serviceId = '01_01_02_P'; // 의원
      const regionCode = '6110000'; // 서울
      const startDate = '20260101';
      const endDate = '20260102';

      const apiUrl = new URL(LOCALDATA_API_ENDPOINT);
      apiUrl.searchParams.set('authKey', apiKey);
      apiUrl.searchParams.set('opnSvcId', serviceId);
      apiUrl.searchParams.set('localCode', regionCode);
      apiUrl.searchParams.set('lastModTsBgn', startDate);
      apiUrl.searchParams.set('lastModTsEnd', endDate);
      apiUrl.searchParams.set('pageIndex', '1');
      apiUrl.searchParams.set('pageSize', '1');
      apiUrl.searchParams.set('resultType', 'xml');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(apiUrl.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/xml, text/xml, */*',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;

      if (!response.ok) {
        return NextResponse.json({
          success: false,
          error: `HTTP 오류 발생 (상태 코드: ${response.status})`,
          latency
        });
      }

      const xmlText = await response.text();

      if (xmlText.includes('<code>00</code>')) {
        const totalMatch = xmlText.match(/<totalCount>(\d+)<\/totalCount>/);
        const totalCount = totalMatch ? parseInt(totalMatch[1]) : 0;
        return NextResponse.json({
          success: true,
          message: `연결 성공 (기간 내 신규 건수: ${totalCount}건)`,
          latency,
          details: { totalCount }
        });
      } else {
        const codeMatch = xmlText.match(/<code>([^<]*)<\/code>/);
        const msgMatch = xmlText.match(/<message>([^<]*)<\/message>/);
        return NextResponse.json({
          success: false,
          error: `API 반환 오류 [코드 ${codeMatch?.[1] || '알 수 없음'}]: ${msgMatch?.[1] || '인증 오류가 발생했습니다.'}`,
          latency
        });
      }
    } else {
      return NextResponse.json({ success: false, error: 'Unsupported apiType' }, { status: 400 });
    }
  } catch (error) {
    console.error('[API Test Route] Error:', error);
    return NextResponse.json({
      success: false,
      error: `연결 실패: ${(error as Error).message || '네트워크 응답이 없습니다.'}`
    }, { status: 500 });
  }
}
