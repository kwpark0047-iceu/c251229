// upload-floor-plans.js
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration (keep existing values)
const SUPABASE_URL = 'https://yreoeqmcebnosmtlyump.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyZW9lcW1jZWJub3NtdGx5dW1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NzM4NzQsImV4cCI6MjA4MjU0OTg3NH0.Uv-c9TlQlv0yvNJemPQX-_MR4Ndn8A50rS2omGjySNI';
const BUCKET_NAME = 'floor-plans';

// Local folder containing JPG output from the floor‑plan extraction step
const SOURCE_PATH = 'C:\\Users\\user\\Downloads\\subway_floors\\jpg_output';

// Mapping from Korean folder identifiers to line numbers (adjust if needed)
const LINE_MAP = {
  '1': '1',
  '2': '2',
  '5': '5',
  '7': '7',
  '8': '8',
};

// Mapping of plan type strings used in folder names
const PLAN_TYPE_MAP = {
  station_layout: 'station_layout',
  psd: 'psd',
};

/** Extract line number and plan type from a folder name.
 * Expected format: <prefix>_<lineNumber>_<planType>
 */
function parseFolderName(folderName) {
  const match = folderName.match(/_(\d+)_([a-zA-Z]+)$/);
  if (!match) return null;
  const lineKey = match[1];
  const planKey = match[2].toLowerCase();
  const lineNumber = LINE_MAP[lineKey];
  const planType = PLAN_TYPE_MAP[planKey];
  if (!lineNumber || !planType) return null;
  return { lineNumber, planType };
}

/** Extract information from a JPG file name.
 * Expected format: <order>_<stationName>(-<page>)?.JPG
 */
function parseFileName(fileName) {
  const match = fileName.match(/^(\d+)_(.+?)(?:-(\d+))?\.JPG$/i);
  if (!match) return null;
  const sortOrder = parseInt(match[1], 10);
  const stationName = match[2];
  const pageNumber = match[3] ? parseInt(match[3], 10) : undefined;
  if (!stationName) return null;
  return { stationName, sortOrder, pageNumber };
}

async function main() {
  console.log('=== Starting floor‑plan upload ===\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  if (!fs.existsSync(SOURCE_PATH)) {
    console.error(`Source path does not exist: ${SOURCE_PATH}`);
    process.exit(1);
  }

  const folders = fs.readdirSync(SOURCE_PATH).filter((f) => {
    return fs.statSync(path.join(SOURCE_PATH, f)).isDirectory();
  });

  console.log(`Found ${folders.length} folders.\n`);

  let totalUploaded = 0;
  let totalFailed = 0;
  let totalSkipped = 0;

  for (const folder of folders) {
    const folderInfo = parseFolderName(folder);
    if (!folderInfo) {
      console.warn(`Skipping unknown folder: ${folder}`);
      continue;
    }

    const folderPath = path.join(SOURCE_PATH, folder);
    const files = fs.readdirSync(folderPath).filter((f) => f.toLowerCase().endsWith('.jpg'));

    console.log(`Folder ${folder} → line ${folderInfo.lineNumber}, type ${folderInfo.planType}, ${files.length} files`);

    for (const file of files) {
      const fileInfo = parseFileName(file);
      if (!fileInfo) {
        console.warn(`Skipping unrecognised file: ${file}`);
        totalSkipped++;
        continue;
      }

      const filePath = path.join(folderPath, file);
      const fileBuffer = fs.readFileSync(filePath);
      const fileStats = fs.statSync(filePath);

      const typeFolder = folderInfo.planType === 'psd' ? 'psd' : 'station-layout';
      const psdSuffix = folderInfo.planType === 'psd' ? '_PSD' : '';
      const pageStr = fileInfo.pageNumber ? `_p${fileInfo.pageNumber}` : '';
      const safeFileName = `line${folderInfo.lineNumber}_${String(fileInfo.sortOrder).padStart(3, '0')}${pageStr}${psdSuffix}.jpg`;
      const storagePath = `line-${folderInfo.lineNumber}/${typeFolder}/${safeFileName}`;

      try {
        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(storagePath, fileBuffer, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) {
          console.error(`Upload error for ${file}: ${uploadError.message}`);
          totalFailed++;
          continue;
        }

        const { data: urlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(storagePath);

        const stationName = fileInfo.pageNumber && fileInfo.pageNumber > 1
          ? `${fileInfo.stationName} (${fileInfo.pageNumber})`
          : fileInfo.stationName;

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
          console.error(`DB insert error for ${file}: ${dbError.message}`);
          totalFailed++;
          continue;
        }

        console.log(`✅ Uploaded ${stationName}`);
        totalUploaded++;
      } catch (err) {
        console.error(`Unexpected error for ${file}: ${err.message}`);
        totalFailed++;
      }
    }
  }

  console.log('\n=== Upload Summary ===');
  console.log(`Uploaded: ${totalUploaded}`);
  console.log(`Failed: ${totalFailed}`);
  console.log(`Skipped: ${totalSkipped}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
