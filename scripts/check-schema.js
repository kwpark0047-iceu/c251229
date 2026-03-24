
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://yreoeqmcebnosmtlyump.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyZW9lcW1jZWJub3NtdGx5dW1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NzM4NzQsImV4cCI6MjA4MjU0OTg3NH0.Uv-c9TlQlv0yvNJemPQX-_MR4Ndn8A50rS2omGjySNI';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkSchema() {
  console.log('--- leads 테이블 컬럼 확인 ---');
  const { data: leadsData, error: leadsError } = await supabase
    .from('leads')
    .select('*')
    .limit(1);

  if (leadsError) {
    console.error('leads 조회 오류:', leadsError);
  } else if (leadsData && leadsData.length > 0) {
    console.log('leads 컬럼들:', Object.keys(leadsData[0]));
  }

  console.log('\n--- proposals 테이블 컬럼 확인 ---');
  const { data: proposalsData, error: proposalsError } = await supabase
    .from('proposals')
    .select('*')
    .limit(1);

  if (proposalsError) {
    console.error('proposals 조회 오류:', proposalsError);
  } else if (proposalsData && proposalsData.length > 0) {
    console.log('proposals 컬럼들:', Object.keys(proposalsData[0]));
    
    // lead_id가 null인 레코드 수 확인
    const { count, error: countError } = await supabase
      .from('proposals')
      .select('*', { count: 'exact', head: true })
      .is('lead_id', null);
      
    if (countError) {
      console.error('lead_id null 카운트 오류:', countError);
    } else {
      console.log(`proposals 테이블 내 lead_id가 null인 레코드 수: ${count}`);
    }
  } else {
    console.log('proposals 데이터가 없습니다.');
  }
}

checkSchema();
