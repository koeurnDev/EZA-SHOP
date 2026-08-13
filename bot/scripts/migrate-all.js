require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const db = require('../config/database');

const MIGRATIONS_DIR = path.join(__dirname, '../migrations');

async function ensureMigrationTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function getApplied() {
  const res = await db.query('SELECT filename FROM schema_migrations');
  return new Set(res.rows.map((r) => r.filename));
}

async function runMigration(file, sql) {
  // DDL auto-commits; avoid long-held transactions that can break pooled connections
  await db.query(sql);
  await db.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
}

async function migrateAll() {
  await ensureMigrationTable();
  const applied = await getApplied();

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  let ran = 0;
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`⏭️  Skip ${file} (already applied)`);
      continue;
    }

    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8').trim();
    if (!sql) {
      console.log(`⏭️  Skip ${file} (empty)`);
      continue;
    }

    console.log(`⏳ Running ${file}...`);
    try {
      await runMigration(file, sql);
      console.log(`✅ Applied ${file}`);
      ran++;
    } catch (err) {
      // Index/table already exists from manual setup — record and continue
      if (/already exists|duplicate key/i.test(err.message)) {
        await db.query('INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING', [file]);
        console.log(`⚠️  ${file} skipped (${err.message}) — marked applied`);
        ran++;
        continue;
      }
      throw err;
    }
  }

  if (ran === 0) {
    console.log('✅ All migrations up to date.');
  } else {
    console.log(`✅ Applied ${ran} migration(s).`);
  }
}

migrateAll()
  .catch((err) => {
    console.error('🔴 Migration failed:', err.message);
    process.exit(1);
  })
  .finally(() => db.end());
