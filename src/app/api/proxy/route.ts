/**
 * LocalData API 프록시
 * CORS 문제 해결을 위한 서버사이드 프록시
 *
 * 보안: SSRF 방지를 위한 도메인 화이트리스트 + 로그인 인증 필수
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '../sync-utils';

// 프록시를 허용할 공공 데이터 API 도메인 (SSRF 방지 화이트리스트)
const ALLOWED_HOSTS = new Set([
  'openapi.seoul.go.kr',
  'openapi.gg.go.kr',
]);

export async function GET(request: NextRequest) {
  try {
    // 1. 로그인 인증 필수 (익명 접근 차단)
    const supabase = await createClient();
    const authError = await requireUser(supabase);
    if (authError) return authError;

    // 2. URL 파라미터 검증
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get('url');

    if (!targetUrl) {
      return NextResponse.json(
        { error: 'Missing url parameter' },
        { status: 400 }
      );
    }

    const decodedUrl = decodeURIComponent(targetUrl);

    // 3. SSRF 방지: 화이트리스트 도메인만 허용
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(decodedUrl);
    } catch {
      return NextResponse.json(
        { error: '유효하지 않은 URL입니다.' },
        { status: 400 }
      );
    }

    if (!ALLOWED_HOSTS.has(parsedUrl.hostname)) {
      console.warn(`[Proxy] 차단된 도메인 요청: ${parsedUrl.hostname}`);
      return NextResponse.json(
        { error: '허용되지 않은 도메인입니다. 공공 데이터 API만 프록시할 수 있습니다.' },
        { status: 403 }
      );
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return NextResponse.json(
        { error: 'http/https 프로토콜만 허용됩니다.' },
        { status: 400 }
      );
    }

    console.log(`[Proxy] Fetching: ${parsedUrl.hostname}${parsedUrl.pathname}`);

    const response = await fetch(decodedUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/xml, text/xml, */*',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      console.error(`[Proxy] HTTP Error: ${response.status}`);
      return NextResponse.json(
        { error: `HTTP ${response.status}: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.text();
    console.log(`[Proxy] Response received: ${data.length} bytes`);

    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('[Proxy] Error:', error);
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
