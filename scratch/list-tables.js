const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function main() {
  const { data, error } = await supabase.rpc('get_tables');
  if (error) {
    // If get_tables RPC doesn't exist, let's query some metadata or try a direct postgres schema query if possible
    console.log('RPC error:', error.message);
    
    // Let's try executing a basic query or list what we can
    const tables = ['leads', 'ad_inventory', 'proposals', 'call_logs', 'tasks', 'floor_plans', 'floor_plan_ad_positions', 'organizations', 'organization_members', 'profiles', 'activity_logs', 'admin_notifications'];
    for (const t of tables) {
      const { error: err } = await supabase.from(t).select('count').limit(1);
      console.log(`Table ${t}: ${err ? 'Error/Not exists: ' + err.message : 'Exists'}`);
    }
  } else {
    console.log('Tables:', data);
  }
}

main();
