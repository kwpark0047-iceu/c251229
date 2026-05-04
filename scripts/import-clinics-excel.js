// scripts/import-clinics-excel.js
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const proj4 = require('proj4');

// 좌표계 정의 (EPSG:5174 - 보정된 중부원점, 서울 공공데이터 표준 중 하나)
proj4.defs('EPSG5174', '+proj=tmerc +lat_0=38 +lon_0=127.0028902777778 +k=1 +x_0=200000 +y_0=500000 +ellps=bessel +units=m +no_defs +towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43');
proj4.defs('WGS84', '+proj=longlat +datum=WGS84 +no_defs');

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

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Supabase 설정이 없습니다. .env.local 파일을 확인하세요.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 하버사인 공식을 이용한 거리 계산 (km)
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2); 
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  return R * c; // Distance in km
}

// 지하철역 하드코딩 리스트 (import-clinics-csv.js에서 발췌)
const SUBWAY_STATIONS = [
  { name: '강남', lat: 37.497175, lng: 127.027926, lines: ['2', 'S'] },
  { name: '역삼', lat: 37.500622, lng: 127.036456, lines: ['2'] },
  { name: '선릉', lat: 37.504503, lng: 127.049008, lines: ['2', 'B'] },
  { name: '삼성', lat: 37.508844, lng: 127.063214, lines: ['2'] },
  { name: '교대', lat: 37.493415, lng: 127.014626, lines: ['2', '3'] },
  { name: '잠실', lat: 37.513282, lng: 127.100150, lines: ['2', '8'] },
  { name: '성수', lat: 37.544580, lng: 127.055914, lines: ['2'] },
  { name: '건대입구', lat: 37.540372, lng: 127.070149, lines: ['2', '7'] },
  { name: '홍대입구', lat: 37.556823, lng: 126.923778, lines: ['2', 'A', 'K'] },
  { name: '신촌', lat: 37.555199, lng: 126.936664, lines: ['2'] },
  { name: '시청', lat: 37.565712, lng: 126.977041, lines: ['1', '2'] },
  { name: '서울역', lat: 37.554648, lng: 126.972559, lines: ['1', '4', 'A', 'K'] },
  { name: '명동', lat: 37.560830, lng: 126.985797, lines: ['4'] },
  { name: '용산', lat: 37.529849, lng: 126.964561, lines: ['1', 'K'] },
  { name: '고속터미널', lat: 37.504811, lng: 127.004943, lines: ['3', '7', '9'] },
  { name: '신사', lat: 37.516778, lng: 127.019998, lines: ['3', 'S'] },
  { name: '압구정', lat: 37.527026, lng: 127.028311, lines: ['3'] },
  { name: '여의도', lat: 37.521433, lng: 126.924388, lines: ['5', '9'] },
  { name: '노량진', lat: 37.513294, lng: 126.942526, lines: ['1', '9'] },
  { name: '공덕', lat: 37.54322, lng: 126.951576, lines: ['5', '6', 'A', 'K'] },
  { name: '합정', lat: 37.54841, lng: 126.913501, lines: ['2', '6'] },
  { name: '종로3가', lat: 37.57041, lng: 126.99211, lines: ['1', '3', '5'] },
  { name: '동대문역사문화공원', lat: 37.5651, lng: 127.0079, lines: ['2', '4', '5'] },
  { name: '신도림', lat: 37.5087, lng: 126.8913, lines: ['1', '2'] },
  { name: '영등포', lat: 37.5155, lng: 126.9076, lines: ['1'] },
  { name: '목동', lat: 37.5261, lng: 126.8641, lines: ['5'] },
  { name: '수유', lat: 37.6381, lng: 127.0257, lines: ['4'] },
  { name: '창동', lat: 37.6532, lng: 127.0477, lines: ['1', '4'] },
  { name: '노원', lat: 37.6551, lng: 127.0614, lines: ['4', '7'] },
  { name: '미아사거리', lat: 37.6133, lng: 127.0301, lines: ['4'] },
  { name: '종각', lat: 37.5702, lng: 126.9829, lines: ['1'] },
  { name: '광화문', lat: 37.5709, lng: 126.9768, lines: ['5'] },
];

