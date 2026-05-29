import { NextRequest, NextResponse } from 'next/server';
import { safeFetch } from '../../../../../src/app/lead-manager/api-client'; // adjust path if needed

/**
 * LocalData 전체 데이터를 페이지네이션 없이 한 번에 반환하는 서버 라우트
 * GET /api/localdata/all?serviceId=...&regionCode=...&startDate=YYYYMMDD&endDate=YYYYMMDD
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const serviceId = params.get('serviceId') || '01_01_02_P';
  const regionCode = params.get('regionCode') || '6410000';
  const startDate = params.get('startDate');
  const endDate = params.get('endDate');

  if (!startDate || !endDate) {
    return NextResponse.json({ success: false, error: 'startDate와 endDate 파라미터가 필요합니다.' }, { status: 400 });
  }

  // Helper to call LocalData API directly via safeFetch
  const fetchPage = async (page: number) => {
    return await safeFetch('/api/localdata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        serviceId,
        regionCode,
        startDate,
        endDate,
        pageIndex: page,
        pageSize: 100,
      }),
    });
  };

  const first = await fetchPage(1);
  if (!first.success) {
    return NextResponse.json(first, { status: 500 });
  }

  const totalPages = Math.ceil(first.totalCount / 100);
  const allLeads = [...first.leads];

  for (let page = 2; page <= totalPages; page++) {
    const res = await fetchPage(page);
    if (res.success) {
      allLeads.push(...res.leads);
    } else {
      break;
    }
  }

  return NextResponse.json({ success: true, leads: allLeads, totalCount: allLeads.length });
}

export const maxDuration = 120; // 장시간 작업을 위해 timeout 확대
