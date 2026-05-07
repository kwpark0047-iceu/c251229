/**
 * 경기도 데이터 드림 (data.gg.go.kr) API 서버사이드 라우트
 * 병원 상세 현황 데이터 조회 및 동기화
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { findNearestStation } from '@/app/lead-manager/utils';

const GG_HOSPITAL_API_KEY = process.env.GG_HOSPITAL_API_KEY || '6e968a5fcec449f683c5c0fcd075802d';
const API_ENDPOINT = 'https://openapi.gg.go.kr/GgHosptlM';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const pIndex = searchParams.get('pIndex') || '1';
  const pSize = searchParams.get('pSize') || '100';
  const sigunNm = searchParams.get('sigunNm');
  const sync = searchParams.get('sync') === 'true';

  try {
    if (!GG_HOSPITAL_API_KEY) {
      return NextResponse.json(
        { success: false, error: 'API 키가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    const apiUrl = new URL(API_ENDPOINT);
    apiUrl.searchParams.set('KEY', GG_HOSPITAL_API_KEY);
    apiUrl.searchParams.set('Type', 'json');
    apiUrl.searchParams.set('pIndex', pIndex);
    apiUrl.searchParams.set('pSize', pSize);
    
    if (sigunNm) {
      apiUrl.searchParams.set('SIGUN_NM', sigunNm);
    }

    console.log(`[GG Hospital API] 요청: pIndex=${pIndex}, pSize=${pSize}, sigunNm=${sigunNm || '전체'}, sync=${sync}`);

    const response = await fetch(apiUrl.toString());
    
    if (!response.ok) {
      throw new Error(`API 응답 오류: ${response.status}`);
    }

    const data = await response.json();

    if (!data.GgHosptlM) {
      const errorCode = data.RESULT?.CODE || 'UNKNOWN';
      const errorMsg = data.RESULT?.MESSAGE || '데이터를 찾을 수 없습니다.';
      
      return NextResponse.json({
        success: false,
        error: `[${errorCode}] ${errorMsg}`,
      });
    }

    const head = data.GgHosptlM[0].head;
    const totalCount = head.find((h: any) => h.list_total_count)?.list_total_count || 0;
    const rows = data.GgHosptlM[1].row || [];

    // 리드 형식으로 매핑
    const leads = rows.map((row: any) => {
      const lat = parseFloat(row.REFINE_WGS84_LAT);
      const lng = parseFloat(row.REFINE_WGS84_LOGT);
      const nearest = findNearestStation(lat, lng);

      return {
        biz_name: row.BIZPLC_NM,
        road_address: row.REFINE_ROADNM_ADDR || '',
        lot_address: row.REFINE_LOTNO_ADDR || '',
        phone: row.LOCPLC_FACLT_TELNO || '',
        medical_subject: row.TREAT_SBJECT_CONT_INFO || '병원',
        service_name: row.BIZCOND_DIV_NM_INFO || '병원',
        category: 'HEALTH',
        latitude: lat || null,
        longitude: lng || null,
        nearest_station: nearest ? nearest.station.name : null,
        station_lines: nearest ? nearest.station.lines : null,
        station_distance: nearest ? nearest.distance : null,
        status: 'NEW',
        operating_status: row.BSN_STATE_NM === '영업중' ? '영업중' : '폐업/휴업',
        mgt_no: `GG_HOSPITAL_${row.BIZPLC_NM}_${row.REFINE_ZIP_CD || row.REFINE_ROADNM_ADDR}`.replace(/\s+/g, ''),
        region_code: '6410000', // 경기도
      };
    });

    // DB 동기화
    if (sync && leads.length > 0) {
      const supabase = await createClient();
      const { error: dbError } = await supabase
        .from('leads')
        .upsert(leads, { onConflict: 'mgt_no' });

      if (dbError) {
        console.error('[GG Hospital API] DB 저장 오류:', dbError);
        return NextResponse.json({
          success: false,
          error: `DB 저장 실패: ${dbError.message}`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      totalCount,
      leads: leads.map((l: any) => ({
        ...l,
        bizName: l.biz_name,
        roadAddress: l.road_address,
        nearestStation: l.nearest_station,
        stationDistance: l.station_distance,
      })),
    });

  } catch (error) {
    console.error('[GG Hospital API] 오류:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
