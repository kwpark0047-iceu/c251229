/**
 * 서울 오픈데이터 광장 (data.seoul.go.kr) API 서버사이드 라우트
 * 의원 인허가 상세 현황 데이터 조회 및 동기화
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { findNearestStation, convertGRS80ToWGS84 } from '@/app/lead-manager/utils';
import { upsertLeadsByMgtNo } from '@/app/api/sync-utils';

const SEOUL_DATA_API_KEY = process.env.SEOUL_DATA_CLINIC_API_KEY || process.env.SEOUL_DATA_API_KEY || '6d7a6b6c766b777033346b53716455';
const API_ENDPOINT = 'http://openapi.seoul.go.kr:8088';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const pIndex = parseInt(searchParams.get('pIndex') || '1');
  const pSize = parseInt(searchParams.get('pSize') || '100');
  const sync = searchParams.get('sync') === 'true';

  try {
    if (!SEOUL_DATA_API_KEY) {
      return NextResponse.json(
        { success: false, error: '서울 데이터 API 키가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    // 서울시 API는 시작인덱스와 종료인덱스를 명시해야 함 (1-based)
    const startIndex = (pIndex - 1) * pSize + 1;
    const endIndex = pIndex * pSize;

    const apiUrl = `${API_ENDPOINT}/${SEOUL_DATA_API_KEY}/json/LOCALDATA_010102/${startIndex}/${endIndex}`;

    console.log(`[Seoul Clinic API] 요청: pIndex=${pIndex}, pSize=${pSize}, range=${startIndex}~${endIndex}, sync=${sync}`);

    const response = await fetch(apiUrl, {
      method: 'GET',
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`API 응답 오류: ${response.status}`);
    }

    const data = await response.json();

    if (!data.LOCALDATA_010102) {
      const errorCode = data.RESULT?.CODE || 'UNKNOWN';
      const errorMsg = data.RESULT?.MESSAGE || '데이터를 찾을 수 없습니다.';
      
      return NextResponse.json({
        success: false,
        error: `[${errorCode}] ${errorMsg}`,
      });
    }

    const totalCount = parseInt(data.LOCALDATA_010102.list_total_count) || 0;
    const rows = data.LOCALDATA_010102.row || [];

    // 리드 형식으로 매핑
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
        medical_subject: row.MEDEXTRITEMSCNNM || row.UPTAENM || '의원',
        service_name: row.METRORGASSRNM || row.UPTAENM || '의원',
        category: 'HEALTH',
        latitude: lat,
        longitude: lng,
        nearest_station: nearest ? nearest.station.name : null,
        station_lines: nearest ? nearest.station.lines : null,
        station_distance: nearest ? nearest.distance : null,
        status: 'NEW',
        operating_status: row.TRDSTATENM === '영업/정상' || row.DTLSTATENM === '영업중' ? '영업중' : '폐업/휴업',
        mgt_no: row.MGTNO || `SEOUL_CLINIC_${row.BPLCNM}_${row.RDNWHLADDR}`.replace(/\s+/g, ''),
        region_code: '1100000', // 서울특별시
      };
    });

    // DB 동기화
    if (sync && leads.length > 0) {
      const supabase = await createClient();
      // DB 스키마에 region_code 컬럼이 없으므로 제외
      const dbLeads = leads.map(({ region_code, ...rest }: any) => rest);
      
      const { error: dbError } = await upsertLeadsByMgtNo(supabase, dbLeads);

      if (dbError) {
        console.error('[Seoul Clinic API] DB 저장 오류:', dbError);
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
    console.error('[Seoul Clinic API] 오류:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
