require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testFetchWithFilters() {
  let query = supabase.from('leads').select('license_date').gte('license_date', '20250515').limit(5);
  const { data } = await query;
  console.log('>= 20250515:', data);

  let query2 = supabase.from('leads').select('license_date').gte('license_date', '2025-05-15').limit(5);
  const { data: data2 } = await query2;
  console.log('>= 2025-05-15:', data2);
}

testFetchWithFilters();
