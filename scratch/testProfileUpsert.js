import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_KEY);

async function testSignupAndProfile() {
  const email = `testworker${Date.now()}@example.com`;
  console.log("Signing up:", email);
  
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password: 'Password123!',
  });
  
  if (authError) {
    console.error("Signup failed:", authError);
    return;
  }
  
  console.log("Signup success, user id:", authData.user?.id);
  
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: authData.user?.id,
    email: email,
    role: 'worker'
  });
  
  console.log("Profile upsert error:", profileError || "Success!");
}

testSignupAndProfile();
