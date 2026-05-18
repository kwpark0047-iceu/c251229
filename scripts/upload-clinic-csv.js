const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const proj4 = require('proj4');

// EPSG:2097 (중부원점) -> WGS84 좌표 변환 정의
proj4.defs("EPSG:2097", "+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=500000 +ellps=bessel +units=m +no_defs +towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43");

// 환경 변수 설정
const envFile = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
  }
});

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const SUBWAY_STATIONS = [
  { name: '강남', lat: 37.497175, lng: 127.027926, lines: ['2', 'S'] },
  { name: '역삼', lat: 37.500622, lng: 127.036456, lines: ['2'] },
  { name: '선릉', lat: 37.504503, lng: 127.049008, lines: ['2', 'K'] },
  { name: '삼성', lat: 37.508844, lng: 127.063214, lines: ['2'] },
  { name: '교대', lat: 37.493415, lng: 127.014626, lines: ['2', '3'] },
  { name: '잠실', lat: 37.513282, lng: 127.100150, lines: ['2', '8'] },
  { name: '홍대입구', lat: 37.556823, lng: 126.923778, lines: ['2', 'A', 'K'] },
  { name: '여의도', lat: 37.521433, lng: 126.924388, lines: ['5', '9'] },
  { name: '종로3가', lat: 37.57041, lng: 126.99211, lines: ['1', '3', '5'] }
];

function getNearestStation(lat, lng, address) {
  if (address) {
    const matched = SUBWAY_STATIONS.find(s => address.includes(s.name));
    if (matched) return matched;
  }
  
  if (!lat || !lng) return null;
  let nearest = null;
  let minDistance = Infinity;

  for (const station of SUBWAY_STATIONS) {
    const dLat = (station.lat - lat) * 111; 
    const dLng = (station.lng - lng) * 88;
    const distance = Math.sqrt(dLat*dLat + dLng*dLng);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = station;
    }
  }

  return minDistance <= 2 ? nearest : null;
}

async function syncClinics() {
  const filePath = 'D:\\Downloads\\서울시 의원 인허가 정보 (260514).csv';
  console.log('--- 의원 데이터 동기화 시작 (260514) ---');
  
  try {
    const buffer = fs.readFileSync(filePath);
    // EUC-KR(949) 파싱
    const workbook = XLSX.read(buffer, { type: 'buffer', codepage: 949 });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    
    console.log(`CSV 파일 로드 성공: 총 ${rows.length}건`);
    
    console.log(`기존 DB에서 mgt_no 로드 중...`);
    // 전체 mgt_no 조회 (페이지네이션 필요 시 변경, 일단 10만건 이내로 가정)
    let existingMgtNos = new Set();
    let from = 0;
    const PAGE_SIZE = 10000;
    while (true) {
       const { data, error } = await supabase.from('leads').select('mgt_no').not('mgt_no', 'is', null).range(from, from + PAGE_SIZE - 1);
       if (error) { console.error(error); break; }
       if (!data || data.length === 0) break;
       data.forEach(r => existingMgtNos.add(r.mgt_no));
       from += PAGE_SIZE;
    }
    console.log(`기존 데이터 ${existingMgtNos.size}건 로드 완료`);

    const leadsToInsert = [];

    for (const row of rows) {
      const mgtNo = String(row['관리번호'] || '').trim() || String(row['인허가번호'] || '').trim();
      if (!mgtNo || existingMgtNos.has(mgtNo)) continue; 

      const bizName = String(row['사업장명'] || '').trim();
      if (!bizName) continue;

      const roadAddress = String(row['도로명주소'] || '').trim();
      const lotAddress = String(row['지번주소'] || '').trim();
      const phone = String(row['전화번호'] || '').trim();
      const operatingStatus = String(row['영업상태명'] || '').trim(); 
      const isOperating = operatingStatus && operatingStatus.includes('영업');
      if (!isOperating) continue; // 영업 중이 아닌 사업장 스킵

      const detailedStatus = String(row['상세영업상태명'] || '').trim();
      const licenseDateStr = String(row['인허가일자'] || '').trim();
      
      let licenseDate = null;
      if (licenseDateStr.length >= 8 && !licenseDateStr.includes('-')) {
         licenseDate = `${licenseDateStr.slice(0,4)}-${licenseDateStr.slice(4,6)}-${licenseDateStr.slice(6,8)}`;
      } else if (licenseDateStr.includes('-')) {
         licenseDate = licenseDateStr;
      }

      const medicalSubject = String(row['진료과목내용'] || '').trim() || String(row['진료과목내용명'] || '').trim() || '의원';

      let latitude = null;
      let longitude = null;
      const cx = parseFloat(row['좌표정보(X)'] || row['좌표정보(x)']);
      const cy = parseFloat(row['좌표정보(Y)'] || row['좌표정보(y)']);
      
      if (!isNaN(cx) && !isNaN(cy) && cx > 0 && cy > 0) {
         try {
             const converted = proj4('EPSG:2097', 'WGS84', [cx, cy]);
             longitude = converted[0];
             latitude = converted[1];
         } catch(e) { }
      }

      const nearestStation = getNearestStation(latitude, longitude, roadAddress || lotAddress);

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
        nearest_station: nearestStation ? nearestStation.name : null,
        station_lines: nearestStation ? nearestStation.lines : null,
        station_distance: 0, 
        status: 'NEW',
      });
      // 임시로 Set에 넣어 중복 방지
      existingMgtNos.add(mgtNo);
    }

    console.log(`처리 대기열 구성 완료: 신규 삽입 대기 ${leadsToInsert.length}건`);
    
    // DB Insert (500건씩)
    const BATCH_SIZE = 500;
    let successCount = 0;

    for (let i = 0; i < leadsToInsert.length; i += BATCH_SIZE) {
      const batch = leadsToInsert.slice(i, i + BATCH_SIZE);
      
      const { error } = await supabase
        .from('leads')
        .insert(batch);

      if (error) {
         console.warn(`[Batch ${i/BATCH_SIZE}] Error inserting batch: ${error.message}`);
      } else {
        successCount += batch.length;
      }
      
      process.stdout.write(`\r진행률: ${successCount} / ${leadsToInsert.length} (${Math.round((successCount/leadsToInsert.length)*100) || 0}%) `);
    }

    console.log('\n--- 업로드/동기화 완료 ---');
    console.log(`최종 성공: ${successCount}건`);

  } catch (error) {
    console.error('임포트 중 치명적 오류:', error);
  }
}

syncClinics();
