const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const proj4 = require('proj4');

// EPSG:2097 (중부원점) -> WGS84 좌표 변환 정의
// 서울시 공공데이터는 주로 보정된 중부원점이나 베셀좌표계를 사용합니다.
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

// 주요 지하철역 매칭용 (간단화)
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
  // 1. 주소 기반 매칭 우선
  if (address) {
    const matched = SUBWAY_STATIONS.find(s => address.includes(s.name));
    if (matched) return matched;
  }
  
  // 2. 좌표 기반 거리 계산
  if (!lat || !lng) return null;
  let nearest = null;
  let minDistance = Infinity;

  for (const station of SUBWAY_STATIONS) {
    const dLat = (station.lat - lat) * 111; // 대략적인 km 변환
    const dLng = (station.lng - lng) * 88;
    const distance = Math.sqrt(dLat*dLat + dLng*dLng);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = station;
    }
  }

  // 너무 멀면 매칭 안 함 (2km 이내)
  return minDistance <= 2 ? nearest : null;
}

async function syncClinics() {
  const filePath = 'D:\\Downloads\\서울시 의원 인허가 정보 (260428).csv';
  console.log('--- 의원 데이터 동기화 시작 ---');
  
  try {
    const buffer = fs.readFileSync(filePath);
    // EUC-KR 파싱
    const workbook = XLSX.read(buffer, { type: 'buffer', codepage: 949 });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // 첫 행을 헤더 키로 사용
    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    
    console.log(`CSV 파일 로드 성공: 총 ${rows.length}건`);
    
    const leadsToUpsert = [];

    for (const row of rows) {
      const mgtNo = String(row['관리번호'] || '').trim();
      if (!mgtNo) continue; // 고유번호가 없으면 건너뜀

      const bizName = String(row['사업장명'] || '').trim();
      if (!bizName) continue;

      const roadAddress = String(row['도로명전체주소'] || '').trim();
      const lotAddress = String(row['소재지전체주소'] || '').trim();
      const phone = String(row['소재지전화'] || '').trim();
      const operatingStatus = String(row['영업상태명'] || '').trim(); // '영업/정상' 등
      const detailedStatus = String(row['상세영업상태명'] || '').trim();
      const licenseDateStr = String(row['인허가일자'] || '').trim();
      let licenseDate = null;
      if (licenseDateStr.length >= 8 && !licenseDateStr.includes('-')) {
         // YYYYMMDD -> YYYY-MM-DD
         licenseDate = `${licenseDateStr.slice(0,4)}-${licenseDateStr.slice(4,6)}-${licenseDateStr.slice(6,8)}`;
      } else if (licenseDateStr.includes('-')) {
         licenseDate = licenseDateStr;
      }

      // 상태(영업중인지)
      const isOperating = operatingStatus && operatingStatus.includes('영업');
      const medicalSubject = String(row['진료과목내용'] || '').trim() || '의원';

      // 좌표 변환
      let latitude = null;
      let longitude = null;
      const cx = parseFloat(row['좌표정보(X)']);
      const cy = parseFloat(row['좌표정보(Y)']);
      if (!isNaN(cx) && !isNaN(cy) && cx > 0 && cy > 0) {
         try {
             // EPSG:2097 -> WGS84
             const converted = proj4('EPSG:2097', 'WGS84', [cx, cy]);
             longitude = converted[0];
             latitude = converted[1];
         } catch(e) {
             // 변환 실패 무시
         }
      }

      const nearestStation = getNearestStation(latitude, longitude, roadAddress || lotAddress);

      leadsToUpsert.push({
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
        status: isOperating ? 'NEW' : 'CLOSED', // 기존 비즈니스 로직에 맞게
      });
    }

    console.log(`처리 대기열 구성 완료: 총 ${leadsToUpsert.length}건 유효 데이터`);
    
    // DB Upsert (50건씩)
    const BATCH_SIZE = 50;
    let successCount = 0;

    for (let i = 0; i < leadsToUpsert.length; i += BATCH_SIZE) {
      const batch = leadsToUpsert.slice(i, i + BATCH_SIZE);
      
      const { error } = await supabase
        .from('leads')
        .upsert(batch, { onConflict: 'mgt_no' });

      if (error) {
         // 일부 항목에러 발생 시 단건 재시도 (디버깅 용이성 위해)
         for (const lead of batch) {
            const { error: sErr } = await supabase.from('leads').upsert(lead, { onConflict: 'mgt_no' });
            if (!sErr) successCount++;
         }
      } else {
        successCount += batch.length;
      }
      
      process.stdout.write(`\r진행률: ${successCount} / ${leadsToUpsert.length} (${Math.round((successCount/leadsToUpsert.length)*100)}%) `);
    }

    console.log('\n--- 업로드/동기화 완료 ---');
    console.log(`최종 성공: ${successCount}건`);

  } catch (error) {
    console.error('임포트 중 치명적 오류:', error);
  }
}

syncClinics();
