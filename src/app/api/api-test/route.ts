/**
 * 공공 데이터 API 키 연결 확인(검증)을 위한 서버사이드 라우트
 * 보안: 로그인 필수, API 키는 URL 쿼리가 아닌 body로 수신
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireUser } from '../sync-utils';

interface TestRequest {
  type: string;
  apiKey: string;
  sigunNm?: string;
}

function buildTestRequest(type: string, apiKey: string, sigunNm?: string): { testUrl: string; validationFn: (data: any) => boolean } {
  let testUrl = '';
  let validationFn = (data: any) => false;

  // API 타입별 테스트 엔드포인트 및 검증 로직 설정
  switch (type) {
    case 'localdata': {
      // LocalData 개방플랫폼 (serviceKey 인증)
      const urlObj = new URL('https://www.localdata.go.kr/platform/rest/TO0/openDataApi');
      urlObj.searchParams.set('serviceKey', apiKey);
      urlObj.searchParams.set('startPage', '1');
      urlObj.searchParams.set('endPage', '1');
      testUrl = urlObj.toString();
      validationFn = (data: any) => !!data && !data.ERROR;
      break;
    }

    case 'seoul':
    case 'seoul-clinic':
      testUrl = `http://openapi.seoul.go.kr:8088/${apiKey}/json/LOCALDATA_010102/1/1`;
      validationFn = (data: any) => !!data.LOCALDATA_010102 || data.RESULT?.CODE === 'INFO-000';
      break;

    case 'seoul-hospital':
      testUrl = `http://openapi.seoul.go.kr:8088/${apiKey}/json/LOCALDATA_010101/1/1`;
      validationFn = (data: any) => !!data.LOCALDATA_010101 || data.RESULT?.CODE === 'INFO-000';
      break;

    case 'gg-clinic': {
      const urlObj = new URL('https://openapi.gg.go.kr/AsembyStus');
      urlObj.searchParams.set('KEY', apiKey);
      urlObj.searchParams.set('Type', 'json');
      urlObj.searchParams.set('pIndex', '1');
      urlObj.searchParams.set('pSize', '1');
      if (sigunNm) urlObj.searchParams.set('SIGUN_NM', sigunNm);
      testUrl = urlObj.toString();
      validationFn = (data: any) => !!data.AsembyStus;
      break;
    }

    case 'gg-hospital': {
      const urlObj = new URL('https://openapi.gg.go.kr/GgMedctnstus');
      urlObj.searchParams.set('KEY', apiKey);
      urlObj.searchParams.set('Type', 'json');
      urlObj.searchParams.set('pIndex', '1');
      urlObj.searchParams.set('pSize', '1');
      if (sigunNm) urlObj.searchParams.set('SIGUN_NM', sigunNm);
      testUrl = urlObj.toString();
      validationFn = (data: any) => !!data.GgMedctnstus;
      break;
    }

    case 'gg-academy': {
      const urlObj = new URL('https://openapi.gg.go.kr/GenmstClassStus');
      urlObj.searchParams.set('KEY', apiKey);
      urlObj.searchParams.set('Type', 'json');
      urlObj.searchParams.set('pIndex', '1');
      urlObj.searchParams.set('pSize', '1');
      if (sigunNm) urlObj.searchParams.set('SIGUN_NM', sigunNm);
      testUrl = urlObj.toString();
      validationFn = (data: any) => !!data.GenmstClassStus;
      break;
    }

    case 'gg-restaurant': {
      const urlObj = new URL('https://openapi.gg.go.kr/Genrestrt');
      urlObj.searchParams.set('KEY', apiKey);
      urlObj.searchParams.set('Type', 'json');
      urlObj.searchParams.set('pIndex', '1');
      urlObj.searchParams.set('pSize', '1');
      if (sigunNm) urlObj.searchParams.set('SIGUN_NM', sigunNm);
      testUrl = urlObj.toString();
      validationFn = (data: any) => !!data.Genrestrt;
      break;
    }

    case 'gg-jncl-univ': {
      const urlObj = new URL('https://openapi.gg.go.kr/GgJnclUnivStus');
      urlObj.searchParams.set('KEY', apiKey);
      urlObj.searchParams.set('Type', 'json');
      urlObj.searchParams.set('pIndex', '1');
      urlObj.searchParams.set('pSize', '1');
      if (sigunNm) urlObj.searchParams.set('SIGUN_NM', sigunNm);
      testUrl = urlObj.toString();
      validationFn = (data: any) => !!data.GgJnclUnivStus;
      break;
    }

    case 'gg-univ': {
      const urlObj = new URL('https://openapi.gg.go.kr/GgUnivStus');
      urlObj.searchParams.set('KEY', apiKey);
      urlObj.searchParams.set('Type', 'json');
      urlObj.searchParams.set('pIndex', '1');
      urlObj.searchParams.set('pSize', '1');
      if (sigunNm) urlObj.searchParams.set('SIGUN_NM', sigunNm);
      testUrl = urlObj.toString();
      validationFn = (data: any) => !!data.GgUnivStus;
      break;
    }

    default:
      throw new Error(`지원하지 않는 API 유형입니다: ${type}`);
  }

  return { testUrl, validationFn };
}

async function runTest({ type, apiKey, sigunNm }: TestRequest) {
  const startTime = Date.now();
  const { testUrl, validationFn } = buildTestRequest(type, apiKey, sigunNm);

  // API 키가 URL에 포함되므로 로그에 URL 전체를 남기지 않음
  console.log(`[API Connect Test] type=${type} host=${new URL(testUrl).host}`);

  const res = await fetch(testUrl, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
    cache: 'no-store'
  });

  const duration = Date.now() - startTime;

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} 오류 발생`);
  }

  const responseText = await res.text();
  let data;
  try {
    data = JSON.parse(responseText);
  } catch {
    throw new Error('API 서버가 올바른 JSON 형식을 반환하지 않았습니다.');
  }

  const isValid = validationFn(data);

  if (isValid) {
    return NextResponse.json({
      success: true,
      duration,
      latency: duration,
      message: 'API 연결 성공'
    });
  } else {
    // 구체적인 에러 메시지 추출 시도
    let errorMsg = '인증에 실패했거나 올바르지 않은 API 응답입니다.';
    if (data.RESULT) {
      errorMsg = `[${data.RESULT.CODE}] ${data.RESULT.MESSAGE}`;
    } else if (data.error) {
      errorMsg = data.error.message || errorMsg;
    }

    return NextResponse.json({
      success: false,
      duration,
      latency: duration,
      error: errorMsg
    });
  }
}

// API 키를 body로 받는 POST 핸들러 (권장 - 키가 URL/로그에 노출되지 않음)
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    // 로그인 인증 필수
    const supabase = await createClient();
    const authError = await requireUser(supabase);
    if (authError) return authError;

    const body = await request.json();
    // SettingsModal은 apiType, SuperAdminDashboard는 type 필드명 사용
    const { apiType, type, apiKey, sigunNm } = body as TestRequest & { apiType?: string };
    const apiTypeName = apiType || type;

    if (!apiTypeName || !apiKey) {
      return NextResponse.json(
        { success: false, error: '필수 파라미터(type, apiKey)가 누락되었습니다.' },
        { status: 400 }
      );
    }

    return await runTest({ type: apiTypeName, apiKey, sigunNm });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[API Connect Test Error]`, error);
    return NextResponse.json({
      success: false,
      duration,
      error: (error as Error).message || '네트워크 오류가 발생했습니다.'
    });
  }
}
