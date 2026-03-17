
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://yreoeqmcebnosmtlyump.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyZW9lcW1jZWJub3NtdGx5dW1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NzM4NzQsImV4cCI6MjA4MjU0OTg3NH0.Uv-c9TlQlv0yvNJemPQX-_MR4Ndn8A50rS2omGjySNI';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkSportsData() {
  console.log('--- 체육시설업(SPORTS) 데이터 검사 시작 ---');

  // 1. SPORTS 카테고리로 저장된 데이터 수 확인
  const { count: sportsCount, error: countError } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true })
    .eq('category', 'SPORTS');

  if (countError) {
    console.error('조회 오류:', countError);
    return;
  }

  console.log(`카테고리 'SPORTS' 데이터 수: ${sportsCount}건`);

  // 2. 서비스 ID별 데이터 분포 확인 (SPORTS 관련 ID들)
  const sportsServiceIds = [
    '10_39_01_P', '10_41_01_P', '10_42_01_P', '10_51_01_P', 
    '10_53_01_P', '10_54_01_P', '10_31_01_P', '10_32_01_P', 
    '10_33_01_P', '10_34_01_P', '10_35_01_P', '10_36_01_P', 
    '10_37_01_P', '10_44_01_P', '10_45_01_P'
  ];

  const { data: serviceIdCounts, error: serviceError } = await supabase
    .from('leads')
    .select('service_id, category')
    .in('service_id', sportsServiceIds);

  if (serviceError) {
    console.error('서비스 ID 조회 오류:', serviceError);
  } else {
    const stats = {};
    serviceIdCounts.forEach(row => {
      stats[row.service_id] = stats[row.service_id] || { count: 0, category: row.category };
      stats[row.service_id].count++;
    });
    console.log('서비스 ID별 데이터 분포:', stats);
  }

  // 3. 샘플 데이터 조회
  const { data: samples } = await supabase
    .from('leads')
    .select('id, biz_name, category, service_id, medical_subject')
    .eq('category', 'SPORTS')
    .limit(5);

  console.log('SPORTS 샘플 데이터:', samples);

  console.log('--- 검사 종료 ---');
}

checkSportsData();
