import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import proj4 from 'proj4';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import iconv from 'iconv-lite';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase URL or Key');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const CSV_FILE_PATH = 'D:\\Downloads\\서울시 의원 인허가 정보 (260615).csv';

// Proj4 definitions
const PROJ4_DEFS = {
  EPSG5174: '+proj=tmerc +lat_0=38 +lon_0=127.0028902777778 +k=1 +x_0=200000 +y_0=500000 +ellps=bessel +units=m +no_defs +towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43',
  WGS84: '+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs',
};

// Subway stations data
const SUBWAY_STATIONS = [
  { name: '강남', lat: 37.497175, lng: 127.027926, lines: ['2', 'S'] },
  { name: '역삼', lat: 37.500622, lng: 127.036456, lines: ['2'] },
  { name: '선릉', lat: 37.504503, lng: 127.049008, lines: ['2', 'K'] },
  { name: '삼성', lat: 37.508844, lng: 127.063214, lines: ['2'] },
  { name: '교대', lat: 37.493415, lng: 127.014626, lines: ['2', '3'] },
  { name: '잠실', lat: 37.513282, lng: 127.100150, lines: ['2', '8'] },
  { name: '성수', lat: 37.544580, lng: 127.055914, lines: ['2'] },
  { name: '건대입구', lat: 37.540372, lng: 127.070149, lines: ['2', '7'] },
  { name: '홍대입구', lat: 37.556823, lng: 126.923778, lines: ['2', 'A', 'K'] },
  { name: '신촌', lat: 37.555199, lng: 126.936664, lines: ['2'] },
  { name: '을지로입구', lat: 37.566014, lng: 126.982618, lines: ['2'] },
  { name: '시청', lat: 37.565712, lng: 126.977041, lines: ['1', '2'] },
  { name: '서울역', lat: 37.554648, lng: 126.972559, lines: ['1', '4', 'A', 'K'] },
  { name: '명동', lat: 37.560830, lng: 126.985797, lines: ['4'] },
  { name: '용산', lat: 37.529849, lng: 126.964561, lines: ['1', 'K'] },
  { name: '압구정', lat: 37.527072, lng: 127.028461, lines: ['3'] },
  { name: '신사', lat: 37.516334, lng: 127.020114, lines: ['3', 'S'] },
  { name: '양재', lat: 37.484147, lng: 127.034631, lines: ['3', 'S'] },
  { name: '고속터미널', lat: 37.504810, lng: 127.004943, lines: ['3', '7', '9'] },
  { name: '여의도', lat: 37.521569, lng: 126.924300, lines: ['5', '9'] },
  { name: '광화문', lat: 37.571026, lng: 126.976669, lines: ['5'] },
  { name: '공덕', lat: 37.543220, lng: 126.951576, lines: ['5', '6', 'A', 'K'] },
  { name: '청담', lat: 37.519365, lng: 127.053350, lines: ['7'] },
  { name: '논현', lat: 37.511093, lng: 127.021415, lines: ['7', 'S'] },
  { name: '신논현', lat: 37.504598, lng: 127.025060, lines: ['9', 'S'] },
  { name: '가산디지털단지', lat: 37.481072, lng: 126.882343, lines: ['1', '7'] },
  { name: '구로디지털단지', lat: 37.485266, lng: 126.901401, lines: ['2'] },
  { name: '종로3가', lat: 37.571607, lng: 126.991806, lines: ['1', '3', '5'] },
  { name: '동대문역사문화공원', lat: 37.565138, lng: 127.007896, lines: ['2', '4', '5'] },
  { name: '왕십리', lat: 37.561533, lng: 127.037732, lines: ['2', '5', 'K', 'B'] },
  { name: '사당', lat: 37.476530, lng: 126.981685, lines: ['2', '4'] },
  { name: '신림', lat: 37.484201, lng: 126.929715, lines: ['2', 'SLL'] },
  { name: '합정', lat: 37.549463, lng: 126.913739, lines: ['2', '6'] },
  { name: '이태원', lat: 37.534488, lng: 126.994302, lines: ['6'] },
];

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

async function processData() {
  const leads: any[] = [];

  const parser = fs.createReadStream(CSV_FILE_PATH)
    .pipe(iconv.decodeStream('euc-kr'))
    .pipe(parse({
      columns: true,
      skip_empty_lines: true,
    }));

  let count = 0;
  let insertedCount = 0;

  for await (const record of parser) {
    count++;
    if (record['영업상태명'] !== '영업/정상') continue;

    const x = parseFloat(record['좌표정보(X)']);
    const y = parseFloat(record['좌표정보(Y)']);
    let lat, lng;

    if (!isNaN(x) && !isNaN(y)) {
      try {
        const result = proj4(PROJ4_DEFS.EPSG5174, PROJ4_DEFS.WGS84, [x, y]);
        lng = result[0];
        lat = result[1];
      } catch (e) {
        // Ignored
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

    leads.push({
      biz_name: record['사업장명'],
      biz_id: record['관리번호'],
      license_date: record['인허가일자'] || null,
      road_address: record['도로명주소'] || null,
      lot_address: record['지번주소'] || null,
      coord_x: isNaN(x) ? null : x,
      coord_y: isNaN(y) ? null : y,
      latitude: lat || null,
      longitude: lng || null,
      phone: record['전화번호'] || null,
      medical_subject: record['진료과목내용명'] || record['업태구분명'] || null,
      nearest_station: nearestStation,
      station_distance: stationDistance,
      station_lines: stationLines,
      status: 'NEW',
    });

    if (leads.length >= 100) {
      const batch = leads.splice(0, 100);
      const { error } = await supabase.from('leads').insert(batch);
      if (error) {
        console.error('Error inserting batch', error);
      } else {
        insertedCount += batch.length;
        console.log(`Processed ${count} records, inserted ${insertedCount} leads...`);
      }
    }
  }

  if (leads.length > 0) {
    const { error } = await supabase.from('leads').insert(leads);
    if (error) {
      console.error('Error inserting final batch', error);
    } else {
      insertedCount += leads.length;
    }
  }

  console.log(`Finished processing ${count} records. Total inserted: ${insertedCount}`);
}

processData().catch(console.error);
