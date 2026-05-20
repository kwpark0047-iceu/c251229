/** API Route */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { findNearestStation } from '@/app/lead-manager/utils';
import { upsertLeadsByMgtNo } from '@/app/api/sync-utils';

const GG_DATA_API_KEY = process.env.GG_DATA_API_KEY || 'e9efa0682eef460cb25cefcc42c52484';
const API_ENDPOINT = 'https://openapi.gg.go.kr/TninsttInstutM';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const pIndex = searchParams.get('pIndex') || '1';
  const pSize = searchParams.get('pSize') || '100';
  const sigunNm = searchParams.get('sigunNm'); // ?쒓뎔紐??꾪꽣 (?듭뀡)
  const sync = searchParams.get('sync') === 'true'; // DB ?숆린???щ?
  const customApiKey = searchParams.get('apiKey');

  try {
    const activeApiKey = customApiKey || GG_DATA_API_KEY;
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

    console.log(`[GG Data API] ?붿껌: pIndex=${pIndex}, pSize=${pSize}, sigunNm=${sigunNm || '?꾩껜'}, sync=${sync}`);

    const response = await fetch(apiUrl.toString());
    
    if (!response.ok) {
      throw new Error(`API ?묐떟 ?ㅻ쪟: ${response.status}`);
    }

    const data = await response.json();

    if (!data.TninsttInstutM) {
      const errorCode = data.RESULT?.CODE || 'UNKNOWN';
      const errorMsg = data.RESULT?.MESSAGE || '?곗씠?곕? 李얠쓣 ???놁뒿?덈떎.';
      
      return NextResponse.json({
        success: false,
        error: `[${errorCode}] ${errorMsg}`,
      });
    }

    const head = data.TninsttInstutM[0].head;
    const totalCount = head.find((h: any) => h.list_total_count)?.list_total_count || 0;
    const rows = data.TninsttInstutM[1].row || [];

    // 由щ뱶 ?뺤떇?쇰줈 留ㅽ븨
    const leads = rows.map((row: any) => {
      const lat = parseFloat(row.REFINE_WGS84_LAT);
      const lng = parseFloat(row.REFINE_WGS84_LOGT);
      const nearest = findNearestStation(lat, lng);

      return {
        biz_name: row.FACLT_NM,
        road_address: row.REFINE_ROADNM_ADDR || '',
        lot_address: row.REFINE_LOTNO_ADDR || '',
        phone: row.TELNO || '',
        medical_subject: '의원',
        service_name: '의원',
        latitude: lat || null,
        longitude: lng || null,
        nearest_station: nearest ? nearest.station.name : null,
        station_lines: nearest ? nearest.station.lines : null,
        station_distance: nearest ? nearest.distance : null,
        status: 'NEW',
        operating_status: '영업중',
        mgt_no: `GG_${row.FACLT_NM}_${row.REFINE_ZIPNO || row.REFINE_ROADNM_ADDR}`.replace(/\s+/g, ''),
        region_code: '6410000',
      };
    });

    // DB
    if (sync && leads.length > 0) {
      const supabase = await createClient();
      const dbLeads = leads.map(({ region_code, ...rest }: any) => rest);
      const { error: dbError } = await upsertLeadsByMgtNo(supabase, dbLeads);

      if (dbError) {
        console.error('[GG Data API] DB ?�???ㅻ쪟:', dbError);
        return NextResponse.json({
          success: false,
          error: `DB ?�???ㅽ뙣: ${dbError.message}`,
        });
      }
      
      console.log(`[GG Data API] ${leads.length}嫄??숆린???꾨즺`);
    }

    return NextResponse.json({
      success: true,
      totalCount,
      leads: leads.map((l: any) => ({
        ...l,
        bizName: l.biz_name, // ?섏쐞 ?명솚?깆쓣 ?꾪빐 camelCase ?꾨뱶 異붽?
        roadAddress: l.road_address,
        nearestStation: l.nearest_station,
        stationDistance: l.station_distance,
      })),
    });

  } catch (error) {
    console.error('[GG Data API] ?ㅻ쪟:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

