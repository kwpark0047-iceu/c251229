/**
 * ê²½ê¸°???°ì´???œë¦¼ (data.gg.go.kr) API ?œë²„?¬ì´???¼ìš°?? * ?„ë¬¸ ë°??€?™êµ ?„í™© ?°ì´??ì¡°íšŒ ë°??™ê¸°?? */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { findNearestStation } from '@/app/lead-manager/utils';
import { upsertLeadsByMgtNo } from '@/app/api/sync-utils';

const GG_UNIV_API_KEY = process.env.GG_UNIV_API_KEY || '8d6df268ee064aa6bfc808742aada7d5';
const API_ENDPOINT = 'https://openapi.gg.go.kr/Jnclluniv';

export const dynamic = 'force-dynamic';

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
        { success: false, error: 'API ?¤ê? ?¤ì •?˜ì? ?Šì•˜?µë‹ˆ??' },
        { status: 500 }
      );
    }

    const apiUrl = new URL(API_ENDPOINT);
    apiUrl.searchParams.set('KEY', activeApiKey);
    apiUrl.searchParams.set('Type', 'json');
    apiUrl.searchParams.set('pIndex', pIndex);
    apiUrl.searchParams.set('pSize', pSize);

    console.log(`[GG Univ API] ?”ì²­: pIndex=${pIndex}, pSize=${pSize}, sync=${sync}`);

    const response = await fetch(apiUrl.toString());
    
    if (!response.ok) {
      throw new Error(`API ?‘ë‹µ ?¤ë¥˜: ${response.status}`);
    }

    const data = await response.json();

    if (!data.Jnclluniv) {
      const errorCode = data.RESULT?.CODE || 'UNKNOWN';
      const errorMsg = data.RESULT?.MESSAGE || '?°ì´?°ë? ì°¾ì„ ???†ìŠµ?ˆë‹¤.';
      
      return NextResponse.json({
        success: false,
        error: `[${errorCode}] ${errorMsg}`,
      });
    }

    const head = data.Jnclluniv[0].head;
    const totalCount = head.find((h: any) => h.list_total_count)?.list_total_count || 0;
    const rows = data.Jnclluniv[1].row || [];

    // ë¦¬ë“œ ?•ì‹?¼ë¡œ ë§¤í•‘
    const leads = rows.map((row: any) => {
      const lat = parseFloat(row.REFINE_WGS84_LAT);
      const lng = parseFloat(row.REFINE_WGS84_LOGT);
      const nearest = findNearestStation(lat, lng);

      return {
        biz_name: row.FACLT_NM,
        road_address: row.REFINE_ROADNM_ADDR || '',
        lot_address: row.REFINE_LOTNO_ADDR || '',
        phone: '', // API?ì„œ ?œê³µ?˜ì? ?ŠìŒ
        medical_subject: row.SCHOOL_DIV_NM || '?€?™êµ',
        service_name: row.PLVTINST_DIV_NM || '?€?™êµ',
        category: 'EDUCATION',
        latitude: lat || null,
        longitude: lng || null,
        nearest_station: nearest ? nearest.station.name : null,
        station_lines: nearest ? nearest.station.lines : null,
        station_distance: nearest ? nearest.distance : null,
        status: 'NEW',
        operating_status: '?ì—…ì¤?,
        mgt_no: `GG_UNIV_${row.FACLT_NM}_${row.REFINE_ZIP_CD || row.REFINE_ROADNM_ADDR}`.replace(/\s+/g, ''),
        region_code: '6410000', // ê²½ê¸°??      };
    });

    // DB ?™ê¸°??    if (sync && leads.length > 0) {
      const supabase = await createClient();
      const dbLeads = leads.map(({ region_code, ...rest }: any) => rest);
      const { error: dbError } = await upsertLeadsByMgtNo(supabase, dbLeads);

      if (dbError) {
        console.error('[GG Univ API] DB ?€???¤ë¥˜:', dbError);
        return NextResponse.json({
          success: false,
          error: `DB ?€???¤íŒ¨: ${dbError.message}`,
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
    console.error('[GG Univ API] ?¤ë¥˜:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
