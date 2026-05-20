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
    // utf8 모드로 파일을 읽어 유효하지 않은 바이트(invalid utf-8 sequence)를 대체문자()로 치환합니다.
    const text = fs.readFileSync(p, 'utf8');
    // 이를 다시 저장하면 완벽한 UTF-8 형식의 파일이 되어 Turbopack 파서 에러를 해결할 수 있습니다.
    fs.writeFileSync(p, text, 'utf8');
    console.log(`Sanitized: ${file}`);
  }
}
