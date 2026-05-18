/**
 * 경기도 데이터 드림 (data.gg.go.kr) API 서버사이드 라우트
 * 전문 및 대학교 현황 데이터 조회 및 동기화
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { findNearestStation } from '@/app/lead-manager/utils';
import { upsertLeadsByMgtNo } from '@/app/api/sync-utils';

const GG_UNIV_API_KEY = process.env.GG_UNIV_API_KEY || '8d6df268ee064aa6bfc808742aada7d5';
const API_ENDPOINT = 'https://openapi.gg.go.kr/Jnclluniv';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const pIndex = searchParams.get('pIndex') || '1';
  const pSize = searchParams.get('pSize') || '100';
  const sync = searchParams.get('sync') === 'true';
  const customApiKey = searchParams.get('apiKey');

  try {
    const activeApiKey = customApiKey || GG_UNIV_API_KEY;
    if (!activeApiKey) {
      return NextResponse.json(
        { success: false, error: 'API 키가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    const apiUrl = new URL(API_ENDPOINT);
    apiUrl.searchParams.set('KEY', activeApiKey);
    apiUrl.searchParams.set('Type', 'json');
    apiUrl.searchParams.set('pIndex', pIndex);
    apiUrl.searchParams.set('pSize', pSize);

    console.log(`[GG Univ API] 요청: pIndex=${pIndex}, pSize=${pSize}, sync=${sync}`);

    const response = await fetch(apiUrl.toString());
    
    if (!response.ok) {
      throw new Error(`API 응답 오류: ${response.status}`);
    }

    const data = await response.json();

    if (!data.Jnclluniv) {
      const errorCode = data.RESULT?.CODE || 'UNKNOWN';
      const errorMsg = data.RESULT?.MESSAGE || '데이터를 찾을 수 없습니다.';
      
      return NextResponse.json({
        success: false,
        error: `[${errorCode}] ${errorMsg}`,
      });
    }

    const head = data.Jnclluniv[0].head;
    const totalCount = head.find((h: any) => h.list_total_count)?.list_total_count || 0;
    const rows = data.Jnclluniv[1].row || [];

    // 리드 형식으로 매핑
    const leads = rows.map((row: any) => {
      const lat = parseFloat(row.REFINE_WGS84_LAT);
      const lng = parseFloat(row.REFINE_WGS84_LOGT);
      const nearest = findNearestStation(lat, lng);

      return {
        biz_name: row.FACLT_NM,
        road_address: row.REFINE_ROADNM_ADDR || '',
        lot_address: row.REFINE_LOTNO_ADDR || '',
        phone: '', // API에서 제공하지 않음
        medical_subject: row.SCHOOL_DIV_NM || '대학교',
        service_name: row.PLVTINST_DIV_NM || '대학교',
        category: 'EDUCATION',
        latitude: lat || null,
        longitude: lng || null,
        nearest_station: nearest ? nearest.station.name : null,
        station_lines: nearest ? nearest.station.lines : null,
        station_distance: nearest ? nearest.distance : null,
        status: 'NEW',
        operating_status: '영업중',
        mgt_no: `GG_UNIV_${row.FACLT_NM}_${row.REFINE_ZIP_CD || row.REFINE_ROADNM_ADDR}`.replace(/\s+/g, ''),
        region_code: '6410000', // 경기도
      };
    });

    // DB 동기화
    if (sync && leads.length > 0) {
      const supabase = await createClient();
      const dbLeads = leads.map(({ region_code, ...rest }: any) => rest);
      const { error: dbError } = await upsertLeadsByMgtNo(supabase, dbLeads);

      if (dbError) {
        console.error('[GG Univ API] DB 저장 오류:', dbError);
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
    console.error('[GG Univ API] 오류:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
