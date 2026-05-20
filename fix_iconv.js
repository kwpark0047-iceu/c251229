const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

const files = [
  "src/app/api/gg-clinics/route.ts",
  "src/app/api/gg-data/route.ts",
  "src/app/api/gg-hospitals/route.ts",
  "src/app/api/gg-jncl-univ/route.ts",
  "src/app/api/gg-restaurants/route.ts",
  "src/app/api/gg-univ/route.ts",
  "src/app/api/seoul-clinics/route.ts",
  "src/app/api/seoul-data/route.ts"
];

for (const file of files) {
  const p = path.join('d:/c251229', file);
  if (fs.existsSync(p)) {
    const buf = fs.readFileSync(p);
    const text = iconv.decode(buf, 'euc-kr');
    fs.writeFileSync(p, text, 'utf8');
    console.log(`Converted to UTF-8 using iconv-lite: ${file}`);
  }
}
