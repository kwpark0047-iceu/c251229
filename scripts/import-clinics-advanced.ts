import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import proj4 from 'proj4';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import iconv from 'iconv-lite';
import { SUBWAY_STATIONS } from '../src/lib/constants';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase URL or Key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const CSV_FILE_PATH = 'D:\\Downloads\\서울시 의원 인허가 정보 (2607101).csv';

// Proj4 definitions (LocalData usually uses EPSG:5174 or EPSG:5181)
const PROJ4_DEFS = {
  EPSG5174: '+proj=tmerc +lat_0=38 +lon_0=127.0028902777778 +k=1 +x_0=200000 +y_0=500000 +ellps=bessel +units=m +no_defs +towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43',
  EPSG5181: '+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=500000 +ellps=GRS80 +units=m +no_defs',
  WGS84: '+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs',
};

function convertToWGS84(x: number, y: number): { lat: number, lng: number } | null {
  try {
    // Try EPSG:5181 first
    if (x > 100000 && x < 400000 && y > 300000 && y < 600000) {
      const result = proj4(PROJ4_DEFS.EPSG5181, PROJ4_DEFS.WGS84, [x, y]);
      return { lat: result[1], lng: result[0] };
    }
  } catch (e) {
    // Fallback to EPSG:5174
    try {
      const result = proj4(PROJ4_DEFS.EPSG5174, PROJ4_DEFS.WGS84, [x, y]);
      return { lat: result[1], lng: result[0] };
    } catch (err) {
      return null;
    }
  }
  return null;
}

function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c * 1000; // in meters
}

function findNearestStation(lat: number, lng: number) {
  let nearest = null;
  let minDistance = Infinity;

  for (const station of SUBWAY_STATIONS) {
    const distance = getDistance(lat, lng, station.lat, station.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = station;
    }
  }

  return nearest ? {
    station: nearest,
    distance: Math.round(minDistance)
  } : null;
}

async function upsertLeadsByMgtNo(batch: any[]) {
  if (!batch || batch.length === 0) return { error: null };
  const mgtNos = batch.map(l => l.mgt_no).filter(Boolean);
  
  try {
    const { data: existingLeads, error: fetchError } = await supabase
      .from('leads')
      .select('id, mgt_no')
      .in('mgt_no', mgtNos);
      
    if (fetchError) throw fetchError;
    
    const existingMap = new Map(existingLeads?.map(e => [e.mgt_no, e.id]) || []);
    
    const toInsert = [];
    const updatePromises = [];
    
    for (const lead of batch) {
      const existingId = existingMap.get(lead.mgt_no);
      if (existingId) {
        updatePromises.push(supabase.from('leads').update(lead).eq('id', existingId));
      } else {
        toInsert.push(lead);
      }
    }
    
    if (updatePromises.length > 0) {
      await Promise.all(updatePromises);
    }
    
    if (toInsert.length > 0) {
      const { error } = await supabase.from('leads').insert(toInsert);
      if (error) throw error;
    }
    return { error: null };
  } catch (err: any) {
    return { error: err };
  }
}

async function processData() {
  const leads: any[] = [];

  console.log(`Reading CSV from ${CSV_FILE_PATH}...`);
  if (!fs.existsSync(CSV_FILE_PATH)) {
    console.error(`File not found: ${CSV_FILE_PATH}`);
    process.exit(1);
  }

  const parser = fs.createReadStream(CSV_FILE_PATH)
    .pipe(iconv.decodeStream('euc-kr'))
    .pipe(parse({
      columns: true,
      skip_empty_lines: true,
    }));

  let count = 0;
  let insertedOrUpdatedCount = 0;
  let failedCount = 0;

  for await (const record of parser) {
    count++;
    if (record['영업상태명'] !== '영업/정상' && record['영업상태명'] !== '영업중') {
      continue;
    }

    const x = parseFloat(record['좌표정보(x)'] || record['좌표정보(X)']);
    const y = parseFloat(record['좌표정보(y)'] || record['좌표정보(Y)']);
    let lat = null, lng = null;

    if (!isNaN(x) && !isNaN(y) && x > 0 && y > 0) {
      const coords = convertToWGS84(x, y);
      if (coords) {
        lat = coords.lat;
        lng = coords.lng;
      }
    }

    let nearestStation = null;
    let stationDistance = null;
    let stationLines = null;

    if (lat && lng) {
      const nearest = findNearestStation(lat, lng);
      if (nearest) {
        nearestStation = nearest.station.name;
        stationDistance = nearest.distance;
        stationLines = nearest.station.lines;
      }
    }
    
    const mgtNo = record['관리번호'] || `SEOUL_CLINIC_${record['사업장명']}_${record['도로명주소'] || record['지번주소']}`.replace(/\s+/g, '');

    leads.push({
      biz_name: record['사업장명'],
      biz_id: record['개방서비스아이디'] || null,
      license_date: record['인허가일자'] || null,
      road_address: record['도로명전체주소'] || record['도로명주소'] || '',
      lot_address: record['소재지전체주소'] || record['지번주소'] || '',
      coord_x: isNaN(x) ? null : x,
      coord_y: isNaN(y) ? null : y,
      latitude: lat,
      longitude: lng,
      phone: record['소재지전화'] || record['전화번호'] || '',
      medical_subject: record['진료과목내용명'] || record['업태구분명'] || record['의료기관종별명'] || '의원',
      service_name: record['업태구분명'] || record['의료기관종별명'] || '의원',
      category: 'HEALTH',
      operating_status: '영업중',
      nearest_station: nearestStation,
      station_distance: stationDistance,
      station_lines: stationLines,
      status: 'NEW',
      mgt_no: mgtNo,
    });

    if (leads.length >= 100) {
      const batch = leads.splice(0, 100);
      const { error } = await upsertLeadsByMgtNo(batch);
      if (error) {
        console.error('Error upserting batch:', error.message || error);
        failedCount += batch.length;
      } else {
        insertedOrUpdatedCount += batch.length;
        console.log(`Processed ${count} records, upserted ${insertedOrUpdatedCount} active leads...`);
      }
    }
  }

  if (leads.length > 0) {
    const { error } = await upsertLeadsByMgtNo(leads);
    if (error) {
      console.error('Error upserting final batch:', error.message || error);
      failedCount += leads.length;
    } else {
      insertedOrUpdatedCount += leads.length;
    }
  }

  console.log(`Finished processing CSV. Total records parsed: ${count}`);
  console.log(`Total active clinics upserted: ${insertedOrUpdatedCount}`);
  if (failedCount > 0) {
    console.error(`Total failed: ${failedCount}`);
  }
}

processData().catch(console.error);
