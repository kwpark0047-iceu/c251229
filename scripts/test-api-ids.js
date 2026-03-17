
const axios = require('axios');

async function testServiceIds() {
  const apiKey = '838d7285574c4310978972855b4c411a'; // 기존에 사용하던 키
  const regionCode = '6110000'; // 서울
  const startDate = '20240101';
  const endDate = '20241231';
  
  const testIds = ['01_01_01_P', '01_01_02_P', '01_01_03_P', '01_01_04_P', '01_01_05_P'];
  
  console.log('--- 서비스 ID별 API 응답 테스트 ---');
  
  for (const id of testIds) {
    const url = `http://www.localdata.go.kr/platform/rest/TO0/openApi?authKey=${apiKey}&serviceid=${id}&lastModTsStart=${startDate}&lastModTsEnd=${endDate}&pageIndex=1&pageSize=1`;
    
    try {
      const response = await axios.get(url);
      const xml = response.data;
      
      // 간단한 문자열 파싱으로 서비스명 확인
      const bgnNmMatch = xml.match(/<bgnNm>(.*?)<\/bgnNm>/);
      const bgnNm = bgnNmMatch ? bgnNmMatch[1] : '알 수 없음';
      
      console.log(`ID: ${id} -> 서비스명(bgnNm): ${bgnNm}`);
      
      // 결과 일부 출력 (필드 확인용)
      if (xml.includes('<row>')) {
          const rowSample = xml.match(/<row>([\s\S]*?)<\/row>/);
          if (rowSample) {
              console.log(`  샘플 필드: ${rowSample[1].substring(0, 200).replace(/\n/g, '')}...`);
          }
      } else {
          console.log('  데이터 없음');
      }
    } catch (e) {
      console.error(`ID: ${id} 호출 중 오류:`, e.message);
    }
  }
}

testServiceIds();
