require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

async function cleanup() {
  const client = await pool.connect();
  try {
    console.log('🔄 [DB] Starting Cleanup...');
    
    // 1. Fetch expired pending orders to restore stock before deleting them
    const pendingOrders = await client.query(
      "SELECT id, items FROM orders WHERE status = 'pending' AND created_at < NOW() - INTERVAL '1 hour'"
    );

    if (pendingOrders.rows.length > 0) {
      console.log(`📦 Found ${pendingOrders.rows.length} expired pending orders. Restoring stock...`);
      for (const order of pendingOrders.rows) {
        try {
          const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
          if (Array.isArray(items)) {
            for (const item of items) {
              await client.query(
                "UPDATE products SET stock = stock + $1 WHERE id = $2",
                [parseInt(item.quantity || 0), item.id]
              );
            }
          }
        } catch (e) {
          console.error(`⚠️ Failed to restore stock for order ${order.id}:`, e.message);
        }
      }
      
      // Delete the expired orders
      const res1 = await client.query(
        "DELETE FROM orders WHERE status = 'pending' AND created_at < NOW() - INTERVAL '1 hour'"
      );
      console.log(`✅ Deleted ${res1.rowCount} expired pending orders with stock restored.`);
    } else {
      console.log('✅ No expired pending orders found.');
    }

    // 2. Delete all orders with numeric IDs or short IDs (Legacy)
    const res2 = await client.query("DELETE FROM orders WHERE order_code IS NULL OR length(order_code) < 10");
    console.log(`✅ Deleted ${res2.rowCount} legacy/short-ID orders.`);

    console.log('✨ [DB] Cleanup finished successfully!');
  } catch (err) {
    console.error('❌ [DB] Cleanup failed:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanup();
