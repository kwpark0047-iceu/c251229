const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testLogin() {
  console.log('Testing login for admin_tester...');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'admin_tester_1776148931438@example.com',
    password: 'Password123!'
  });

  if (error) {
    console.error('Login failed:', error.message);
  } else {
    console.log('Login successful for user:', data.user.id);
  }
}

testLogin();
