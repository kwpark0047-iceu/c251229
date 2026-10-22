/**
 * SOPO(소상공인시장진흥공단) 상가정보 조회 API 라우트
 * 서버사이드: DATAGOKR_API_KEY 사용 (클라이언트 노출 방지)
 * 
 * query: mgtNo(관리번호), sigunNm(구청명 - 선택)
 * 
 * 참고: fetchSopoData utils 재사용, seoul-clinics/route.ts 패턴 기반
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '@/app/api/sync-utils';
import { fetchSopoData } from '@/app/lead-manager/utils/sopo-utils';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_QUERY_LENGTH = 100;
const RATE_WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 30;
const requestLog = new Map<string, number[]>();

function getClientKey(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function isRateLimited(clientKey: string, now = Date.now()): boolean {
  const windowStart = now - RATE_WINDOW_MS;
  for (const [key, times] of requestLog) {
    if (!times.length || times[times.length - 1] <= windowStart) requestLog.delete(key);
  }
  if (!requestLog.has(clientKey) && requestLog.size >= 5000) return true;
  const recentRequests = (requestLog.get(clientKey) ?? []).filter((timestamp) => timestamp > windowStart);

  if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
    requestLog.set(clientKey, recentRequests);
    return true;
  }

  recentRequests.push(now);
  requestLog.set(clientKey, recentRequests);
  return false;
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const authError = await requireUser(supabase);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const mgtNo = searchParams.get('mgtNo')?.trim() || '';
    const sigunNm = searchParams.get('sigunNm')?.trim() || undefined;

    if (!mgtNo || mgtNo.length > MAX_QUERY_LENGTH) {
      return NextResponse.json(
        { success: false, error: 'mgtNo 파라미터는 1자 이상 100자 이하이어야 합니다.' },
        { status: 400 }
      );
    }

    if (sigunNm && sigunNm.length > MAX_QUERY_LENGTH) {
      return NextResponse.json(
        { success: false, error: 'sigunNm 파라미터는 100자 이하이어야 합니다.' },
        { status: 400 }
      );
    }

    if (isRateLimited(getClientKey(request))) {
      return NextResponse.json(
        { success: false, error: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      );
    }

    const sopoItems = await fetchSopoData({ key: mgtNo, sigunNm });

    return NextResponse.json({
      success: true,
      data: sopoItems,
    });
  } catch (error) {
    console.error('[SOPO Lookup API Error]:', error instanceof Error ? error.name : 'UnknownError');
    return NextResponse.json(
      {
        success: false,
        error: '상가정보 제공기관에 연결하지 못했습니다. 인증키 설정과 이용 한도를 확인한 후 다시 시도해 주세요.',
      },
      { status: 502 }
    );
  }
}
