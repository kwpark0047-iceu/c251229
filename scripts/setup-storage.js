const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// .env.local 직접 읽기 (dotenv 미설치 대비)
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach(line => {
    const [key, ...value] = line.split('=');
    if (key && value) {
      process.env[key.trim()] = value.join('=').trim().replace(/^["']|["']$/g, '');
    }
  });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
// 버킷 생성을 위해선 서비스 롤 키가 더 안정적이지만, 없으면 Anon 키로 시도 (설정에 따라 다름)
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; 

const supabase = createClient(supabaseUrl, supabaseKey);
const BUCKET_NAME = 'floor-plans';

async function setupStorage() {
  console.log(`Checking storage bucket: ${BUCKET_NAME}...`);
  
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  
  if (listError) {
    console.error('Error listing buckets:', listError.message);
    return;
  }

  const exists = buckets.find(b => b.name === BUCKET_NAME);
  
  if (exists) {
    console.log(`✅ Bucket '${BUCKET_NAME}' already exists.`);
  } else {
    console.log(`Creating bucket '${BUCKET_NAME}'...`);
    const { data, error } = await supabase.storage.createBucket(BUCKET_NAME, {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/jpg'],
      fileSizeLimit: 52428800 // 50MB
    });

    if (error) {
      console.error('❌ Error creating bucket:', error.message);
      console.log('Tip: Supabase Dashboard에서 직접 "floor-plans" 버킷을 "Public"으로 생성해 주세요.');
    } else {
      console.log(`✅ Bucket '${BUCKET_NAME}' created successfully.`);
    }
  }
}

setupStorage();
