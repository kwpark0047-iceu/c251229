const XLSX = require('xlsx');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });
require('./load-vault');

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const filePath = 'D:\\Downloads\\포스터_인벤토리현황_202608121532.xls';

function parsePosterXls() {
  console.log(`Reading Excel file: ${filePath}...`);
  const wb = XLSX.readFile(filePath);
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });

  const headers = rows[3];
  console.log('Total rows:', rows.length);
  console.log('Headers:', headers);

  const today = new Date('2026-08-12');
  const dateRangeRegex = /\((\d{4}-\d{2}-\d{2})\s*~\s*(\d{4}-\d{2}-\d{2})\)/;

  const items = [];
  const lineCounts = {};
  const gradeCounts = {};
  const statusCounts = { AVAILABLE: 0, OCCUPIED: 0, RESERVED: 0, UNAVAILABLE: 0 };
  const availabilityByMonth = {};

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

    // Line normalization (1 -> '1호선', '2' -> '2호선', '3호선' -> '3호선')
    let lineName = rawLine;
    if (/^\d+$/.test(rawLine)) {
      lineName = `${rawLine}호선`;
    }

    lineCounts[lineName] = (lineCounts[lineName] || 0) + 1;
    gradeCounts[grade] = (gradeCounts[grade] || 0) + 1;

    let status = 'AVAILABLE';
    let availableFrom = null;
    let contractInfo = '';

    // Check August 2026 cell (index 8)
    const currentMonthCell = r[8];

    if (unused && unused !== '') {
      status = 'UNAVAILABLE';
      contractInfo = `[미사용/점검] ${unused}`;
    } else if (currentMonthCell && String(currentMonthCell).trim() !== '') {
      const cellText = String(currentMonthCell).trim();
      contractInfo = cellText;

      if (cellText.includes('[부킹]')) {
        status = 'RESERVED';
      } else {
        status = 'OCCUPIED';
      }

      // Extract contract date range
      const match = cellText.match(dateRangeRegex);
      if (match) {
        const startDateStr = match[1];
        const endDateStr = match[2];
        const endDate = new Date(endDateStr);

        if (endDate < today) {
          // Contract expired before today!
          status = 'AVAILABLE';
          availableFrom = today.toISOString().split('T')[0];
        } else {
          // Contract active! Next available day is day after endDate
          const nextDay = new Date(endDate);
          nextDay.setDate(nextDay.getDate() + 1);
          availableFrom = nextDay.toISOString().split('T')[0];

          // Track availability month
          const nextMonthKey = `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(2, '0')}`;
          availabilityByMonth[nextMonthKey] = (availabilityByMonth[nextMonthKey] || 0) + 1;
        }
      }
    } else {
      status = 'AVAILABLE';
      availableFrom = today.toISOString().split('T')[0];
    }

    statusCounts[status] = (statusCounts[status] || 0) + 1;

    const descParts = [];
    if (lineName) descParts.push(lineName);
    if (grade) descParts.push(`${grade}등급`);
    if (memo) descParts.push(memo);

    items.push({
      station_name: station,
      location_code: locationCode,
      ad_type: '포스터',
      ad_size: adSize || '770*1070',
      price_monthly: priceMonthly,
      price_weekly: null,
      availability_status: status,
      available_from: availableFrom,
      description: descParts.join(' / ') || '포스터 광고',
      line_name: lineName,
      grade: grade,
      yearly_price: priceYear,
      contract_info: contractInfo
    });
  }

  console.log('\nParsed Items Summary:');
  console.log('Total items:', items.length);
  console.log('Status breakdown:', statusCounts);
  console.log('Line breakdown:', lineCounts);
  console.log('Grade breakdown:', gradeCounts);
  console.log('Future available_from month distribution:', availabilityByMonth);

  return items;
}

parsePosterXls();
