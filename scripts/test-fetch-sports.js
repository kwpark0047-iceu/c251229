async function testFetchSports() {
  console.log('--- 체육시설업(SPORTS) API 수집 테스트 시작 ---');
  
  // 서울 데이터 포털 체력단련장업 테스트 엔드포인트
  const url = 'http://localhost:3000/api/seoul-data?service=fitness&start=1&end=5';
  
  try {
    console.log(`[API 요청] ${url}`);
    const response = await fetch(url);
    const result = await response.json();
    
    if (result.success && result.leads && result.leads.length > 0) {
      console.log(`✅ API 조회 성공: ${result.leads.length}건 발견 (총 ${result.totalCount}건)`);
      console.log('📦 첫 번째 리드 원본 샘플:');
      console.log(JSON.stringify(result.leads[0], null, 2));
    } else {
      console.log('⚠️ 데이터가 없거나 조회에 실패했습니다.', result.message || result.error);
    }
  } catch (error) {
    console.error('❌ 테스트 중 네트워크/서버 오류 발생:', error.message);
    console.log('=> 로컬 서버(npm run dev)가 http://localhost:3000 에서 실행 중인지 확인하세요.');
  }

  console.log('--- 테스트 종료 ---');
}

testFetchSports();
