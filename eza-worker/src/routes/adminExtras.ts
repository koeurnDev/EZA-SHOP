import { Hono } from 'hono';
import { eq, desc, sql } from 'drizzle-orm';
import { z } from 'zod';
import { createDb } from '../db/connection';
import { users, orders, settings, categories, coupons, products } from '../db/schema';
import { telegramAuth, adminAuth } from '../middleware/auth';
import { parseJsonSafe } from '../utils/helpers';
import type { Env, Variables } from '../types';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use('*', telegramAuth, adminAuth);

/* ─────────────────── CUSTOMERS ─────────────────── */

/**
 * GET /api/admin/customers
 */
app.get('/customers', async (c) => {
  try {
    const limit = Math.min(parseInt(c.req.query('limit') || '100'), 500);
    const offset = Math.max(parseInt(c.req.query('offset') || '0'), 0);
    const db = createDb(c.env);

    const customers = await db
      .select()
      .from(users)
      .orderBy(desc(users.last_seen))
      .limit(limit)
      .offset(offset);

    return c.json({
      success: true,
      customers: customers.map(u => ({
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
      })),
    });
  } catch (error) {
    console.error('getCustomers error:', error);
    return c.json({ success: true, customers: [] });
  }
});

/**
 * PUT /api/admin/customers/:id/role
 */
app.put('/customers/:id/role', async (c) => {
  try {
    const userId = c.req.param('id');
    const body = await c.req.json();
    const schema = z.object({ role: z.enum(['user', 'staff', 'admin']) });
    const parsed = schema.safeParse(body);
    if (!parsed.success) return c.json({ success: false, error: 'Invalid role' }, 400);

    if (userId === c.env.SUPERADMIN_ID) {
      return c.json({ success: false, error: 'Cannot modify SuperAdmin role' }, 400);
    }

    const db = createDb(c.env);
    const updated = await db
      .update(users)
      .set({ role: parsed.data.role, last_updated: new Date() })
      .where(eq(users.user_id, userId))
      .returning();

    return c.json({ success: true, user: updated[0] });
  } catch (error) {
    return c.json({ success: false, error: 'Failed to update role' }, 500);
  }
});

/**
 * PUT /api/admin/customers/:id/ban
 */
app.put('/customers/:id/ban', async (c) => {
  try {
    const userId = c.req.param('id');
    const body = await c.req.json();
    const isBanned = body.isBanned ?? body.is_banned ?? false;

    if (userId === c.env.SUPERADMIN_ID) {
      return c.json({ success: false, error: 'Cannot ban SuperAdmin' }, 400);
    }

    const db = createDb(c.env);
    const updated = await db
      .update(users)
      .set({ is_banned: Boolean(isBanned), last_updated: new Date() })
      .where(eq(users.user_id, userId))
      .returning();

    return c.json({ success: true, user: updated[0] });
  } catch (error) {
    return c.json({ success: false, error: 'Failed to update ban status' }, 500);
  }
});

/**
 * DELETE /api/admin/customers/:id
 */
app.delete('/customers/:id', async (c) => {
  try {
    const userId = c.req.param('id');

    if (userId === c.env.SUPERADMIN_ID) {
      return c.json({ success: false, error: 'Cannot delete SuperAdmin' }, 400);
    }

    const db = createDb(c.env);

    // Check user exists
    const existing = await db.select().from(users).where(eq(users.user_id, userId)).limit(1);
    if (!existing.length) return c.json({ success: false, error: 'User not found' }, 404);
    if (existing[0].role === 'admin') {
      return c.json({ success: false, error: 'Cannot delete admin account' }, 400);
    }

    await db.delete(orders).where(eq(orders.user_id, userId));
    await db.delete(users).where(eq(users.user_id, userId));

    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false, error: 'Failed to delete customer' }, 500);
  }
});

/* ─────────────────── ORDERS EXPORT ─────────────────── */

/**
 * GET /api/admin/orders/export - CSV export
 */
