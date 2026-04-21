/**
 * 吏?섏쿋 ??궗 ?꾨㈃ JPG ?뚯씪 ?쇨큵 ?낅줈???ㅽ겕由쏀듃
 *
 * ?ъ슜踰?
 * 1. Supabase?먯꽌 migrations/20260106000000_floor_plans_extension.sql ?ㅽ뻾
 * 2. Supabase Storage?먯꽌 'floor-plans' 踰꾪궥 ?앹꽦 (public)
 * 3. node scripts/upload-floor-plans.js ?ㅽ뻾
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase ?ㅼ젙
const SUPABASE_URL = 'https://yreoeqmcebnosmtlyump.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyZW9lcW1jZWJub3NtdGx5dW1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NzM4NzQsImV4cCI6MjA4MjU0OTg3NH0.Uv-c9TlQlv0yvNJemPQX-_MR4Ndn8A50rS2omGjySNI';
const BUCKET_NAME = 'floor-plans';

// JPG ?뚯씪 ?뚯뒪 寃쎈줈
const SOURCE_PATH = 'C:\\Users\\user\\Downloads\\subway_floors\\jpg_output';

// ?몄꽑 留ㅽ븨
const LINE_MAP = {
  '1?몄꽑': '1',
  '2?몄꽑': '2',
  '5?몄꽑': '5',
  '7?몄꽑': '7',
  '8?몄꽑': '8',
};

// ?꾨㈃ ?좏삎 留ㅽ븨
const PLAN_TYPE_MAP = {
  '??뎄?대룄硫?: 'station_layout',
  'PSD?꾨㈃': 'psd',
};

// ?대뜑紐??뚯떛
function parseFolderName(folderName) {
  const match = folderName.match(/吏?섏쿋_(\d+?몄꽑)_(??뎄?대룄硫?PSD?꾨㈃)/);
  if (!match) return null;

  return {
    lineNumber: LINE_MAP[match[1]],
    planType: PLAN_TYPE_MAP[match[2]],
  };
}

// ?뚯씪紐??뚯떛
function parseFileName(fileName) {
  const match = fileName.match(/^(\d+)_(.+?)(?:-(\d+))?\.JPG$/i);
  if (!match) return null;

  const sortOrder = parseInt(match[1], 10);
  const stationName = match[2];
  const pageNumber = match[3] ? parseInt(match[3], 10) : undefined;

  // ?쒖?? ?몄꽑?꾨뒗 嫄대꼫?
  if (stationName === '?쒖?' || stationName === '?몄꽑??) return null;

  return { stationName, sortOrder, pageNumber };
}

async function main() {
  console.log('=== 吏?섏쿋 ??궗 ?꾨㈃ ?낅줈???쒖옉 ===\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // ?뚯뒪 ?대뜑 ?뺤씤
  if (!fs.existsSync(SOURCE_PATH)) {
    console.error(`?ㅻ쪟: ?뚯뒪 寃쎈줈媛 議댁옱?섏? ?딆뒿?덈떎: ${SOURCE_PATH}`);
    process.exit(1);
  }

  // ?대뜑 紐⑸줉 議고쉶
  const folders = fs.readdirSync(SOURCE_PATH).filter(f =>
    fs.statSync(path.join(SOURCE_PATH, f)).isDirectory()
  );

  console.log(`?대뜑 ${folders.length}媛?諛쒓껄\n`);

  let totalUploaded = 0;
  let totalFailed = 0;
  let totalSkipped = 0;

  for (const folder of folders) {
    const folderInfo = parseFolderName(folder);
    if (!folderInfo) {
      console.log(`?ㅽ궢: ${folder} (?뚯떛 ?ㅽ뙣)`);
      continue;
    }

    console.log(`\n[${folder}] 泥섎━ 以?..`);
    console.log(`  ?몄꽑: ${folderInfo.lineNumber}?몄꽑, ?좏삎: ${folderInfo.planType}`);

    const folderPath = path.join(SOURCE_PATH, folder);
    const files = fs.readdirSync(folderPath).filter(f => f.toLowerCase().endsWith('.jpg'));

    console.log(`  ?뚯씪: ${files.length}媛?);

    for (const file of files) {
      const fileInfo = parseFileName(file);
      if (!fileInfo) {
        console.log(`    ?ㅽ궢: ${file} (?쒖?/?몄꽑???뚯떛?ㅽ뙣)`);
        totalSkipped++;
        continue;
      }

      const filePath = path.join(folderPath, file);
      const fileBuffer = fs.readFileSync(filePath);
      const fileStats = fs.statSync(filePath);

      // Storage 寃쎈줈 (?곷Ц ?뚯씪紐? PSD??_PSD ?묐???異붽?)
      const typeFolder = folderInfo.planType === 'psd' ? 'psd' : 'station-layout';
      const psdSuffix = folderInfo.planType === 'psd' ? '_PSD' : '';
      const pageStr = fileInfo.pageNumber ? `_p${fileInfo.pageNumber}` : '';
      const safeFileName = `line${folderInfo.lineNumber}_${String(fileInfo.sortOrder).padStart(3, '0')}${pageStr}${psdSuffix}.jpg`;
      const storagePath = `line-${folderInfo.lineNumber}/${typeFolder}/${safeFileName}`;

      try {
        // Storage ?낅줈??        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(storagePath, fileBuffer, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) {
          console.log(`    ?ㅻ쪟: ${file} - ${uploadError.message}`);
          totalFailed++;
          continue;
        }

        // Public URL
        const { data: urlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(storagePath);

        // ??챸 (?섏씠吏 踰덊샇 ?ы븿)
        const stationName = fileInfo.pageNumber && fileInfo.pageNumber > 1
          ? `${fileInfo.stationName} (${fileInfo.pageNumber})`
          : fileInfo.stationName;

        // DB ???(INSERT)
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
          console.log(`    DB ?ㅻ쪟: ${file} - ${dbError.message}`);
          totalFailed++;
          continue;
        }

        console.log(`    ?깃났: ${stationName}`);
        totalUploaded++;
      } catch (err) {
        console.log(`    ?덉쇅: ${file} - ${err.message}`);
        totalFailed++;
      }
    }
  }

  console.log('\n=== ?낅줈???꾨즺 ===');
  console.log(`?깃났: ${totalUploaded}媛?);
  console.log(`?ㅽ뙣: ${totalFailed}媛?);
  console.log(`?ㅽ궢: ${totalSkipped}媛?);
}

main().catch(console.error);
