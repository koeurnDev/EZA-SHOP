import { Hono } from 'hono';
import { sql } from 'drizzle-orm';
import { createDb } from '../db/connection';
import type { Env, Variables } from '../types';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

/**
 * GET /api/notifications - Public broadcast notifications
 */
app.get('/', async (c) => {
  try {
    const db = createDb(c.env);
    const res = await db.execute(sql`
      SELECT id, message, photo_url, created_at
      FROM broadcasts
      ORDER BY created_at DESC
      LIMIT 20
    `);
    return c.json({
      success: true,
      notifications: res.rows || [],
      unread: (res.rows as any[]).length,
    });
  } catch (error) {
    console.error('getNotifications error:', error);
    return c.json({ success: true, notifications: [], unread: 0 });
  }
});

/**
 * DELETE /api/notifications/:id - Dismiss a notification (no-op for Workers — client-side only)
 */
app.delete('/:id', async (c) => {
  // In the serverless model, dismissal is client-side state.
  // Return success so the frontend doesn't error.
  return c.json({ success: true });
});

export default app;
