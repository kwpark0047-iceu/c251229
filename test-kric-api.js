/**
 * KRIC API 테스트
 * 철도산업정보센터 API 연동 테스트
 */

import { 
  getKRICServiceKey, 
  validateServiceKey, 
  fetchAllSeoulSubwayRoutes,
  fetchAllSeoulStationInfo,
  convertKRICToSubwayStation,
  convertKRICStationInfoToSubwayStation,
  generateLineRoutes
} from '../src/app/lead-manager/kric-api';

/**
 * KRIC API 연동 테스트 함수
 */
async function testKRICAPI() {
  console.log('🚇 KRIC API 연동 테스트 시작...\n');

  try {
    // 1. 서비스 키 확인
    console.log('1️⃣ 서비스 키 확인...');
    const serviceKey = getKRICServiceKey();
    console.log(`✅ 서비스 키: ${serviceKey.substring(0, 20)}...`);

    // 2. API 키 유효성 검증
    console.log('\n2️⃣ API 키 유효성 검증...');
    const isValid = await validateServiceKey(serviceKey);
    console.log(isValid ? '✅ API 키 유효함' : '❌ API 키 무효함');

    if (!isValid) {
      throw new Error('API 키가 유효하지 않습니다.');
    }

    // 3. 노선 정보 가져오기
    console.log('\n3️⃣ 수도권 전체 노선 정보 가져오기...');
    const startTime = Date.now();
    const kricStations = await fetchAllSeoulSubwayRoutes(serviceKey);
    const routeTime = Date.now() - startTime;
    
    const totalStations = Object.values(kricStations).reduce((sum, stations) => sum + stations.length, 0);
    console.log(`✅ ${Object.keys(kricStations).length}개 노선, ${totalStations}개역 정보 로드 완료 (${routeTime}ms)`);

    // 4. 역사 상세 정보 가져오기
    console.log('\n4️⃣ 수도권 역사 상세 정보 가져오기...');
    const detailStartTime = Date.now();
    const kricStationInfos = await fetchAllSeoulStationInfo(serviceKey);
    const detailTime = Date.now() - detailStartTime;
    console.log(`✅ ${kricStationInfos.length}개 역사 상세 정보 로드 완료 (${detailTime}ms)`);

    // 5. 데이터 변환
    console.log('\n5️⃣ 데이터 변환...');
    const convertStartTime = Date.now();
    
    const basicStations = convertKRICToSubwayStation(
      Object.values(kricStations).flat()
    );
    
    const detailedStations = convertKRICStationInfoToSubwayStation(kricStationInfos);
    
    const routes = generateLineRoutes(kricStations);
    
    const convertTime = Date.now() - convertStartTime;
    console.log(`✅ 데이터 변환 완료 (${convertTime}ms)`);
    console.log(`   - 기본 역 정보: ${basicStations.length}개`);
    console.log(`   - 상세 역 정보: ${detailedStations.length}개`);
    console.log(`   - 노선 경로: ${Object.keys(routes).length}개`);

    // 6. 데이터 샘플 출력
    console.log('\n6️⃣ 데이터 샘플:');
    
    // 노선별 샘플
    Object.entries(kricStations).slice(0, 3).forEach(([lineCode, stations]) => {
      console.log(`\n📍 ${lineCode}호선 (${stations.length}개역):`);
      stations.slice(0, 3).forEach(station => {
        console.log(`   - ${station.stinNm} (${station.lnNm})`);
        console.log(`     좌표: ${station.xcrd}, ${station.ycrd}`);
        console.log(`     순번: ${station.ordrNo}`);
      });
    });

    // 상세 정보 샘플
    console.log('\n🏢 상세 역사 정보 샘플:');
    kricStationInfos.slice(0, 3).forEach(station => {
      console.log(`\n📍 ${station.stinNm}:`);
      console.log(`   - 주소: ${station.stinAdres || '없음'}`);
      console.log(`   - 전화: ${station.stinTelno || '없음'}`);
      console.log(`   - 시설: ${station.stinFcty || '없음'}`);
      console.log(`   - 역종류: ${station.stinKndNm || '없음'}`);
    });

    // 7. 성능 요약
    const totalTime = Date.now() - startTime;
    console.log('\n📊 성능 요약:');
    console.log(`   - 총 소요 시간: ${totalTime}ms`);
    console.log(`   - 노선 정보 로딩: ${routeTime}ms (${((routeTime/totalTime)*100).toFixed(1)}%)`);
    console.log(`   - 상세 정보 로딩: ${detailTime}ms (${((detailTime/totalTime)*100).toFixed(1)}%)`);
    console.log(`   - 데이터 변환: ${convertTime}ms (${((convertTime/totalTime)*100).toFixed(1)}%)`);

    console.log('\n✅ KRIC API 연동 테스트 완료!');

  } catch (error) {
    console.error('\n❌ KRIC API 연동 테스트 실패:', error);
    
    if (error instanceof Error) {
      console.error('에러 메시지:', error.message);
      console.error('스택 트레이스:', error.stack);
    }
    
    process.exit(1);
  }
}

// 테스트 실행
if (require.main === module) {
  testKRICAPI();
}

export { testKRICAPI };
