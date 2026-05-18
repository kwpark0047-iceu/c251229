/**
 * ?œìš¸ ?¤í”ˆ?°ì´??ê´‘ìž¥ (data.seoul.go.kr) API ?œë²„?¬ì´???¼ìš°?? * ?˜ì› ?¸í—ˆê°€ ?ì„¸ ?„í™© ?°ì´??ì¡°íšŒ ë°??™ê¸°?? */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { findNearestStation, convertGRS80ToWGS84 } from '@/app/lead-manager/utils';
import { upsertLeadsByMgtNo } from '@/app/api/sync-utils';

const SEOUL_DATA_API_KEY = process.env.SEOUL_DATA_CLINIC_API_KEY || process.env.SEOUL_DATA_API_KEY || '6d7a6b6c766b777033346b53716455';
const API_ENDPOINT = 'http://openapi.seoul.go.kr:8088';

export const dynamic = 'force-dynamic';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const pIndex = parseInt(searchParams.get('pIndex') || '1');
  const pSize = parseInt(searchParams.get('pSize') || '100');
  const sync = searchParams.get('sync') === 'true';

  try {
    if (!SEOUL_DATA_API_KEY) {
      return NextResponse.json(
        { success: false, error: '?œìš¸ ?°ì´??API ?¤ê? ?¤ì •?˜ì? ?Šì•˜?µë‹ˆ??' },
        { status: 500 }
      );
    }

    // ?œìš¸??API???œìž‘?¸ë±?¤ì? ì¢…ë£Œ?¸ë±?¤ë? ëª…ì‹œ?´ì•¼ ??(1-based)
    const startIndex = (pIndex - 1) * pSize + 1;
    const endIndex = pIndex * pSize;

    const apiUrl = `${API_ENDPOINT}/${SEOUL_DATA_API_KEY}/json/LOCALDATA_010102/${startIndex}/${endIndex}`;

    console.log(`[Seoul Clinic API] ?”ì²­: pIndex=${pIndex}, pSize=${pSize}, range=${startIndex}~${endIndex}, sync=${sync}`);

    const response = await fetch(apiUrl, {
      method: 'GET',
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`API ?‘ë‹µ ?¤ë¥˜: ${response.status}`);
    }

    const data = await response.json();

    if (!data.LOCALDATA_010102) {
      const errorCode = data.RESULT?.CODE || 'UNKNOWN';
      const errorMsg = data.RESULT?.MESSAGE || '?°ì´?°ë? ì°¾ì„ ???†ìŠµ?ˆë‹¤.';
      
      return NextResponse.json({
        success: false,
        error: `[${errorCode}] ${errorMsg}`,
      });
    }

    const totalCount = parseInt(data.LOCALDATA_010102.list_total_count) || 0;
    const rows = data.LOCALDATA_010102.row || [];

    // ë¦¬ë“œ ?•ì‹?¼ë¡œ ë§¤í•‘
    const leads = rows.map((row: any) => {
      const rawX = parseFloat(row.X);
      const rawY = parseFloat(row.Y);
      
      let lat = null;
      let lng = null;
      let nearest = null;

      if (!isNaN(rawX) && !isNaN(rawY) && rawX > 0 && rawY > 0) {
        const coord = convertGRS80ToWGS84(rawX, rawY);
        if (coord) {
          lat = coord.lat;
          lng = coord.lng;
          nearest = findNearestStation(lat, lng);
        }
      }

      return {
        biz_name: row.BPLCNM,
        road_address: row.RDNWHLADDR || row.SITEWHLADDR || '',
        lot_address: row.SITEWHLADDR || '',
        phone: row.SITETEL || '',
        medical_subject: row.MEDEXTRITEMSCNNM || row.UPTAENM || '?˜ì›',
        service_name: row.METRORGASSRNM || row.UPTAENM || '?˜ì›',
        category: 'HEALTH',
        latitude: lat,
        longitude: lng,
        nearest_station: nearest ? nearest.station.name : null,
        station_lines: nearest ? nearest.station.lines : null,
        station_distance: nearest ? nearest.distance : null,
        status: 'NEW',
        operating_status: row.TRDSTATENM === '?ì—…/?•ìƒ' || row.DTLSTATENM === '?ì—…ì¤? ? '?ì—…ì¤? : '?ì—…/?´ì—…',
        mgt_no: row.MGTNO || `SEOUL_CLINIC_${row.BPLCNM}_${row.RDNWHLADDR}`.replace(/\s+/g, ''),
        region_code: '1100000', // ?œìš¸?¹ë³„??      };
    });

    // DB ?™ê¸°??    if (sync && leads.length > 0) {
      const supabase = await createClient();
      // DB ?¤í‚¤ë§ˆì— region_code ì»¬ëŸ¼???†ìœ¼ë¯€ë¡??œì™¸
      const dbLeads = leads.map(({ region_code, ...rest }: any) => rest);
      
      const { error: dbError } = await upsertLeadsByMgtNo(supabase, dbLeads);

      if (dbError) {
        console.error('[Seoul Clinic API] DB ?€???¤ë¥˜:', dbError);
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
    console.error('[Seoul Clinic API] ?¤ë¥˜:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
