import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
// Cron 작업은 오래 걸릴 수 있으므로 타임아웃 연장
export const maxDuration = 300; 

export async function GET(request: Request) {
  // 1. Vercel Cron 요청 검증
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.warn('[Cron] Unauthorized request to sync endpoint');
    return new NextResponse('Unauthorized', { status: 401 });
  }

  console.log('[Cron] Starting scheduled background sync...');

  try {
    // 2. 동기화해야 할 API 목록을 순차적으로 호출
    // 현재 프로젝트의 호스트 URL 획득 (로컬, Vercel 등 환경에 따라 다름)
    const host = request.headers.get('host');
    const protocol = host?.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    const endpoints = [
      '/api/seoul-clinics?sync=true',
      // 필요한 경우 다른 동기화 API 추가
      // '/api/gyeonggi-clinics?sync=true',
      // '/api/localdata?category=ALL&sync=true',
    ];

    const results = [];

    for (const endpoint of endpoints) {
      console.log(`[Cron] Triggering sync for: ${endpoint}`);
      const res = await fetch(`${baseUrl}${endpoint}`, {
        method: 'GET',
        // Next.js 캐시 방지
        cache: 'no-store',
      });

      if (!res.ok) {
        console.error(`[Cron] Failed to sync ${endpoint}: ${res.statusText}`);
        results.push({ endpoint, success: false, status: res.status });
      } else {
        const data = await res.json();
        console.log(`[Cron] Successfully synced ${endpoint}:`, data);
        results.push({ endpoint, success: true, data });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Scheduled sync completed',
      results,
    });

  } catch (error) {
    console.error('[Cron] Error during scheduled sync:', error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}
