/**
 * 공공 데이터 API 키 연결 확인(검증)을 위한 서버사이드 라우트
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const type = searchParams.get('type');
  const apiKey = searchParams.get('apiKey');
  const sigunNm = searchParams.get('sigunNm');

  if (!type || !apiKey) {
    return NextResponse.json(
      { success: false, error: '필수 파라미터(type, apiKey)가 누락되었습니다.' },
      { status: 400 }
    );
  }

  const startTime = Date.now();

  try {
    let testUrl = '';
    let validationFn = (data: any) => false;

    // API 타입별 테스트 엔드포인트 및 검증 로직 설정
    switch (type) {
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
        testUrl = urlObj.toString();
        validationFn = (data: any) => !!data.GgUnivStus;
        break;
      }

      default:
        return NextResponse.json(
          { success: false, error: `지원하지 않는 API 유형입니다: ${type}` },
          { status: 400 }
        );
    }

    console.log(`[API Connect Test] URL: ${testUrl}`);

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
        error: errorMsg
      });
    }

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
