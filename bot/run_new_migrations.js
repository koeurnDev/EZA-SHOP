const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function run() {
  const m1 = fs.readFileSync(path.join(__dirname, 'migrations', '07_flash_sales.sql'), 'utf8');
  const m2 = fs.readFileSync(path.join(__dirname, 'migrations', '08_reviews.sql'), 'utf8');
  const client = await pool.connect();
  try {
    await client.query(m1);
    await client.query(m2);
    console.log('✅ Migrations successful!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    client.release();
    await pool.end();
  }
}
run();
