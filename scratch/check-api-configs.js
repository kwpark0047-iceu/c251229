const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// .env.local 로드
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
  try {
    const { data, error } = await supabase.from('api_configs').select('*');
    if (error) {
      console.log('Error or table not exists:', error.message);
    } else {
      console.log('Table exists, data:', data);
    }
  } catch (err) {
    console.error(err.message);
  }
}

main();
