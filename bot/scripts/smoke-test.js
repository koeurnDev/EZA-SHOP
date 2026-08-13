#!/usr/bin/env node
/**
 * Post-deploy / local health checks — no external deps beyond pg.
 * Usage: cd bot && npm run smoke
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const db = require('../config/database');

const REQUIRED_ENV = ['BOT_TOKEN', 'DATABASE_URL', 'WEBAPP_URL', 'SUPERADMIN_ID'];
const REQUIRED_TABLES = ['products', 'orders', 'users', 'wishlist', 'schema_migrations'];

let passed = 0;
let failed = 0;

function ok(label) {
  console.log(`  ✅ ${label}`);
  passed += 1;
}

function fail(label, detail = '') {
  console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`);
  failed += 1;
}

async function checkEnv() {
  console.log('\n📋 Environment');
  for (const key of REQUIRED_ENV) {
    if (process.env[key]) ok(key);
    else fail(key, 'missing');
  }
}

async function checkDb() {
  console.log('\n🗄️  Database');
  try {
    const ping = await db.query('SELECT 1 AS ok');
    if (ping.rows[0]?.ok === 1) ok('Connection');
    else fail('Connection', 'unexpected response');
  } catch (err) {
    fail('Connection', err.message);
    return;
  }

  for (const table of REQUIRED_TABLES) {
    try {
      const res = await db.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = $1
        ) AS exists`,
        [table]
      );
      if (res.rows[0]?.exists) ok(`Table: ${table}`);
      else fail(`Table: ${table}`, 'not found — run npm run migrate');
    } catch (err) {
      fail(`Table: ${table}`, err.message);
    }
  }

  try {
    const products = await db.query('SELECT COUNT(*)::int AS n FROM products');
    const n = products.rows[0]?.n ?? 0;
    if (n > 0) ok(`Products (${n} rows)`);
    else fail('Products', '0 rows — check catalog / image restore');
  } catch (err) {
    fail('Products count', err.message);
  }

  try {
    const migrations = await db.query('SELECT COUNT(*)::int AS n FROM schema_migrations');
    ok(`Migrations applied: ${migrations.rows[0]?.n ?? 0}`);
  } catch {
    /* schema_migrations already checked above */
  }
}

function checkScripts() {
  console.log('\n📜 Ops scripts');
  const scriptsDir = path.join(__dirname);
  const expected = [
    'migrate-all.js',
    'restore-product-images.js',
    'scan-broken-images.js',
    'db-backup.js',
    'smoke-test.js'
  ];
  for (const file of expected) {
    if (fs.existsSync(path.join(scriptsDir, file))) ok(file);
    else fail(file, 'missing');
  }

  const sharedDir = path.join(__dirname, '../../shared');
  for (const file of ['discountUtils.js', 'deliveryUtils.js']) {
    if (fs.existsSync(path.join(sharedDir, file))) ok(`shared/${file}`);
    else fail(`shared/${file}`, 'missing');
  }
}

function checkSyntax() {
  console.log('\n🔍 Syntax (key files)');
  const root = path.join(__dirname, '..');
  const files = [
    'server.js',
    'app.js',
    'controllers/wishlistController.js',
    'services/imageHealthService.js',
    'scripts/migrate-all.js'
  ];
  const { execSync } = require('child_process');
  for (const rel of files) {
    const full = path.join(root, rel);
    try {
      execSync(`node --check "${full}"`, { stdio: 'pipe' });
      ok(rel);
    } catch {
      fail(rel, 'syntax error');
    }
  }
}

async function main() {
  console.log('🧪 MO-MO smoke test');
  checkSyntax();
  checkScripts();
  await checkEnv();
  await checkDb();

  console.log(`\n${'─'.repeat(40)}`);
  console.log(`Result: ${passed} passed, ${failed} failed`);
  await db.end();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (err) => {
  console.error('🔴 Smoke test crashed:', err.message);
  try { await db.end(); } catch { /* ignore */ }
  process.exit(1);
});
