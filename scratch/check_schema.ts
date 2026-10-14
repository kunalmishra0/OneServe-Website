import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL!
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSchema() {
  console.log("Checking columns for processed_complaints...")
  const { data, error } = await supabase.rpc('get_table_columns', {
    p_table_name: 'processed_complaints'
  })

  if (error) {
    // Fallback: try querying information_schema directly via raw SQL if possible, 
    // but usually we need an RPC for that.
    console.error("Error fetching columns:", error)
    
    // Alternative: Try to select 1 row and see keys
    const { data: row } = await supabase.from('processed_complaints').select('*').limit(1)
    if (row && row.length > 0) {
      console.log("Columns found in first row:", Object.keys(row[0]))
    } else {
      console.log("No rows in processed_complaints to inspect.")
    }
    return
  }

  console.log("Columns:", data)
}

checkSchema()
