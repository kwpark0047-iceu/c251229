const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });
require('./load-vault');

const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Supabase URL or Key missing in environment.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const filePath = 'D:\\Downloads\\포스터_인벤토리현황_202608121532.xls';

async function importPosterInventory() {
  console.log(`Reading poster inventory file: ${filePath}...`);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

  console.log(`Total rows in Excel: ${rows.length}`);
  const today = new Date('2026-08-12');
  const dateRangeRegex = /\((\d{4}-\d{2}-\d{2})\s*~\s*(\d{4}-\d{2}-\d{2})\)/;

  const items = [];
  let availableCount = 0;
  let occupiedCount = 0;
  let reservedCount = 0;
  let unavailableCount = 0;

  for (let i = 4; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length === 0 || !r[1]) continue;

    const rawLine = String(r[0] || '').trim();
    const station = String(r[1] || '').trim();
    const grade = String(r[2] || '').trim();
    const priceYearRaw = r[3];
    const priceYear = typeof priceYearRaw === 'number' ? priceYearRaw : parseFloat(String(priceYearRaw || '0').replace(/,/g, ''));
    const priceMonthly = priceYear > 0 ? Math.round(priceYear / 12) : null;
    const locationCode = String(r[4] || '').trim();
    const adSize = String(r[5] || '').trim();
    const memo = String(r[6] || '').trim();
    const unused = String(r[7] || '').trim();

    // Standardize line name
    let lineName = rawLine;
    if (/^\d+$/.test(rawLine)) {
      lineName = `${rawLine}호선`;
    }

    let status = 'AVAILABLE';
    let availableFrom = null;
    let contractInfo = '';

    const currentMonthCell = r[8]; // 2026년 08월 cell

    if (unused && unused !== '') {
      status = 'UNAVAILABLE';
      contractInfo = `[미사용/점검] ${unused}`;
      unavailableCount++;
    } else if (currentMonthCell && String(currentMonthCell).trim() !== '') {
      const cellText = String(currentMonthCell).trim();
      contractInfo = cellText;

      const match = cellText.match(dateRangeRegex);
      if (match) {
        const startDateStr = match[1];
        const endDateStr = match[2];
        const endDate = new Date(endDateStr);

        if (endDate < today) {
          status = 'AVAILABLE';
          availableFrom = today.toISOString().split('T')[0];
          availableCount++;
        } else {
          status = cellText.includes('[부킹]') ? 'RESERVED' : 'OCCUPIED';
          if (status === 'RESERVED') reservedCount++;
          else occupiedCount++;

          const nextDay = new Date(endDate);
          nextDay.setDate(nextDay.getDate() + 1);
          availableFrom = nextDay.toISOString().split('T')[0];
        }
      } else {
        status = cellText.includes('[부킹]') ? 'RESERVED' : 'OCCUPIED';
        if (status === 'RESERVED') reservedCount++;
        else occupiedCount++;
        availableFrom = null;
      }
    } else {
      status = 'AVAILABLE';
      availableFrom = today.toISOString().split('T')[0];
      availableCount++;
    }

    const descParts = [];
    if (lineName) descParts.push(lineName);
    if (grade) descParts.push(`${grade}등급`);
    if (memo) descParts.push(memo);
    if (contractInfo) descParts.push(`계약: ${contractInfo}`);

    items.push({
      station_name: station,
      location_code: locationCode,
      ad_type: '포스터',
      ad_size: adSize || '770*1070',
      price_monthly: priceMonthly,
      price_weekly: null,
      availability_status: status,
      available_from: availableFrom,
      description: descParts.join(' / '),
    });
  }

  console.log(`Parsed ${items.length} poster inventory items.`);
  console.log(`- Immediate Available: ${availableCount}`);
  console.log(`- Occupied: ${occupiedCount}`);
  console.log(`- Reserved: ${reservedCount}`);
  console.log(`- Unavailable: ${unavailableCount}`);

  // Fetch count before import
  const { count: countBefore } = await supabase.from('ad_inventory').select('*', { count: 'exact', head: true });
  console.log(`Current ad_inventory total count before update: ${countBefore}`);

  // Batch Upsert (50 items per batch)
  const BATCH_SIZE = 50;
  let upsertedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const { error } = await supabase
      .from('ad_inventory')
      .upsert(batch, { onConflict: 'station_name,location_code' });

    if (error) {
      console.error(`Batch ${Math.floor(i / BATCH_SIZE) + 1} error:`, error.message);
      errorCount += batch.length;
    } else {
      upsertedCount += batch.length;
      if (upsertedCount % 500 === 0 || i + BATCH_SIZE >= items.length) {
        console.log(`Upserted ${upsertedCount}/${items.length} items...`);
      }
    }
  }

  const { count: countAfter } = await supabase.from('ad_inventory').select('*', { count: 'exact', head: true });
  console.log(`\n========================================`);
  console.log(`Poster Inventory Update Complete!`);
  console.log(`- Parsed Items from XLS: ${items.length}`);
  console.log(`- Successfully Upserted: ${upsertedCount}`);
  console.log(`- Errors: ${errorCount}`);
  console.log(`- Previous Total ad_inventory Count: ${countBefore}`);
  console.log(`- Final Total ad_inventory Count: ${countAfter}`);
  console.log(`========================================`);
}

importPosterInventory().catch(console.error);
