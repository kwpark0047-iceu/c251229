/**
 * 지하철 역사 도면 대량 업로드 스크립트
 * 사용법: node scripts/bulk-upload-floor-plans.js [디렉토리경로]
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// .env.local 직접 읽기 (dotenv 미설치 대비)
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; 

if (!supabaseUrl || !supabaseKey) {
  console.error('환경 변수가 설정되지 않았습니다 (.env.local 확인)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const BUCKET_NAME = 'floor-plans';

// 노선 정보 매핑 (파일명 파싱용)
const METRO_LINES = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'S', 'K', 'A', 'B'];

/**
 * 파일명에서 정보를 추출합니다.
 * 형식 예: 2호선_강남_B1.jpg, 2호선_역삼_station_layout.jpg
 */
function parseFileInfo(fileName) {
  const name = path.parse(fileName).name;
  const parts = name.split('_');
  
  let lineNumber = '';
  let stationName = '';
  let planType = 'station_layout';
  let floorName = 'B1';

  // "2호선" -> "2"
  const lineMatch = parts[0]?.match(/(\d+|[A-Z])호선/);
  if (lineMatch) {
    lineNumber = lineMatch[1];
  }

  stationName = parts[1] || '';
  
  if (parts[2]) {
    if (parts[2].toLowerCase() === 'psd' || parts[2].toLowerCase() === '스크린도어') {
      planType = 'psd';
    } else {
      floorName = parts[2];
    }
  }

  return { lineNumber, stationName, planType, floorName };
}

async function bulkUpload(targetDir) {
  if (!fs.existsSync(targetDir)) {
    console.error(`디렉토리를 찾을 수 없습니다: ${targetDir}`);
    return;
  }

  const files = fs.readdirSync(targetDir).filter(f => 
    /\.(jpg|jpeg|png)$/i.test(f)
  );

  console.log(`총 ${files.length}개의 파일을 발견했습니다. 업로드를 시작합니다...`);

  for (const fileName of files) {
    const filePath = path.join(targetDir, fileName);
    const { lineNumber, stationName, planType, floorName } = parseFileInfo(fileName);

    if (!lineNumber || !stationName) {
      console.warn(`[SKIP] 파일명 파싱 불가: ${fileName}`);
      continue;
    }

    console.log(`[PROCESS] ${stationName} (${lineNumber}호선) - ${planType}...`);

    try {
      const fileBuffer = fs.readFileSync(filePath);
      const typeFolder = planType === 'psd' ? 'psd' : 'station-layout';
      const storagePath = `line-${lineNumber}/${typeFolder}/${fileName}`;

      // 1. Storage 업로드
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, fileBuffer, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) {
        console.error(`   Storage 오류 (${fileName}):`, uploadError.message);
        continue;
      }

      // 2. URL 획득
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(storagePath);

      // 3. DB 저장 (Upsert)
      const { error: dbError } = await supabase
        .from('floor_plans')
        .upsert({
          station_name: stationName,
          line_number: lineNumber,
          plan_type: planType,
          floor_name: floorName,
          image_url: urlData.publicUrl,
          storage_path: storagePath,
          file_name: fileName,
          file_size: fileBuffer.length,
          sort_order: 0
        }, {
          onConflict: 'station_name,line_number,plan_type,floor_name'
        });

      if (dbError) {
        console.error(`   DB 오류 (${fileName}):`, dbError.message);
      } else {
        console.log(`   ✅ 완료: ${fileName}`);
      }
    } catch (err) {
      console.error(`   처리 중 치명적 오류 (${fileName}):`, err.message);
    }
  }

  console.log('--- 모든 작업이 완료되었습니다 ---');
}

// 실행
const targetPath = process.argv[2] || './public/subway-plans';
bulkUpload(targetPath);
