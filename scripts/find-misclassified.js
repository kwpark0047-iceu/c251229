
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://yreoeqmcebnosmtlyump.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyZW9lcW1jZWJub3NtdGx5dW1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NzM4NzQsImV4cCI6MjA4MjU0OTg3NH0.Uv-c9TlQlv0yvNJemPQX-_MR4Ndn8A50rS2omGjySNI';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function findMisclassifiedSports() {
  console.log('--- 오분류된 체육시설 데이터 검색 시작 ---');

  const sportsServiceIds = [
    '10_39_01_P', '10_41_01_P', '10_42_01_P', '10_51_01_P', 
    '10_53_01_P', '10_54_01_P', '10_31_01_P', '10_32_01_P', 
    '10_33_01_P', '10_34_01_P', '10_35_01_P', '10_36_01_P', 
    '10_37_01_P', '10_44_01_P', '10_45_01_P'
  ];

  const { data: leads, error } = await supabase
    .from('leads')
    .select('id, biz_name, category, service_id')
    .in('service_id', sportsServiceIds);

  if (error) {
    console.error('조회 오류:', error);
    return;
  }

  console.log(`체육 관련 서비스 ID로 검색된 총 데이터: ${leads.length}건`);
  
  const categories = {};
  leads.forEach(l => {
    categories[l.category] = (categories[l.category] || 0) + 1;
  });

  console.log('카테고리별 분포:', categories);
  
  if (leads.length > 0) {
    console.log('샘플 (최초 5건):', leads.slice(0, 5));
  }

  console.log('--- 검색 종료 ---');
}

findMisclassifiedSports();
