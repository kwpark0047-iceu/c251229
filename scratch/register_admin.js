const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://yreoeqmcebnosmtlyump.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyZW9lcW1jZWJub3NtdGx5dW1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NzM4NzQsImV4cCI6MjA4MjU0OTg3NH0.Uv-c9TlQlv0yvNJemPQX-_MR4Ndn8A50rS2omGjySNI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function registerAdmin() {
  const email = `admin_tester_${Date.now()}@example.com`;
  const password = 'Password123!';

  console.log(`Registering admin: ${email}`);
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: 'Admin Tester'
      }
    }
  });

  if (error) {
    console.error('Signup failed:', error.message);
    process.exit(1);
  }

  console.log('Signup successful. User ID:', data.user?.id);
  console.log('EMAIL_FOR_TEST:' + email);
}

registerAdmin();
