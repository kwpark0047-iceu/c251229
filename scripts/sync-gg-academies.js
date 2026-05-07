
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 환경 변수 설정 (직접 읽기)
const envPath = path.join(__dirname, '../.env.local');
let env = {};

if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
    }
  });
} else {
  console.error('.env.local 파일이 없습니다.');
  process.exit(1);
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const GG_DATA_API_KEY = env.GG_DATA_API_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY || !GG_DATA_API_KEY) {
  console.error('필수 설정(SUPABASE, GG_DATA_API_KEY)이 없습니다.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 경기도 주요 지하철역 좌표 데이터 (거리 계산용)
const GG_STATIONS = [
  // 1호선 (경부선/경인선 등 경기도 구간)
  { name: '의정부', lat: 37.7394, lng: 127.0458, lines: ['1'] },
  { name: '수원', lat: 37.2659, lng: 127.0001, lines: ['1', 'SuinBundang', 'KTX'] },
  { name: '부천', lat: 37.4841, lng: 126.7827, lines: ['1'] },
  { name: '안양', lat: 37.4022, lng: 126.9229, lines: ['1'] },
  { name: '평택', lat: 36.9923, lng: 127.0861, lines: ['1'] },
  { name: '동두천', lat: 37.9272, lng: 127.0548, lines: ['1'] },
  { name: '광명', lat: 37.4168, lng: 126.8848, lines: ['1', 'KTX'] },
  
  // 3호선 (일산선)
  { name: '대화', lat: 37.6761, lng: 126.7476, lines: ['3'] },
  { name: '주엽', lat: 37.6701, lng: 126.7613, lines: ['3'] },
  { name: '정발산', lat: 37.6595, lng: 126.7734, lines: ['3'] },
  { name: '마두', lat: 37.6522, lng: 126.7776, lines: ['3'] },
  { name: '백석', lat: 37.6431, lng: 126.7879, lines: ['3'] },
  { name: '대곡', lat: 37.6316, lng: 126.811, lines: ['3', 'GyeonguiJungang'] },
  { name: '화정', lat: 37.6346, lng: 126.8327, lines: ['3'] },
  { name: '원당', lat: 37.6533, lng: 126.843, lines: ['3'] },
  { name: '삼송', lat: 37.6531, lng: 126.8956, lines: ['3'] },
  
  // 4호선 (과천선/안산선)
  { name: '과천', lat: 37.433, lng: 126.9967, lines: ['4'] },
  { name: '정부과천청사', lat: 37.4269, lng: 126.9897, lines: ['4'] },
  { name: '인덕원', lat: 37.4035, lng: 126.9767, lines: ['4'] },
  { name: '범계', lat: 37.3898, lng: 126.9507, lines: ['4'] },
  { name: '금정', lat: 37.3722, lng: 126.9434, lines: ['1', '4'] },
  { name: '중앙', lat: 37.3122, lng: 126.8385, lines: ['4', 'SuinBundang'] },
  { name: '안산', lat: 37.3271, lng: 126.7871, lines: ['4', 'SuinBundang'] },
  { name: '오이도', lat: 37.3624, lng: 126.7365, lines: ['4', 'SuinBundang'] },
  
  // 수인분당선 (성남, 용인, 수원 등)
  { name: '야탑', lat: 37.4111, lng: 127.1287, lines: ['SuinBundang'] },
  { name: '서현', lat: 37.3851, lng: 127.1235, lines: ['SuinBundang'] },
  { name: '수내', lat: 37.3784, lng: 127.1143, lines: ['SuinBundang'] },
  { name: '정자', lat: 37.367, lng: 127.1084, lines: ['SuinBundang', 'Shinbundang'] },
  { name: '미금', lat: 37.3499, lng: 127.1089, lines: ['SuinBundang', 'Shinbundang'] },
  { name: '죽전', lat: 37.3248, lng: 127.1074, lines: ['SuinBundang'] },
  { name: '기흥', lat: 37.2758, lng: 127.1159, lines: ['SuinBundang', 'Everline'] },
  
  // 신분당선
  { name: '판교', lat: 37.3948, lng: 127.1111, lines: ['Shinbundang', 'Gyeonggang'] },
  { name: '광교', lat: 37.3013, lng: 127.049, lines: ['Shinbundang'] },
  
  // 경강선
  { name: '경기광주', lat: 37.3862, lng: 127.2526, lines: ['Gyeonggang'] },
  { name: '이천', lat: 37.2655, lng: 127.4421, lines: ['Gyeonggang'] },
  { name: '여주', lat: 37.2825, lng: 127.6288, lines: ['Gyeonggang'] },

  // 7호선 (부천, 광명)
  { name: '상동', lat: 37.5035, lng: 126.753, lines: ['7'] },
  { name: '부천시청', lat: 37.5046, lng: 126.7635, lines: ['7'] },
  { name: '철산', lat: 37.476, lng: 126.8679, lines: ['7'] },

  // 8호선 (성남, 구리, 남양주)
  { name: '남한산성입구', lat: 37.4515, lng: 127.1598, lines: ['8'] },
  { name: '단대오거리', lat: 37.4452, lng: 127.1568, lines: ['8'] },
  { name: '모란', lat: 37.4321, lng: 127.1291, lines: ['8', 'SuinBundang'] },
  { name: '구리', lat: 37.6034, lng: 127.1439, lines: ['8', 'GyeonguiJungang'] },
  { name: '별내', lat: 37.6418, lng: 127.1265, lines: ['8', 'Gyeongchun'] },
];

// Haversine 공식을 이용한 두 좌표 간 거리 계산 (km 단위)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // 지구 반지름
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// 가장 가까운 지하철역 찾기
function findNearestStation(lat, lon) {
  if (!lat || !lon) return null;
  
  let nearest = null;
  let minDistance = Infinity;
  
  for (const station of GG_STATIONS) {
    const distance = calculateDistance(lat, lon, station.lat, station.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = {
        name: station.name,
        distance: Math.round(distance * 1000), // m 단위
        lines: station.lines
      };
    }
  }
  
  // 3km 이내일 때만 매칭 (너무 멀면 의미 없음)
  return minDistance <= 3 ? nearest : null;
}

async function syncGyeonggiAcademies() {
  console.log('--- 경기도 학원 데이터 동기화 시작 ---');
  
  const BATCH_SIZE = 1000;
  let pageIndex = 1;
  let totalProcessed = 0;
  let totalSaved = 0;

  try {
    while (true) {
      console.log(`페이지 ${pageIndex} 불러오는 중...`);
      
      const response = await axios.get('https://openapi.gg.go.kr/TninsttInstutM', {
        params: {
          KEY: GG_DATA_API_KEY,
          Type: 'json',
          pIndex: pageIndex,
          pSize: BATCH_SIZE
        }
      });

      const data = response.data.TninsttInstutM;
      if (!data || data.length < 2) {
        console.log('데이터가 더 이상 없습니다.');
        break;
      }

      const rows = data[1].row;
      if (!rows || rows.length === 0) {
        console.log('데이터가 더 이상 없습니다.');
        break;
      }

      console.log(`${rows.length}건 데이터 변환 중...`);
      
      const leads = rows.map(row => {
        const lat = parseFloat(row.REFINE_WGS84_LAT);
        const lon = parseFloat(row.REFINE_WGS84_LOGT);
        const nearest = findNearestStation(lat, lon);
        
        return {
          biz_name: row.FACLT_NM,
          road_address: row.REFINE_ROADNM_ADDR || '',
          lot_address: row.REFINE_LOTNO_ADDR || '',
          phone: row.TELNO || '',
          license_date: row.FA_DATE ? `${row.FA_DATE.substring(0,4)}-${row.FA_DATE.substring(4,6)}-${row.FA_DATE.substring(6,8)}` : null,
          medical_subject: row.LE_CRSE_NM || '학원',
          category: 'EDUCATION',
          service_id: row.INDUTY_DIV_NM === '학원' ? 'EDU_ACADEMY' : 'EDU_INSTITUTE',
          service_name: row.INDUTY_DIV_NM,
          latitude: lat || null,
          longitude: lon || null,
          nearest_station: nearest ? nearest.name : null,
          station_lines: nearest ? nearest.lines : null,
          station_distance: nearest ? nearest.distance : null,
          status: 'NEW',
          operating_status: row.FACLT_STAT_NM === '운영' ? '영업중' : '폐업/휴업',
          region_code: '6410000', // 경기도 코드
          mgt_no: `GG_${row.FACLT_NM}_${row.REFINE_ROADNM_ADDR || row.REFINE_LOTNO_ADDR}`.replace(/\s+/g, '')
        };
      }).filter(lead => lead.operating_status === '영업중');

      // DB 저장 (upsert)
      if (leads.length > 0) {
        // mgt_no 또는 (biz_name, road_address) 기준으로 중복 체크가 필요하지만 
        // 여기선 단순 insert 시도 후 실패 시 무시하거나 mgt_no 기준 upsert
        const { error } = await supabase
          .from('leads')
          .upsert(leads, { onConflict: 'mgt_no' });

        if (error) {
          console.error('DB 저장 오류:', error);
        } else {
          totalSaved += leads.length;
        }
      }

      totalProcessed += rows.length;
      console.log(`현재까지: 처리 ${totalProcessed}건 / 저장 ${totalSaved}건`);

      if (rows.length < BATCH_SIZE) break;
      pageIndex++;
      
      // API Rate Limit 방지
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log('--- 동기화 완료 ---');
    console.log(`최종 결과: 전체 처리 ${totalProcessed}건, 저장됨 ${totalSaved}건`);

  } catch (error) {
    console.error('동기화 중 오류 발생:', error.message);
  }
}

syncGyeonggiAcademies();
