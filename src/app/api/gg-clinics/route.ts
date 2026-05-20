/**
 * 寃쎄린???곗씠???쒕┝ (data.gg.go.kr) API ?쒕쾭?ъ씠???쇱슦?? * ?섏썝 ?명뿀媛 ?곸꽭 ?꾪솴 ?곗씠??議고쉶 諛??숆린?? */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { findNearestStation } from '@/app/lead-manager/utils';
import { upsertLeadsByMgtNo } from '@/app/api/sync-utils';

const GG_CLINIC_API_KEY = process.env.GG_CLINIC_API_KEY || 'c9c5e32c0aff406bbe3de0f7af75f6f8';
const API_ENDPOINT = 'https://openapi.gg.go.kr/AsembyStus';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const pIndex = searchParams.get('pIndex') || '1';
  const pSize = searchParams.get('pSize') || '100';
  const sigunNm = searchParams.get('sigunNm');
  const sync = searchParams.get('sync') === 'true';
  const customApiKey = searchParams.get('apiKey');

  try {
    const activeApiKey = customApiKey || GG_CLINIC_API_KEY;
    if (!activeApiKey) {
      return NextResponse.json(
        { success: false, error: 'API ?ㅺ? ?ㅼ젙?섏? ?딆븯?듬땲??' },
        { status: 500 }
      );
    }

    const apiUrl = new URL(API_ENDPOINT);
    apiUrl.searchParams.set('KEY', activeApiKey);
    apiUrl.searchParams.set('Type', 'json');
    apiUrl.searchParams.set('pIndex', pIndex);
    apiUrl.searchParams.set('pSize', pSize);
    
    if (sigunNm) {
      apiUrl.searchParams.set('SIGUN_NM', sigunNm);
    }

    console.log(`[GG Clinic API] ?붿껌: pIndex=${pIndex}, pSize=${pSize}, sigunNm=${sigunNm || '?꾩껜'}, sync=${sync}`);

    const response = await fetch(apiUrl.toString());
    
    if (!response.ok) {
      throw new Error(`API ?묐떟 ?ㅻ쪟: ${response.status}`);
    }

    const data = await response.json();

    if (!data.AsembyStus) {
      const errorCode = data.RESULT?.CODE || 'UNKNOWN';
      const errorMsg = data.RESULT?.MESSAGE || '?곗씠?곕? 李얠쓣 ???놁뒿?덈떎.';
      
      return NextResponse.json({
        success: false,
        error: `[${errorCode}] ${errorMsg}`,
      });
    }

    const head = data.AsembyStus[0].head;
    const totalCount = head.find((h: any) => h.list_total_count)?.list_total_count || 0;
    const rows = data.AsembyStus[1].row || [];

    // 由щ뱶 ?뺤떇?쇰줈 留ㅽ븨
    const leads = rows.map((row: any) => {
      const lat = parseFloat(row.REFINE_WGS84_LAT);
      const lng = parseFloat(row.REFINE_WGS84_LOGT);
      const nearest = findNearestStation(lat, lng);

      return {
        biz_name: row.BIZPLC_NM,
        road_address: row.REFINE_ROADNM_ADDR || '',
        lot_address: row.REFINE_LOTNO_ADDR || '',
        phone: row.LOCPLC_FACLT_TELNO || '',
        medical_subject: row.TREAT_SBJECT_CONT_INFO || '?섏썝',
        service_name: row.BIZCOND_DIV_NM_INFO || '?섏썝',
        category: 'HEALTH',
        latitude: lat || null,
        longitude: lng || null,
        nearest_station: nearest ? nearest.station.name : null,
        station_lines: nearest ? nearest.station.lines : null,
        station_distance: nearest ? nearest.distance : null,
        status: 'NEW',
        operating_status: row.BSN_STATE_NM === '?뺤긽' ? '?곸뾽以? : '?먯뾽/?댁뾽',
        mgt_no: `GG_CLINIC_${row.BIZPLC_NM}_${row.REFINE_ZIP_CD || row.REFINE_ROADNM_ADDR}`.replace(/\s+/g, ''),
        region_code: '6410000', // 寃쎄린??      };
    });

    // DB ?숆린??    if (sync && leads.length > 0) {
      const supabase = await createClient();
      const dbLeads = leads.map(({ region_code, ...rest }: any) => rest);
      const { error: dbError } = await upsertLeadsByMgtNo(supabase, dbLeads);

      if (dbError) {
        console.error('[GG Clinic API] DB ????ㅻ쪟:', dbError);
        return NextResponse.json({
          success: false,
          error: `DB ????ㅽ뙣: ${dbError.message}`,
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
    console.error('[GG Clinic API] ?ㅻ쪟:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
