import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

async function test() {
   const res = await supabase.from('staff').select('id, auth_user_id, invite_code').eq('invite_code', 'TEST1234').single()
   console.log(res)
}

test()
