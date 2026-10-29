const fs = require('fs');
const path = require('path');

async function main() {
  const tokenFile = path.join(process.env.USERPROFILE, '.gemini', 'antigravity-ide', 'mcp_oauth_tokens.json');
  if (!fs.existsSync(tokenFile)) {
    throw new Error('MCP token file not found at ' + tokenFile);
  }

  const tokens = JSON.parse(fs.readFileSync(tokenFile, 'utf8'));
  const key = Object.keys(tokens)[0];
  const token = tokens[key].token.access_token;
  const projectRef = 'uzgrfdzugfovgkphokqw';

  const sqlPath = path.join(__dirname, '..', 'migrations', 'v16_master_demo_seed.sql');
  const fullSql = fs.readFileSync(sqlPath, 'utf8');

  console.log(`Loaded migration SQL (${fullSql.length} bytes, ${fullSql.split('\n').length} lines).`);

  async function runQuery(query, name) {
    console.log(`Executing ${name}...`);
    const resp = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    });

    const data = await resp.json();
    if (!resp.ok || (data && data.message)) {
      console.error(`Error in ${name}:`, data);
      throw new Error(`Failed to execute ${name}: ${JSON.stringify(data)}`);
    }
    console.log(`✓ ${name} succeeded!`);
    return data;
  }

  // Split into clean, safe execution chunks
  const lines = fullSql.split('\n');

  // Find boundaries
  const part1End = lines.findIndex(l => l.includes('-- 4. INSERT / UPSERT PROFILES & OFFICIALS'));
  const part2End = lines.findIndex(l => l.includes('-- 5. SEED 105 REALISTIC COMPLAINTS'));
  const part3End = lines.findIndex(l => l.includes('-- 6. STORED PROCEDURE: REFRESH DEMO TIMESTAMPS'));

  console.log(`Boundaries: Part 1 (0..${part1End}), Part 2 (${part1End}..${part2End}), Part 3 (${part2End}..${part3End}), Part 4 (${part3End}..${lines.length})`);

  const chunk1 = lines.slice(0, part1End).join('\n');
  const chunk2 = lines.slice(part1End, part2End).join('\n');
  const chunk3 = lines.slice(part2End, part3End).join('\n');
  const chunk4 = lines.slice(part3End).join('\n');

  await runQuery(chunk1, 'Part 1: Schema Alters, Storage, auto_escalate_priorities_v2()');
  await runQuery(chunk2, 'Part 2: Authority Profiles, Citizens, 26 Staff Workers');
  await runQuery(chunk3, 'Part 3: 105 Complaints & History');
  await runQuery(chunk4, 'Part 4: refresh_demo_complaints_timestamps()');

  console.log('\n=========================================');
  console.log('ALL PARTS EXECUTED SUCCESSFULLY!');
  console.log('=========================================\n');

  // Verify counts in DB
  const verifyRes = await runQuery(`
    SELECT 
      (SELECT COUNT(*) FROM profiles) as total_profiles,
      (SELECT COUNT(*) FROM citizens) as total_citizens,
      (SELECT COUNT(*) FROM staff) as total_staff,
      (SELECT COUNT(*) FROM raw_complaints) as total_raw_complaints,
      (SELECT COUNT(*) FROM processed_complaints) as total_processed_complaints,
      (SELECT COUNT(*) FROM completed_complaints) as total_completed_complaints;
  `, 'Database Verification Count');

  console.log('Live Database Counts:', verifyRes);

  const priorityDistribution = await runQuery(`
    SELECT priority_level, count(*) 
    FROM processed_complaints 
    GROUP BY priority_level 
    ORDER BY count(*) DESC;
  `, 'Priority Level Distribution');

  console.log('Priority Level Breakdown:', priorityDistribution);
}

main().catch(err => {
  console.error('Migration execution failed:', err);
  process.exit(1);
});
