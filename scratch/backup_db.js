const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = "https://uzgrfdzugfovgkphokqw.supabase.co";
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV6Z3JmZHp1Z2ZvdmdrcGhva3F3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTkyNjAzNywiZXhwIjoyMDg1NTAyMDM3fQ.IX6go-2fsbXOOXz-ElBbMwI8xlTgXixUk9mLVtEioYY";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function exportAll() {
  const tables = [
    'profiles',
    'citizens',
    'staff',
    'raw_complaints',
    'processed_complaints',
    'completed_complaints',
    'otp_codes'
  ];

  const backup = {};

  for (const table of tables) {
    console.log(`Exporting table: ${table}...`);
    const { data, error } = await supabase.from(table).select('*');
    if (error) {
      console.error(`Error exporting ${table}:`, error.message);
      backup[table] = { error: error.message };
    } else {
      console.log(`  -> ${data.length} rows exported.`);
      backup[table] = data;
    }
  }

  // Also check if any billing tables exist
  const potentialTables = ['bills', 'bill_items', 'bill_payments', 'user_documents'];
  for (const table of potentialTables) {
    const { data, error } = await supabase.from(table).select('*');
    if (!error) {
      console.log(`Exported optional table: ${table} (${data.length} rows)`);
      backup[table] = data;
    }
  }

  // Also export auth users via admin API if permitted
  try {
    const { data: usersData, error: usersErr } = await supabase.auth.admin.listUsers();
    if (!usersErr && usersData) {
      console.log(`Exported ${usersData.users.length} auth.users`);
      backup['auth_users'] = usersData.users.map(u => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        user_metadata: u.user_metadata
      }));
    }
  } catch (err) {
    console.log("Could not export auth users:", err.message);
  }

  const backupDir = path.join(__dirname, 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = path.join(backupDir, `db_backup_${timestamp}.json`);
  fs.writeFileSync(filename, JSON.stringify(backup, null, 2));
  console.log(`\nAll backup data successfully saved to: ${filename}`);
}

exportAll();
