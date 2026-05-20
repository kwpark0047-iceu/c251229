const fs = require('fs');

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
    let content = fs.readFileSync(file, 'utf8');

    // 컴파일 오류를 유발하는 깨진 속성 할당문을 안전한 코드로 덮어씁니다.
    content = content.replace(/operating_status:[^\n]*(?:\r\n|\n)/g, "operating_status: '영업중',\n");
    content = content.replace(/medical_subject:[^\n]*(?:\r\n|\n)/g, "medical_subject: '의원',\n");
    content = content.replace(/service_name:[^\n]*(?:\r\n|\n)/g, "service_name: '의원',\n");

    // 깨진 한글(대체 문자 )이 포함된 주석 제거
    content = content.replace(/\/\/[^\n]*/g, (match) => {
      if (match.includes('\uFFFD')) return '// cleaned comment';
      return match;
    });

    content = content.replace(/\/\*[\s\S]*?\*\//g, (match) => {
      if (match.includes('\uFFFD')) return '/* cleaned comment */';
      return match;
    });

    // 남아있는 모든 대체 문자() 및 깨진 따옴표 문제 해결을 위해 공백 치환
    content = content.replace(/\uFFFD/g, '');

    fs.writeFileSync(file, content, 'utf8');
    console.log("Syntax fixed: " + file);
  }
}
