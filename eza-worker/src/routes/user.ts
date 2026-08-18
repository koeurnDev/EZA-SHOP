import { Hono } from 'hono';
import { eq, desc, sql } from 'drizzle-orm';
import { z } from 'zod';
import { createDb } from '../db/connection';
import { users, orders } from '../db/schema';
import { telegramAuth } from '../middleware/auth';
import { parseJsonSafe, sanitizeString, validatePhone } from '../utils/helpers';
import type { Env, Variables } from '../types';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * GET /api/user/profile
 */
app.get('/profile', telegramAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const db = createDb(c.env);

    const result = await db.select().from(users).where(eq(users.user_id, userId)).limit(1);

    if (!result.length) {
      return c.json({
        success: true,
        profile: { user_id: userId, loyalty_points: 0, phone: '', address: '' },
      });
    }

    const u = result[0];

    // Calculate total spent for VIP Status
    const spentRes = await db.execute(
      sql`SELECT SUM(total) as total_spent FROM orders WHERE user_id = ${userId} AND status = 'delivered'`
    );
    const totalSpentStr = (spentRes.rows[0] as any)?.total_spent;
    const totalSpent = totalSpentStr ? parseFloat(totalSpentStr) : 0;

    let vipTier = 'none';
    if (totalSpent >= 1000) vipTier = 'diamond';
    else if (totalSpent >= 500) vipTier = 'gold';
    else if (totalSpent >= 100) vipTier = 'silver';

    return c.json({
      success: true,
      profile: {
        user_id: u.user_id,
        user_name: u.user_name,
        username: u.username,
        phone: u.phone || '',
        address: u.address || '',
        role: u.role,
        is_banned: u.is_banned,
        loyalty_points: u.loyalty_points || 0,
        photo_url: u.photo_url,
        last_seen: u.last_seen?.toISOString(),
        total_spent: totalSpent,
        vip_tier: vipTier,
      },
    });
  } catch (error) {
    console.error('getProfile error:', error);
    return c.json({ success: false, error: 'Failed to fetch profile' }, 500);
  }
});

/**
 * PUT /api/user/profile
 */
app.put('/profile', telegramAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();

    const schema = z.object({
      phone: z.string().max(20).optional(),
      address: z.string().max(500).optional(),
    });

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, error: 'Invalid input', details: parsed.error.issues }, 400);
    }

    const phone = parsed.data.phone ? sanitizeString(parsed.data.phone) : '';
    const address = parsed.data.address ? sanitizeString(parsed.data.address) : '';

    if (phone && !validatePhone(phone)) {
      return c.json({ success: false, error: 'Invalid phone number format. Must be 8-15 digits.' }, 400);
    }

    const db = createDb(c.env);
    const dummyEmail = `tg_${userId}@vibelifestyle.local`;

    await db.execute(
      sql`INSERT INTO users (user_id, phone, address, email, last_updated, loyalty_points)
          VALUES (${userId}, ${phone}, ${address}, ${dummyEmail}, NOW(), 0)
          ON CONFLICT (user_id) DO UPDATE SET
            phone = EXCLUDED.phone,
            address = EXCLUDED.address,
            last_updated = NOW()`
    );

    const updated = await db.select().from(users).where(eq(users.user_id, userId)).limit(1);
    const u = updated[0];

    return c.json({
      success: true,
      profile: {
        user_id: u.user_id,
        phone: u.phone || '',
        address: u.address || '',
        loyalty_points: u.loyalty_points || 0,
      },
    });
  } catch (error) {
    console.error('updateProfile error:', error);
    return c.json({ success: false, error: 'Failed to update profile' }, 500);
  }
});

/**
 * PUT /api/user/cart
 * Sync user cart to backend for Abandoned Cart recovery
 */
