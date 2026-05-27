// scripts/import-leads-csv.ts

import fs from 'fs';
import Papa from 'papaparse';
import { saveLeads } from '../src/app/lead-manager/supabase-service';
import { Lead, BusinessCategory, LeadStatus } from '../src/app/lead-manager/types';

/**
 * Map CSV record to Lead interface.
 */
function mapRecordToLead(record: Record<string, string>): Lead {
  return {
    id: '',
    bizName: record['사업장명'] || record['사업장명(한글)'] || record['시설명'] || '',
    bizId: record['사업자등록번호'] || record['사업자번호'] || undefined,
    licenseDate: record['인허가일'] || record['인허가일자'] || undefined,
    roadAddress: record['도로명주소'] || undefined,
    lotAddress: record['지번주소'] || undefined,
    coordX: record['좌표 X'] ? Number(record['좌표 X']) : undefined,
    coordY: record['좌표 Y'] ? Number(record['좌표 Y']) : undefined,
    latitude: record['위도'] ? Number(record['위도']) : undefined,
    longitude: record['경도'] ? Number(record['경도']) : undefined,
    phone: record['전화번호'] || undefined,
    medicalSubject: record['업태명'] || record['분류'] || undefined,
    category: (record['업종'] as BusinessCategory) || undefined,
    serviceId: record['서비스ID'] || undefined,
    serviceName: record['서비스명'] || undefined,
    nearestStation: record['가장가까운역'] || undefined,
    nearestExitNo: record['출구번호'] || undefined,
    stationDistance: record['역까지거리'] ? Number(record['역까지거리']) : undefined,
    stationLines: record['노선'] ? record['노선'].split('/') : undefined,
    status: (record['상태'] as LeadStatus) || 'NEW',
    notes: record['메모'] || undefined,
    assignedTo: undefined,
    assignedToName: undefined,
    assignedAt: undefined,
    mgtNo: record['관리번호'] || undefined,
    operatingStatus: record['영업상태'] || undefined,
    detailedStatus: record['상세상태'] || undefined,
    createdAt: undefined,
    updatedAt: undefined,
  };
}

async function main() {
  const csvPath = process.argv[2] || 'D:/Downloads/서울시 의원 인허가 정보 (260527).csv';
  if (!fs.existsSync(csvPath)) {
    console.error('CSV file not found at', csvPath);
    process.exit(1);
  }
  const raw = fs.readFileSync(csvPath, { encoding: 'utf8' });
  const parsed = Papa.parse<Record<string, string>>(raw, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
  });

  if (parsed.errors.length) {
    console.error('CSV parsing errors:', parsed.errors);
    process.exit(1);
  }

  const leads: Lead[] = parsed.data.map(mapRecordToLead);
  console.log(`Parsed ${leads.length} leads from CSV.`);

  const result = await saveLeads(leads, (cur, total, status) => {
    console.log(`[Progress] ${cur}/${total} - ${status}`);
  });
  console.log('Import result:', result);
}

main().catch(err => {
  console.error('Unexpected error:', err);
});
