const fs = require('fs');
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
  if (fs.existsSync(file)) {
    const buf = fs.readFileSync(file);
    let content = iconv.decode(buf, 'euc-kr');

    // 1. 문법 에러를 유발하는 깨진 속성 할당 복원
    content = content.replace(/operating_status:.*?(?:\r\n|\n)/g, "operating_status: '영업중',\n");
    content = content.replace(/medical_subject:.*?(?:\r\n|\n)/g, "medical_subject: '의원',\n");
    content = content.replace(/service_name:.*?(?:\r\n|\n)/g, "service_name: '의원',\n");

    // 2. 한글 주석이 줄바꿈과 섞여 코드를 주석처리 해버리는 현상 복원
    content = content.replace(/region_code:\s*'6410000',\s*\/\/[^\n]*};/g, "region_code: '6410000',\n      };");
    content = content.replace(/region_code:\s*'6110000',\s*\/\/[^\n]*};/g, "region_code: '6110000',\n      };");
    content = content.replace(/\/\/[^\n]*}\)/g, "})\n");

    // 3. 파일 최상단 깨진 JSDoc 주석 초기화
    content = content.replace(/\/\*\*[\s\S]*?\*\//, "/** API Route */");

    fs.writeFileSync(file, content, 'utf8');
    console.log("Fixed: " + file);
  }
}
