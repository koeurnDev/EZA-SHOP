const pool = require('../config/database');
const cacheService = require('../services/cacheService');

const couponRepository = {
  findAll: async () => {
    const res = await pool.query(`
      SELECT c.*, array_agg(cp.product_id) FILTER (WHERE cp.product_id IS NOT NULL) as product_ids
      FROM coupons c
      LEFT JOIN coupon_products cp ON c.id = cp.coupon_id
      GROUP BY c.id
      ORDER BY c.id DESC
    `);
    return res.rows;
  },

  findByCode: async (code) => {
    const res = await pool.query(`
      SELECT c.*, array_agg(cp.product_id) FILTER (WHERE cp.product_id IS NOT NULL) as product_ids
      FROM coupons c
      LEFT JOIN coupon_products cp ON c.id = cp.coupon_id
      WHERE UPPER(c.code) = UPPER($1) AND c.active = true
      AND (c.start_date IS NULL OR c.start_date <= CURRENT_TIMESTAMP)
      AND (c.end_date IS NULL OR c.end_date >= CURRENT_TIMESTAMP)
      AND (c.usage_limit IS NULL OR c.used_count < c.usage_limit)
      GROUP BY c.id
    `, [code]);
    return res.rows[0];
  },

  findActiveAuto: async () => {
    return await cacheService.getOrFetch(
      'coupons:active:auto',
      async () => {
        const res = await pool.query(`
          SELECT c.*, array_agg(cp.product_id) FILTER (WHERE cp.product_id IS NOT NULL) as product_ids
          FROM coupons c
          LEFT JOIN coupon_products cp ON c.id = cp.coupon_id
          WHERE c.is_auto = true AND c.active = true 
          AND (c.start_date IS NULL OR c.start_date <= CURRENT_TIMESTAMP)
          AND (c.end_date IS NULL OR c.end_date >= CURRENT_TIMESTAMP)
          AND (c.usage_limit IS NULL OR c.used_count < c.usage_limit)
          GROUP BY c.id
        `);
        return res.rows;
      },
      600 // 10 minutes
    );
  },

  create: async (c) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const sDate = (c.startDate && c.startDate.trim() !== '') ? c.startDate : null;
      const eDate = (c.endDate && c.endDate.trim() !== '') ? c.endDate : null;

      const res = await client.query(
        'INSERT INTO coupons (code, discount_type, value, is_auto, apply_to, start_date, end_date, usage_limit) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *',
        [c.code.toUpperCase(), c.type, c.value, c.isAuto || false, c.applyTo || 'all', sDate, eDate, c.usageLimit || null]
      );
      const coupon = res.rows[0];
      
      if (c.applyTo === 'specific' && c.productIds && c.productIds.length > 0) {
        const values = c.productIds.map((_, idx) => `($1, $${idx + 2})`).join(', ');
        const queryText = `INSERT INTO coupon_products (coupon_id, product_id) VALUES ${values}`;
        await client.query(queryText, [coupon.id, ...c.productIds]);
      }
      
      await client.query('COMMIT');
      // 🚀 Invalidate cache
      await cacheService.clearPattern('coupons:*');
      return coupon;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  incrementUsage: async (code, client = pool) => {
    // 🛡️ Atomic increment with FOR UPDATE safety (if running in transaction)
    const res = await client.query(
      `UPDATE coupons SET used_count = used_count + 1 
       WHERE UPPER(code) = UPPER($1) 
       AND (usage_limit IS NULL OR used_count < usage_limit) 
       RETURNING *`,
      [code]
    );
    if (res.rowCount === 0) {
      throw new Error(`Coupon ${code} usage limit reached or not found.`);
    }
    return res.rows[0];
  },

  delete: async (id) => {
    await pool.query('DELETE FROM coupons WHERE id = $1', [id]);
    // 🚀 Invalidate cache
    await cacheService.clearPattern('coupons:*');
  }
};

module.exports = couponRepository;
