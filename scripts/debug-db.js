
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://yreoeqmcebnosmtlyump.supabase.co';
// 이 키는 check-schema.js에 있던 것과 동일함
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyZW9lcW1jZWJub3NtdGx5dW1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NzM4NzQsImV4cCI6MjA4MjU0OTg3NH0.Uv-c9TlQlv0yvNJemPQX-_MR4Ndn8A50rS2omGjySNI';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkProfiles() {
    console.log('--- profiles 테이블 조회 테스트 ---');
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(5);

    if (error) {
        console.error('조회 오류:', error.message);
        console.error('코드:', error.code);
    } else {
        console.log('조회 성공! 데이터 건수:', data.length);
        if (data.length > 0) {
            console.log('샘플 데이터:', data[0]);
        } else {
            console.log('데이터가 비어 있습니다.');
        }
    }

    console.log('\n--- organization_members 테이블 조회 테스트 ---');
    const { data: memberData, error: memberError } = await supabase
        .from('organization_members')
        .select('*')
        .limit(1);
    
    if (memberError) console.error('조회 오류:', memberError.message);
    else console.log('성공 건수:', memberData.length);
}

checkProfiles();
