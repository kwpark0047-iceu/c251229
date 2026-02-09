const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://yreoeqmcebnosmtlyump.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyZW9lcW1jZWJub3NtdGx5dW1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NzM4NzQsImV4cCI6MjA4MjU0OTg3NH0.Uv-c9TlQlv0yvNJemPQX-_MR4Ndn8A50rS2omGjySNI';

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
