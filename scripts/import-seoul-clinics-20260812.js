const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');
const { parse } = require('csv-parse/sync');
const proj4 = require('proj4');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });
require('./load-vault');

const { createClient } = require('@supabase/supabase-js');
const { TOTAL_SUBWAY_STATIONS } = require(path.resolve(__dirname, '../src/app/lead-manager/data/stations.ts'));
const { calculateLeadScore } = require(path.resolve(__dirname, '../src/lib/lead-scoring.ts'));

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Supabase URL or Key missing in environment.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

proj4.defs('EPSG5174', '+proj=tmerc +lat_0=38 +lon_0=127.0028902777778 +k=1 +x_0=200000 +y_0=500000 +ellps=bessel +units=m +no_defs +towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43');
proj4.defs('EPSG5181', '+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=500000 +ellps=GRS80 +units=m +no_defs');
proj4.defs('EPSG5179', '+proj=tmerc +lat_0=38 +lon_0=127.5 +k=0.9996 +x_0=1000000 +y_0=2000000 +ellps=GRS80 +units=m +no_defs');
proj4.defs('WGS84', '+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs');

function convertToWGS84(x, y) {
  try {
    if (!x || !y || isNaN(x) || isNaN(y) || x <= 0 || y <= 0) return null;
    let result;
    if (x > 100000 && x < 500000 && y > 300000 && y < 700000) {
      result = proj4('EPSG5181', 'WGS84', [x, y]);
    } else if (x > 800000 && x < 1500000 && y > 1500000 && y < 2500000) {
      result = proj4('EPSG5179', 'WGS84', [x, y]);
    } else {
      result = proj4('EPSG5174', 'WGS84', [x, y]);
    }
    const lng = result[0];
    const lat = result[1];
    if (lat < 33 || lat > 43 || lng < 124 || lng > 132) return null;
    return { lat, lng };
  } catch (err) {
    return null;
  }
}

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c * 1000; // in meters
}

