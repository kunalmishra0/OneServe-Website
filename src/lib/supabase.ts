import { createClient } from "@supabase/supabase-js";

// These environment variables will be needed
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Missing Supabase Environment Variables. Authentication will not work until VITE_SUPABASE_URL and VITE_SUPABASE_KEY are set in .env",
  );
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder",
);
