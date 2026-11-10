
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 환경변수를 설정하세요 (.env.local).');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function inspectData() {
  console.log('--- DB 데이터 정밀 분석 시작 ---');

  const { data: leads, error } = await supabase
    .from('leads')
    .select('id, biz_name, medical_subject, category, service_id')
    .limit(5000);

  if (error) {
    console.error('조회 오류:', error);
    return;
  }

  const noiseKeywords = [
    '이마트', 'emart', '세븐일레븐', '7-eleven', 'gs25', '지에스25', 'cu', '씨유', 
    '편의점', '안경', '콘택트', '다이소', '올리브영', '롭스', '랄라블라'
  ];
  const noiseFound = leads.filter(l => {
    const bizName = (l.biz_name || '').toLowerCase().replace(/\s+/g, '');
    const subject = (l.medical_subject || '').toLowerCase().replace(/\s+/g, '');
    return noiseKeywords.some(k => bizName.includes(k) || subject.includes(k));
  });

  console.log(`전체 HEALTH 리드: ${leads.length}건`);
  console.log(`노이즈 발견: ${noiseFound.length}건`);
  
  if (noiseFound.length > 0) {
    console.log('--- 노이즈 샘플 (최초 10건) ---');
    noiseFound.slice(0, 10).forEach(l => {
      console.log(`ID: ${l.id} | 상호명: ${l.biz_name} | 업종명: ${l.medical_subject} | ServiceID: ${l.service_id}`);
    });
  }

  // 중복된 상호명이 있는지 확인
  const nameCounts = {};
  leads.forEach(l => {
    nameCounts[l.biz_name] = (nameCounts[l.biz_name] || 0) + 1;
  });
  const duplicates = Object.entries(nameCounts).filter(([name, count]) => count > 1);
  if (duplicates.length > 0) {
    console.log(`중복 상호명 발견: ${duplicates.length}종`);
  }

  console.log('--- 분석 종료 ---');
}

inspectData();
