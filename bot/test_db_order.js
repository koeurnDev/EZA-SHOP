require('dotenv').config();
const pool = require('./config/database');

async function test() {
  const res = await pool.query('SELECT id, total, qr_string FROM orders ORDER BY created_at DESC LIMIT 5');
  console.log(JSON.stringify(res.rows, null, 2));
  process.exit(0);
}
test();
