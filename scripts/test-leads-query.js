import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function testFetchLeads() {
  console.log('=== 가장 최근에 추가된 리드 5개 조회 ===');
  const { data: recentLeads, error: recentError } = await supabase
    .from('leads')
    .select('id, biz_name, road_address, lot_address, organization_id, category, service_id, status, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (recentError) {
    console.error('최근 리드 조회 에러:', recentError);
  } else {
    console.log('최근 리드 데이터:', JSON.stringify(recentLeads, null, 2));
  }

  console.log('\n=== or() 쿼리 구문 테스트 ===');
  const queryStr = 'road_address.ilike.%서울%,lot_address.ilike.%서울%,road_address.is.null,lot_address.is.null';
  const { data: testQuery, count, error: queryError } = await supabase
    .from('leads')
    .select('id, biz_name', { count: 'exact' })
    .or(queryStr)
    .limit(1);

  if (queryError) {
    console.error('or 쿼리 구문 에러:', queryError.message);
  } else {
    console.log(`or 쿼리 성공: ${count}건 발견됨`);
  }
}

testFetchLeads();
