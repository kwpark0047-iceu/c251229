/**
 * SOPO(소상공인시장진흥공단) 상가정보 조회 API 라우트
 * 서버사이드: DATAGOKR_API_KEY 사용 (클라이언트 노출 방지)
 * 
 * query: mgtNo(관리번호), sigunNm(구청명 - 선택)
 * 
 * 참고: fetchSopoData utils 재사용, seoul-clinics/route.ts 패턴 기반
 */

import { NextResponse } from 'next/server';
import { fetchSopoData } from '@/app/lead-manager/utils/sopo-utils';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface SopoLookupRequest {
  mgtNo: string;
  sigunNm?: string;
}

interface SopoItem {
  // SOPO 데이터 필드 (sopo-utils.ts 기준)
  upclCn: string;
  upclNm: string;
  indsLclsCd: string;
  indsLclsNm: string;
  indsMclsCd: string;
  indsMclsNm: string;
  indsSclsCd: string;
  indsSclsNm: string;
  ctprvnCd: string;
  ctprvnNm: string;
  signguCd: string;
  signguNm: string;
  adongCd: string;
  adongNm: string;
  stdrYm: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mgtNo = searchParams.get('mgtNo') || '';
    const sigunNm = searchParams.get('sigunNm') || undefined;

    if (!mgtNo) {
      return NextResponse.json(
        { success: false, error: 'mgtNo 파라미터가 필요합니다.' },
        { status: 400 }
      );
    }

    // 서버사이드 env 키로 SOPO 데이터 조회 (mgtNo만 전달, sigunNm은 쿼리 파라미터로 자동 포함됨)
    const sopoItems = await fetchSopoData({ key: mgtNo });

    return NextResponse.json({
      success: true,
      data: sopoItems,
    });
  } catch (error) {
    console.error('[SOPO Lookup API Error]:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message || 'SOPO 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}