app.get('/orders/export', async (c) => {
  try {
    const db = createDb(c.env);
    const allOrders = await db
      .select()
      .from(orders)
      .orderBy(desc(orders.created_at))
      .limit(10000);

    let csv = 'Order ID,Date,Customer Name,Phone,Status,Total ($)\n';
    for (const o of allOrders) {
      const id = o.order_code || o.id;
      const date = new Date(o.created_at).toISOString().split('T')[0];
      const name = `"${(o.user_name || 'N/A').replace(/"/g, '""')}"`;
      const phone = o.phone || 'N/A';
      const status = o.status || '';
      const total = parseFloat(o.total).toFixed(2);
      csv += `${id},${date},${name},${phone},${status},${total}\n`;
    }

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="orders_export.csv"',
      },
    });
  } catch (error) {
    return c.json({ success: false, error: 'Export failed' }, 500);
  }
});

/* ─────────────────── SETTINGS (WRITE) ─────────────────── */

/**
 * PUT /api/admin/settings
 */
app.put('/settings', async (c) => {
  try {
    const body = await c.req.json();
    const schema = z.object({ key: z.string(), value: z.string() });
    const parsed = schema.safeParse(body);
    if (!parsed.success) return c.json({ success: false, error: 'Invalid key/value' }, 400);

    const db = createDb(c.env);
    await db.execute(
      sql`INSERT INTO settings (key, value) VALUES (${parsed.data.key}, ${parsed.data.value})
          ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`
    );
    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false, error: 'Failed to update setting' }, 500);
  }
});

/* ─────────────────── CATEGORIES ─────────────────── */

/**
 * GET /api/admin/categories
 */
app.get('/categories', async (c) => {
  try {
    const db = createDb(c.env);
    const cats = await db.select().from(categories);
    return c.json({ success: true, categories: cats.map(c => c.name) });
  } catch (error) {
    return c.json({ success: false, error: 'Failed to fetch categories' }, 500);
  }
});

/**
 * POST /api/admin/categories
 */
app.post('/categories', async (c) => {
  try {
    const body = await c.req.json();
    if (!body.name) return c.json({ success: false, error: 'Name required' }, 400);
    const db = createDb(c.env);
    await db.execute(
      sql`INSERT INTO categories (name) VALUES (${body.name}) ON CONFLICT (name) DO NOTHING`
    );
    return c.json({ success: true, category: body.name });
  } catch (error) {
    return c.json({ success: false, error: 'Failed to add category' }, 500);
  }
});

/**
 * DELETE /api/admin/categories/:id
 */
app.delete('/categories/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const db = createDb(c.env);
    await db.delete(categories).where(eq(categories.id, id));
    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false, error: 'Failed to delete category' }, 500);
  }
});

/* ─────────────────── COUPONS ─────────────────── */

/**
 * GET /api/admin/coupons
 */
app.get('/coupons', async (c) => {
  try {
    const db = createDb(c.env);
    const all = await db.select().from(coupons).orderBy(desc(coupons.created_at));
    return c.json({
      success: true,
      coupons: all.map(cp => ({ ...cp, value: parseFloat(cp.value) })),
    });
  } catch (error) {
    return c.json({ success: false, error: 'Failed to fetch coupons' }, 500);
  }
});

/**
 * POST /api/admin/coupons
 */
app.post('/coupons', async (c) => {
  try {
    const body = await c.req.json();
    const db = createDb(c.env);
    const res = await db.insert(coupons).values({
      code: body.code.toUpperCase(),
      discount_type: body.discount_type || 'percent',
      value: String(body.value || 0),
      is_auto: body.is_auto || false,
      active: body.active ?? true,
      apply_to: body.apply_to || 'all',
      usage_limit: body.usage_limit || null,
    }).returning();
    return c.json({ success: true, coupon: res[0] });
  } catch (error) {
    return c.json({ success: false, error: 'Failed to create coupon' }, 500);
  }
});

/**
 * DELETE /api/admin/coupons/:id
 */
app.delete('/coupons/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const db = createDb(c.env);
    await db.delete(coupons).where(eq(coupons.id, id));
    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false, error: 'Failed to delete coupon' }, 500);
  }
});

/* ─────────────────── PRODUCTS (CRUD) ─────────────────── */

/**
 * POST /api/admin/products
 */
