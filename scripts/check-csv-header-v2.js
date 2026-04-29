
const XLSX = require('xlsx');
const fs = require('fs');

const filePath = 'D:\\Downloads\\서울시 의원 인허가 정보(수정).csv';

try {
  // 파일을 Buffer로 읽어오기
  const buffer = fs.readFileSync(filePath);
  
  // xlsx로 읽되, CSV의 경우 인코딩 문제 해결을 위해 시도
  // 보통 한국어 CSV는 CP949(949) 또는 UTF-8입니다.
  const workbook = XLSX.read(buffer, { type: 'buffer', codepage: 949 });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  
  console.log('--- CSV 컬럼명 확인 ---');
  console.log(data[0]); // 헤더 출력
  
  console.log('--- 샘플 데이터 (1번 행) ---');
  console.log(data[1]);
} catch (error) {
  console.error('오류 발생:', error);
}
