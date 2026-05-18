import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import proj4 from 'proj4';
import dotenv from 'dotenv';
import { SUBWAY_STATIONS } from '../src/lib/constants';

// Load environment variables
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Supabase credentials not found in .env.local!');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Define EPSG:2097 (TM Central Belt with Bessel ellipsoid) for coordinate translation
proj4.defs("EPSG:2097", "+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=500000 +ellps=bessel +units=m +no_defs +towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43");

function excelDateToJSDate(serial: any): string | null {
  if (!serial) return null;
  const num = parseFloat(serial);
  if (isNaN(num)) {
    // If it's already a formatted string, return it clean
    const str = String(serial).trim();
    if (str.includes('-')) return str;
    if (str.length === 8) {
      return `${str.slice(0, 4)}-${str.slice(4, 6)}-${str.slice(6, 8)}`;
    }
    return null;
  }
  
  const utc_days = Math.floor(num - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  
  const year = date_info.getFullYear();
  const month = String(date_info.getMonth() + 1).padStart(2, '0');
  const day = String(date_info.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

function getNearestStation(lat: number | null, lng: number | null, address: string) {
  // 1. Calculate using coordinates if available
  if (lat && lng) {
    let nearest = null;
    let minDistance = Infinity;

    for (const station of SUBWAY_STATIONS) {
      const dLat = (station.lat - lat) * 111; 
      const dLng = (station.lng - lng) * 88;
      const distance = Math.sqrt(dLat * dLat + dLng * dLng);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = station;
      }
    }

    // Within 2km
    if (minDistance <= 2.0) {
      return { station: nearest, distance: minDistance };
    }
  }

  // 2. Fallback to address name search
  if (address) {
    // Match station names (e.g. '강남역' or '강남')
    const matched = SUBWAY_STATIONS.find(s => address.includes(s.name + '역') || address.includes(s.name));
    if (matched) {
      return { station: matched, distance: 0 };
    }
  }

  return null;
}

async function main() {
  const filePath = 'D:\\Downloads\\서울시 의원 인허가 정보 (260514).csv';
  console.log('=== 의원 데이터 고성능 재임포트 시작 ===');
  console.log('Target file:', filePath);

  try {
    // 1. Delete corrupted leads
    console.log('기존 HEALTH 카테고리 불량 리드 삭제 중...');
    const { error: deleteError } = await supabase
      .from('leads')
      .delete()
      .eq('category', 'HEALTH');

    if (deleteError) {
      console.error('기존 데이터 삭제 에러:', deleteError.message);
      process.exit(1);
    }
    console.log('기존 데이터 삭제 완료.');

    // 2. Read CSV
    const buffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(buffer, { type: 'buffer', codepage: 949 });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as any[];

    console.log(`CSV 로드 완료. 총 레코드: ${rows.length}개`);

    const leadsToInsert: any[] = [];
    const seenMgtNos = new Set<string>();

    for (const row of rows) {
      const mgtNo = String(row['관리번호'] || '').trim();
      if (!mgtNo || seenMgtNos.has(mgtNo)) continue;

      const bizName = String(row['사업장명'] || '').trim();
      if (!bizName) continue;

      // Filter operating clinics only
      const operatingStatus = String(row['영업상태명'] || '').trim();
      const isOperating = operatingStatus && operatingStatus.includes('영업');
      if (!isOperating) continue;

      // Extract CORRECT columns
      const roadAddress = String(row['도로명주소'] || '').trim();
      const lotAddress = String(row['지번주소'] || '').trim();
      const phone = String(row['전화번호'] || '').trim();
      const detailedStatus = String(row['상세영업상태명'] || '').trim();
      const licenseDate = excelDateToJSDate(row['인허가일자']);
      const medicalSubject = String(row['진료과목내용명'] || row['진료과목내용'] || '의원').trim();

      // GPS Translation
      let latitude: number | null = null;
      let longitude: number | null = null;
      const cx = parseFloat(row['좌표정보(X)']);
      const cy = parseFloat(row['좌표정보(Y)']);

      if (!isNaN(cx) && !isNaN(cy) && cx > 0 && cy > 0) {
        try {
          const converted = proj4('EPSG:2097', 'WGS84', [cx, cy]);
          longitude = converted[0];
          latitude = converted[1];
        } catch (e) {
          // ignore
        }
      }

      // Calculate nearest station
      const matchResult = getNearestStation(latitude, longitude, roadAddress || lotAddress || bizName);

      leadsToInsert.push({
        mgt_no: mgtNo,
        biz_name: bizName,
        road_address: roadAddress,
        lot_address: lotAddress,
        phone: phone,
        license_date: licenseDate,
        operating_status: operatingStatus,
        detailed_status: detailedStatus,
        medical_subject: medicalSubject,
        category: 'HEALTH',
        service_id: '01_01_02_P',
        service_name: '의원',
        latitude: latitude,
        longitude: longitude,
        coord_x: cx || null,
        coord_y: cy || null,
        nearest_station: (matchResult && matchResult.station) ? matchResult.station.name : null,
        station_lines: (matchResult && matchResult.station) ? matchResult.station.lines : null,
        station_distance: matchResult ? Math.round(matchResult.distance * 1000) : 0, // distance in meters
        status: 'NEW'
      });

      seenMgtNos.add(mgtNo);
    }

    console.log(`유효한 영업 중인 데이터 필터링 완료: ${leadsToInsert.length}건`);

    // 3. Batch insert (500 items per batch)
    const BATCH_SIZE = 500;
    let successCount = 0;

    for (let i = 0; i < leadsToInsert.length; i += BATCH_SIZE) {
      const batch = leadsToInsert.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from('leads')
        .insert(batch);

      if (error) {
        console.warn(`\n[Batch ${i / BATCH_SIZE}] Bulk insert failed: ${error.message}. Retrying individually...`);
        for (const lead of batch) {
          const { error: singleError } = await supabase.from('leads').insert(lead);
          if (!singleError) {
            successCount++;
          }
        }
      } else {
        successCount += batch.length;
      }

      process.stdout.write(`\r진행률: ${successCount} / ${leadsToInsert.length} (${Math.round((successCount / leadsToInsert.length) * 100)}%) `);
    }

    console.log('\n=== 업로드/동기화 최종 완료 ===');
    console.log(`성공적으로 복구 완료: ${successCount}건`);

  } catch (error: any) {
    console.error('오류 발생:', error.message);
  }
}

main();
