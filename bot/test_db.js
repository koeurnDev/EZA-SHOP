const { Pool } = require('pg');
require('dotenv').config();
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
pool.query("SELECT value FROM settings WHERE key = 'payment_qr_url'").then(res => {
  console.log('DB value:', res.rows[0]?.value);
  pool.end();
}).catch(console.error);
