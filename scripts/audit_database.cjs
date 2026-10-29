const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://uzgrfdzugfovgkphokqw.supabase.co', 'sb_publishable_z_jWfMQDgHuU0Z1_LM9FsA_NQXYnZrh');

async function checkAll() {
  const tables = ['profiles', 'citizens', 'staff', 'raw_complaints', 'processed_complaints', 'completed_complaints', 'bills', 'bill_items', 'bill_payments'];
  console.log('--- SUPABASE LIVE DATABASE AUDIT ---');
  for (const t of tables) {
    try {
      const { data, count, error } = await supabase.from(t).select('*', { count: 'exact' });
      if (error) {
        console.log(`[${t}]: Error -> ${error.message} (code: ${error.code})`);
      } else {
        console.log(`[${t}]: ${count} records found.`);
        if (data && data.length > 0) {
          const sample = data.slice(0, 3).map(d => ({
            id: d.id,
            name: d.full_name || d.title || d.bill_number || d.email,
            status: d.status || d.complaint_status || d.role
          }));
          console.log(`   Sample records from ${t}:`, JSON.stringify(sample));
        }
      }
    } catch (err) {
      console.log(`[${t}]: Exception -> ${err.message}`);
    }
  }
}
checkAll();
