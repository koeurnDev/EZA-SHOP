const { encrypt, decrypt } = require('./bot/utils/crypto');
const pool = require('./bot/config/database');

async function test() {
  try {
    const res = await pool.query('SELECT user_id, phone FROM users LIMIT 5');
    console.log("Users in DB:");
    for (const row of res.rows) {
      console.log(`User ${row.user_id}`);
      console.log(`Raw phone: ${row.phone}`);
      console.log(`Decrypted phone: ${decrypt(row.phone)}`);
      console.log('---');
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

test();
