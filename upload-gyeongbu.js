/**
 * 1호선 경부선 도면 업로드 스크립트
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://yreoeqmcebnosmtlyump.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyZW9lcW1jZWJub3NtdGx5dW1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NzM4NzQsImV4cCI6MjA4MjU0OTg3NH0.Uv-c9TlQlv0yvNJemPQX-_MR4Ndn8A50rS2omGjySNI';
const BUCKET_NAME = 'floor-plans';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// 도면 폴더 경로
const FOLDER_PATH = 'C:\\Users\\user\\Downloads\\subway_floors\\jpg_output\\지하철 1호선 경부선 매체제안서 도면';

// 역명 -> 영문 변환
const stationNameMap = {
  '금정역': 'geumjeong',
  '수원역': 'suwon',
  '병점역': 'byeongjeom',
  '서정리역': 'seojeongri',
  '평택역': 'pyeongtaek',
  '두정역': 'dujeong',
  '천안역': 'cheonan',
  '온양온천역': 'onyang-oncheon',
  '판교역': 'pangyo',
  '이매역': 'imae',
  '경기광주역': 'gyeonggi-gwangju',
  '초월역': 'chowol',
  '이천역': 'icheon',
};

// 파일명에서 역명 추출
function parseFileName(fileName) {
  // 형식: 01_금정역-1.JPG 또는 07_병점역.JPG
  const match = fileName.match(/^(\d+)_(.+?)(-\d+)?\.JPG$/i);
  if (!match) return null;

  const sortOrder = parseInt(match[1], 10);
  let stationName = match[2];
  const page = match[3] ? parseInt(match[3].replace('-', ''), 10) : 1;

  // 표지, 안내 등은 건너뛰기
  if (['표지', '안내', '경강선표지'].includes(stationName)) {
    return null;
  }

  const englishName = stationNameMap[stationName];
  if (!englishName) {
    console.log(`  알 수 없는 역명: ${stationName}`);
    return null;
  }

  return {
    sortOrder,
    stationName,
    englishName,
    page,
    fullName: stationName + (match[3] || '')
  };
}

async function uploadFloorPlans() {
  console.log('1호선 경부선 도면 업로드 시작...\n');

  const files = fs.readdirSync(FOLDER_PATH).filter(f => f.toLowerCase().endsWith('.jpg'));
  console.log(`총 ${files.length}개 파일 발견\n`);

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const fileName of files) {
    const parsed = parseFileName(fileName);

    if (!parsed) {
      console.log(`건너뛰기: ${fileName}`);
      skipped++;
      continue;
    }

    const filePath = path.join(FOLDER_PATH, fileName);
    const fileBuffer = fs.readFileSync(filePath);
    const storageFileName = `${String(parsed.sortOrder).padStart(2, '0')}_${parsed.englishName}${parsed.page > 1 ? '-' + parsed.page : ''}.jpg`;
    const storagePath = `line-1/station-layout/${storageFileName}`;

    console.log(`업로드 중: ${fileName} -> ${parsed.stationName}`);

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
        console.error(`  Storage 오류: ${uploadError.message}`);
        failed++;
        continue;
      }

      // Public URL 가져오기
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(storagePath);

      // DB에 저장
      const { error: dbError } = await supabase
        .from('floor_plans')
        .upsert({
          station_name: parsed.stationName,
          line_number: '1',
          plan_type: 'station_layout',
          floor_name: `page-${parsed.page}`,
          image_url: urlData.publicUrl,
          storage_path: storagePath,
          file_name: fileName,
          file_size: fileBuffer.length,
          sort_order: parsed.sortOrder,
        }, {
          onConflict: 'station_name,line_number,plan_type,floor_name',
        });

      if (dbError) {
        console.error(`  DB 오류: ${dbError.message}`);
        failed++;
        continue;
      }

      console.log(`  완료: ${urlData.publicUrl}`);
      uploaded++;

    } catch (err) {
      console.error(`  오류: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n업로드 완료!`);
  console.log(`- 성공: ${uploaded}`);
  console.log(`- 건너뛰기: ${skipped}`);
  console.log(`- 실패: ${failed}`);
}

uploadFloorPlans().catch(console.error);
