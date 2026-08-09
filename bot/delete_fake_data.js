const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const fakeProductNames = [
  'Rose Elegance Perfume',
  'Pure Eucalyptus Lotion',
  'Midnight Gold Luxe Candle',
  'Serenity Lavender Oil',
  'Grand Boutique Gift Set'
];

async function deleteFakeData() {
  console.log('🚀 Deleting fake data...');
  let client;
  try {
    client = await pool.connect();
    for (const name of fakeProductNames) {
      const res = await client.query('DELETE FROM products WHERE name = $1 RETURNING *', [name]);
      if (res.rowCount > 0) {
        console.log(`✅ Deleted: ${name}`);
      }
    }
    console.log('✨ Fake data deleted successfully!');
  } catch (error) {
    console.error('❌ Failed to delete fake data:', error);
  } finally {
    if (client) client.release();
    await pool.end();
    process.exit(0);
  }
}

deleteFakeData();
