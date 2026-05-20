/** API Route */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { findNearestStation, convertGRS80ToWGS84 } from '@/app/lead-manager/utils';
import { upsertLeadsByMgtNo } from '@/app/api/sync-utils';

const SEOUL_DATA_API_KEY = process.env.SEOUL_DATA_CLINIC_API_KEY || process.env.SEOUL_DATA_API_KEY || '6d7a6b6c766b777033346b53716455';
const API_ENDPOINT = 'http://openapi.seoul.go.kr:8088';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const pIndex = parseInt(searchParams.get('pIndex') || '1');
  const pSize = parseInt(searchParams.get('pSize') || '100');
  const sync = searchParams.get('sync') === 'true';

  try {
    if (!SEOUL_DATA_API_KEY) {
      return NextResponse.json(
        { success: false, error: '?쒖슱 ?곗씠??API ?ㅺ? ?ㅼ젙?섏? ?딆븯?듬땲??' },
        { status: 500 }
      );
    }

    // ?쒖슱??API???쒖옉?몃뜳?ㅼ? 醫낅즺?몃뜳?ㅻ? 紐낆떆?댁빞 ??(1-based)
    const startIndex = (pIndex - 1) * pSize + 1;
    const endIndex = pIndex * pSize;

    const apiUrl = `${API_ENDPOINT}/${SEOUL_DATA_API_KEY}/json/LOCALDATA_010102/${startIndex}/${endIndex}`;

    console.log(`[Seoul Clinic API] ?붿껌: pIndex=${pIndex}, pSize=${pSize}, range=${startIndex}~${endIndex}, sync=${sync}`);

    const response = await fetch(apiUrl, {
      method: 'GET',
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`API ?묐떟 ?ㅻ쪟: ${response.status}`);
    }

    const data = await response.json();

    if (!data.LOCALDATA_010102) {
      const errorCode = data.RESULT?.CODE || 'UNKNOWN';
      const errorMsg = data.RESULT?.MESSAGE || '?곗씠?곕? 李얠쓣 ???놁뒿?덈떎.';
      
      return NextResponse.json({
        success: false,
        error: `[${errorCode}] ${errorMsg}`,
      });
    }

    const totalCount = parseInt(data.LOCALDATA_010102.list_total_count) || 0;
    const rows = data.LOCALDATA_010102.row || [];

    // 由щ뱶 ?뺤떇?쇰줈 留ㅽ븨
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
        medical_subject: '의원',
        service_name: '의원',
        category: 'HEALTH',
        latitude: lat,
        longitude: lng,
        nearest_station: nearest ? nearest.station.name : null,
        station_lines: nearest ? nearest.station.lines : null,
        station_distance: nearest ? nearest.distance : null,
        status: 'NEW',
        operating_status: '영업중',
        mgt_no: row.MGTNO || `SEOUL_CLINIC_${row.BPLCNM}_${row.RDNWHLADDR}`.replace(/\s+/g, ''),
        region_code: '1100000',
      };
    });

    // DB
    if (sync && leads.length > 0) {
      const supabase = await createClient();
      // DB ?ㅽ궎留덉뿉 region_code 而щ읆???놁쑝誘�濡??쒖쇅
      const dbLeads = leads.map(({ region_code, ...rest }: any) => rest);
      
      const { error: dbError } = await upsertLeadsByMgtNo(supabase, dbLeads);

      if (dbError) {
        console.error('[Seoul Clinic API] DB ?�???ㅻ쪟:', dbError);
        return NextResponse.json({
          success: false,
          error: `DB ?�???ㅽ뙣: ${dbError.message}`,
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
    console.error('[Seoul Clinic API] ?ㅻ쪟:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
