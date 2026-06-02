require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const iconv = require('iconv-lite');
const { parse } = require('csv-parse/sync');
const { createClient } = require('@supabase/supabase-js');
const proj4 = require('proj4');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

proj4.defs('EPSG5174', '+proj=tmerc +lat_0=38 +lon_0=127.0028902777778 +k=1 +x_0=200000 +y_0=500000 +ellps=bessel +units=m +no_defs +towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43');
proj4.defs('EPSG5181', '+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=500000 +ellps=GRS80 +units=m +no_defs');
proj4.defs('EPSG5179', '+proj=tmerc +lat_0=38 +lon_0=127.5 +k=0.9996 +x_0=1000000 +y_0=2000000 +ellps=GRS80 +units=m +no_defs');
proj4.defs('WGS84', '+proj=longlat +ellps=WGS84 +datum=WGS84 +no_defs');

function detectCoordinateSystem(x, y) {
  if (x > 800000 && x < 1500000 && y > 1500000 && y < 2500000) return 'EPSG5179';
  if (x > 100000 && x < 500000 && y > 300000 && y < 800000) return 'EPSG5174';
  return 'EPSG5174';
}

function convertGRS80ToWGS84(x, y) {
  try {
    if (!x || !y || x === 0 || y === 0) return null;
    const sourceSystem = detectCoordinateSystem(x, y);
    const result = proj4(sourceSystem, 'WGS84', [x, y]);
    let lng, lat;
    if (Array.isArray(result)) { lng = result[0]; lat = result[1]; }
    else if (result && typeof result === 'object') { lng = result.x; lat = result.y; }
    if (lat < 33 || lat > 43 || lng < 124 || lng > 132) return null;
    return { lat, lng };
  } catch (error) { return null; }
}

async function main() {
  const buf = fs.readFileSync('seoul_clinic_data.csv');
  const decoded = iconv.decode(buf, 'euc-kr');
  const records = parse(decoded, { columns: true, skip_empty_lines: true, trim: true });

  console.log(`총 ${records.length}개 데이터 파싱 완료.`);

  const newLeads = [];
  for (const record of records) {
    if (record['영업상태명'] !== '영업/정상' && record['상세영업상태명'] !== '영업중') continue;
    
    const mgtNo = record['관리번호'];
    if (!mgtNo) continue;

    const x = parseFloat(record['좌표정보(X)']);
    const y = parseFloat(record['좌표정보(Y)']);
    
    let lat = null, lng = null;
    if (!isNaN(x) && !isNaN(y) && x > 0 && y > 0) {
      const coords = convertGRS80ToWGS84(x, y);
      if (coords) { lat = coords.lat; lng = coords.lng; }
    }

    newLeads.push({
      biz_name: record['사업장명'] || '',
      license_date: record['인허가일자'] || null,
      road_address: record['도로명주소'] || null,
      lot_address: record['지번주소'] || null,
      coord_x: !isNaN(x) ? x : null,
      coord_y: !isNaN(y) ? y : null,
      latitude: lat,
      longitude: lng,
      phone: record['전화번호'] || null,
      medical_subject: record['진료과목내용명'] || record['업태구분명'] || null,
      mgt_no: mgtNo,
      operating_status: record['영업상태명'] || null,
      detailed_status: record['상세영업상태명'] || null,
      category: 'HEALTH',
      status: 'NEW',
    });
  }

  console.log(`영업중 데이터 ${newLeads.length}개 필터링 완료. DB 업로드 시작...`);

  // DB에서 기존 관리번호 가져오기
  const mgtNos = newLeads.map(l => l.mgt_no);
  const existingSet = new Set();
  const BATCH = 500;
  for (let i = 0; i < mgtNos.length; i += BATCH) {
    const chunk = mgtNos.slice(i, i + BATCH);
    const { data, error } = await supabase.from('leads').select('mgt_no').in('mgt_no', chunk);
    if (data) {
      data.forEach(d => existingSet.add(d.mgt_no));
    }
  }

  console.log(`기존 데이터 ${existingSet.size}개 확인됨.`);

  const toInsert = newLeads.filter(l => !existingSet.has(l.mgt_no));
  console.log(`신규 삽입 대상: ${toInsert.length}개`);

  if (toInsert.length === 0) {
    console.log('삽입할 신규 데이터가 없습니다.');
    return;
  }

  let savedCount = 0;
  const INSERT_BATCH = 200;
  for (let i = 0; i < toInsert.length; i += INSERT_BATCH) {
    const chunk = toInsert.slice(i, i + INSERT_BATCH);
    const { error } = await supabase.from('leads').insert(chunk);
    if (error) {
      console.error('삽입 오류 발생:', error);
    } else {
      savedCount += chunk.length;
      console.log(`저장 진행 중... ${savedCount}/${toInsert.length}`);
    }
  }

  console.log(`모든 작업 완료! (성공: ${savedCount}건)`);
}

main().catch(console.error);
