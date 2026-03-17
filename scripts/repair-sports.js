
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://yreoeqmcebnosmtlyump.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyZW9lcW1jZWJub3NtdGx5dW1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NzM4NzQsImV4cCI6MjA4MjU0OTg3NH0.Uv-c9TlQlv0yvNJemPQX-_MR4Ndn8A50rS2omGjySNI';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function repairSportsCategory() {
  console.log('--- 체육시설업 카테고리 데이터 복구 및 검증 시작 ---');

  // 1. 혹시라도 HEALTH나 OTHER로 잘못 들어가 있는 체육시설이 있는지 확인
  const sportsServiceIds = [
    '10_39_01_P', '10_41_01_P', '10_42_01_P', '10_51_01_P', 
    '10_53_01_P', '10_54_01_P', '10_31_01_P', '10_32_01_P', 
    '10_33_01_P', '10_34_01_P', '10_35_01_P', '10_36_01_P', 
    '10_37_01_P', '10_44_01_P', '10_45_01_P'
  ];

  const { data: misclassified, error: fetchError } = await supabase
    .from('leads')
    .select('id, biz_name, service_id, category')
    .in('service_id', sportsServiceIds)
    .neq('category', 'SPORTS');

  if (fetchError) {
    console.error('조회 오류:', fetchError);
  } else if (misclassified.length > 0) {
    console.log(`오분류된 데이터 ${misclassified.length}건 발견. SPORTS로 업데이트 중...`);
    
    for (const item of misclassified) {
      await supabase.from('leads').update({ category: 'SPORTS' }).eq('id', item.id);
    }
    console.log('업데이트 완료.');
  } else {
    console.log('오분류된 데이터가 없습니다. (수집 시점부터 누락되었을 가능성)');
  }

  // 2. 현재 SPORTS 카테고리 최종 확인
  const { count, error: finalError } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('category', 'SPORTS');

  console.log(`최종 SPORTS 카테고리 데이터 수: ${count}건`);
  
  console.log('--- 복구 작업 종료 ---');
}

repairSportsCategory();
