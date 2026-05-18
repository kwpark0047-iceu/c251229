require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testFetchWithFilters() {
  let query = supabase
    .from('leads')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  // Simulate date filter
  query = query.gte('license_date', '20250515');
  
  const { data, count, error } = await query.range(0, 49);

  if (error) {
    console.error('Fetch error:', error);
  } else {
    console.log(`With date filter 20250515 - Fetched ${data.length} records. Total count: ${count}`);
  }

  // Also simulate date filter with dashes
  let query2 = supabase.from('leads').select('*', { count: 'exact' });
  query2 = query2.gte('license_date', '2025-05-15');
  const res2 = await query2.range(0, 49);
  console.log(`With date filter 2025-05-15 - Fetched ${res2.data.length} records. Total count: ${res2.count}`);
}

testFetchWithFilters();
