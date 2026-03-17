
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://yreoeqmcebnosmtlyump.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyZW9lcW1jZWJub3NtdGx5dW1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NzM4NzQsImV4cCI6MjA4MjU0OTg3NH0.Uv-c9TlQlv0yvNJemPQX-_MR4Ndn8A50rS2omGjySNI';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkSchema() {
  console.log('--- leads 테이블 컬럼 확인 ---');
  
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .limit(1);

  if (error) {
    console.error('조회 오류:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('기존 컬럼들:', Object.keys(data[0]));
  } else {
    console.log('데이터가 없어 컬럼을 확인할 수 없습니다. RPC 또는 별도 쿼리 필요.');
    
    // 더 확실한 방법: 정보 스키마 쿼리 (권한에 따라 안 될 수도 있음)
    const { data: cols, error: colError } = await supabase.rpc('get_table_columns', { table_name: 'leads' });
    if (colError) {
        console.log('RPC get_table_columns 실패 (정상임).');
    } else {
        console.log('컬럼 정보:', cols);
    }
  }
}

checkSchema();
