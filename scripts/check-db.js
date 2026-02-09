/* eslint-disable @typescript-eslint/no-require-imports */
const { createClient } = require('@supabase/supabase-js');

// .env.local에서 값을 직접 가져와서 테스트 (임시)
const SUPABASE_URL = 'https://yreoeqmcebnosmtlyump.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyZW9lcW1jZWJub3NtdGx5dW1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NzM4NzQsImV4cCI6MjA4MjU0OTg3NH0.Uv-c9TlQlv0yvNJemPQX-_MR4Ndn8A50rS2omGjySNI';

async function check() {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    console.log('--- Supabase Connection Check ---');

    // 1. floor_plans 테이블 확인
    const { count, error } = await supabase
        .from('floor_plans')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error('Error fetching floor_plans:', error.message);
    } else {
        console.log('Total floor_plans records:', count);
    }

    // 2. 노선별 분포 확인
    const { data: lines, error: lineError } = await supabase
        .from('floor_plans')
        .select('line_number, plan_type');

    if (lineError) {
        console.error('Error fetching line distribution:', lineError.message);
    } else {
        const distribution = {};
        lines.forEach(row => {
            const key = `${row.line_number}_${row.plan_type}`;
            distribution[key] = (distribution[key] || 0) + 1;
        });
        console.log('Line Distribution:', distribution);
    }
}

check();
