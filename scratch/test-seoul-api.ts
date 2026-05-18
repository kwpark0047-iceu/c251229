import dotenv from 'dotenv';
import { getSeoulClinicLicenseData } from '../src/lib/seoul-data-api';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function main() {
  console.log('=== 서울 열린데이터 광장 API 테스트 ===');
  console.log('API Key:', process.env.SEOUL_DATA_API_KEY);
  
  try {
    const result = await getSeoulClinicLicenseData(1, 5);
    if (!result) {
      console.error('API 호출 실패: 응답이 null입니다.');
      return;
    }
    
    console.log('성공! 총 의원 수:', result.totalCount);
    console.log('가져온 샘플 개수:', result.leads.length);
    if (result.leads.length > 0) {
      console.log('첫 번째 의원 이름:', result.leads[0].BZRGNM || result.leads[0].bzrgnm || result.leads[0]);
    }
  } catch (error: any) {
    console.error('API 호출 중 에러 발생:', error.message);
  }
}

main();