app.post('/products', async (c) => {
  try {
    const body = await c.req.json();
    const db = createDb(c.env);

    if (body.category) {
      await db.execute(
        sql`INSERT INTO categories (name) VALUES (${body.category}) ON CONFLICT (name) DO NOTHING`
      );
    }

    const res = await db.insert(products).values({
      name: body.name,
      price: String(body.price || 0),
      category: body.category || '',
      image: body.image || '',
      stock: parseInt(body.stock) || 0,
      description: body.description || '',
      additional_images: parseJsonSafe(body.additional_images, []),
      variants: parseJsonSafe(body.variants, []),
      flash_sale_price: body.flash_sale_price ? String(body.flash_sale_price) : null,
      flash_sale_end: body.flash_sale_end ? new Date(body.flash_sale_end) : null,
      video_url: body.video_url || null,
    }).returning();

    return c.json({ success: true, product: res[0] });
  } catch (error) {
    console.error('Failed to create product:', error);
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to create product' }, 500);
  }
});

/**
 * PUT /api/admin/products/:id
 */
app.put('/products/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json();
    const db = createDb(c.env);

    if (body.category) {
      await db.execute(
        sql`INSERT INTO categories (name) VALUES (${body.category}) ON CONFLICT (name) DO NOTHING`
      );
    }

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.price !== undefined) updateData.price = String(body.price);
    if (body.category !== undefined) updateData.category = body.category;
    if (body.image !== undefined) updateData.image = body.image;
    if (body.stock !== undefined) updateData.stock = parseInt(body.stock);
    if (body.description !== undefined) updateData.description = body.description;
    if (body.additional_images !== undefined) updateData.additional_images = parseJsonSafe(body.additional_images, []);
    if (body.variants !== undefined) updateData.variants = parseJsonSafe(body.variants, []);
    if (body.flash_sale_price !== undefined) updateData.flash_sale_price = body.flash_sale_price ? String(body.flash_sale_price) : null;
    if (body.flash_sale_end !== undefined) updateData.flash_sale_end = body.flash_sale_end ? new Date(body.flash_sale_end) : null;
    if (body.video_url !== undefined) updateData.video_url = body.video_url;

    const updated = await db.update(products).set(updateData).where(eq(products.id, id)).returning();
    if (!updated.length) return c.json({ success: false, error: 'Product not found' }, 404);

    return c.json({ success: true, product: updated[0] });
  } catch (error) {
    console.error('Failed to update product:', error);
    return c.json({ success: false, error: error instanceof Error ? error.message : 'Failed to update product' }, 500);
  }
});

/**
 * DELETE /api/admin/products/:id
 */
app.delete('/products/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const db = createDb(c.env);
    await db.delete(products).where(eq(products.id, id));
    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false, error: 'Failed to delete product' }, 500);
  }
});

/* ─────────────────── ORDER STATUS UPDATE ─────────────────── */

/**
 * PUT /api/admin/orders/:id/status  (already in admin.ts — this adds Telegram notify)
 */
