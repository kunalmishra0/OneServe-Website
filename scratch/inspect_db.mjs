import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uzgrfdzugfovgkphokqw.supabase.co';
const supabaseKey = 'sb_publishable_z_jWfMQDgHuU0Z1_LM9FsA_NQXYnZrh';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
  const tables = [
    'profiles',
    'citizens',
    'raw_complaints',
    'processed_complaints',
    'completed_complaints',
    'staff',
    'otp_codes',
    'user_documents'
  ];

  console.log('=== TABLE STATUS & COLUMNS ===');
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`[${table}]: ERROR/NOT ACCESSIBLE -> ${error.message} (code: ${error.code})`);
      } else if (data && data.length > 0) {
        console.log(`[${table}]: EXISTS (${data.length} row sample) -> Columns:`, Object.keys(data[0]));
      } else {
        console.log(`[${table}]: EXISTS (empty table)`);
      }
    } catch (e) {
      console.log(`[${table}]: EXCEPTION ->`, e.message);
    }
  }

  console.log('\n=== TESTING RPCS ===');
  const rpcs = [
    'check_and_escalate_priorities',
    'get_community_wins',
    'admin_hard_delete_complaint',
    'worker_complete_task',
    'submit_rating',
    'auto_assign_nearest_task'
  ];

  for (const rpc of rpcs) {
    try {
      const { data, error } = await supabase.rpc(rpc, {});
      if (error) {
        console.log(`RPC [${rpc}]: ${error.message} (code: ${error.code})`);
      } else {
        console.log(`RPC [${rpc}]: SUCCESS / EXISTS`);
      }
    } catch (e) {
      console.log(`RPC [${rpc}]: EXCEPTION ->`, e.message);
    }
  }
}

inspect();
