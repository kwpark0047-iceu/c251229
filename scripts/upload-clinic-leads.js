const fs = require('fs');
const { parse } = require('csv-parse/sync');
const iconv = require('iconv-lite');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const proj4 = require('proj4');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// EPSG:5174 (LocalData 기본 좌표계) -> WGS84
proj4.defs("EPSG:5174", "+proj=tmerc +lat_0=38 +lon_0=127.0028902777778 +k=1 +x_0=200000 +y_0=500000 +ellps=bessel +units=m +no_defs +towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43");

async function main() {
  const filePath = 'D:\\Downloads\\서울시 의원 인허가 정보 (260527).csv';
  console.log('Reading file...');
  const buffer = fs.readFileSync(filePath);
  const decoded = iconv.decode(buffer, 'EUC-KR');
  
  console.log('Parsing CSV...');
  const records = parse(decoded, {
    columns: false,
    skip_empty_lines: true,
  });

  const headers = records[0];
  const dataRows = records.slice(1);
  console.log(`Found ${dataRows.length} records`);

  const BATCH_SIZE = 500;
  let successCount = 0;
  
  // 영업중인 것만 필터링 (영업상태코드 1 또는 13)
  const activeRows = dataRows.filter(row => row[4] === '1' || row[4] === '13');
  console.log(`Active records: ${activeRows.length}`);

  for (let i = 0; i < activeRows.length; i += BATCH_SIZE) {
    const batch = activeRows.slice(i, i + BATCH_SIZE);
    
    // 배치 내 mgt_no 추출
    const mgtNos = batch.map(row => row[1]).filter(Boolean);
    
    // 기존에 존재하는 mgt_no 확인
    const { data: existingData, error: selectError } = await supabase
      .from('leads')
      .select('mgt_no')
      .in('mgt_no', mgtNos);
      
    if (selectError) {
      console.error(`Error checking existing leads for batch ${i}:`, selectError.message);
      continue;
    }
    
    const existingMgtNos = new Set(existingData.map(d => d.mgt_no));
    
    // 존재하지 않는 새로운 리드만 추출
    const newLeads = batch.filter(row => !existingMgtNos.has(row[1])).map(row => {
      let lat = null, lng = null;
      if (row[21] && row[22] && !isNaN(Number(row[21]))) {
        try {
          const wgs = proj4('EPSG:5174', 'WGS84', [Number(row[21]), Number(row[22])]);
          lng = wgs[0];
          lat = wgs[1];
        } catch (e) { }
      }
      
      return {
        mgt_no: row[1],
        license_date: row[2] || null,
        operating_status: row[5],
        detailed_status: row[7],
        phone: row[11],
        lot_address: row[13],
        road_address: row[14],
        biz_name: row[16],
        medical_subject: row[20],
        coord_x: row[21] ? Number(row[21]) : null,
        coord_y: row[22] ? Number(row[22]) : null,
        latitude: lat,
        longitude: lng,
        category: 'HEALTH',
        service_id: '01_01_02_P', // 의원
        status: 'NEW',
      };
    }).filter(lead => lead.biz_name); // 이름이 있는 항목만

    if (newLeads.length === 0) {
      console.log(`Batch ${i} - All leads already exist or invalid`);
      continue;
    }

    const { data, error } = await supabase
      .from('leads')
      .insert(newLeads);
      
    if (error) {
      console.error(`Error inserting batch ${i}:`, error.message);
    } else {
      successCount += newLeads.length;
      console.log(`Inserted ${newLeads.length} new leads in batch ${i} (${successCount} total)`);
    }
  }
  
  console.log(`Finished updating DB. Successfully processed ${successCount} new active leads.`);
}

main().catch(console.error);
