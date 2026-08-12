#!/usr/bin/env node
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const imageHealthService = require('../services/imageHealthService');
const pool = require('../config/database');

async function main() {
  const clearDb = process.argv.includes('--dry-run') ? false : true;
  console.log(clearDb ? '🔍 Scanning Cloudinary images (will clear broken URLs)...' : '🔍 Dry run (no DB changes)...');

  const result = await imageHealthService.scanAndRepairProducts({ clearDb });

  console.log(`\n✅ Scanned: ${result.scanned}`);
  console.log(`❌ Broken: ${result.broken.length}`);
  if (result.broken.length) {
    result.broken.forEach((b) => console.log(`   - #${b.id} ${b.name}: ${b.url}`));
  }
  if (clearDb) console.log(`🧹 Cleared from DB: ${result.cleared}`);

  await pool.end();
  process.exit(0);
}

main().catch((err) => {
  console.error('🔴 Scan failed:', err.message);
  process.exit(1);
});
