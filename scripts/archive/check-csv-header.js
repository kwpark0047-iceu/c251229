
const XLSX = require('xlsx');
const path = require('path');

const filePath = 'D:\\Downloads\\서울시 의원 인허가 정보(수정).csv';

try {
  console.log('파일 읽기 시도:', filePath);
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // 첫 5행만 JSON으로 변환하여 헤더와 데이터 구조 확인
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, range: 0 }).slice(0, 5);
  
  console.log('--- CSV 헤더 및 샘플 데이터 ---');
  data.forEach((row, index) => {
    console.log(`Row ${index}:`, row);
  });
} catch (error) {
  console.error('파일 읽기 오류:', error);
}
