
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 환경변수를 설정하세요 (.env.local).');
}

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
