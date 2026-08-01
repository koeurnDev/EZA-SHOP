const { Client } = require('pg');
require('dotenv').config();

async function checkOrder() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  try {
    await client.connect();
    const res = await client.query("SELECT id, order_code, qr_string FROM orders WHERE order_code = 'MO-B9RYASTV'");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkOrder();
