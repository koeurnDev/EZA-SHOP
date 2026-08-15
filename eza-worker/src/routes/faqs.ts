import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { createDb } from '../db/connection';
import { telegramAuth, adminAuth } from '../middleware/auth';
import type { Env, Variables } from '../types';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * GET /api/faqs - Public
 */
app.get('/', async (c) => {
  try {
    const db = createDb(c.env);
    const res = await db.execute(sql`
      SELECT * FROM faqs WHERE is_active = true ORDER BY sort_order ASC, id ASC
    `);
    return c.json({ success: true, faqs: res.rows || [] });
  } catch (error) {
    return c.json({ success: false, faqs: [] });
  }
});

/**
 * POST /api/faqs - Admin create
 */
app.post('/', telegramAuth, adminAuth, async (c) => {
  try {
    const body = await c.req.json();
    const { q_kh = '', q_en = '', a_kh = '', a_en = '', is_active = true } = body;
    const sort_order = parseInt(body.sort_order) || 0;

    const db = createDb(c.env);
    const res = await db.execute(sql`
      INSERT INTO faqs (q_kh, q_en, a_kh, a_en, sort_order, is_active)
      VALUES (${q_kh}, ${q_en}, ${a_kh}, ${a_en}, ${sort_order}, ${Boolean(is_active)})
      RETURNING *
    `);
    return c.json({ success: true, faq: res.rows[0] });
  } catch (error) {
    return c.json({ success: false, error: 'Failed to create FAQ' }, 500);
  }
});

/**
 * PUT /api/faqs/:id - Admin update
 */
app.put('/:id', telegramAuth, adminAuth, async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) return c.json({ success: false, error: 'Invalid FAQ ID' }, 400);

    const body = await c.req.json();
    const db = createDb(c.env);

    const res = await db.execute(sql`
      UPDATE faqs SET
        q_kh      = COALESCE(${body.q_kh      ?? null}, q_kh),
        q_en      = COALESCE(${body.q_en      ?? null}, q_en),
        a_kh      = COALESCE(${body.a_kh      ?? null}, a_kh),
        a_en      = COALESCE(${body.a_en      ?? null}, a_en),
        sort_order = COALESCE(${body.sort_order != null ? parseInt(body.sort_order) : null}, sort_order),
        is_active  = COALESCE(${body.is_active  != null ? Boolean(body.is_active)  : null}, is_active)
      WHERE id = ${id}
      RETURNING *
    `);

    if (!(res.rows as any[]).length) {
      return c.json({ success: false, error: 'FAQ not found' }, 404);
    }
    return c.json({ success: true, faq: res.rows[0] });
  } catch (error) {
    return c.json({ success: false, error: 'Failed to update FAQ' }, 500);
  }
});

/**
 * DELETE /api/faqs/:id - Admin delete
 */
app.delete('/:id', telegramAuth, adminAuth, async (c) => {
  try {
    const id = parseInt(c.req.param('id'));
    if (isNaN(id)) return c.json({ success: false, error: 'Invalid FAQ ID' }, 400);
    const db = createDb(c.env);
    await db.execute(sql`DELETE FROM faqs WHERE id = ${id}`);
    return c.json({ success: true });
  } catch (error) {
    return c.json({ success: false, error: 'Failed to delete FAQ' }, 500);
  }
});

export default app;
