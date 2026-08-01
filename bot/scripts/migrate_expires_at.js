require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function migrate() {
  console.log('🐘 Starting Database Migration...');
  const client = await pool.connect();
  try {
    await client.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE;');
    console.log('✅ Success: Column "expires_at" added to "orders" table.');
    
    // Optional: Populate existing orders with a default value based on created_at
    await client.query("UPDATE orders SET expires_at = created_at + interval '5 minutes' WHERE expires_at IS NULL;");
    console.log('✅ Success: Populated existing orders with default expires_at.');
    
  } catch (err) {
    console.error('❌ Migration Failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
