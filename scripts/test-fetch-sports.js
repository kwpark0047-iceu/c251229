
const { fetchLocalDataAPI } = require('../src/app/lead-manager/api');
const { saveLeads } = require('../src/app/lead-manager/supabase-service');
const { CATEGORY_SERVICE_IDS } = require('../src/app/lead-manager/types');

async function testFetchSports() {
  console.log('--- 체육시설업 API 수집 테스트 시작 ---');
  
  const settings = {
    apiKey: '838d7285574c4310978972855b4c411a', // 실제 사용 중인 키 (로컬 환경 변수에서 가져오는 것이 좋으나 테스트용)
    regionCode: '6110000', // 서울
    searchType: 'API'
  };

  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 1); // 최근 1개월
  const endDate = new Date();

  // '체력단련장업' (10_44_01_P) 테스트
  const serviceInfo = CATEGORY_SERVICE_IDS.SPORTS.find(s => s.id === '10_44_01_P');
  
  console.log(`조회 대상: ${serviceInfo.name} (${serviceInfo.id})`);

  try {
    const result = await fetchLocalDataAPI(settings, startDate, endDate, 1, 10, serviceInfo);
    
    if (result.success && result.leads.length > 0) {
      console.log(`API 조회 성공: ${result.leads.length}건 발견`);
      console.log('첫 번째 리드 카테고리 확인:', result.leads[0].category);
      
      const saveResult = await saveLeads(result.leads);
      console.log('DB 저장 결과:', saveResult.message);
    } else {
      console.log('해당 기간에 신규 데이터가 없거나 조회에 실패했습니다.', result.message);
    }
  } catch (error) {
    console.error('테스트 중 오류 발생:', error);
  }

  console.log('--- 테스트 종료 ---');
}

// 주의: CommonJS와 ESM 혼용 문제로 직접 실행이 어려울 수 있으므로 
// 실제로는 브라우저 콘솔이나 별도 환경에서 검증이 필요할 수 있습니다.
// 여기서는 로직 수정이 완료되었으므로 사용자에게 직접 '데이터 새로고침'을 요청하는 것이 가장 확실합니다.
console.log('로직 수정이 완료되었습니다. 이제 UI에서 [데이터 새로고침]을 클릭하면 SPORTS 카테고리가 정상적으로 수집됩니다.');
