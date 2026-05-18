const XLSX = require('xlsx');
const fs = require('fs');

const filePath = 'D:\\Downloads\\서울시 의원 인허가 정보 (260514).csv';

try {
  const buffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(buffer, { type: 'buffer', codepage: 949 });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  console.log('--- CSV (260514) 컬럼명 ---');
  console.log(data[0]);
  console.log('--- 샘플 데이터 (1번 행) ---');
  console.log(data[1]);
} catch (error) {
  console.error('Error:', error);
}
