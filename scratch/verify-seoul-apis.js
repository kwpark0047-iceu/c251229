
const fetch = require('node-fetch');

async function testApi(service) {
  console.log(`\n--- Testing Service: ${service} ---`);
  const url = `http://localhost:3000/api/seoul-data?service=${service}&start=1&end=5`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.success) {
      console.log(`✅ Success: Fetched ${data.leads.length} leads.`);
      if (data.leads.length > 0) {
        console.log(`Sample: ${data.leads[0].BPLCNM || data.leads[0].bizName} (${data.leads[0].RDNWHADDRESS || data.leads[0].roadAddress})`);
      }
    } else {
      console.log(`❌ Failed: ${data.error || 'Unknown error'}`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }
}

async function runTests() {
  // 로컬 서버가 실행 중이어야 함을 가정하거나, 
  // 직접 lib 함수를 호출하는 방식으로 테스트 가능하지만 라우트 검증을 위해 엔드포인트 호출
  await testApi('hospital');
  await testApi('quasi-medical');
  await testApi('fitness');
  await testApi('clinic');
}

runTests();
