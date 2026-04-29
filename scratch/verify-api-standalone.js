

require('dotenv').config({ path: '.env.local' });

const SEOUL_DATA_BASE_URL = 'http://openapi.seoul.go.kr:8088';

async function fetchSeoulData(service, startIndex = 1, endIndex = 100) {
  let apiKey = process.env.SEOUL_DATA_API_KEY;
  
  // 분기 로직 테스트
  if (service === 'LOCALDATA_010301' && process.env.SEOUL_DATA_QUASI_MEDICAL_API_KEY) {
    apiKey = process.env.SEOUL_DATA_QUASI_MEDICAL_API_KEY;
    console.log(`[Test] Using Quasi-Medical Special Key: ${apiKey.substring(0, 5)}...`);
  } else if (service === 'LOCALDATA_104201' && process.env.SEOUL_DATA_FITNESS_API_KEY) {
    apiKey = process.env.SEOUL_DATA_FITNESS_API_KEY;
    console.log(`[Test] Using Fitness Special Key: ${apiKey.substring(0, 5)}...`);
  } else if (service === 'LOCALDATA_010101' && process.env.SEOUL_DATA_HOSPITAL_API_KEY) {
    apiKey = process.env.SEOUL_DATA_HOSPITAL_API_KEY;
    console.log(`[Test] Using Hospital Special Key: ${apiKey.substring(0, 5)}...`);
  } else {
    console.log(`[Test] Using Default Key: ${apiKey.substring(0, 5)}...`);
  }

  const url = `${SEOUL_DATA_BASE_URL}/${apiKey}/json/${service}/${startIndex}/${endIndex}`;
  console.log(`[Test] Requesting URL: ${url.replace(apiKey, 'HIDDEN_KEY')}`);

  try {
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Fetch Error:', error);
    return null;
  }
}

async function runVerification() {
  console.log('=== Verifying New API Keys and Pipeline ===');
  
  const services = [
    { id: 'LOCALDATA_010301', name: '의료유사업' },
    { id: 'LOCALDATA_104201', name: '체력단련장업' },
    { id: 'LOCALDATA_010101', name: '병원' }
  ];

  for (const svc of services) {
    console.log(`\nChecking ${svc.name}...`);
    const data = await fetchSeoulData(svc.id, 1, 3);
    
    if (data && data[svc.id]) {
      console.log(`✅ ${svc.name} API OK!`);
      console.log(`   Total Count: ${data[svc.id].list_total_count}`);
      if (data[svc.id].row && data[svc.id].row.length > 0) {
        console.log(`   Sample: ${data[svc.id].row[0].BPLCNM}`);
      }
    } else {
      console.log(`❌ ${svc.name} API FAILED!`);
      console.log('   Response:', JSON.stringify(data));
    }
  }
}

runVerification();
