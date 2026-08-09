require('dotenv').config();
const pool = require('./config/database');
(async () => {
  try {
    await pool.query('SELECT $1::text', [undefined]);
    console.log("Success with undefined");
  } catch (err) {
    console.error("PG ERROR:", err.message);
  } finally {
    process.exit(0);
  }
})();
