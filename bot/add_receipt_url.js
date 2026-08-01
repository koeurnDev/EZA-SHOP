require('dotenv').config();
const { pool } = require('./config/database');
async function run() {
  try {
    await pool.query('ALTER TABLE orders ADD COLUMN receipt_url TEXT;');
    console.log('Column receipt_url added successfully.');
  } catch (e) {
    console.error('Error (might already exist):', e.message);
  } finally {
    process.exit();
  }
}
run();
