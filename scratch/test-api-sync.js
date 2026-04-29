
// 테스트용 동기화 스크립트 (의료유사업 50건 수집 테스트)
const { getSeoulQuasiMedicalLicenseData } = require('../src/lib/seoul-data-api');
// 실제 환경에서는 supabase 클라이언트가 필요하므로, 로직만 검증하거나 
// 임시로 수집된 데이터를 출력하는 방식으로 테스트합니다.

async function testSync() {
  console.log('--- Starting Quasi-Medical Data Sync Test ---');
  try {
    const result = await getSeoulQuasiMedicalLicenseData(1, 10);
    console.log(`Successfully fetched ${result.leads.length} leads from Seoul Data Portal.`);
    
    if (result.leads.length > 0) {
      console.log('Sample Data Structure:');
      const sample = result.leads[0];
      console.log(`- Business Name: ${sample.BPLCNM}`);
      console.log(`- Address: ${sample.RDNWHADDRESS}`);
      console.log(`- MGT NO: ${sample.MGTNO}`);
    }
  } catch (error) {
    console.error('Sync Test Failed:', error);
  }
}

// 이 스크립트는 node 환경에서 실행되므로 .env 로드 필요
require('dotenv').config({ path: '.env.local' });
testSync();
