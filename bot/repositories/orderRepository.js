const pool = require('../config/database');

const orderRepository = {
  create: async (o, client = pool) => {
    // 🛡️ Self-Healing Migration: Ensure new columns exist (Crucial for Production/Render)
    try {
      await client.query(`
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal DECIMAL(12,2) DEFAULT 0;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(12,2) DEFAULT 0;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee DECIMAL(12,2) DEFAULT 0;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS gross_total DECIMAL(12,2) DEFAULT 0;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_reminded BOOLEAN DEFAULT false;
      `);
    } catch (e) {
      console.warn('⚠️ Migration Guard: Non-critical failure (Columns might already exist or permission issue)');
    }

    const res = await client.query(
      `INSERT INTO orders 
       (user_id, user_name, items, total, qr_string, phone, address, province, note, delivery_company, payment_method, order_code, idempotency_key, expires_at, status, subtotal, discount_amount, delivery_fee, gross_total) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19) RETURNING *`,
      [
        o.user_id, o.user_name, o.items, o.total, o.qr_string || '', 
        o.phone, o.address, o.province, o.note, o.delivery_company, 
        o.payment_method, o.order_code, o.idempotency_key, o.expires_at || null,
        'pending', o.subtotal || 0, o.discount_amount || 0, o.delivery_fee || 0, o.gross_total || 0
      ]
    );
    return res.rows[0];
  },

  findByCode: async (code) => {
    const res = await pool.query('SELECT * FROM orders WHERE order_code = $1', [code]);
    return res.rows[0];
  },

  findById: async (id) => {
    const res = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
    return res.rows[0];
  },

  findByIdOrCode: async (idOrCode, client = pool) => {
    if (idOrCode == null || idOrCode === '') return null;
    const byId = await client.query('SELECT * FROM orders WHERE id = $1', [idOrCode]);
    if (byId.rows[0]) return byId.rows[0];
    const byCode = await client.query('SELECT * FROM orders WHERE order_code = $1', [String(idOrCode)]);
    return byCode.rows[0] || null;
  },

  findByIdempotencyKey: async (userId, key) => {
    const res = await pool.query(
      'SELECT * FROM orders WHERE user_id = $1 AND idempotency_key = $2',
      [userId, key]
    );
    return res.rows[0];
  },

  findRecentDuplicate: async (userId, total, itemsJson) => {
    const res = await pool.query(
      `SELECT * FROM orders 
       WHERE user_id = $1 AND total = $2 AND items = $3 AND created_at > NOW() - INTERVAL '30 seconds' 
       ORDER BY created_at DESC LIMIT 1`,
      [userId, total, itemsJson]
    );
    return res.rows[0];
  },

  findByUserPaginated: async (userId, limit = 50, offset = 0) => {
    const res = await pool.query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
      [userId, limit, offset]
    );
    return res.rows;
  },

  countByUser: async (userId) => {
    const res = await pool.query('SELECT COUNT(*) as total FROM orders WHERE user_id = $1', [userId]);
    return parseInt(res.rows[0]?.total || 0);
  },

  findAll: async (limit = 100, offset = 0) => {
    // 🛡️ Migration: Ensure is_reminded column exists
    await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS is_reminded BOOLEAN DEFAULT false`).catch(() => {});

    const res = await pool.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT $1 OFFSET $2', [limit, offset]);
    return res.rows;
  },

  updateStatus: async (idOrCode, status, trackingNumber = null, client = pool) => {
    await client.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(255)`).catch(() => {});

    const existing = await orderRepository.findByIdOrCode(idOrCode, client);
    if (!existing) return null;
    
    const res = await client.query(
      "UPDATE orders SET status = $1, tracking_number = COALESCE(NULLIF($2, ''), tracking_number) WHERE id = $3 RETURNING *",
      [status, trackingNumber, existing.id]
    );
    return res.rows[0];
  },

  updateQrString: async (id, qr) => {
    await pool.query('UPDATE orders SET qr_string = $1 WHERE id = $2', [qr, id]);
  },

  updateReceiptUrl: async (id, url) => {
    const res = await pool.query('UPDATE orders SET receipt_url = $1 WHERE id = $2 RETURNING *', [url, id]);
    return res.rows[0];
  },

  updateExpiry: async (id, expiresAt) => {
    const res = await pool.query(
      'UPDATE orders SET expires_at = $1, status = $2 WHERE id = $3 RETURNING *',
      [expiresAt, 'pending', id]
    );
    return res.rows[0];
  },

  getDashboardAggregates: async () => {
    const res = await pool.query(`
      SELECT 
        SUM(total) FILTER (WHERE status != 'cancelled') as revenue,
        COUNT(*) as total_orders,
        COUNT(*) FILTER (WHERE status IN ('pending', 'processing', 'shipped')) as active_orders,
        COUNT(*) FILTER (WHERE status IN ('paid', 'processing', 'shipped', 'delivering', 'delivered')) as healthy,
        COUNT(*) as total
      FROM orders
    `);
    return {
      revenue: parseFloat(res.rows[0]?.revenue || 0),
      totalOrders: parseInt(res.rows[0]?.total_orders || 0),
      activeOrders: parseInt(res.rows[0]?.active_orders || 0),
      healthy: parseInt(res.rows[0]?.healthy || 0),
      total: parseInt(res.rows[0]?.total || 0)
    };
  },

  getDailyStats: async (days = 14) => {
    const res = await pool.query(`
      SELECT TO_CHAR(created_at, 'YYYY-MM-DD') as date, SUM(total) as revenue, COUNT(*) as orders
      FROM orders
      WHERE created_at > CURRENT_DATE - INTERVAL '${days} days' AND status != 'cancelled'
      GROUP BY date
      ORDER BY date ASC
    `);
    return res.rows;
  },

  getStatusDistribution: async () => {
    const res = await pool.query('SELECT status, COUNT(*) as count FROM orders GROUP BY status');
    return res.rows;
  },

  findPendingOrders: async (lookbackHours = 24, limit = 50, offset = 0) => {
    const safeLimit = Math.min(Math.max(parseInt(limit) || 50, 1), 200);
    const safeOffset = Math.max(parseInt(offset) || 0, 0);

    const res = await pool.query(
      `SELECT * FROM orders 
       WHERE status = 'pending' 
       AND is_reminded = false
       AND created_at > NOW() - (INTERVAL '1 hour' * $1)
       AND created_at < NOW() - INTERVAL '2 hours'
       ORDER BY created_at ASC
       LIMIT $2 OFFSET $3`,
      [lookbackHours, safeLimit, safeOffset]
    );
    return res.rows;
  },

  markAsReminded: async (id) => {
    await pool.query('UPDATE orders SET is_reminded = true WHERE id = $1', [id]);
  },

  // --- Advanced Analytics / BI ---
  
  getTopSellingProducts: async (limit = 5, days = 30) => {
    const safeLimit = Math.min(Math.max(parseInt(limit) || 5, 1), 50);
    const safeDays = Math.min(Math.max(parseInt(days) || 30, 1), 365);

    // Unnest the JSON items array to aggregate by product id/name with date scoping
    const res = await pool.query(`
      SELECT 
        item->>'id' as product_id,
        item->>'name' as product_name,
        SUM(CAST(item->>'quantity' AS INTEGER)) as total_quantity,
        SUM(CAST(item->>'price' AS DECIMAL) * CAST(item->>'quantity' AS INTEGER)) as total_revenue
      FROM orders,
      jsonb_array_elements(items::jsonb) as item
      WHERE status != 'cancelled'
      AND created_at >= NOW() - (INTERVAL '1 day' * $2)
      GROUP BY item->>'id', item->>'name'
      ORDER BY total_quantity DESC
      LIMIT $1
    `, [safeLimit, safeDays]);
    return res.rows;
  },

  getTopCustomers: async (limit = 5, days = 30) => {
    const safeLimit = Math.min(Math.max(parseInt(limit) || 5, 1), 50);
    const safeDays = Math.min(Math.max(parseInt(days) || 30, 1), 365);

    const res = await pool.query(`
      SELECT 
        user_id,
        MAX(user_name) as user_name,
        MAX(phone) as phone,
        COUNT(id) as total_orders,
        SUM(total) as total_spent
      FROM orders
      WHERE status != 'cancelled'
      AND created_at >= NOW() - (INTERVAL '1 day' * $2)
      GROUP BY user_id
      ORDER BY total_spent DESC
      LIMIT $1
    `, [safeLimit, safeDays]);
    return res.rows;
  },

  getAverageOrderValue: async (days = 30) => {
    const safeDays = Math.min(Math.max(parseInt(days) || 30, 1), 365);

    const res = await pool.query(`
      SELECT 
        COALESCE(AVG(total), 0) as aov,
        COALESCE(AVG(total) FILTER (WHERE created_at > NOW() - (INTERVAL '1 day' * $1)), 0) as aov_range
      FROM orders
      WHERE status != 'cancelled'
    `, [safeDays]);
    return {
      aov: parseFloat(res.rows[0]?.aov || 0),
      aov_30d: parseFloat(res.rows[0]?.aov_range || 0)
    };
  },

  hasPurchasedProduct: async (userId, productId) => {
    // 🛡️ Verified purchaser: order handed to courier or marked delivered
    const res = await pool.query(`
      SELECT 1 
      FROM orders, jsonb_array_elements(items::jsonb) AS item 
      WHERE user_id = $1 
      AND status IN ('shipped', 'delivering', 'delivered')
      AND (item->>'id' = $2 OR item->>'product_id' = $2)
      LIMIT 1
    `, [String(userId), String(productId)]);
    return res.rows.length > 0;
  }
};

module.exports = orderRepository;