app.put('/orders/:id/notify', async (c) => {
  try {
    const body = await c.req.json();
    const { userId, status, orderCode } = body;

    if (!userId || !status) return c.json({ success: false, error: 'Missing fields' }, 400);

    const statusMap: Record<string, string> = {
      paid: 'បានបង់ប្រាក់រួចរាល់ ✅',
      processing: 'កំពុងរៀបចំអីវ៉ាន់ 📦',
      shipped: 'ប្រគល់ជូនអ្នកដឹកជញ្ជូន 🚚',
      delivered: 'បានដល់ដៃអតិថិជន 🎉',
      cancelled: 'បោះបង់ ❌',
    };

    const msg = `🛍️ ការបញ្ជាទិញរបស់បង លេខសម្គាល់  ${orderCode} ត្រូវបានប្តូរទៅ ${statusMap[status] || status}`;

    // Send Telegram notification
    const tgRes = await fetch(
      `https://api.telegram.org/bot${c.env.BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: userId, text: msg, parse_mode: 'Markdown' }),
      }
    );

    const tgData = await tgRes.json() as any;
    return c.json({ success: true, telegram_sent: tgData.ok });
  } catch (error) {
    return c.json({ success: true, telegram_sent: false }); // non-critical
  }
});

/* ─────────────────── FAQS ADMIN ─────────────────── */

/**
 * GET /api/admin/faqs
 */
app.get('/faqs', async (c) => {
  try {
    const db = createDb(c.env);
    const res = await db.execute(sql`SELECT * FROM faqs ORDER BY sort_order ASC, id ASC`);
    return c.json({ success: true, faqs: res.rows || [] });
  } catch (error) {
    return c.json({ success: false, error: 'Failed to fetch FAQs' }, 500);
  }
});

/**
 * POST /api/admin/faqs
 */
app.post('/faqs', async (c) => {
  try {
    const body = await c.req.json();
    const { q_kh = '', q_en = '', a_kh = '', a_en = '', sort_order = 0, is_active = true } = body;
    const db = createDb(c.env);
    await db.execute(sql`
      INSERT INTO faqs (q_kh, q_en, a_kh, a_en, sort_order, is_active)
      VALUES (${q_kh}, ${q_en}, ${a_kh}, ${a_en}, ${sort_order}, ${is_active})
    `);
    return c.json({ success: true });
  } catch (error: any) {
    console.error('FAQ create error:', error);
    return c.json({ success: false, error: 'Failed to create FAQ' }, 500);
  }
});

/**
 * PUT /api/admin/faqs/:id
 */
app.put('/faqs/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const body = await c.req.json();
    const { q_kh = '', q_en = '', a_kh = '', a_en = '', sort_order = 0, is_active = true } = body;
    const db = createDb(c.env);
    await db.execute(sql`
      UPDATE faqs SET q_kh=${q_kh}, q_en=${q_en}, a_kh=${a_kh}, a_en=${a_en},
      sort_order=${sort_order}, is_active=${is_active}
      WHERE id=${id}
    `);
    return c.json({ success: true });
  } catch (error: any) {
    console.error('FAQ update error:', error);
    return c.json({ success: false, error: 'Failed to update FAQ' }, 500);
  }
});

/**
 * DELETE /api/admin/faqs/:id
 */
app.delete('/faqs/:id', async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    const db = createDb(c.env);
    await db.execute(sql`DELETE FROM faqs WHERE id=${id}`);
    return c.json({ success: true });
  } catch (error: any) {
    console.error('FAQ delete error:', error);
    return c.json({ success: false, error: 'Failed to delete FAQ' }, 500);
  }
});

/**
 * GET /api/admin/advanced-analytics
 */
app.get('/advanced-analytics', async (c) => {
  try {
    const db = createDb(c.env);
    const [salesRes, ordersRes, topProductsRes] = await Promise.all([
      db.execute(sql`SELECT COALESCE(SUM(total::numeric), 0) as total_revenue, COUNT(*) as total_orders FROM orders WHERE status != 'cancelled'`),
      db.execute(sql`SELECT status, COUNT(*) as count FROM orders GROUP BY status`),
      db.select().from(products).limit(10),
    ]);
    return c.json({
      success: true,
      data: {
        total_revenue: parseFloat((salesRes.rows[0] as any)?.total_revenue || '0'),
        total_orders: parseInt((salesRes.rows[0] as any)?.total_orders || '0'),
        order_status: ordersRes.rows,
        top_products: topProductsRes,
      }
    });
  } catch (error) {
    return c.json({ success: true, data: {} });
  }
});

/* ─────────────────── BROADCAST ─────────────────── */

/**
 * POST /api/admin/broadcast - Send message to all users via Telegram
 */
app.post('/broadcast', async (c) => {
  try {
    const body = await c.req.json();
    const { message, photoUrl } = body;

    if (!message?.trim() && !photoUrl) {
      return c.json({ success: false, error: 'Message or image required' }, 400);
    }

    const db = createDb(c.env);
    const botToken = c.env.BOT_TOKEN;

    if (!botToken) {
      return c.json({ success: false, error: 'BOT_TOKEN not configured' }, 500);
    }

    // Get all users - user_id IS the telegram id
    const allUsers = await db
      .select({ user_id: users.user_id })
      .from(users);

    let sent = 0;
    let failed = 0;

    for (const u of allUsers) {
      if (!u.user_id) continue;
      try {
        const telegramUrl = photoUrl
          ? `https://api.telegram.org/bot${botToken}/sendPhoto`
          : `https://api.telegram.org/bot${botToken}/sendMessage`;

        const telegramBody = photoUrl
          ? { chat_id: u.user_id, photo: photoUrl, caption: message || '' }
          : { chat_id: u.user_id, text: message, parse_mode: 'HTML' };

        const res = await fetch(telegramUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(telegramBody)
        });

        const result = await res.json() as any;
        if (result.ok) {
          sent++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    return c.json({
      success: true,
      data: { count: sent, failed, total: allUsers.length }
    });
  } catch (error: any) {
    console.error('broadcast error:', error);
    return c.json({ success: false, error: 'Broadcast failed' }, 500);
  }
});

export default app;