function findNearestStation(lat, lng) {
  if (!lat || !lng) return null;
  let nearest = null;
  let minDistance = Infinity;

  for (const station of TOTAL_SUBWAY_STATIONS) {
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

function normalizeKey(str) {
  if (!str) return '';
  return str.trim().replaceAll(/\s+/g, ' ').toLowerCase();
}

async function runImport() {
  const filePath = 'D:\\Downloads\\서울시 의원 인허가 정보(20260812).csv';
  console.log(`Reading CSV file: ${filePath}...`);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  // 1. Fetch initial total DB lead count
  const { count: initialCount } = await supabase.from('leads').select('*', { count: 'exact', head: true });
  console.log(`Initial DB leads count: ${initialCount}`);

  // 2. Fetch all existing keys from DB in 1000-row pages
  console.log('Fetching existing lead keys from database...');
  const existingSet = new Set();
  let from = 0;
  const PAGE_SIZE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from('leads')
      .select('mgt_no, biz_name, road_address, lot_address, biz_name_normalized, road_address_normalized')
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error('Error fetching DB leads:', error.message);
      break;
    }
    if (!data || data.length === 0) break;

    data.forEach(d => {
      if (d.mgt_no) existingSet.add(d.mgt_no);
      
      const bizNorm = d.biz_name_normalized || normalizeKey(d.biz_name);
      const addrNorm = d.road_address_normalized || normalizeKey(d.road_address || d.lot_address);
      if (bizNorm && addrNorm) {
        existingSet.add(`${bizNorm}|${addrNorm}`);
      }
    });

    from += data.length;
    if (data.length < PAGE_SIZE) break;
  }
  console.log(`Loaded ${existingSet.size} unique keys from existing DB leads.`);

  // 3. Read and parse CSV
  const fileBuffer = fs.readFileSync(filePath);
  let decoded = iconv.decode(fileBuffer, 'euc-kr');
  if (!decoded || decoded.length < 100) {
    decoded = fileBuffer.toString('utf-8');
  }

  const records = parse(decoded, { columns: true, skip_empty_lines: true, trim: true });
  console.log(`Total CSV records parsed: ${records.length}`);

  const activeLeads = [];
  let skippedExistingCount = 0;

  for (const r of records) {
    const opStatus = r['영업상태명'] || '';
    const detailStatus = r['상세영업상태명'] || '';
    
    // Only import active/operating clinics
    if (opStatus !== '영업/정상' && opStatus !== '영업중' && detailStatus !== '영업중') {
      continue;
    }

    const mgtNo = r['관리번호'];
    if (!mgtNo) continue;

    const bizName = r['사업장명'] || '';
    const roadAddr = r['도로명주소'] || '';
    const lotAddr = r['지번주소'] || '';

    const bizNorm = normalizeKey(bizName);
    const addrNorm = normalizeKey(roadAddr || lotAddr);
    const comboKey = `${bizNorm}|${addrNorm}`;

    // Check if record already exists in DB or was already seen
    if (existingSet.has(mgtNo) || existingSet.has(comboKey)) {
      skippedExistingCount++;
      continue;
    }

    // Add to existingSet to deduplicate within CSV
    existingSet.add(mgtNo);
    if (bizNorm && addrNorm) existingSet.add(comboKey);

    const x = parseFloat(r['좌표정보(X)']);
    const y = parseFloat(r['좌표정보(Y)']);
    const coords = convertToWGS84(x, y);

    let nearestStation = null;
    let stationDistance = null;
    let stationLines = null;

    if (coords) {
      const n = findNearestStation(coords.lat, coords.lng);
      if (n) {
        nearestStation = n.station.name;
        stationDistance = n.distance;
        stationLines = n.station.lines;
      }
    }

    const phone = r['전화번호'] || '';

    const scoringResult = calculateLeadScore({
      distance: stationDistance ?? undefined,
      category: 'HEALTH',
      phone: phone,
      address: roadAddr || lotAddr,
      bizName: bizName,
    });

    activeLeads.push({
      mgt_no: mgtNo,
      biz_name: bizName,
      license_date: r['인허가일자'] || null,
      road_address: roadAddr || null,
      lot_address: lotAddr || null,
      coord_x: !isNaN(x) ? x : null,
      coord_y: !isNaN(y) ? y : null,
      latitude: coords ? coords.lat : null,
      longitude: coords ? coords.lng : null,
      phone: phone || null,
      medical_subject: r['진료과목내용명'] || r['의료기관종별명'] || r['업태구분명'] || '의원',
      service_name: r['의료기관종별명'] || r['업태구분명'] || '의원',
      service_id: '01_01_02_P',
      category: 'HEALTH',
      operating_status: opStatus || '영업/정상',
      detailed_status: detailStatus || '영업중',
      status: 'NEW',
      nearest_station: nearestStation,
      station_distance: stationDistance,
      station_lines: stationLines,
      lead_score: scoringResult.score,
      lead_grade: scoringResult.grade,
      biz_name_normalized: bizNorm,
      road_address_normalized: addrNorm,
    });
  }

  console.log(`Skipped existing/duplicate records: ${skippedExistingCount}`);
  console.log(`New active clinic leads ready for insertion: ${activeLeads.length}`);

  if (activeLeads.length === 0) {
    console.log('All active clinics from CSV already exist in DB!');
  } else {
    // 4. Batch insertion with fallback for individual errors
    const BATCH_SIZE = 100;
    let insertedCount = 0;

    for (let i = 0; i < activeLeads.length; i += BATCH_SIZE) {
      const batch = activeLeads.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from('leads').insert(batch);
      if (error) {
        console.warn(`Batch ${Math.floor(i / BATCH_SIZE) + 1} encountered error: ${error.message}. Fallback to row-by-row insertion...`);
        for (const item of batch) {
          const { error: itemErr } = await supabase.from('leads').insert(item);
          if (!itemErr) {
            insertedCount++;
          }
        }
      } else {
        insertedCount += batch.length;
      }
      if ((i + BATCH_SIZE) % 1000 === 0 || i + BATCH_SIZE >= activeLeads.length) {
        console.log(`Inserted ${insertedCount}/${activeLeads.length} leads...`);
      }
    }
  }

  // 5. Final stats verification
  const { count: finalCount } = await supabase.from('leads').select('*', { count: 'exact', head: true });
  const totalAdded = (finalCount || 0) - (initialCount || 0);

  console.log(`\n========================================`);
  console.log(`Seoul Clinic Import Complete!`);
  console.log(`- Total CSV Records: ${records.length}`);
  console.log(`- Already Existing / Duplicate Skipped: ${skippedExistingCount}`);
  console.log(`- Initial DB Lead Count: ${initialCount}`);
  console.log(`- Final DB Lead Count: ${finalCount}`);
  console.log(`- Newly Added Leads in this session: ${totalAdded}`);
  console.log(`========================================`);
}

runImport().catch(console.error);
