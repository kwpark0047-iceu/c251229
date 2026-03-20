import { getSupabase } from './src/lib/supabase/utils.js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function checkFloorPlans() {
  const supabase = getSupabase();
  
  console.log('--- Supabase Floor Plans 조회 시작 ---');
  
  const { data, error } = await supabase
    .from('floor_plans')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('데이터 조회 오류:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('실제로 저장된 도면 데이터가 없습니다.');
  } else {
    console.log(`총 ${data.length}개의 도면이 발견되었습니다.`);
    data.forEach(plan => {
      console.log(`[${plan.id}] ${plan.station_name} (${plan.line_number || '노선미지정'}) - ${plan.plan_type} - ${plan.floor_name}`);
      console.log(`   URL: ${plan.image_url}`);
      console.log(`   수정일: ${plan.updated_at}`);
      console.log('-----------------------------------');
    });
  }
}

checkFloorPlans();
