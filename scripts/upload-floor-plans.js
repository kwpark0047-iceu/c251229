/**
 * 지하철 역사 도면 JPG 파일 일괄 업로드 스크립트
 *
 * 사용법:
 * 1. Supabase에서 migrations/20260106000000_floor_plans_extension.sql 실행
 * 2. Supabase Storage에서 'floor-plans' 버킷 생성 (public)
 * 3. node scripts/upload-floor-plans.js 실행
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase 설정
const SUPABASE_URL = 'https://yreoeqmcebnosmtlyump.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyZW9lcW1jZWJub3NtdGx5dW1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NzM4NzQsImV4cCI6MjA4MjU0OTg3NH0.Uv-c9TlQlv0yvNJemPQX-_MR4Ndn8A50rS2omGjySNI';
const BUCKET_NAME = 'floor-plans';

// JPG 파일 소스 경로
const SOURCE_PATH = 'C:\\Users\\user\\Downloads\\subway_floors\\jpg_output';

// 노선 매핑
const LINE_MAP = {
  '1호선': '1',
  '2호선': '2',
  '5호선': '5',
  '7호선': '7',
  '8호선': '8',
};

// 도면 유형 매핑
const PLAN_TYPE_MAP = {
  '역구내도면': 'station_layout',
  'PSD도면': 'psd',
};

// 폴더명 파싱
function parseFolderName(folderName) {
  const match = folderName.match(/지하철_(\d+호선)_(역구내도면|PSD도면)/);
  if (!match) return null;

  return {
    lineNumber: LINE_MAP[match[1]],
    planType: PLAN_TYPE_MAP[match[2]],
  };
}

// 파일명 파싱
function parseFileName(fileName) {
  const match = fileName.match(/^(\d+)_(.+?)(?:-(\d+))?\.JPG$/i);
  if (!match) return null;

  const sortOrder = parseInt(match[1], 10);
  const stationName = match[2];
  const pageNumber = match[3] ? parseInt(match[3], 10) : undefined;

  // 표지와 노선도는 건너뜀
  if (stationName === '표지' || stationName === '노선도') return null;

  return { stationName, sortOrder, pageNumber };
}

async function main() {
  console.log('=== 지하철 역사 도면 업로드 시작 ===\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // 소스 폴더 확인
  if (!fs.existsSync(SOURCE_PATH)) {
    console.error(`오류: 소스 경로가 존재하지 않습니다: ${SOURCE_PATH}`);
    process.exit(1);
  }

  // 폴더 목록 조회
  const folders = fs.readdirSync(SOURCE_PATH).filter(f =>
    fs.statSync(path.join(SOURCE_PATH, f)).isDirectory()
  );

  console.log(`폴더 ${folders.length}개 발견\n`);

  let totalUploaded = 0;
  let totalFailed = 0;
  let totalSkipped = 0;

  for (const folder of folders) {
    const folderInfo = parseFolderName(folder);
    if (!folderInfo) {
      console.log(`스킵: ${folder} (파싱 실패)`);
      continue;
    }

    console.log(`\n[${folder}] 처리 중...`);
    console.log(`  노선: ${folderInfo.lineNumber}호선, 유형: ${folderInfo.planType}`);

    const folderPath = path.join(SOURCE_PATH, folder);
    const files = fs.readdirSync(folderPath).filter(f => f.toLowerCase().endsWith('.jpg'));

    console.log(`  파일: ${files.length}개`);

    for (const file of files) {
      const fileInfo = parseFileName(file);
      if (!fileInfo) {
        console.log(`    스킵: ${file} (표지/노선도/파싱실패)`);
        totalSkipped++;
        continue;
      }

      const filePath = path.join(folderPath, file);
      const fileBuffer = fs.readFileSync(filePath);
      const fileStats = fs.statSync(filePath);

      // Storage 경로 (영문 파일명, PSD는 _PSD 접미사 추가)
      const typeFolder = folderInfo.planType === 'psd' ? 'psd' : 'station-layout';
      const psdSuffix = folderInfo.planType === 'psd' ? '_PSD' : '';
      const pageStr = fileInfo.pageNumber ? `_p${fileInfo.pageNumber}` : '';
      const safeFileName = `line${folderInfo.lineNumber}_${String(fileInfo.sortOrder).padStart(3, '0')}${pageStr}${psdSuffix}.jpg`;
      const storagePath = `line-${folderInfo.lineNumber}/${typeFolder}/${safeFileName}`;

      try {
        // Storage 업로드
        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(storagePath, fileBuffer, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) {
          console.log(`    오류: ${file} - ${uploadError.message}`);
          totalFailed++;
          continue;
        }

        // Public URL
        const { data: urlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(storagePath);

        // 역명 (페이지 번호 포함)
        const stationName = fileInfo.pageNumber && fileInfo.pageNumber > 1
          ? `${fileInfo.stationName} (${fileInfo.pageNumber})`
          : fileInfo.stationName;

        // DB 저장 (INSERT)
        const { error: dbError } = await supabase
          .from('floor_plans')
          .insert({
            station_name: stationName,
            line_number: folderInfo.lineNumber,
            plan_type: folderInfo.planType,
            floor_name: 'B1',
            image_url: urlData.publicUrl,
            storage_path: storagePath,
            file_name: safeFileName,
            file_size: fileStats.size,
            sort_order: fileInfo.sortOrder,
          });

        if (dbError) {
          console.log(`    DB 오류: ${file} - ${dbError.message}`);
          totalFailed++;
          continue;
        }

        console.log(`    성공: ${stationName}`);
        totalUploaded++;
      } catch (err) {
        console.log(`    예외: ${file} - ${err.message}`);
        totalFailed++;
      }
    }
  }

  console.log('\n=== 업로드 완료 ===');
  console.log(`성공: ${totalUploaded}개`);
  console.log(`실패: ${totalFailed}개`);
  console.log(`스킵: ${totalSkipped}개`);
}

main().catch(console.error);