function excelDateToJSDate(serial) {
  if (!serial) return null;
  if (typeof serial === 'string' && serial.includes('-')) return serial;
  if (typeof serial === 'string' && serial.length === 8) {
    return `${serial.substring(0,4)}-${serial.substring(4,6)}-${serial.substring(6,8)}`;
  }
  if (!isNaN(serial)) {
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    const year = date_info.getFullYear();
    const month = String(date_info.getMonth() + 1).padStart(2, '0');
    const day = String(date_info.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return String(serial);
}

async function importClinics() {
  const filePath = 'D:\\Downloads\\01_01_02_P_의원 (2604291).xlsx';
  console.log(`--- 임포트 시작: ${filePath} ---`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`파일을 찾을 수 없습니다: ${filePath}`);
    process.exit(1);
  }

  const subwayStations = SUBWAY_STATIONS;

  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    const headers = rows[0];
    const dataRows = rows.slice(1);
    
    console.log(`총 ${dataRows.length}건의 데이터를 파싱했습니다.`);
    
    const idxBizName = headers.indexOf('사업장명');
    const idxStatus = headers.indexOf('상세영업상태명');
    const idxRoadAddr = headers.indexOf('도로명주소');
    const idxLotAddr = headers.indexOf('지번주소');
    const idxPhone = headers.indexOf('전화번호');
    const idxLicenseDate = headers.indexOf('인허가일자');
    const idxMedicalSubject = headers.indexOf('진료과목내용');
    const idxMedicalSubjectNm = headers.indexOf('진료과목내용명');
    const idxX = headers.indexOf('좌표정보(X)');
    const idxY = headers.indexOf('좌표정보(Y)');
    
    const leads = [];
    let matchCount = 0;

    for (const row of dataRows) {
      if (!row[idxBizName]) continue;
      
      const detailedStatus = String(row[idxStatus] || '').trim();
      if (!detailedStatus.includes('영업') && !detailedStatus.includes('정상')) {
        continue;
      }

      const bizName = String(row[idxBizName]).trim();
      const roadAddress = String(row[idxRoadAddr] || '').trim();
      const lotAddress = String(row[idxLotAddr] || '').trim();
      const phone = String(row[idxPhone] || '').trim();
      const licenseDate = excelDateToJSDate(row[idxLicenseDate]);
      const medicalSubject = String(row[idxMedicalSubjectNm] || row[idxMedicalSubject] || '의원').trim();
      
      let latitude = null;
      let longitude = null;
      let nearestStation = null;
      let stationLines = null;
      let stationDistance = null;

      const x = row[idxX];
      const y = row[idxY];
      if (x && y && !isNaN(x) && !isNaN(y)) {
        try {
          const [lng, lat] = proj4('EPSG5174', 'WGS84', [parseFloat(x), parseFloat(y)]);
          if (lat > 30 && lat < 40 && lng > 120 && lng < 135) {
            latitude = lat;
            longitude = lng;
          }
        } catch (e) { }
      }

      if (latitude && longitude && subwayStations.length > 0) {
        let minDistance = Infinity;
        let closestSt = null;
        for (const st of subwayStations) {
          const dist = getDistanceFromLatLonInKm(latitude, longitude, st.lat, st.lng);
          if (dist < minDistance) {
            minDistance = dist;
            closestSt = st;
          }
        }
        
        if (closestSt && minDistance < 2) {
          nearestStation = closestSt.name;
          stationLines = closestSt.lines || [];
          stationDistance = Math.round(minDistance * 1000);
          matchCount++;
        }
      }

      leads.push({
        biz_name: bizName,
        road_address: roadAddress,
        lot_address: lotAddress,
        phone: phone,
        license_date: licenseDate,
        medical_subject: medicalSubject,
        detailed_status: detailedStatus,
        category: 'HEALTH',
        service_id: '01_01_02_P',
        service_name: '의원 (Excel)',
        latitude: latitude,
        longitude: longitude,
        nearest_station: nearestStation,
        station_lines: stationLines,
        station_distance: stationDistance,
        status: 'NEW',
        operating_status: '영업중',
      });
    }

    console.log(`영업중인 데이터 필터링 완료: ${leads.length}건`);
    console.log(`인접 역 매칭 성공: ${matchCount}건`);
    
    const BATCH_SIZE = 50;
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < leads.length; i += BATCH_SIZE) {
      const batch = leads.slice(i, i + BATCH_SIZE);
      const { error } = await supabase.from('leads').insert(batch);

      if (error) {
        // 개별 삽입 시도
        for (const lead of batch) {
          const { error: singleError } = await supabase.from('leads').insert(lead);
          if (!singleError) {
             successCount++;
          } else {
             errorCount++;
          }
        }
      } else {
        successCount += batch.length;
      }
      process.stdout.write(`\r진행률: ${Math.min(i + BATCH_SIZE, leads.length)}/${leads.length} (성공: ${successCount}, 오류: ${errorCount})`);
    }

    console.log('\n--- 임포트 완료 ---');
    console.log(`최종 처리(성공): 약 ${successCount}건 (오류/중복: ${errorCount}건)`);

  } catch (error) {
    console.error('임포트 중 치명적 오류:', error);
  }
}

importClinics();
