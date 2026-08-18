import { Hono } from 'hono';
import { eq, inArray, sql, and } from 'drizzle-orm';
import { createDb } from '../db/connection';
import { settings, categories, products, coupons } from '../db/schema';
import { telegramAuth } from '../middleware/auth';
import { parseJsonSafe, getEffectivePrice } from '../utils/helpers';
import type { Env, Variables } from '../types';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * GET /api/alive - Keep-alive health check
 */
app.get('/alive', (c) => {
  return c.json({ success: true, timestamp: new Date().toISOString(), uptime: Date.now() });
});

/**
 * POST /api/ping - Silent user activity ping
 */
app.post('/ping', telegramAuth, async (c) => {
  // Fire-and-forget last_seen update — respond immediately
  const userId = c.get('userId');
  const db = createDb(c.env);
  
  let referredBy = null;
  try {
    const body = await c.req.json();
    if (body.referred_by && typeof body.referred_by === 'string') {
      referredBy = body.referred_by;
    }
  } catch (e) {
    // ignore
  }

  c.executionCtx.waitUntil(
    db.execute(
      sql`INSERT INTO users (user_id, last_seen, last_updated, email, phone, address, loyalty_points, referred_by)
          VALUES (${userId}, NOW(), NOW(), ${'tg_' + userId + '@vibelifestyle.local'}, '', '', 0, ${referredBy})
          ON CONFLICT (user_id) DO UPDATE SET last_seen = NOW(), last_updated = NOW()`
    ).catch((err) => {
      console.error('[PING ERROR]', err);
    })
  );

  return c.json({ success: true });
});

/**
 * GET /api/settings - Get settings by keys
 */
app.get('/settings', async (c) => {
  try {
    const db = createDb(c.env);
    const keysParam = c.req.query('keys');
    
    let rows;
    if (keysParam) {
      const keys = keysParam.split(',').map(k => k.trim()).filter(Boolean);
      rows = await db.select().from(settings).where(inArray(settings.key, keys));
    } else {
      rows = await db.select().from(settings);
    }

    const settingsMap = rows.reduce((acc, s) => {
      acc[s.key] = s.value || '';
      return acc;
    }, {} as Record<string, string>);

    c.header('Cache-Control', 'public, max-age=15, s-maxage=60');
    return c.json({ success: true, settings: settingsMap });
  } catch (error) {
    return c.json({ success: false, error: 'Failed to fetch settings' }, 500);
  }
});

/**
 * GET /api/init - Initial app data (products + settings + categories + coupons)
 */
app.get('/init', async (c) => {
  try {
    const db = createDb(c.env);

    const [allProducts, allSettings, allCategories, activeCoupons] = await Promise.all([
      db.select().from(products),
      db.select().from(settings),
      db.select().from(categories),
      db.select().from(coupons).where(and(eq(coupons.active, true), eq(coupons.is_auto, true))),
    ]);

    const settingsMap = allSettings.reduce((acc, s) => {
      acc[s.key] = s.value || '';
      return acc;
    }, {} as Record<string, string>);

    const formattedProducts = allProducts.map(p => ({
      id: p.id,
      name: p.name,
      price: getEffectivePrice(
        parseFloat(p.price),
        p.flash_sale_price ? parseFloat(p.flash_sale_price) : undefined,
        p.flash_sale_end?.toISOString()
      ),
      original_price: parseFloat(p.price),
      category: p.category,
      image: p.image,
      stock: p.stock,
      description: p.description,
      additional_images: parseJsonSafe(p.additional_images as string, []),
      variants: parseJsonSafe(p.variants as string, []),
      flash_sale: {
        active: p.flash_sale_end ? new Date(p.flash_sale_end) > new Date() : false,
        price: p.flash_sale_price ? parseFloat(p.flash_sale_price) : null,
        end_time: p.flash_sale_end?.toISOString() || null,
      },
      video_url: p.video_url,
      created_at: p.created_at.toISOString(),
    }));

    c.header('Cache-Control', 'public, max-age=60, s-maxage=120');
    return c.json({
      success: true,
      products: formattedProducts,
      settings: settingsMap,
      categories: allCategories.map(c => c.name),
      coupons: activeCoupons.map(cp => ({
        id: cp.id,
        code: cp.code,
        discount_type: cp.discount_type,
        value: parseFloat(cp.value),
        is_auto: cp.is_auto,
        apply_to: cp.apply_to,
      })),
    });
  } catch (error) {
    console.error('Init error:', error);
    return c.json({ success: false, error: 'Failed to load initial data' }, 500);
  }
});

/**
 * GET /api/flags - Feature flags
 */
app.get('/flags', (c) => {
  return c.json({
    success: true,
    flags: {
      BETA_WISH_LIST: true,
      NEW_CHECKOUT_FLOW: false,
      PREMIUM_ADMIN_STATS: false
    }
  });
});

/**
 * POST /api/v1/telemetry - Telemetry ingestion (renamed from app-state to avoid ad blockers)
 */
app.post('/v1/telemetry', (c) => {
  return c.json({ success: true });
});

/**
 * POST /api/images/report-broken - Broken image reporting
 */
app.post('/images/report-broken', (c) => {
  return c.json({ success: true });
});

export default app;
