require('dotenv').config();
const pool = require('./config/database');

async function check() {
  try {
    const res = await pool.query('SELECT * FROM settings');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

check();
