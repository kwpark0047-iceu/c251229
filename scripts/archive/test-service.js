const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 환경변수를 설정하세요 (.env.local).');
}

async function testService() {
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    console.log('Fetching floor plans for line 2...');
    const { data, error } = await supabase
        .from('floor_plans')
        .select('*')
        .eq('line_number', '2')
        .order('sort_order', { ascending: true });

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Success! Found ${data.length} plans.`);
    if (data.length > 0) {
        console.log('First plan:', {
            station_name: data[0].station_name,
            line_number: data[0].line_number,
            image_url: data[0].image_url
        });
    }
}

testService();
