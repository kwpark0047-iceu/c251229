const fs = require('fs');
const path = require('path');

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
    let text;
    try {
      const decoder = new TextDecoder('utf-8', { fatal: true });
      text = decoder.decode(buf);
      console.log(`Already UTF-8: ${file}`);
    } catch(e) {
      const decoderEuc = new TextDecoder('euc-kr');
      text = decoderEuc.decode(buf);
      fs.writeFileSync(p, text, 'utf8');
      console.log(`Converted from euc-kr to utf8: ${file}`);
    }
  }
}
