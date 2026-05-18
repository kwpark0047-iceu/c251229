const XLSX = require('xlsx');
const fs = require('fs');

const file1 = 'D:\\Downloads\\서울시 의원 인허가 정보 (260514).csv';
const file2 = 'D:\\Downloads\\서울시 의원 인허가 정보(수정).csv';

function analyzeFile(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    const workbook = XLSX.read(buffer, { type: 'buffer', codepage: 949 });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    const header = rows[0];
    const dataRows = rows.slice(1);
    
    let validCoords = 0;
    let validAddress = 0;
    let operatingCount = 0;
    
    // Find column indexes
    const bizNameIdx = header.indexOf('사업장명');
    const roadAddressIdx = header.indexOf('도로명주소');
    const lotAddressIdx = header.indexOf('지번주소');
    const statusIdx = header.indexOf('영업상태명');
    const cxIdx = header.indexOf('좌표정보(X)');
    const cyIdx = header.indexOf('좌표정보(Y)');
    
    for (const row of dataRows) {
      const bizName = row[bizNameIdx];
      const roadAddress = row[roadAddressIdx];
      const lotAddress = row[lotAddressIdx];
      const status = row[statusIdx];
      const cx = parseFloat(row[cxIdx]);
      const cy = parseFloat(row[cyIdx]);
      
      if (status && status.includes('영업')) {
        operatingCount++;
      }
      if ((roadAddress && String(roadAddress).trim()) || (lotAddress && String(lotAddress).trim())) {
        validAddress++;
      }
      if (!isNaN(cx) && !isNaN(cy) && cx > 0 && cy > 0) {
        validCoords++;
      }
    }
    
    console.log(`=== Analysis for ${filePath.split('\\').pop()} ===`);
    console.log('Total rows:', dataRows.length);
    console.log('Operating status rows:', operatingCount);
    console.log('Valid address rows:', validAddress);
    console.log('Valid coordinate rows:', validCoords);
  } catch (error) {
    console.error(`Error analyzing ${filePath}:`, error.message);
  }
}

analyzeFile(file1);
analyzeFile(file2);
