// Script to import 서울시 체력단련장업 인허가 정보 CSV into Supabase
import { createClient as createSupabaseClient } from '../src/lib/supabase/client';
import 'dotenv/config';
import { parse } from 'csv-parse';
import path from 'path';
import { createReadStream } from 'fs';

// Adjust this path if the CSV is moved
const csvFilePath = 'D:/Downloads/서울시 체력단련장업 인허가 정보 (2606021).csv';

// Initialize Supabase client using @supabase/supabase-js
const supabase = createSupabaseClient();

// Helper to map CSV columns to DB fields – adjust column names as needed
function mapRowToRecord(row: any): any {
  // Example column headers (you may need to adjust based on actual CSV)
  // 관리번호, 인허가일자, 영업상태코드, 영업상태명, 사업장명, 소재지주소, 전화번호, 시설규모, 좌표X, 좌표Y
  return {
    id: row['관리번호']?.trim(),
    approval_date: row['인허가일자']?.trim(),
    status_code: row['영업상태코드']?.trim(),
    status_name: row['영업상태명']?.trim(),
    business_name: row['사업장명']?.trim(),
    address: row['소재지주소']?.trim(),
    phone: row['전화번호']?.trim(),
    facility_size: row['시설규모']?.trim(),
    coord_x: row['좌표X'] ? Number(row['좌표X']) : null,
    coord_y: row['좌표Y'] ? Number(row['좌표Y']) : null,
  };
}

async function importCsv() {
  const parser = parse({ columns: true, trim: true, skip_empty_lines: true });

  const stream = createReadStream(csvFilePath).pipe(parser);

  let count = 0;
  for await (const row of stream) {
    const record = mapRowToRecord(row);
    if (!record.id) continue; // skip rows without primary key

    const { error } = await supabase.from('gym_licenses').upsert(record, { onConflict: 'id' });
    if (error) {
      console.error(`Error upserting id ${record.id}:`, error.message);
    } else {
      count++;
    }
  }
  console.log(`Import finished. Upserted ${count} records.`);
}

importCsv().catch((e) => console.error('Unexpected error:', e));
