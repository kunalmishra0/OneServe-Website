import { createClient } from "@supabase/supabase-js";

// These environment variables will be needed
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase Environment Variables. VITE_SUPABASE_URL and VITE_SUPABASE_KEY must be set in .env",
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
