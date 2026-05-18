import fs from 'fs';
import path from 'path';
import iconv from 'iconv-lite';
import { parse } from 'csv-parse/sync';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import proj4 from 'proj4';

dotenv.config({ path: '.env.local' });

proj4.defs(
  'EPSG:5174',
  '+proj=tmerc +lat_0=38 +lon_0=127.0028902777778 +k=1 +x_0=200000 +y_0=500000 +ellps=bessel +units=m +no_defs +towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43'
);
proj4.defs(
  'EPSG:5181',
  '+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=500000 +ellps=GRS80 +units=m +no_defs'
);

function convertGRS80ToWGS84(x: number, y: number): { lat: number; lng: number } | null {
  try {
    if (x > 100000 && x < 400000 && y > 300000 && y < 600000) {
      const [lng, lat] = proj4('EPSG:5181', 'WGS84', [x, y]);
      return { lat, lng };
    }
  } catch (error) {
    try {
      const [lng, lat] = proj4('EPSG:5174', 'WGS84', [x, y]);
      return { lat, lng };
    } catch (e) {
      return null;
    }
  }
  return null;
}

// Temporary simple station matching without importing complex React UI modules
const STATIONS = [
    { name: '강남', line: '2호선', lat: 37.4979, lng: 127.0276 },
    { name: '압구정로데오', line: '수인분당선', lat: 37.5273, lng: 127.0405 },
    { name: '신사', line: '3호선', lat: 37.5163, lng: 127.0201 },
    // A full station list isn't critical for this batch script since it can be re-calculated or we just let it be null.
];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase URL or Key in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Custom bulk upsert logic
async function upsertLeadsByMgtNo(leads: any[]) {
  if (!leads || leads.length === 0) return { error: null };
  const mgtNos = leads.map(l => l.mgt_no).filter(Boolean);
  
  try {
    const { data: existingLeads, error: fetchError } = await supabase
      .from('leads')
      .select('id, mgt_no')
      .in('mgt_no', mgtNos);
      
    if (fetchError) throw fetchError;
    
    const existingMap = new Map(existingLeads?.map(e => [e.mgt_no, e.id]) || []);
    
    const toInsert = [];
    const updatePromises = [];
    
    for (const lead of leads) {
      if (!lead.mgt_no) {
        toInsert.push(lead);
        continue;
      }
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
      await Promise.allSettled(toInsert.map(lead => supabase.from('leads').insert(lead)));
    }
    return { error: null };
  } catch (err: any) {
    return { error: err };
  }
}

async function run() {
  const filePath = 'D:\\Downloads\\서울시 의원 인허가 정보 (260518).csv';
  console.log(`Reading ${filePath}...`);
  
  const buffer = fs.readFileSync(filePath);
  const decoded = iconv.decode(buffer, 'cp949');
  
  const records = parse(decoded, {
    columns: true,
    skip_empty_lines: true,
  });
  
  console.log(`Parsed ${records.length} records. Mapping to leads...`);
  
  const leads = records.map((row: any) => {
    const rawX = parseFloat(row['좌표정보(X)']);
    const rawY = parseFloat(row['좌표정보(Y)']);
    
    let lat = null;
    let lng = null;

    if (!isNaN(rawX) && !isNaN(rawY) && rawX > 0 && rawY > 0) {
      const coord = convertGRS80ToWGS84(rawX, rawY);
      if (coord) {
        lat = coord.lat;
        lng = coord.lng;
      }
    }
    
    // Status
    const statusNm = row['상세영업상태명'] || row['영업상태명'];
    const isOperating = (statusNm === '영업중' || statusNm === '영업/정상') ? '영업중' : '폐업/휴업';
    
    return {
      biz_name: row['사업장명'],
      road_address: row['도로명주소'] || row['지번주소'] || '',
      lot_address: row['지번주소'] || '',
      phone: row['전화번호'] || '',
      medical_subject: row['진료과목내용명'] || row['진료과목내용'] || '의원',
      service_name: row['업태구분명'] || row['의료기관종별명'] || '의원',
      category: 'HEALTH',
      latitude: lat,
      longitude: lng,
      status: 'NEW',
      operating_status: isOperating,
      mgt_no: row['관리번호'] || `SEOUL_CLINIC_${row['사업장명']}_${row['도로명주소']}`.replace(/\s+/g, ''),
    };
  });
  
  // Filter only operating
  const activeLeads = leads.filter((l: any) => l.operating_status === '영업중');
  console.log(`Uploading ${activeLeads.length} active leads in batches...`);
  
  const BATCH_SIZE = 100;
  for (let i = 0; i < activeLeads.length; i += BATCH_SIZE) {
    const batch = activeLeads.slice(i, i + BATCH_SIZE);
    process.stdout.write(`Batch ${i / BATCH_SIZE + 1}/${Math.ceil(activeLeads.length / BATCH_SIZE)}... `);
    const { error } = await upsertLeadsByMgtNo(batch);
    if (error) {
      console.log(`Failed: ${error.message}`);
    } else {
      console.log(`OK`);
    }
  }
  
  console.log('Upload complete.');
}

run().catch(console.error);
