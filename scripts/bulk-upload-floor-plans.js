/**
 * 지하철 역사 도면 대량 업로드 스크립트 (V8 - 정교한 파싱 로직 적용)
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

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
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; 

const supabase = createClient(supabaseUrl, supabaseKey);
const BUCKET_NAME = 'floor-plans';

function getSafeStorageKey(lineNumber, typeFolder, fileName, stationName) {
  const ext = path.extname(fileName).toLowerCase();
  const input = `${lineNumber}_${stationName}_${fileName}`;
  const hash = Buffer.from(input).toString('hex').substring(0, 16);
  return `line-${lineNumber}/${typeFolder}/${hash}${ext}`;
}

function parseFileInfo(fileName, parentDirName) {
  const name = path.parse(fileName).name;
  
  let lineNumber = '';
  let stationName = '';
  let planType = 'station_layout';
  let floorName = 'B1';

  // 1. 노선 판별
  if (parentDirName && parentDirName.includes('신분당선')) {
    lineNumber = 'S';
  } else if (parentDirName) {
    const lineMatch = parentDirName.match(/(\d+|[A-Z])호선/);
    if (lineMatch) lineNumber = lineMatch[1];
  }

  // 2. 층 정보 추출 (지하N층, 지상N층, BF, 1F 등)
  const floorMatch = name.match(/(지하\d+층|지상\d+층|[B]\d|[1-9]F)/i);
  if (floorMatch) {
    floorName = floorMatch[1].toUpperCase()
      .replace('지하', 'B')
      .replace('지상', '')
      .replace('층', '');
    if (!floorName.startsWith('B') && !floorName.endsWith('F')) {
      floorName = floorName + 'F';
    }
  }

  // 3. 역명 및 파일 유형 파싱
  if (name.includes('신분당선_도면_첨부파일')) {
    lineNumber = 'S';
    const numPart = name.split('_').pop();
    stationName = `신분당선_첨부파일_${numPart}`;
  } else {
    const parts = name.split('_');
    if (parts.length >= 1) {
      // 첫 번째 파트가 숫자(정렬용)인 경우 두 번째 파트를 역명으로 사용
      if (/^\d+$/.test(parts[0]) && parts.length >= 2) {
        stationName = parts[1];
      } else {
        stationName = parts[0];
      }
    }
    // 역명 정리 (특수기호 제거)
    stationName = stationName.split('-')[0].split('(')[0].replace('역', '').trim();
  }

  // 4. 도면 유형 (PSD 여부)
  if (name.includes('PSD') || name.includes('스크린도어') || parentDirName.includes('PSD')) {
    planType = 'psd';
  }

  return { lineNumber, stationName, planType, floorName };
}

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];
  files.forEach(function(file) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
    } else {
      if (/\.(jpg|jpeg|png)$/i.test(file)) {
        arrayOfFiles.push(fullPath);
      }
    }
  });
  return arrayOfFiles;
}

async function bulkUpload(targetDir) {
  if (!fs.existsSync(targetDir)) {
    console.error(`Directory not found: ${targetDir}`);
    return;
  }

  const allFilePaths = getAllFiles(targetDir);
  console.log(`Starting upload for ${allFilePaths.length} files...`);

  let success = 0;
  let failed = 0;
  let skipped = 0;

  for (const filePath of allFilePaths) {
    const fileName = path.basename(filePath);
    const parentDir = path.basename(path.dirname(filePath));
    const { lineNumber, stationName, planType, floorName } = parseFileInfo(fileName, parentDir);

    if (!lineNumber || !stationName || stationName === '표지' || stationName === '노선도') {
      skipped++;
      continue;
    }

    try {
      const fileBuffer = fs.readFileSync(filePath);
      const typeFolder = planType === 'psd' ? 'psd' : 'station-layout';
      const storagePath = getSafeStorageKey(lineNumber, typeFolder, fileName, stationName);

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, fileBuffer, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) {
        console.error(`[ERR] ${fileName} -> ${uploadError.message}`);
        failed++;
        continue;
      }

      const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(storagePath);

      const { error: dbError } = await supabase.from('floor_plans').upsert({
        station_name: stationName,
        line_number: lineNumber,
        plan_type: planType,
        floor_name: floorName,
        image_url: urlData.publicUrl,
        storage_path: storagePath,
        file_name: fileName,
        file_size: fileBuffer.length,
        sort_order: 0
      }, { onConflict: 'station_name,line_number,plan_type,floor_name' });

      if (dbError) {
        console.error(`[DB_ERR] ${fileName} -> ${dbError.message}`);
        failed++;
      } else {
        console.log(`[OK] ${stationName} (${lineNumber}) ${floorName}`);
        success++;
      }
    } catch (err) {
      console.error(`[FATAL] ${fileName} -> ${err.message}`);
      failed++;
    }
  }

  console.log(`\nFinal: Success ${success}, Failed ${failed}, Skipped ${skipped}`);
}

bulkUpload('./public/subway-plans');
