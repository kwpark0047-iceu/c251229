const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function debug() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321';
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-key';

    console.log('Connecting to:', url);
    const supabase = createClient(url, key);

    console.log('--- Step 1: List all tables ---');
    const { data: tables, error: tableError } = await supabase.rpc('get_tables'); // 만약 RPC가 없다면 직접 쿼리
    if (tableError) console.log('RPC get_tables error:', tableError.message);

    console.log('--- Step 2: Test Organization Insert ---');
    const { data, error } = await supabase.from('organizations').insert({ name: 'DEBUG_ORG' }).select();

    if (error) {
        console.error('INSERT ERROR DETAIL:');
        console.error('Message:', error.message);
        console.error('Code:', error.code);
        console.error('Hint:', error.hint);
        console.error('Details:', error.details);
    } else {
        console.log('INSERT SUCCESS:', data);
    }
}

debug();
