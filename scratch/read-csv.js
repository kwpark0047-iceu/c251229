const fs = require('fs');
const iconv = require('iconv-lite');

const filePath = 'D:\\Downloads\\서울시 의원 인허가 정보 (260518).csv';
const buffer = fs.readFileSync(filePath);
const decoded = iconv.decode(buffer, 'cp949');
const lines = decoded.split('\n');

console.log(lines[0]);
console.log(lines[1]);
