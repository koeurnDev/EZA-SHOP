#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const imageHealthService = require('../services/imageHealthService');
const pool = require('../config/database');

async function main() {
  const clearDb = process.argv.includes('--clear-db');
  const dryRun = process.argv.includes('--dry-run');

  if (dryRun) {
    console.log('🔍 Dry run — report only, no DB changes');
  } else if (clearDb) {
    console.log('⚠️  Scan + CLEAR broken image URLs from DB (--clear-db)');
  } else {
    console.log('🔍 Scan only — broken URLs flagged in cache, DB untouched (default)');
    console.log('   Use --clear-db to wipe broken URLs from products table');
  }

  const result = await imageHealthService.scanAndRepairProducts({ clearDb: clearDb && !dryRun });

  console.log(`\n✅ Scanned: ${result.scanned}`);
  console.log(`❌ Broken: ${result.broken.length}`);
  if (result.broken.length) {
    result.broken.forEach((b) => console.log(`   - #${b.id} ${b.name}: ${b.url}`));
  }
  if (result.cleared) {
    console.log(`🧹 Cleared from DB: ${result.cleared}`);
  }

  await pool.end();
  process.exit(0);
}

main().catch((err) => {
  console.error('🔴 Scan failed:', err.message);
  process.exit(1);
});
