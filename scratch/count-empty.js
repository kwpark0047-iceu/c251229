const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  try {
    // Total count of leads
    const { count: totalCount, error: err1 } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true });
    
    // Count of leads with empty road_address AND empty lot_address
    const { count: emptyCount, error: err2 } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('road_address', '')
      .eq('lot_address', '');
      
    // Count of leads with null addresses
    const { count: nullCount, error: err3 } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .is('road_address', null)
      .is('lot_address', null);

    console.log('=== Leads Table Stats ===');
    console.log('Total leads:', totalCount);
    console.log('Leads with empty strings for both addresses:', emptyCount);
    console.log('Leads with null for both addresses:', nullCount);
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
