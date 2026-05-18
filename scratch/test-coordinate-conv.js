const XLSX = require('xlsx');
const fs = require('fs');
const proj4 = require('proj4');

// EPSG:2097
proj4.defs("EPSG:2097", "+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=500000 +ellps=bessel +units=m +no_defs +towgs84=-115.80,474.99,674.11,1.16,-2.31,-1.63,6.43");

const filePath = 'D:\\Downloads\\서울시 의원 인허가 정보 (260514).csv';

try {
  const buffer = fs.readFileSync(filePath);
  const workbook = XLSX.read(buffer, { type: 'buffer', codepage: 949 });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
  const header = data[0];
  const rows = data.slice(1);
  
  const cxIdx = header.indexOf('좌표정보(X)');
  const cyIdx = header.indexOf('좌표정보(Y)');
  const nameIdx = header.indexOf('사업장명');
  const addrIdx = header.indexOf('도로명주소');
  
  let count = 0;
  for (const row of rows) {
    const cx = parseFloat(row[cxIdx]);
    const cy = parseFloat(row[cyIdx]);
    const name = row[nameIdx];
    const addr = row[addrIdx];
    
    if (!isNaN(cx) && !isNaN(cy) && cx > 0 && cy > 0) {
      const converted = proj4('EPSG:2097', 'WGS84', [cx, cy]);
      console.log(`Clinic: ${name}`);
      console.log(`Original: X=${cx}, Y=${cy}`);
      console.log(`WGS84: Lng=${converted[0]}, Lat=${converted[1]}`);
      console.log(`Address: ${addr}`);
      console.log('---');
      count++;
      if (count >= 5) break;
    }
  }
} catch (error) {
  console.error('Error:', error);
}
