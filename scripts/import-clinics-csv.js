
const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 환경 변수 설정 (직접 읽기)
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

// 지하철역 데이터 (주요 역 일부 추출 및 매칭용)
// 실제로는 constants.ts의 데이터를 모두 쓰는 것이 좋으나, 
// 스크립트 실행을 위해 주요 역 데이터를 하드코딩하거나 간단한 매칭 로직을 구현합니다.
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
  { name: '숭인', lat: 37.5726, lng: 127.0164, lines: ['1', '6'] }, // 동묘앞 인근
  { name: '동묘앞', lat: 37.5726, lng: 127.0164, lines: ['1', '6'] },
  { name: '신설동', lat: 37.5753, lng: 127.0251, lines: ['1', '2', 'Ui'] },
  { name: '안암', lat: 37.5852, lng: 127.0298, lines: ['6'] },
  { name: '고대', lat: 37.5852, lng: 127.0298, lines: ['6'] },
  { name: '성신여대입구', lat: 37.5926, lng: 127.0164, lines: ['4', 'Ui'] },
  { name: '길음', lat: 37.6034, lng: 127.0251, lines: ['4'] },
  { name: '불광', lat: 37.6105, lng: 126.9299, lines: ['3', '6'] },
  { name: '연신내', lat: 37.619, lng: 126.921, lines: ['3', '6'] },
  { name: '구파발', lat: 37.6368, lng: 126.9188, lines: ['3'] },
  { name: '대화', lat: 37.6761, lng: 126.7476, lines: ['3'] },
  { name: '주엽', lat: 37.6701, lng: 126.7613, lines: ['3'] },
  { name: '정발산', lat: 37.6595, lng: 126.7734, lines: ['3'] },
  { name: '마두', lat: 37.6522, lng: 126.7776, lines: ['3'] },
  { name: '백석', lat: 37.6431, lng: 126.7879, lines: ['3'] },
  { name: '화정', lat: 37.6346, lng: 126.8327, lines: ['3'] },
  { name: '원당', lat: 37.6533, lng: 126.843, lines: ['3'] },
  { name: '삼송', lat: 37.6531, lng: 126.8956, lines: ['3'] },
  { name: '지축', lat: 37.648, lng: 126.914, lines: ['3'] },
];

function excelDateToJSDate(serial) {
  if (!serial || isNaN(serial)) return null;
  const utc_days = Math.floor(serial - 25569);
  const utc_value = utc_days * 86400;
  const date_info = new Date(utc_value * 1000);
  
  const year = date_info.getFullYear();
  const month = String(date_info.getMonth() + 1).padStart(2, '0');
  const day = String(date_info.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

function findStationByAddress(address) {
  if (!address || typeof address !== 'string') return null;
  
  // 주소에서 역 이름 찾기
  for (const station of SUBWAY_STATIONS) {
    if (address.includes(station.name)) {
      return station;
    }
  }
  return null;
}

async function importClinics() {
  const filePath = 'D:\\Downloads\\서울시 의원 인허가 정보(수정).csv';
  console.log('--- 임포트 시작 ---');
  
  try {
    const buffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(buffer, { type: 'buffer', codepage: 949 });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }).slice(1); // 헤더 제외
    
    console.log(`총 ${rows.length}건의 데이터를 처리합니다.`);
    
    const leads = [];
    let matchCount = 0;

    for (const row of rows) {
      if (!row[9]) continue; // 사업장명 없으면 스킵

      const bizName = String(row[9]).trim();
      const roadAddress = String(row[7] || '').trim();
      const lotAddress = String(row[6] || '').trim();
      const phone = String(row[5] || '').trim();
      const licenseDate = excelDateToJSDate(row[1]);
      const medicalSubject = String(row[10] || '의원').trim();
      const detailedStatus = String(row[4] || '').trim();
      
      // 역 매칭 시도 (주소 및 상호명에서 검색)
      const matchedStation = findStationByAddress(roadAddress) || 
                             findStationByAddress(lotAddress) || 
                             findStationByAddress(bizName);
      
      let latitude = null;
      let longitude = null;
      let nearestStation = null;
      let stationLines = null;
      let stationDistance = null;

      if (matchedStation) {
        latitude = matchedStation.lat;
        longitude = matchedStation.lng;
        nearestStation = matchedStation.name;
        stationLines = matchedStation.lines;
        stationDistance = 0; // 역명이 주소에 포함되어 있으므로 매우 가깝다고 가정
        matchCount++;
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
        service_id: '01_01_02_P', // 의원
        service_name: '의원 (CSV)',
        latitude: latitude,
        longitude: longitude,
        nearest_station: nearestStation,
        station_lines: stationLines,
        station_distance: stationDistance,
        status: 'NEW',
        operating_status: '영업중'
      });
    }

    console.log(`역 매칭 성공: ${matchCount}건 / 전체: ${leads.length}건`);
    
    // DB 업서트 (50건씩)
    const BATCH_SIZE = 50;
    let successCount = 0;

    for (let i = 0; i < leads.length; i += BATCH_SIZE) {
      const batch = leads.slice(i, i + BATCH_SIZE);
      const { error } = await supabase
        .from('leads')
        .insert(batch);

      if (error) {
        // 개별 삽입 시도 (일부 중복이나 오류가 섞여 있어도 나머지는 저장되도록)
        for (const lead of batch) {
          const { error: singleError } = await supabase.from('leads').insert(lead);
          if (!singleError) successCount++;
        }
      } else {
        successCount += batch.length;
      }
      process.stdout.write(`\r진행률: ${successCount}/${leads.length} (${Math.round(successCount/leads.length*100)}%)`);
    }

    console.log('\n--- 임포트 완료 ---');
    console.log(`최종 성공: ${successCount}건`);

  } catch (error) {
    console.error('임포트 중 치명적 오류:', error);
  }
}

importClinics();
