const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function migrate() {
  try {
    // Add missing Telegram user columns to existing users table
    await pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS user_id BIGINT UNIQUE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS last_updated TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS loyalty_points INT DEFAULT 0;
    `);
    console.log('✅ Migration done: added user_id, phone, address, last_updated, loyalty_points to users');

    // Show final columns
    const res = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position");
    console.log('FINAL COLUMNS:', JSON.stringify(res.rows.map(x => x.column_name)));
  } catch (e) {
    console.error('❌ Migration error:', e.message);
  } finally {
    pool.end();
  }
}
migrate();

