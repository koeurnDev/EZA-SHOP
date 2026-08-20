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

/* ─────────────────── BROADCAST ─────────────────── */
app.post('/broadcast', async (c) => {
  try {
    const db = createDb(c.env);
    const body = await c.req.json();
    const { message, photoUrl, buttonUrl } = body;

    if (!message && !photoUrl) {
      return c.json({ success: false, error: 'Message or Photo is required' }, 400);
    }

    // Fetch all unique users who have interacted with the bot
    const allUsers = await db.select({ user_id: users.user_id }).from(users).where(sql`${users.user_id} IS NOT NULL`);
    
    const sendBroadcast = async () => {
      let successCount = 0;
      let failCount = 0;
      
      const replyMarkup = buttonUrl ? {
        inline_keyboard: [[{ text: '🛍️ Open Shop', url: buttonUrl }]]
      } : undefined;

      for (const u of allUsers) {
        if (!u.user_id) continue;
        
        try {
          let apiUrl = `https://api.telegram.org/bot${c.env.BOT_TOKEN}/sendMessage`;
          let payload: any = {
            chat_id: u.user_id,
            text: message,
            parse_mode: 'HTML',
            reply_markup: replyMarkup
          };

          if (photoUrl) {
            apiUrl = `https://api.telegram.org/bot${c.env.BOT_TOKEN}/sendPhoto`;
            payload = {
              chat_id: u.user_id,
              photo: photoUrl,
              caption: message || '',
              parse_mode: 'HTML',
              reply_markup: replyMarkup
            };
          }

          const res = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          
          if (res.ok) successCount++;
          else failCount++;
          
          await new Promise(r => setTimeout(r, 50)); 
        } catch (e) {
          failCount++;
        }
      }
      console.log(`Broadcast finished. Success: ${successCount}, Fail: ${failCount}`);
    };

    c.executionCtx.waitUntil(sendBroadcast());

    return c.json({ success: true, data: { count: allUsers.length } });
  } catch (error: any) {
    console.error('Broadcast Error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

/* ─────────────────── CUSTOMERS ─────────────────── */

/**
 * GET /api/admin/avatar/:id
 * Fetches the user's Telegram avatar
 */
app.get('/avatar/:id', async (c) => {
  try {
    const userId = c.req.param('id');
    const token = c.env.BOT_TOKEN;
    if (!token) return c.json({ error: 'No token configured' }, 500);

    // 1. Get user profile photos
    const photoRes = await fetch(`https://api.telegram.org/bot${token}/getUserProfilePhotos?user_id=${userId}&limit=1`);
    const photoData: any = await photoRes.json();

    if (!photoData.ok || !photoData.result.total_count) {
      return c.json({ error: 'No photos found' }, 404);
    }

    const fileId = photoData.result.photos[0][0].file_id;

    // 2. Get file path
    const fileRes = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
    const fileData: any = await fileRes.json();

    if (!fileData.ok) {
      return c.json({ error: 'Failed to get file' }, 404);
    }

    const filePath = fileData.result.file_path;
    const imageUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;

    // 3. Fetch image and return as response
    const imageRes = await fetch(imageUrl);
    if (!imageRes.ok) {
      return c.json({ error: 'Failed to fetch image from Telegram' }, 404);
    }
    const arrayBuffer = await imageRes.arrayBuffer();

    c.header('Content-Type', imageRes.headers.get('Content-Type') || 'image/jpeg');
    c.header('Cache-Control', 'public, max-age=86400');
    return c.body(arrayBuffer);
  } catch (error) {
    console.error('Avatar fetch error:', error);
    return c.json({ error: 'Failed to fetch avatar' }, 500);
  }
});

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
        last_seen: u.last_seen ? new Date(u.last_seen as any).toISOString() : undefined,
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
    const requesterId = c.get('userId') as string;
    const body = await c.req.json();
    const schema = z.object({ role: z.enum(['user', 'staff', 'admin']) });
    const parsed = schema.safeParse(body);
    if (!parsed.success) return c.json({ success: false, error: 'Invalid role' }, 400);

    if (userId === c.env.SUPERADMIN_ID) {
      return c.json({ success: false, error: 'Cannot modify SuperAdmin role' }, 400);
    }

    const db = createDb(c.env);
    
    // Privilege check
    let requesterRole = 'staff';
    if (requesterId === c.env.SUPERADMIN_ID) {
      requesterRole = 'admin';
    } else {
      const reqUser = await db.select({ role: users.role }).from(users).where(eq(users.user_id, requesterId)).limit(1);
      requesterRole = reqUser[0]?.role || 'staff';
    }
    
    if (requesterRole !== 'admin') {
      return c.json({ success: false, error: 'Only admins can change roles' }, 403);
    }

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
    const requesterId = c.get('userId') as string;
    const body = await c.req.json();
    const isBanned = body.isBanned ?? body.is_banned ?? false;

    if (userId === c.env.SUPERADMIN_ID) {
      return c.json({ success: false, error: 'Cannot ban SuperAdmin' }, 400);
    }

    const db = createDb(c.env);
    
    // Privilege check
    let requesterRole = 'staff';
    if (requesterId === c.env.SUPERADMIN_ID) {
      requesterRole = 'admin';
    } else {
      const reqUser = await db.select({ role: users.role }).from(users).where(eq(users.user_id, requesterId)).limit(1);
      requesterRole = reqUser[0]?.role || 'staff';
    }
    
    const targetUser = await db.select({ role: users.role }).from(users).where(eq(users.user_id, userId)).limit(1);
    const targetRole = targetUser[0]?.role || 'user';
    
    if (requesterRole === 'staff' && (targetRole === 'admin' || targetRole === 'staff')) {
      return c.json({ success: false, error: 'Staff cannot ban admins or other staff' }, 403);
    }

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
    const requesterId = c.get('userId') as string;

    if (userId === c.env.SUPERADMIN_ID) {
      return c.json({ success: false, error: 'Cannot delete SuperAdmin' }, 400);
    }

    const db = createDb(c.env);

    // Check user exists
    const existing = await db.select().from(users).where(eq(users.user_id, userId)).limit(1);
    if (!existing.length) return c.json({ success: false, error: 'User not found' }, 404);
    
    const targetRole = existing[0].role;
    if (targetRole === 'admin') {
      return c.json({ success: false, error: 'Cannot delete admin account' }, 400);
    }
    
    // Privilege check
    let requesterRole = 'staff';
    if (requesterId === c.env.SUPERADMIN_ID) {
      requesterRole = 'admin';
    } else {
      const reqUser = await db.select({ role: users.role }).from(users).where(eq(users.user_id, requesterId)).limit(1);
      requesterRole = reqUser[0]?.role || 'staff';
    }
    
    if (requesterRole === 'staff' && targetRole === 'staff') {
      return c.json({ success: false, error: 'Staff cannot delete other staff' }, 403);
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
    if (isNaN(id)) return c.json({ success: false, error: 'Invalid ID' }, 400);
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
    if (isNaN(id)) return c.json({ success: false, error: 'Invalid ID' }, 400);
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
    
    // Prevent negative prices
    const priceVal = parseFloat(body.price || 0);
    if (isNaN(priceVal) || priceVal < 0) {
      return c.json({ success: false, error: 'Price cannot be negative' }, 400);
    }
    
    if (body.flash_sale_price !== undefined && body.flash_sale_price !== null) {
      const flashPriceVal = parseFloat(body.flash_sale_price);
      if (isNaN(flashPriceVal) || flashPriceVal < 0) {
        return c.json({ success: false, error: 'Flash sale price cannot be negative' }, 400);
      }
    }
    
    const db = createDb(c.env);

    if (body.category) {
      await db.execute(
        sql`INSERT INTO categories (name) VALUES (${body.category}) ON CONFLICT (name) DO NOTHING`
      );
    }

    const res = await db.insert(products).values({
      name: body.name,
      price: String(priceVal),
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

    // AUTO-POST TO TELEGRAM CHANNEL
    c.executionCtx.waitUntil((async () => {
      try {
        const channelSettings = await db.select().from(settings).where(eq(settings.key, 'telegram_channel_id'));
        const channelId = channelSettings[0]?.value;
        if (channelId && res[0].image) {
          const caption = `🌟 <b>ទំនិញថ្មី / New Arrival</b> 🌟\n\n<b>${res[0].name}</b>\n\nតម្លៃ / Price: <b>$${res[0].price}</b>\n\n${res[0].description ? res[0].description.substring(0, 100) + '...' : ''}`;
          
          // Try to get Telegram Bot username or link
          const tgSettings = await db.select().from(settings).where(eq(settings.key, 'social_tg'));
          let shopUrl = tgSettings[0]?.value || 'https://t.me/Vibe_Lifestyle_Bot/app';
          if (shopUrl.includes('@')) {
            shopUrl = `https://t.me/${shopUrl.replace('@', '')}/app`;
          }

          const replyMarkup = {
            inline_keyboard: [[{ text: '🛍️ ទិញឥឡូវនេះ (Buy Now)', url: shopUrl }]]
          };

          await fetch(`https://api.telegram.org/bot${c.env.BOT_TOKEN}/sendPhoto`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: channelId,
              photo: res[0].image,
              caption: caption,
              parse_mode: 'HTML',
              reply_markup: replyMarkup
            })
          });
        }
      } catch (err) {
        console.error('Auto-post to channel failed:', err);
      }
    })());

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
    if (isNaN(id)) return c.json({ success: false, error: 'Invalid ID' }, 400);
    const body = await c.req.json();
    const db = createDb(c.env);

    if (body.category) {
      await db.execute(
        sql`INSERT INTO categories (name) VALUES (${body.category}) ON CONFLICT (name) DO NOTHING`
      );
    }

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    
    if (body.price !== undefined) {
      const priceVal = parseFloat(body.price);
      if (isNaN(priceVal) || priceVal < 0) {
        return c.json({ success: false, error: 'Price cannot be negative' }, 400);
      }
      updateData.price = String(priceVal);
    }
    
    if (body.category !== undefined) updateData.category = body.category;
    if (body.image !== undefined) updateData.image = body.image;
    
    if (body.stock !== undefined) {
      const stockVal = parseInt(body.stock);
      if (isNaN(stockVal) || stockVal < 0) {
        return c.json({ success: false, error: 'Stock cannot be negative' }, 400);
      }
      updateData.stock = stockVal;
    }
    
    if (body.description !== undefined) updateData.description = body.description;
    if (body.additional_images !== undefined) updateData.additional_images = parseJsonSafe(body.additional_images, []);
    if (body.variants !== undefined) updateData.variants = parseJsonSafe(body.variants, []);
    
    if (body.flash_sale_price !== undefined) {
      if (body.flash_sale_price) {
        const flashPriceVal = parseFloat(body.flash_sale_price);
        if (isNaN(flashPriceVal) || flashPriceVal < 0) {
          return c.json({ success: false, error: 'Flash sale price cannot be negative' }, 400);
        }
        updateData.flash_sale_price = String(flashPriceVal);
      } else {
        updateData.flash_sale_price = null;
      }
    }
    
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
    if (isNaN(id)) return c.json({ success: false, error: 'Invalid ID' }, 400);
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
    if (isNaN(id)) return c.json({ success: false, error: 'Invalid ID' }, 400);
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
    if (isNaN(id)) return c.json({ success: false, error: 'Invalid ID' }, 400);
    const db = createDb(c.env);
    await db.execute(sql`DELETE FROM faqs WHERE id=${id}`);
    return c.json({ success: true });
  } catch (error: any) {
    console.error('FAQ delete error:', error);
    return c.json({ success: false, error: 'Failed to delete FAQ' }, 500);
  }
});

/**
 * GET /api/admin/analytics - Extended analytics: monthly, category, province breakdown
 */
app.get('/analytics', async (c) => {
  try {
    const db = createDb(c.env);

    const [monthlyRes, categoryRes, provinceRes, statusRes] = await Promise.all([
      // Monthly revenue for the last 6 months
      db.execute(sql`
        SELECT
          TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YY') as month,
          SUM(total::numeric) as revenue,
          COUNT(*) as orders
        FROM orders
        WHERE created_at >= NOW() - INTERVAL '6 months'
          AND status != 'cancelled'
        GROUP BY DATE_TRUNC('month', created_at)
        ORDER BY DATE_TRUNC('month', created_at) ASC
      `),
      // Revenue by product category — LEFT JOIN so unmatched items are grouped as 'Other'
      db.execute(sql`
        SELECT
          COALESCE(p.category, 'Other') as category,
          SUM((item->>'price')::numeric * (item->>'quantity')::numeric) as revenue
        FROM orders o,
          jsonb_array_elements(
            CASE WHEN jsonb_typeof(o.items::jsonb) = 'array' THEN o.items::jsonb ELSE '[]'::jsonb END
          ) AS item
        LEFT JOIN products p ON p.id = (item->>'id')::int
        WHERE o.status != 'cancelled'
          AND (item->>'price') IS NOT NULL
          AND (item->>'quantity') IS NOT NULL
        GROUP BY p.category
        ORDER BY revenue DESC
        LIMIT 8
      `),
      // Revenue by province — include empty string province as 'Unknown'
      db.execute(sql`
        SELECT
          CASE WHEN province IS NULL OR province = '' THEN 'Unknown' ELSE province END as province,
          SUM(total::numeric) as revenue,
          COUNT(*) as orders
        FROM orders
        WHERE status != 'cancelled'
        GROUP BY CASE WHEN province IS NULL OR province = '' THEN 'Unknown' ELSE province END
        ORDER BY revenue DESC
        LIMIT 10
      `),
      // Revenue by status
      db.execute(sql`
        SELECT status, COUNT(*) as count, SUM(total::numeric) as revenue
        FROM orders
        GROUP BY status
      `)
    ]);

    return c.json({
      success: true,
      monthly: (Array.isArray(monthlyRes) ? monthlyRes : (monthlyRes.rows || [])).map((r: any) => ({
        month: r.month,
        revenue: parseFloat(r.revenue || '0'),
        orders: parseInt(r.orders || '0'),
      })),
      categoryRevenue: (Array.isArray(categoryRes) ? categoryRes : (categoryRes.rows || [])).map((r: any) => ({
        category: r.category,
        revenue: parseFloat(r.revenue || '0'),
      })),
      provinceRevenue: (Array.isArray(provinceRes) ? provinceRes : (provinceRes.rows || [])).map((r: any) => ({
        province: r.province,
        revenue: parseFloat(r.revenue || '0'),
        orders: parseInt(r.orders || '0'),
      })),
      revenueByStatus: (Array.isArray(statusRes) ? statusRes : (statusRes.rows || [])).map((r: any) => ({
        status: r.status,
        count: parseInt(r.count || '0'),
        revenue: parseFloat(r.revenue || '0'),
      })),
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return c.json({ success: false, monthly: [], categoryRevenue: [], provinceRevenue: [], revenueByStatus: [] }, 500);
  }
});

app.get('/advanced-analytics', async (c) => {
  try {
    const db = createDb(c.env);
    
    const [topCustomersRes, aovRes, ordersRes] = await Promise.all([
      db.execute(sql`
        SELECT user_name, SUM(total::numeric) as total_spent
        FROM orders
        WHERE status NOT IN ('cancelled', 'expired', 'pending')
          AND user_name IS NOT NULL AND user_name != ''
        GROUP BY user_name
        ORDER BY total_spent DESC
        LIMIT 5
      `),
      db.execute(sql`
        SELECT COALESCE(AVG(total::numeric), 0) as aov
        FROM orders
        WHERE status NOT IN ('cancelled', 'expired', 'pending')
      `),
      db.execute(sql`SELECT items FROM orders WHERE status NOT IN ('cancelled', 'expired', 'pending')`)
    ]);

    const productCounts: Record<string, number> = {};
    const ordersRows = Array.isArray(ordersRes) ? ordersRes : (ordersRes.rows || []);
    for (const row of ordersRows) {
      if (row.items) {
        try {
          // items is jsonb — comes back as object already, no need to JSON.parse
          const items = Array.isArray(row.items)
            ? row.items
            : (typeof row.items === 'string' ? JSON.parse(row.items) : []);
          for (const item of items) {
            const name = item.name || item.product_name || item.productName;
            if (name) {
              productCounts[name] = (productCounts[name] || 0) + (item.quantity || 1);
            }
          }
        } catch(e){}
      }
    }
    
    const topProducts = Object.entries(productCounts)
      .map(([name, qty]) => ({ product_name: name, total_quantity: qty }))
      .sort((a, b) => b.total_quantity - a.total_quantity)
      .slice(0, 5);

    const topCustomersRows = Array.isArray(topCustomersRes) ? topCustomersRes : (topCustomersRes.rows || []);
    const aovRows = Array.isArray(aovRes) ? aovRes : (aovRes.rows || []);

    return c.json({
      success: true,
      data: {
        topProducts: topProducts,
        topCustomers: topCustomersRows,
        aov: {
          aov: parseFloat((aovRows[0] as any)?.aov || '0')
        }
      }
    });
  } catch (error) {
    console.error('advanced-analytics error:', error);
    return c.json({ success: true, data: { topProducts: [], topCustomers: [], aov: { aov: 0 } }, _error: String(error) });
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

    // Run the broadcast in the background to prevent Cloudflare Worker timeout
    c.executionCtx.waitUntil(
      (async () => {
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
              if (result.error_code === 429) {
                // Rate limited, wait a bit
                await new Promise(r => setTimeout(r, (result.parameters?.retry_after || 1) * 1000));
              }
              failed++;
            }
            
            // Artificial delay to respect Telegram's 30 msg/sec broadcast limit
            await new Promise(r => setTimeout(r, 35)); 
          } catch {
            failed++;
          }
        }
        console.log(`Broadcast completed. Sent: ${sent}, Failed: ${failed}`);
      })()
    );

    return c.json({
      success: true,
      message: `Broadcast started for ${allUsers.length} users in the background.`,
      data: { total: allUsers.length }
    });
  } catch (error: any) {
    console.error('broadcast error:', error);
    return c.json({ success: false, error: 'Broadcast initialization failed' }, 500);
  }
});

