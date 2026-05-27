// check-gg-leads.js – simple verification of 경기도 의원 데이터 존재 여부
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase 환경 변수가 설정되지 않음');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
  const { data, error, count } = await supabase
    .from('leads')
    .select('biz_name, nearest_station, region_code', { count: 'exact' })
    .eq('region_code', '6410000')
    .limit(10);

  if (error) {
    console.error('DB 조회 오류:', error);
    process.exit(1);
  }
  console.log('경기도 의원 레코드 수:', count);
  console.log('예시 레코드:', data.slice(0, 5));
})();
