require('dotenv').config();
const pool = require('./config/database');

async function update() {
  try {
    await pool.query("UPDATE settings SET value = 'seab_koeurn@bkrt' WHERE key = 'bakong_account_id'");
    console.log('✅ Bakong ID updated in Database to: seab_koeurn@bkrt');
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

update();