/* ─────────────────── ABANDONED CART ─────────────────── */

/**
 * POST /api/admin/abandoned-cart-notify
 */
app.post('/abandoned-cart-notify', async (c) => {
  try {
    const db = createDb(c.env);
    const botToken = c.env.BOT_TOKEN;

    if (!botToken) {
      return c.json({ success: false, error: 'BOT_TOKEN not configured' }, 500);
    }

    // Find users with cart items, updated > 2 hours ago, and not reminded yet
    const targetUsers = await db.execute(
      sql`SELECT user_id, cart_state 
          FROM users 
          WHERE cart_state IS NOT NULL 
            AND cart_state != '[]' 
            AND is_cart_reminded = false 
            AND cart_updated_at < NOW() - INTERVAL '2 hours'`
    );

    const usersToNotify = targetUsers.rows as any[];
    if (usersToNotify.length === 0) {
      return c.json({ success: true, message: 'No abandoned carts found matching the criteria.', count: 0 });
    }

    // Run in background
    c.executionCtx.waitUntil(
      (async () => {
        let sent = 0;
        let failed = 0;

        for (const u of usersToNotify) {
          try {
            const message = `🛍️ *សួស្ដីបង! ទំនិញក្នុងកន្ត្រករបស់អ្នកកំពុងរង់ចាំ!* \n\nកុំឱ្យកន្ត្រករបស់អ្នកឯកា! ចូលទៅកាន់ App របស់យើងឥឡូវនេះ ដើម្បីពិនិត្យមើល និងបញ្ជាទិញទំនិញរបស់អ្នកមុនពេលវាអស់ពីស្តុក! 🚀`;
            
            const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: u.user_id, text: message, parse_mode: 'Markdown' })
            });

            const result = await res.json() as any;
            if (result.ok) {
              sent++;
              // Mark as reminded
              await db.execute(sql`UPDATE users SET is_cart_reminded = true WHERE user_id = ${u.user_id}`);
            } else {
              if (result.error_code === 429) {
                await new Promise(r => setTimeout(r, (result.parameters?.retry_after || 1) * 1000));
              }
              failed++;
            }
            await new Promise(r => setTimeout(r, 35)); 
          } catch {
            failed++;
          }
        }
        console.log(`Abandoned cart notify completed. Sent: ${sent}, Failed: ${failed}`);
      })()
    );

    return c.json({
      success: true,
      message: `Abandoned cart recovery started for ${usersToNotify.length} users.`,
      count: usersToNotify.length
    });
  } catch (error: any) {
    console.error('abandoned cart error:', error);
    return c.json({ success: false, error: 'Failed to trigger abandoned cart' }, 500);
  }
});

/* ─────────────────── WEBHOOK SETUP ─────────────────── */

/**
 * POST /api/admin/set-webhook
 * Register the webhook with Telegram
 */
app.post('/set-webhook', async (c) => {
  try {
    const body = await c.req.json();
    const { url } = body; // e.g. https://your-worker.workers.dev/api/webhook/telegram
    const botToken = c.env.BOT_TOKEN;

    if (!botToken) {
      return c.json({ success: false, error: 'BOT_TOKEN not configured' }, 500);
    }
    if (!url) {
      return c.json({ success: false, error: 'Webhook URL is required' }, 400);
    }

    const res = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook?url=${encodeURIComponent(url)}`);
    const data = await res.json();

    return c.json({ success: true, data });
  } catch (error: any) {
    console.error('set webhook error:', error);
    return c.json({ success: false, error: 'Failed to set webhook' }, 500);
  }
});

export default app;