app.put('/cart', telegramAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const body = await c.req.json();
    const db = createDb(c.env);
    
    // Safely store cart as JSON string
    const cartState = JSON.stringify(body.cart || []);
    const dummyEmail = `tg_${userId}@vibelifestyle.local`;

    await db.execute(
      sql`INSERT INTO users (user_id, email, cart_state, cart_updated_at, is_cart_reminded)
          VALUES (${userId}, ${dummyEmail}, ${cartState}, NOW(), false)
          ON CONFLICT (user_id) DO UPDATE SET
            cart_state = EXCLUDED.cart_state,
            cart_updated_at = NOW(),
            is_cart_reminded = false`
    );

    return c.json({ success: true });
  } catch (error) {
    console.error('updateCart error:', error);
    return c.json({ success: false, error: 'Failed to sync cart' }, 500);
  }
});
/**
 * POST /api/user/redeem-points
 */
app.post('/redeem-points', telegramAuth, async (c) => {
  try {
    const userId = c.get('userId') as string;
    const db = createDb(c.env);

    const POINTS_COST = 100;
    const REWARD_VALUE = 2.00;

    // Atomically deduct points if user has enough
    const updatedUser = await db
      .update(users)
      .set({ loyalty_points: sql`loyalty_points - ${POINTS_COST}` })
      .where(sql`user_id = ${userId} AND loyalty_points >= ${POINTS_COST}`)
      .returning();

    if (updatedUser.length === 0) {
      return c.json({ success: false, error: 'Insufficient loyalty points' }, 400);
    }

    // Generate unique coupon code
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    const couponCode = `PTS-${randomStr}`;

    const { coupons } = await import('../db/schema');
    await db.insert(coupons).values({
      code: couponCode,
      discount_type: 'fixed',
      value: String(REWARD_VALUE),
      is_auto: false,
      active: true,
      apply_to: 'all',
      usage_limit: 1,
    });

    return c.json({
      success: true,
      message: 'Points redeemed successfully',
      coupon_code: couponCode,
      new_balance: updatedUser[0].loyalty_points,
    });
  } catch (error) {
    console.error('redeemPoints error:', error);
    // If we reach here after deducting points but before inserting coupon, we might have lost points.
    // However, Drizzle neon-http without interactive tx makes this tricky.
    // A robust system would use db.transaction. For now, catching here.
    return c.json({ success: false, error: 'Failed to redeem points' }, 500);
  }
});

/**
 * GET /api/user/orders
 */
app.get('/orders', telegramAuth, async (c) => {
  try {
    const userId = c.get('userId');
    const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);
    const offset = Math.max(parseInt(c.req.query('offset') || '0'), 0);

    const db = createDb(c.env);

    const userOrders = await db
      .select()
      .from(orders)
      .where(eq(orders.user_id, userId))
      .orderBy(desc(orders.created_at))
      .limit(limit)
      .offset(offset);

    // total count
    const countRes = await db.execute(
      sql`SELECT COUNT(*) as total FROM orders WHERE user_id = ${userId}`
    );
    const total = parseInt((countRes.rows[0] as any)?.total || '0');

    const formatted = userOrders.map(o => ({
      id: o.id,
      order_code: o.order_code,
      total: parseFloat(o.total),
      subtotal: parseFloat(o.subtotal || '0'),
      delivery_fee: parseFloat(o.delivery_fee || '0'),
      discount_amount: parseFloat(o.discount_amount || '0'),
      items: parseJsonSafe(o.items as string, []),
      status: o.status,
      phone: o.phone,
      address: o.address,
      province: o.province,
      delivery_company: o.delivery_company,
      payment_method: o.payment_method,
      tracking_number: o.tracking_number,
      receipt_url: o.receipt_url,
      qr_string: o.qr_string,
      note: o.note,
      expires_at: o.expires_at?.toISOString(),
      created_at: o.created_at.toISOString(),
    }));

    return c.json({
      success: true,
      orders: formatted,
      pagination: { limit, offset, total, hasMore: offset + limit < total },
    });
  } catch (error) {
    console.error('getUserOrders error:', error);
    return c.json({ success: false, error: 'Failed to fetch orders' }, 500);
  }
});

export default app;
