/**
 * 1?몄꽑 寃쎈????꾨㈃ ?낅줈???ㅽ겕由쏀듃
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://yreoeqmcebnosmtlyump.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyZW9lcW1jZWJub3NtdGx5dW1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NzM4NzQsImV4cCI6MjA4MjU0OTg3NH0.Uv-c9TlQlv0yvNJemPQX-_MR4Ndn8A50rS2omGjySNI';
const BUCKET_NAME = 'floor-plans';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ?꾨㈃ ?대뜑 寃쎈줈
const FOLDER_PATH = 'C:\\Users\\user\\Downloads\\subway_floors\\jpg_output\\吏?섏쿋 1?몄꽑 寃쎈???留ㅼ껜?쒖븞???꾨㈃';

// ??챸 -> ?곷Ц 蹂??
const stationNameMap = {
  '湲덉젙??: 'geumjeong',
  '?섏썝??: 'suwon',
  '蹂묒젏??: 'byeongjeom',
  '?쒖젙由ъ뿭': 'seojeongri',
  '?됲깮??: 'pyeongtaek',
  '?먯젙??: 'dujeong',
  '泥쒖븞??: 'cheonan',
  '?⑥뼇?⑥쿇??: 'onyang-oncheon',
  '?먭탳??: 'pangyo',
  '?대ℓ??: 'imae',
  '寃쎄린愿묒＜??: 'gyeonggi-gwangju',
  '珥덉썡??: 'chowol',
  '?댁쿇??: 'icheon',
};

// ?뚯씪紐낆뿉????챸 異붿텧
function parseFileName(fileName) {
  // ?뺤떇: 01_湲덉젙??1.JPG ?먮뒗 07_蹂묒젏??JPG
  const match = fileName.match(/^(\d+)_(.+?)(-\d+)?\.JPG$/i);
  if (!match) return null;

  const sortOrder = parseInt(match[1], 10);
  let stationName = match[2];
  const page = match[3] ? parseInt(match[3].replace('-', ''), 10) : 1;

  // ?쒖?, ?덈궡 ?깆? 嫄대꼫?곌린
  if (['?쒖?', '?덈궡', '寃쎄컯?좏몴吏'].includes(stationName)) {
    return null;
  }

  const englishName = stationNameMap[stationName];
  if (!englishName) {
    console.log(`  ?????녿뒗 ??챸: ${stationName}`);
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
  console.log('1?몄꽑 寃쎈????꾨㈃ ?낅줈???쒖옉...\n');

  const files = fs.readdirSync(FOLDER_PATH).filter(f => f.toLowerCase().endsWith('.jpg'));
  console.log(`珥?${files.length}媛??뚯씪 諛쒓껄\n`);

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const fileName of files) {
    const parsed = parseFileName(fileName);

    if (!parsed) {
      console.log(`嫄대꼫?곌린: ${fileName}`);
      skipped++;
      continue;
    }

    const filePath = path.join(FOLDER_PATH, fileName);
    const fileBuffer = fs.readFileSync(filePath);
    const storageFileName = `${String(parsed.sortOrder).padStart(2, '0')}_${parsed.englishName}${parsed.page > 1 ? '-' + parsed.page : ''}.jpg`;
    const storagePath = `line-1/station-layout/${storageFileName}`;

    console.log(`?낅줈??以? ${fileName} -> ${parsed.stationName}`);

    try {
      // Storage ?낅줈??
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(storagePath, fileBuffer, {
          contentType: 'image/jpeg',
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) {
        console.error(`  Storage ?ㅻ쪟: ${uploadError.message}`);
        failed++;
        continue;
      }

      // Public URL 媛?몄삤湲?
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(storagePath);

      // DB?????
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
        console.error(`  DB ?ㅻ쪟: ${dbError.message}`);
        failed++;
        continue;
      }

      console.log(`  ?꾨즺: ${urlData.publicUrl}`);
      uploaded++;

    } catch (err) {
      console.error(`  ?ㅻ쪟: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n?낅줈???꾨즺!`);
  console.log(`- ?깃났: ${uploaded}`);
  console.log(`- 嫄대꼫?곌린: ${skipped}`);
  console.log(`- ?ㅽ뙣: ${failed}`);
}

uploadFloorPlans().catch(console.error);
