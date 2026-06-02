import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import iconv from 'iconv-lite';
import { parse } from 'csv-parse/sync';
import { saveLeads, checkExistingLeadsByMgtNo } from '../../lead-manager/supabase-service';
import { Lead } from '../../lead-manager/types';
import { convertGRS80ToWGS84 } from '../../lead-manager/utils';
import { findNearestStation } from '../../lead-manager/utils';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for Vercel

export async function GET(request: Request) {
  try {
    const csvPath = path.join(process.cwd(), 'seoul_clinic_data.csv');
    if (!fs.existsSync(csvPath)) {
      return NextResponse.json({ success: false, message: 'CSV file not found at ' + csvPath }, { status: 404 });
    }

    const buffer = fs.readFileSync(csvPath);
    const decoded = iconv.decode(buffer, 'euc-kr');
    
    // Parse CSV
    const records: any[] = parse(decoded, { columns: true, skip_empty_lines: true, trim: true });

    console.log(`Parsed ${records.length} records from CSV.`);
    
    const leads: Lead[] = [];
    
    for (const record of records) {
      // Filter logic: Only active ones (영업/정상 or 영업중)
      if (record['영업상태명'] !== '영업/정상' && record['상세영업상태명'] !== '영업중') {
        continue;
      }
      
      const mgtNo = record['관리번호'];
      if (!mgtNo) continue;
      
      const x = parseFloat(record['좌표정보(X)']);
      const y = parseFloat(record['좌표정보(Y)']);
      
      let lat = 0, lng = 0;
      let nearestStation = '', nearestExitNo = '', distance = 0;
      let stationLines: string[] = [];
      
      if (!isNaN(x) && !isNaN(y) && x > 0 && y > 0) {
        const coords = convertGRS80ToWGS84(x, y);
        if (coords) {
          lat = coords.lat;
          lng = coords.lng;
          
          const address = record['도로명주소'] || record['지번주소'];
          const stationInfo = findNearestStation(lat, lng, address);
          if (stationInfo) {
            nearestStation = stationInfo.station.name;
            stationLines = stationInfo.station.lines || [];
            nearestExitNo = ''; // SubWayStation에 nearestExit 속성이 없으므로 임시로 빈 문자열 처리
            distance = stationInfo.distance;
          }
        }
      }
      
      const lead: Lead = {
        id: crypto.randomUUID(),
        bizName: record['사업장명'] || '',
        licenseDate: record['인허가일자'] || '',
        roadAddress: record['도로명주소'] || '',
        lotAddress: record['지번주소'] || '',
        phone: record['전화번호'] || '',
        medicalSubject: record['진료과목내용명'] || record['업태구분명'] || '',
        coordX: !isNaN(x) ? x : undefined,
        coordY: !isNaN(y) ? y : undefined,
        latitude: lat || undefined,
        longitude: lng || undefined,
        nearestStation: nearestStation || undefined,
        stationLines: stationLines.length > 0 ? stationLines : undefined,
        nearestExitNo: nearestExitNo || undefined,
        stationDistance: distance || undefined,
        category: 'HEALTH', // Fixed for clinics
        mgtNo: mgtNo,
        operatingStatus: record['영업상태명'] || '',
        detailedStatus: record['상세영업상태명'] || '',
        status: 'NEW'
      };
      
      leads.push(lead);
    }
    
    console.log(`Filtered to ${leads.length} active leads. Starting save...`);
    
    // Process in smaller batches to avoid overwhelming the system
    const batchSize = 1000;
    let totalSaved = 0;
    
    // get an organization_id if needed? We will just use null to let saveLeads determine it,
    // or we fetch the first user's org. Since it's a server endpoint without auth context, saveLeads might fail if orgId is required.
    // Wait, saveLeads uses `getOrganizationId()` which relies on supabase auth.
    // If we call this from browser while logged in, maybe we should pass it.
    // For GET request without cookies in curl, it will fail.
    // But we will fetch from browser window!
    
    // We will return the payload and let the client process it, OR we just do it here if we can bypass org.
    // Let's do it here, but pass a specific orgId if provided, or bypass.
    // Wait, actually, let's just make it a client component button or something.
    // No, doing it here is fine.
    
    return NextResponse.json({ 
      success: true, 
      count: leads.length,
      data: leads
    });
    
  } catch (error: any) {
    console.error('Import Error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
