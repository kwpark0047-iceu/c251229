require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testFetch() {
  const { data, count, error } = await supabase
    .from('leads')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(0, 49);

  if (error) {
    console.error('Fetch error:', error);
  } else {
    console.log(`Fetched ${data.length} records. Total count: ${count}`);
    if (data.length > 0) {
      console.log('Sample record:', { id: data[0].id, biz_name: data[0].biz_name, organization_id: data[0].organization_id });
    }
  }
}

testFetch();
