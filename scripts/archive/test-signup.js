require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testSignup() {
  const email = `test_signup_${Date.now()}@example.com`;
  const password = "password123!";
  
  console.log(`Testing signup with email: ${email}`);
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        tier: 'FREE',
        full_name: 'Test Signup User',
        org_name: 'Test Org'
      }
    }
  });

  if (error) {
    console.error("Signup Error:", error.message);
  } else {
    // delay a bit to let triggers finish
    await new Promise(r => setTimeout(r, 2000));
    
    console.log("Signup Success, user ID:", data.user?.id);
    
    // Check if profile is created
    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
      
    if (profileErr) console.error("Profile Fetch Error:", profileErr.message);
    else console.log("Profile created successfully:", profile.id);
    
    // Check if organization member is created
    const { data: member, error: memberErr } = await supabase
      .from('organization_members')
      .select('role, organizations(name)')
      .eq('user_id', data.user.id);
      
    if (memberErr) console.error("Org Member Fetch Error:", memberErr.message);
    else console.log("Org Membership:", JSON.stringify(member, null, 2));
  }
}

testSignup();
