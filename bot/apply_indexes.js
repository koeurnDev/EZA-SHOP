require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const applyIndexes = async () => {
  try {
    console.log('⏳ Applying performance indexes...');
    
    // 1. Orders table indexes for fast filtering and analytics
    await pool.query('CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);');
    
    // 2. Products table indexes
    await pool.query('CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_products_stock ON products(stock);');
    
    console.log('✅ Indexes applied successfully!');
  } catch (err) {
    console.error('🔴 Error applying indexes:', err.message);
  } finally {
    await pool.end();
  }
};

applyIndexes();
